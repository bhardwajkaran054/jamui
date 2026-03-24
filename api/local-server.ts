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

app.get('/api/categories', async (req, res) => {
  try {
    const rows = await sql`SELECT DISTINCT category FROM products ORDER BY category`;
    res.json(['All', ...rows.map((r: any) => r.category)]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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

app.post('/api/products', authMiddleware, async (req, res) => {
  const { id, name, price, unit, category, emoji, stock } = req.body;
  try {
    if (id) {
      await sql`UPDATE products SET name = ${name}, price = ${price}, unit = ${unit}, category = ${category}, emoji = ${emoji}, stock = ${stock} WHERE id = ${id}`;
      res.json({ message: 'Updated', id });
    } else {
      const result = await sql`INSERT INTO products (name, price, unit, category, emoji, stock) VALUES (${name}, ${price}, ${unit}, ${category}, ${emoji}, ${stock}) RETURNING id`;
      res.json({ message: 'Created', id: result[0]?.id });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    await sql`DELETE FROM products WHERE id = ${req.params.id}`;
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM orders ORDER BY timestamp DESC`;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { items, total, customer, promoCode, deliveryFee } = req.body;
  try {
    const orderId = Date.now();
    await sql`INSERT INTO orders (id, items, total, customer, promo_code, delivery_fee) VALUES (${orderId}, ${JSON.stringify(items)}, ${total}, ${JSON.stringify(customer || {})}, ${promoCode || null}, ${deliveryFee || 0})`;
    for (const item of items) {
      await sql`UPDATE products SET stock = stock - ${item.quantity} WHERE id = ${item.id}`;
    }
    res.json({ success: true, order: { id: orderId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id', authMiddleware, async (req, res) => {
  const { status, deliveryMessage, rejectionReason, deliveryHours } = req.body;
  try {
    await sql`UPDATE orders SET status = ${status}, delivery_message = ${deliveryMessage || null}, rejection_reason = ${rejectionReason || null}, delivery_hours = ${deliveryHours || null} WHERE id = ${req.params.id}`;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/promo-codes', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM promo_codes`;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notices', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM notices WHERE id = 1`;
    res.json(rows[0] || { text: '', active: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/delivery-zones', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM delivery_zones`;
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

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