import { initDb, sql } from './db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'jamui_secret_123';

// Ensure DB is initialized on cold start
try {
  await initDb();
} catch (err) {
  console.error('[DB] Init failed:', err.message);
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  const url = req.url.split('?')[0];
  const path = url.replace('/api', '');

  try {
    // GET /api/products
    if (path === '/products' && req.method === 'GET') {
      const rows = await sql`SELECT * FROM products ORDER BY id`;
      const settingsRows = await sql`SELECT value FROM settings WHERE key = 'general'`;
      const settings = settingsRows[0]?.value || {};
      return Response.json({ products: rows, settings });
    }

    // GET /api/categories
    if (path === '/categories' && req.method === 'GET') {
      const rows = await sql`SELECT DISTINCT category FROM products ORDER BY category`;
      return Response.json(['All', ...rows.map(r => r.category)]);
    }

    // POST /api/login
    if (path === '/login' && req.method === 'POST') {
      const body = await req.json();
      const { username, password } = body;
      const rows = await sql`SELECT * FROM admins WHERE username = ${username}`;
      const admin = rows[0];
      if (!admin || !bcrypt.compareSync(password, admin.password)) {
        return Response.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
      return Response.json({ token, username: admin.username });
    }

    // Auth middleware
    const token = req.headers.get('authorization')?.split(' ')[1];
    let admin = null;
    if (token) {
      try {
        admin = jwt.verify(token, JWT_SECRET);
      } catch (e) {
        // Token invalid
      }
    }

    // POST /api/products (protected)
    if (path === '/products' && req.method === 'POST') {
      if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const body = await req.json();
      const { id, name, price, unit, category, emoji, stock } = body;

      if (id) {
        const existing = await sql`SELECT stock FROM products WHERE id = ${id}`;
        if (existing.length > 0) {
          const oldStock = existing[0].stock || 0;
          if (oldStock !== stock) {
            await sql`INSERT INTO stock_logs (product_id, product_name, old_stock, new_stock, reason, timestamp)
              VALUES (${id}, ${name}, ${oldStock}, ${stock}, ${'Manual Admin Update'}, CURRENT_TIMESTAMP)`;
          }
          await sql`UPDATE products SET name = ${name}, price = ${price}, unit = ${unit}, category = ${category}, emoji = ${emoji}, stock = ${stock} WHERE id = ${id}`;
        }
      } else {
        const maxRows = await sql`SELECT MAX(id) as max_id FROM products`;
        const newId = (maxRows[0]?.max_id || 0) + 1;
        await sql`INSERT INTO products (id, name, price, unit, category, emoji, stock) VALUES (${newId}, ${name}, ${price}, ${unit}, ${category}, ${emoji}, ${stock})`;
        await sql`INSERT INTO stock_logs (product_id, product_name, old_stock, new_stock, reason, timestamp)
          VALUES (${newId}, ${name}, ${0}, ${stock}, ${'New Product Added'}, CURRENT_TIMESTAMP)`;
      }

      return Response.json({ success: true });
    }

    // DELETE /api/products/:id (protected)
    if (path.match(/^\/products\/\d+$/) && req.method === 'DELETE') {
      if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const id = parseInt(path.split('/')[2]);
      const productRows = await sql`SELECT * FROM products WHERE id = ${id}`;
      if (productRows.length > 0) {
        await sql`INSERT INTO stock_logs (product_id, product_name, old_stock, new_stock, reason, timestamp)
          VALUES (${id}, ${productRows[0].name}, ${productRows[0].stock || 0}, ${0}, ${'Product Deleted'}, CURRENT_TIMESTAMP)`;
      }
      await sql`DELETE FROM products WHERE id = ${id}`;
      return Response.json({ success: true });
    }

    // POST /api/orders
    if (path === '/orders' && req.method === 'POST') {
      const body = await req.json();
      const { items, total, customer, promoCode, deliveryFee } = body;
      const orderId = Date.now();
      await sql`INSERT INTO orders (id, items, total, customer, promo_code, delivery_fee, timestamp, status)
        VALUES (${orderId}, ${JSON.stringify(items)}, ${total}, ${JSON.stringify(customer)}, ${promoCode || null}, ${deliveryFee || 0}, CURRENT_TIMESTAMP, 'pending')`;
      return Response.json({ success: true, order: { id: orderId, timestamp: new Date().toISOString() } });
    }

    // GET /api/orders (protected)
    if (path === '/orders' && req.method === 'GET') {
      if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const rows = await sql`SELECT * FROM orders ORDER BY timestamp DESC`;
      return Response.json(rows.map(row => ({
        ...row,
        items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
        customer: typeof row.customer === 'string' ? JSON.parse(row.customer) : row.customer,
      })));
    }

    // PUT /api/orders/:id (protected)
    if (path.match(/^\/orders\/\d+$/) && req.method === 'PUT') {
      if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const id = parseInt(path.split('/')[2]);
      const body = await req.json();
      const { status, deliveryMessage, rejectionReason, deliveryHours, driver, cancelReason } = body;

      const orderRows = await sql`SELECT * FROM orders WHERE id = ${id}`;
      const order = orderRows[0];
      if (order && status === 'completed' && order.status !== 'completed') {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        for (const item of items) {
          const productRows = await sql`SELECT stock FROM products WHERE id = ${item.id}`;
          if (productRows.length > 0) {
            const oldStock = productRows[0].stock || 0;
            const newStock = Math.max(0, oldStock - item.quantity);
            await sql`UPDATE products SET stock = ${newStock} WHERE id = ${item.id}`;
            await sql`INSERT INTO stock_logs (product_id, product_name, old_stock, new_stock, reason, timestamp)
              VALUES (${item.id}, ${item.name}, ${oldStock}, ${newStock}, ${`Order Approved (#JM-${id.toString().slice(-6)})`}, CURRENT_TIMESTAMP)`;
          }
        }
      }

      const updates = [];
      const vals = [];
      if (status) { updates.push('status'); vals.push(status); }
      if (deliveryMessage) { updates.push('delivery_message'); vals.push(deliveryMessage); }
      if (rejectionReason) { updates.push('rejection_reason'); vals.push(rejectionReason); }
      if (deliveryHours) { updates.push('delivery_hours'); updates.push('approval_timestamp'); vals.push(parseInt(deliveryHours), new Date().toISOString()); }
      if (driver) { updates.push('driver'); vals.push(JSON.stringify(driver)); }
      if (cancelReason) { updates.push('cancel_reason'); vals.push(cancelReason); }

      if (updates.length > 0) {
        const setClause = updates.map((u, i) => `${u} = $${i + 1}`).join(', ');
        vals.push(id);
        await sql.query(`UPDATE orders SET ${setClause} WHERE id = $${vals.length}`, vals);
      }

      return Response.json({ success: true });
    }

    // DELETE /api/orders/:id (protected)
    if (path.match(/^\/orders\/\d+$/) && req.method === 'DELETE') {
      if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const id = parseInt(path.split('/')[2]);
      await sql`DELETE FROM orders WHERE id = ${id}`;
      return Response.json({ success: true });
    }

    // GET /api/stock-logs (protected)
    if (path === '/stock-logs' && req.method === 'GET') {
      if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const rows = await sql`SELECT * FROM stock_logs ORDER BY timestamp DESC LIMIT 100`;
      return Response.json(rows);
    }

    // GET /api/drivers (protected)
    if (path === '/drivers' && req.method === 'GET') {
      if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const rows = await sql`SELECT * FROM drivers WHERE active = true ORDER BY name`;
      return Response.json(rows);
    }

    // POST /api/drivers (protected)
    if (path === '/drivers' && req.method === 'POST') {
      if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const body = await req.json();
      const { id, name, phone, vehicle, active } = body;
      if (id) {
        await sql`UPDATE drivers SET name = ${name}, phone = ${phone}, vehicle = ${vehicle}, active = ${active} WHERE id = ${id}`;
      } else {
        await sql`INSERT INTO drivers (name, phone, vehicle, active) VALUES (${name}, ${phone}, ${vehicle}, ${active !== false})`;
      }
      return Response.json({ success: true });
    }

    // DELETE /api/drivers/:id (protected)
    if (path.match(/^\/drivers\/\d+$/) && req.method === 'DELETE') {
      if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const id = parseInt(path.split('/')[2]);
      await sql`DELETE FROM drivers WHERE id = ${id}`;
      return Response.json({ success: true });
    }

    // GET/POST /api/promo-codes
    if (path === '/promo-codes') {
      if (req.method === 'GET') {
        const rows = await sql`SELECT * FROM promo_codes ORDER BY code`;
        return Response.json(rows);
      }
      if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const body = await req.json();
      const { code, discount, minOrder, active } = body;
      await sql`INSERT INTO promo_codes (code, discount, min_order, active) VALUES (${code}, ${discount}, ${minOrder || 0}, ${active !== false})
        ON CONFLICT (code) DO UPDATE SET discount = ${discount}, min_order = ${minOrder || 0}, active = ${active !== false}`;
      return Response.json({ success: true });
    }

    // DELETE /api/promo-codes/:code (protected)
    if (path.match(/^\/promo-codes\/.+$/) && req.method === 'DELETE') {
      if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const code = path.split('/')[2];
      await sql`DELETE FROM promo_codes WHERE code = ${code}`;
      return Response.json({ success: true });
    }

    // GET/POST /api/notices
    if (path === '/notices') {
      if (req.method === 'GET') {
        const rows = await sql`SELECT * FROM notices WHERE id = 1`;
        return Response.json(rows[0] || { text: '', active: false });
      }
      if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const body = await req.json();
      await sql`UPDATE notices SET text = ${body.text || ''}, active = ${body.active || false} WHERE id = 1`;
      return Response.json({ success: true });
    }

    // GET/POST /api/delivery-zones
    if (path === '/delivery-zones') {
      if (req.method === 'GET') {
        const rows = await sql`SELECT * FROM delivery_zones ORDER BY name`;
        return Response.json(rows.map(r => ({ name: r.name, fee: r.fee, minOrder: r.min_order })));
      }
      if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const body = await req.json();
      await sql`INSERT INTO delivery_zones (name, fee, min_order) VALUES (${body.name}, ${body.fee || 0}, ${body.minOrder || 0})
        ON CONFLICT (name) DO UPDATE SET fee = ${body.fee || 0}, min_order = ${body.minOrder || 0}`;
      return Response.json({ success: true });
    }

    // DELETE /api/delivery-zones/:name (protected)
    if (path.match(/^\/delivery-zones\/.+$/) && req.method === 'DELETE') {
      if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const name = decodeURIComponent(path.split('/')[2]);
      await sql`DELETE FROM delivery_zones WHERE name = ${name}`;
      return Response.json({ success: true });
    }

    // GET /api/customers (protected)
    if (path === '/customers' && req.method === 'GET') {
      if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const orders = await sql`SELECT * FROM orders ORDER BY timestamp DESC`;
      const customers = {};
      for (const order of orders) {
        const customer = typeof order.customer === 'string' ? JSON.parse(order.customer) : order.customer;
        if (customer && customer.phone) {
          const phone = customer.phone;
          if (!customers[phone]) {
            customers[phone] = { name: customer.name, phone, totalSpent: 0, orderCount: 0, lastOrder: null, loyaltyPoints: 0 };
          }
          if (order.status === 'completed') {
            customers[phone].totalSpent += order.total;
            customers[phone].loyaltyPoints += Math.floor(order.total / 100);
          }
          customers[phone].orderCount += 1;
          if (!customers[phone].lastOrder || new Date(order.timestamp) > new Date(customers[phone].lastOrder)) {
            customers[phone].lastOrder = order.timestamp;
          }
        }
      }
      return Response.json(Object.values(customers));
    }

    // GET /api/settings
    if (path === '/settings' && req.method === 'GET') {
      const rows = await sql`SELECT value FROM settings WHERE key = 'general'`;
      return Response.json(rows[0]?.value || {});
    }

    // POST /api/settings (protected)
    if (path === '/settings' && req.method === 'POST') {
      if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const body = await req.json();
      await sql`INSERT INTO settings (key, value) VALUES ('general', ${JSON.stringify(body)})
        ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(body)}`;
      return Response.json({ success: true });
    }

    // Health check
    if (path === '/health' && req.method === 'GET') {
      return Response.json({ status: 'ok', time: new Date().toISOString() });
    }

    // 404
    return Response.json({ error: 'Not Found' }, { status: 404 });
  } catch (err) {
    console.error('[API ERROR]', err.message);
    return Response.json({ error: 'Server Error' }, { status: 500 });
  }
}

export default handler;
