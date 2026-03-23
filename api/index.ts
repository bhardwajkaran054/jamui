import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initDb, sql } from './db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { JWTPayload } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'jamui_secret_123';

initDb().catch((err: Error) => console.error('[DB] Init failed:', err.message));

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = (req.url || '').split('?')[0];
  const path = url.replace('/api', '');

  const getBody = (): Promise<Record<string, unknown>> => new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });

  try {
    // GET /api/products
    if (path === '/products' && req.method === 'GET') {
      const rows = await sql`SELECT * FROM products ORDER BY id`;
      const settingsRows = await sql`SELECT value FROM settings WHERE key = 'general'`;
      const settings = (settingsRows[0] as { value?: Record<string, unknown> } | undefined)?.value || {};
      res.json({ products: rows, settings });
      return;
    }

    // GET /api/categories
    if (path === '/categories' && req.method === 'GET') {
      const rows = await sql`SELECT DISTINCT category FROM products ORDER BY category` as { category: string }[];
      res.json(['All', ...rows.map(r => r.category)]);
      return;
    }

    // POST /api/login
    if (path === '/login' && req.method === 'POST') {
      const body = await getBody();
      const { username, password } = body as { username?: string; password?: string };
      const rows = await sql`SELECT * FROM admins WHERE username = ${username}` as { id: number; username: string; password: string }[];
      const admin = rows[0];
      if (!admin || !bcrypt.compareSync(password || '', admin.password)) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Invalid credentials' }));
        return;
      }
      const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, username: admin.username });
      return;
    }

    // Auth middleware
    const authHeader = (req.headers['authorization'] || req.headers['Authorization']) as string | undefined;
    const token = authHeader?.split(' ')[1];
    let admin: JWTPayload | null = null;
    if (token) {
      try {
        admin = jwt.verify(token, JWT_SECRET) as JWTPayload;
      } catch {
        // Token invalid
      }
    }

    // POST /api/products (protected)
    if (path === '/products' && req.method === 'POST') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const body = await getBody();
      const { id, name, price, unit, category, emoji, stock } = body as {
        id?: number; name?: string; price?: number; unit?: string; category?: string; emoji?: string; stock?: number
      };

      if (id) {
        const existing = await sql`SELECT stock FROM products WHERE id = ${id}` as { stock: number }[];
        if (existing.length > 0) {
          const oldStock = existing[0].stock || 0;
          if (oldStock !== stock) {
            await sql`INSERT INTO stock_logs (product_id, product_name, old_stock, new_stock, reason, timestamp)
              VALUES (${id}, ${name}, ${oldStock}, ${stock}, ${'Manual Admin Update'}, CURRENT_TIMESTAMP)`;
          }
          await sql`UPDATE products SET name = ${name}, price = ${price}, unit = ${unit}, category = ${category}, emoji = ${emoji}, stock = ${stock} WHERE id = ${id}`;
        }
      } else {
        const maxRows = await sql`SELECT MAX(id) as max_id FROM products` as { max_id: number | null }[];
        const newId = (maxRows[0]?.max_id || 0) + 1;
        await sql`INSERT INTO products (id, name, price, unit, category, emoji, stock) VALUES (${newId}, ${name}, ${price}, ${unit}, ${category}, ${emoji}, ${stock})`;
        await sql`INSERT INTO stock_logs (product_id, product_name, old_stock, new_stock, reason, timestamp)
          VALUES (${newId}, ${name}, ${0}, ${stock}, ${'New Product Added'}, CURRENT_TIMESTAMP)`;
      }

      res.json({ success: true });
      return;
    }

    // DELETE /api/products/:id (protected)
    if (path.match(/^\/products\/\d+$/) && req.method === 'DELETE') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const id = parseInt(path.split('/')[2]);
      const productRows = await sql`SELECT * FROM products WHERE id = ${id}` as { name: string; stock: number }[];
      if (productRows.length > 0) {
        await sql`INSERT INTO stock_logs (product_id, product_name, old_stock, new_stock, reason, timestamp)
          VALUES (${id}, ${productRows[0].name}, ${productRows[0].stock || 0}, ${0}, ${'Product Deleted'}, CURRENT_TIMESTAMP)`;
      }
      await sql`DELETE FROM products WHERE id = ${id}`;
      res.json({ success: true });
      return;
    }

    // POST /api/orders
    if (path === '/orders' && req.method === 'POST') {
      const body = await getBody();
      const { items, total, customer, promoCode, deliveryFee } = body as {
        items?: unknown[]; total?: number; customer?: { name: string; phone: string }; promoCode?: string; deliveryFee?: number
      };
      const orderId = Date.now();
      await sql`INSERT INTO orders (id, items, total, customer, promo_code, delivery_fee, timestamp, status)
        VALUES (${orderId}, ${JSON.stringify(items)}, ${total}, ${JSON.stringify(customer)}, ${promoCode || null}, ${deliveryFee || 0}, CURRENT_TIMESTAMP, 'pending')`;
      res.json({ success: true, order: { id: orderId, timestamp: new Date().toISOString() } });
      return;
    }

    // GET /api/track/:id - public order lookup
    if (path.match(/^\/track\/\d+$/) && req.method === 'GET') {
      const orderId = parseInt(path.split('/')[2]);
      const rows = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
      if (rows.length === 0) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Order not found' }));
        return;
      }
      const order = rows[0] as Record<string, unknown>;
      res.json({
        id: order.id,
        status: order.status,
        timestamp: order.timestamp,
        total: order.total,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
        customer: typeof order.customer === 'string' ? JSON.parse(order.customer as string) : order.customer,
        deliveryMessage: order.delivery_message,
        deliveryHours: order.delivery_hours,
        approvalTimestamp: order.approval_timestamp,
        driver: order.driver,
        rejectionReason: order.rejection_reason
      });
      return;
    }

    // GET /api/orders (protected)
    if (path === '/orders' && req.method === 'GET') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const rows = await sql`SELECT * FROM orders ORDER BY timestamp DESC`;
      res.json(rows.map((row: Record<string, unknown>) => ({
        ...row,
        items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
        customer: typeof row.customer === 'string' ? JSON.parse(row.customer as string) : row.customer,
      })));
      return;
    }

    // PUT /api/orders/:id (protected)
    if (path.match(/^\/orders\/\d+$/) && req.method === 'PUT') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const id = parseInt(path.split('/')[2]);
      const body = await getBody();
      const { status, deliveryMessage, rejectionReason, deliveryHours, driver, cancelReason } = body as {
        status?: string; deliveryMessage?: string; rejectionReason?: string; deliveryHours?: number; driver?: { id: number; name: string; phone: string }; cancelReason?: string
      };

      const orderRows = await sql`SELECT * FROM orders WHERE id = ${id}` as Record<string, unknown>[];
      const order = orderRows[0];
      if (order && status === 'completed' && order.status !== 'completed') {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items as { id: number; name: string; quantity: number }[];
        for (const item of items) {
          const productRows = await sql`SELECT stock FROM products WHERE id = ${item.id}` as { stock: number }[];
          if (productRows.length > 0) {
            const oldStock = productRows[0].stock || 0;
            const newStock = Math.max(0, oldStock - item.quantity);
            await sql`UPDATE products SET stock = ${newStock} WHERE id = ${item.id}`;
            await sql`INSERT INTO stock_logs (product_id, product_name, old_stock, new_stock, reason, timestamp)
              VALUES (${item.id}, ${item.name}, ${oldStock}, ${newStock}, ${`Order Approved (#JM-${id.toString().slice(-6)})`}, CURRENT_TIMESTAMP)`;
          }
        }
      }

      const updates: string[] = [];
      const vals: (string | number | boolean | null)[] = [];
      if (status) { updates.push('status'); vals.push(status); }
      if (deliveryMessage) { updates.push('delivery_message'); vals.push(deliveryMessage); }
      if (rejectionReason) { updates.push('rejection_reason'); vals.push(rejectionReason); }
      if (deliveryHours) { updates.push('delivery_hours'); updates.push('approval_timestamp'); vals.push(parseInt(String(deliveryHours)), new Date().toISOString()); }
      if (driver) { updates.push('driver'); vals.push(JSON.stringify(driver)); }
      if (cancelReason) { updates.push('cancel_reason'); vals.push(cancelReason); }

      if (updates.length > 0) {
        const setClause = updates.map((u, i) => `${u} = $${i + 1}`).join(', ');
        vals.push(id);
        await sql.query(`UPDATE orders SET ${setClause} WHERE id = $${vals.length}`, vals);
      }

      res.json({ success: true });
      return;
    }

    // DELETE /api/orders/:id (protected)
    if (path.match(/^\/orders\/\d+$/) && req.method === 'DELETE') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const id = parseInt(path.split('/')[2]);
      await sql`DELETE FROM orders WHERE id = ${id}`;
      res.json({ success: true });
      return;
    }

    // GET /api/stock-logs (protected)
    if (path === '/stock-logs' && req.method === 'GET') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const rows = await sql`SELECT * FROM stock_logs ORDER BY timestamp DESC LIMIT 100`;
      res.json(rows);
      return;
    }

    // GET /api/drivers (protected)
    if (path === '/drivers' && req.method === 'GET') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const rows = await sql`SELECT * FROM drivers WHERE active = true ORDER BY name`;
      res.json(rows);
      return;
    }

    // POST /api/drivers (protected)
    if (path === '/drivers' && req.method === 'POST') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const body = await getBody();
      const { id, name, phone, vehicle, active } = body as {
        id?: number; name?: string; phone?: string; vehicle?: string; active?: boolean
      };
      if (id) {
        await sql`UPDATE drivers SET name = ${name}, phone = ${phone}, vehicle = ${vehicle}, active = ${active} WHERE id = ${id}`;
      } else {
        await sql`INSERT INTO drivers (name, phone, vehicle, active) VALUES (${name}, ${phone}, ${vehicle}, ${active !== false})`;
      }
      res.json({ success: true });
      return;
    }

    // DELETE /api/drivers/:id (protected)
    if (path.match(/^\/drivers\/\d+$/) && req.method === 'DELETE') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const id = parseInt(path.split('/')[2]);
      await sql`DELETE FROM drivers WHERE id = ${id}`;
      res.json({ success: true });
      return;
    }

    // GET/POST /api/promo-codes
    if (path === '/promo-codes') {
      if (req.method === 'GET') {
        const rows = await sql`SELECT * FROM promo_codes ORDER BY code`;
        res.json(rows);
        return;
      }
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const body = await getBody();
      const { code, discount, minOrder, active } = body as {
        code?: string; discount?: number; minOrder?: number; active?: boolean
      };
      await sql`INSERT INTO promo_codes (code, discount, min_order, active) VALUES (${code}, ${discount}, ${minOrder || 0}, ${active !== false})
        ON CONFLICT (code) DO UPDATE SET discount = ${discount}, min_order = ${minOrder || 0}, active = ${active !== false}`;
      res.json({ success: true });
      return;
    }

    // DELETE /api/promo-codes/:code (protected)
    if (path.match(/^\/promo-codes\/.+$/) && req.method === 'DELETE') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const code = path.split('/')[2];
      await sql`DELETE FROM promo_codes WHERE code = ${code}`;
      res.json({ success: true });
      return;
    }

    // GET/POST /api/notices
    if (path === '/notices') {
      if (req.method === 'GET') {
        const rows = await sql`SELECT * FROM notices WHERE id = 1`;
        res.json(rows[0] || { text: '', active: false });
        return;
      }
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const body = await getBody();
      await sql`UPDATE notices SET text = ${(body.text as string) || ''}, active = ${body.active as boolean || false} WHERE id = 1`;
      res.json({ success: true });
      return;
    }

    // GET/POST /api/delivery-zones
    if (path === '/delivery-zones') {
      if (req.method === 'GET') {
        const rows = await sql`SELECT * FROM delivery_zones ORDER BY name` as { name: string; fee: number; min_order: number }[];
        res.json(rows.map(r => ({ name: r.name, fee: r.fee, minOrder: r.min_order })));
        return;
      }
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const body = await getBody();
      await sql`INSERT INTO delivery_zones (name, fee, min_order) VALUES (${body.name as string}, ${body.fee as number || 0}, ${body.minOrder as number || 0})
        ON CONFLICT (name) DO UPDATE SET fee = ${body.fee as number || 0}, min_order = ${body.minOrder as number || 0}`;
      res.json({ success: true });
      return;
    }

    // DELETE /api/delivery-zones/:name (protected)
    if (path.match(/^\/delivery-zones\/.+$/) && req.method === 'DELETE') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const name = decodeURIComponent(path.split('/')[2]);
      await sql`DELETE FROM delivery_zones WHERE name = ${name}`;
      res.json({ success: true });
      return;
    }

    // GET /api/customers (protected)
    if (path === '/customers' && req.method === 'GET') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const orders = await sql`SELECT * FROM orders ORDER BY timestamp DESC` as Record<string, unknown>[];
      const customers: Record<string, { name: string; phone: string; totalSpent: number; orderCount: number; lastOrder: string | null; loyaltyPoints: number }> = {};
      for (const order of orders) {
        const customer = typeof order.customer === 'string' ? JSON.parse(order.customer as string) : order.customer as { name?: string; phone?: string } | null;
        if (customer && customer.phone) {
          const phone = customer.phone;
          if (!customers[phone]) {
            customers[phone] = { name: customer.name || '', phone, totalSpent: 0, orderCount: 0, lastOrder: null, loyaltyPoints: 0 };
          }
          if (order.status === 'completed') {
            customers[phone].totalSpent += order.total as number;
            customers[phone].loyaltyPoints += Math.floor((order.total as number) / 100);
          }
          customers[phone].orderCount += 1;
          if (!customers[phone].lastOrder || new Date(order.timestamp as string) > new Date(customers[phone].lastOrder)) {
            customers[phone].lastOrder = order.timestamp as string;
          }
        }
      }
      res.json(Object.values(customers));
      return;
    }

    // GET /api/settings
    if (path === '/settings' && req.method === 'GET') {
      const rows = await sql`SELECT value FROM settings WHERE key = 'general'` as { value: Record<string, unknown> }[];
      res.json(rows[0]?.value || {});
      return;
    }

    // POST /api/settings (protected)
    if (path === '/settings' && req.method === 'POST') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const body = await getBody();
      await sql`INSERT INTO settings (key, value) VALUES ('general', ${JSON.stringify(body)})
        ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(body)}`;
      res.json({ success: true });
      return;
    }

    // Debug endpoint - remove in production
    if (path === '/debug' && req.method === 'GET') {
      try {
        const admins = await sql`SELECT id, username FROM admins` as { id: number; username: string }[];
        const products = await sql`SELECT COUNT(*) as count FROM products` as { count: number }[];
        res.json({
          dbStatus: 'connected',
          admins: admins,
          productCount: products[0]?.count,
          jwtSecret: JWT_SECRET.substring(0, 4) + '...'
        });
        return;
      } catch (err) {
        res.json({ dbStatus: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
        return;
      }
    }

    // Health check
    if (path === '/health' && req.method === 'GET') {
      res.json({ status: 'ok', time: new Date().toISOString() });
      return;
    }

    // 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  } catch (err) {
    console.error('[API ERROR]', err instanceof Error ? err.message : err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Server Error' }));
  }
}
