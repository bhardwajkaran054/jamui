import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb, sql } from './db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5001');
const JWT_SECRET = process.env.JWT_SECRET || 'jamui_secret_123';

console.log('[SYSTEM] Starting local server...');

app.use(cors());
app.use(express.json());

const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    (req as any).admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const getBody = (req: express.Request): Promise<Record<string, any>> => new Promise((resolve) => {
  let body = '';
  req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
  req.on('end', () => {
    try { resolve(JSON.parse(body || '{}')); }
    catch { resolve({}); }
  });
});

// GET /api/products
app.get('/api/products', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM products ORDER BY id`;
    const settingsRows = await sql`SELECT value FROM settings WHERE key = 'general'`;
    const settings = settingsRows[0]?.value || {};
    res.json({ products: rows, settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categories
app.get('/api/categories', async (req, res) => {
  try {
    const rows = await sql`SELECT DISTINCT category FROM products ORDER BY category`;
    res.json(['All', ...rows.map((r: any) => r.category)]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const rows = await sql`SELECT * FROM admins WHERE username = ${username}`;
    const admin = rows[0];
    if (!admin || !bcrypt.compareSync(password || '', admin.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: admin.username });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products (protected)
app.post('/api/products', authMiddleware, async (req, res) => {
  const { id, name, price, unit, category, emoji, stock } = req.body;
  try {
    if (id) {
      const existing = await sql`SELECT stock FROM products WHERE id = ${id}`;
      if (existing.length > 0) {
        const oldStock = existing[0].stock || 0;
        if (oldStock !== stock) {
          await sql`INSERT INTO stock_logs (product_id, product_name, old_stock, new_stock, reason, timestamp)
            VALUES (${id}, ${name}, ${oldStock}, ${stock}, ${'Manual Admin Update'}, CURRENT_TIMESTAMP)`;
        }
      }
      await sql`UPDATE products SET name = ${name}, price = ${price}, unit = ${unit}, category = ${category}, emoji = ${emoji}, stock = ${stock} WHERE id = ${id}`;
    } else {
      const maxRows = await sql`SELECT MAX(id) as max_id FROM products`;
      const newId = (maxRows[0]?.max_id || 0) + 1;
      await sql`INSERT INTO products (id, name, price, unit, category, emoji, stock) VALUES (${newId}, ${name}, ${price}, ${unit}, ${category}, ${emoji}, ${stock})`;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id (protected)
app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const productRows = await sql`SELECT * FROM products WHERE id = ${id}`;
    if (productRows.length > 0) {
      await sql`INSERT INTO stock_logs (product_id, product_name, old_stock, new_stock, reason, timestamp)
        VALUES (${id}, ${productRows[0].name}, ${productRows[0].stock || 0}, ${0}, ${'Product Deleted'}, CURRENT_TIMESTAMP)`;
    }
    await sql`DELETE FROM products WHERE id = ${id}`;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders
app.post('/api/orders', async (req, res) => {
  const { items, total, customer, promoCode, deliveryFee } = req.body;
  try {
    const orderId = Date.now();
    await sql`INSERT INTO orders (id, items, total, customer, promo_code, delivery_fee, timestamp, status)
      VALUES (${orderId}, ${JSON.stringify(items)}, ${total}, ${JSON.stringify(customer || {})}, ${promoCode || null}, ${deliveryFee || 0}, CURRENT_TIMESTAMP, 'pending')`;
    res.json({ success: true, order: { id: orderId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders (protected)
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM orders ORDER BY timestamp DESC`;
    res.json(rows.map((row: any) => ({
      ...row,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      customer: typeof row.customer === 'string' ? JSON.parse(row.customer) : row.customer,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id (protected)
app.put('/api/orders/:id', authMiddleware, async (req, res) => {
  const { status, deliveryMessage, rejectionReason, deliveryHours, driver, cancelReason } = req.body;
  try {
    const id = parseInt(req.params.id as string);
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

    const updates: string[] = [];
    const vals: any[] = [];
    if (status) { updates.push('status'); vals.push(status); }
    if (deliveryMessage) { updates.push('delivery_message'); vals.push(deliveryMessage); }
    if (rejectionReason) { updates.push('rejection_reason'); vals.push(rejectionReason); }
    if (deliveryHours) { updates.push('delivery_hours'); updates.push('approval_timestamp'); vals.push(deliveryHours, new Date().toISOString()); }
    if (driver) { updates.push('driver'); vals.push(JSON.stringify(driver)); }
    if (cancelReason) { updates.push('cancel_reason'); vals.push(cancelReason); }

    if (updates.length > 0) {
      const setClauses = updates.map((u, i) => `${u} = $${i + 1}`).join(', ');
      const query = `UPDATE orders SET ${setClauses}, timestamp = CURRENT_TIMESTAMP WHERE id = $${vals.length + 1}`;
      await sql([query, ...vals, id]);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stock-logs (protected)
app.get('/api/stock-logs', authMiddleware, async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM stock_logs ORDER BY timestamp DESC LIMIT 100`;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/drivers (protected)
app.get('/api/drivers', authMiddleware, async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM drivers WHERE active = true ORDER BY name`;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/drivers (protected)
app.post('/api/drivers', authMiddleware, async (req, res) => {
  const { id, name, phone, vehicle, active } = req.body;
  try {
    if (id) {
      await sql`UPDATE drivers SET name = ${name}, phone = ${phone}, vehicle = ${vehicle}, active = ${active} WHERE id = ${id}`;
    } else {
      await sql`INSERT INTO drivers (name, phone, vehicle, active) VALUES (${name}, ${phone}, ${vehicle}, ${active !== false})`;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/drivers/:id (protected)
app.delete('/api/drivers/:id', authMiddleware, async (req, res) => {
  try {
    await sql`DELETE FROM drivers WHERE id = ${parseInt(req.params.id as string)}`;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET/POST /api/promo-codes
app.get('/api/promo-codes', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM promo_codes ORDER BY code`;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/promo-codes', authMiddleware, async (req, res) => {
  const { code, discount, minOrder, active } = req.body;
  try {
    await sql`INSERT INTO promo_codes (code, discount, min_order, active) VALUES (${code}, ${discount}, ${minOrder || 0}, ${active !== false})
      ON CONFLICT (code) DO UPDATE SET discount = ${discount}, min_order = ${minOrder || 0}, active = ${active !== false}`;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/promo-codes/:code (protected)
app.delete('/api/promo-codes/:code', authMiddleware, async (req, res) => {
  try {
    await sql`DELETE FROM promo_codes WHERE code = ${req.params.code}`;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET/POST /api/notices
app.get('/api/notices', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM notices WHERE id = 1`;
    res.json(rows[0] || { text: '', active: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notices', authMiddleware, async (req, res) => {
  const { text, active } = req.body;
  try {
    await sql`UPDATE notices SET text = ${text || ''}, active = ${active || false} WHERE id = 1`;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET/POST /api/delivery-zones
app.get('/api/delivery-zones', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM delivery_zones ORDER BY name`;
    res.json(rows.map((r: any) => ({ name: r.name, fee: r.fee, minOrder: r.min_order })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/delivery-zones', authMiddleware, async (req, res) => {
  const { name, fee, minOrder } = req.body;
  try {
    await sql`INSERT INTO delivery_zones (name, fee, min_order) VALUES (${name}, ${fee || 0}, ${minOrder || 0})
      ON CONFLICT (name) DO UPDATE SET fee = ${fee || 0}, min_order = ${minOrder || 0}`;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/delivery-zones/:name (protected)
app.delete('/api/delivery-zones/:name', authMiddleware, async (req, res) => {
  try {
    await sql`DELETE FROM delivery_zones WHERE name = ${decodeURIComponent(req.params.name as string)}`;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers (protected)
app.get('/api/customers', authMiddleware, async (req, res) => {
  try {
    const orders = await sql`SELECT * FROM orders ORDER BY timestamp DESC`;
    const customers: any = {};
    for (const order of orders) {
      const customer = typeof order.customer === 'string' ? JSON.parse(order.customer) : order.customer;
      if (customer && customer.phone) {
        const phone = customer.phone;
        if (!customers[phone]) {
          customers[phone] = { name: customer.name || '', phone, totalSpent: 0, orderCount: 0, lastOrder: null, loyaltyPoints: 0 };
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
    res.json(Object.values(customers));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET/POST /api/settings
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await sql`SELECT value FROM settings WHERE key = 'general'`;
    res.json(rows[0]?.value || {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', authMiddleware, async (req, res) => {
  try {
    await sql`INSERT INTO settings (key, value) VALUES ('general', ${JSON.stringify(req.body)})
      ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(req.body)}`;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Serve static files
app.use(express.static(path.join(__dirname, '../dist')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path === '/health') {
    return res.status(404).json({ error: 'Not Found' });
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

initDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SUCCESS] Server listening on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('[DB] Init failed:', err);
  process.exit(1);
});