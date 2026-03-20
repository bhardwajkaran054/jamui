import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const port = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'jamui_secret_123';

console.log('[SYSTEM] Starting server process...');
console.log(`[SYSTEM] Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`[SYSTEM] Port: ${port}`);

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.get('/api/products', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM products');
    res.json(result.rows);
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Database Error' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const result = await db.execute('SELECT DISTINCT category FROM products');
    const categories = ['All', ...result.rows.map(row => row.category)];
    res.json(categories);
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Database Error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await db.execute({
      sql: 'SELECT * FROM admins WHERE username = ?',
      args: [username]
    });
    const admin = result.rows[0];
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: admin.username });
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Database Error' });
  }
});

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/products', authMiddleware, async (req, res) => {
  try {
    const { id, name, price, unit, category, emoji, stock } = req.body;
    if (id) {
      await db.execute({
        sql: 'UPDATE products SET name = ?, price = ?, unit = ?, category = ?, emoji = ?, stock = ? WHERE id = ?',
        args: [name, price, unit, category, emoji, stock, id]
      });
      res.json({ message: 'Updated', id });
    } else {
      const result = await db.execute({
        sql: 'INSERT INTO products (name, price, unit, category, emoji, stock) VALUES (?, ?, ?, ?, ?, ?)',
        args: [name, price, unit, category, emoji, stock]
      });
      res.json({ message: 'Created', id: result.lastInsertRowid });
    }
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: err.message || 'Failed' });
  }
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    await db.execute({
      sql: 'DELETE FROM products WHERE id = ?',
      args: [req.params.id]
    });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { items, total, customer, promoCode, deliveryFee } = req.body;
    const result = await db.execute({
      sql: 'INSERT INTO orders (items, total, customer, promoCode, deliveryFee) VALUES (?, ?, ?, ?, ?)',
      args: [JSON.stringify(items), total, JSON.stringify(customer), promoCode, deliveryFee]
    });
    res.json({ message: 'Success', id: result.lastInsertRowid });
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Order failed' });
  }
});

app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM orders ORDER BY timestamp DESC');
    res.json(result.rows.map(row => ({
      ...row,
      items: JSON.parse(row.items),
      customer: JSON.parse(row.customer || '{}')
    })));
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM orders WHERE id = ?',
      args: [req.params.id]
    });
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Order not found' });
    res.json({
      ...row,
      items: JSON.parse(row.items),
      customer: JSON.parse(row.customer || '{}')
    });
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Database Error' });
  }
});

app.get('/api/orders/history/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const { verifyId } = req.query;
    const result = await db.execute({
      sql: 'SELECT * FROM orders ORDER BY timestamp DESC'
    });
    const parsedRows = result.rows
      .map(row => ({
        ...row,
        items: JSON.parse(row.items),
        customer: JSON.parse(row.customer || '{}')
      }))
      .filter(row => row.customer.phone && row.customer.phone.includes(phone));

    if (verifyId) {
      const ownsOne = parsedRows.some(o =>
        o.id.toString() === verifyId ||
        o.id.toString().endsWith(verifyId)
      );
      if (!ownsOne) return res.status(403).json({ error: 'Verification failed' });
    }
    res.json(parsedRows);
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Database Error' });
  }
});

app.put('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    const { status, estimatedDelivery, rejectReason } = req.body;
    const { id } = req.params;

    // Get current order
    const orderResult = await db.execute({
      sql: 'SELECT items, status FROM orders WHERE id = ?',
      args: [id]
    });
    const order = orderResult.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const items = JSON.parse(order.items);

    // If transitioning to 'completed'
    if (status === 'completed' && order.status !== 'completed') {
      for (const item of items) {
        const productResult = await db.execute({
          sql: 'SELECT name, stock FROM products WHERE id = ?',
          args: [item.id]
        });
        const product = productResult.rows[0];
        if (product) {
          const oldStock = product.stock;
          const newStock = Math.max(0, oldStock - item.quantity);
          await db.execute({
            sql: 'UPDATE products SET stock = ? WHERE id = ?',
            args: [newStock, item.id]
          });
          await db.execute({
            sql: 'INSERT INTO stock_logs (productId, productName, oldStock, newStock, reason) VALUES (?, ?, ?, ?, ?)',
            args: [item.id, product.name, oldStock, newStock, `Order Approved (#JM-${id.toString().slice(-6)})`]
          });
        }
      }
    }

    // Update order
    await db.execute({
      sql: 'UPDATE orders SET status = ?, estimatedDelivery = ?, rejectReason = ? WHERE id = ?',
      args: [status, estimatedDelivery, rejectReason, id]
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Update failed' });
  }
});

app.delete('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    await db.execute({
      sql: 'DELETE FROM orders WHERE id = ?',
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.get('/api/promo-codes', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM promo_codes');
    res.json(result.rows);
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

app.post('/api/promo-codes', authMiddleware, async (req, res) => {
  try {
    const { code, discount, type, minOrder } = req.body;
    await db.execute({
      sql: 'INSERT OR REPLACE INTO promo_codes (code, discount, type, minOrder) VALUES (?, ?, ?, ?)',
      args: [code, discount, type, minOrder]
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Save failed' });
  }
});

app.delete('/api/promo-codes/:code', authMiddleware, async (req, res) => {
  try {
    await db.execute({
      sql: 'DELETE FROM promo_codes WHERE code = ?',
      args: [req.params.code]
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.get('/api/notices', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM notices WHERE id = 1');
    res.json(result.rows[0] || { text: '', active: 0 });
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

app.post('/api/notices', authMiddleware, async (req, res) => {
  try {
    const { text, active } = req.body;
    await db.execute({
      sql: 'INSERT OR REPLACE INTO notices (id, text, active) VALUES (1, ?, ?)',
      args: [text, active ? 1 : 0]
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Save failed' });
  }
});

app.get('/api/delivery-zones', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM delivery_zones');
    res.json(result.rows);
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

app.post('/api/delivery-zones', authMiddleware, async (req, res) => {
  try {
    const { name, fee, minOrder } = req.body;
    await db.execute({
      sql: 'INSERT OR REPLACE INTO delivery_zones (name, fee, minOrder) VALUES (?, ?, ?)',
      args: [name, fee, minOrder]
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Save failed' });
  }
});

app.delete('/api/delivery-zones/:name', authMiddleware, async (req, res) => {
  try {
    await db.execute({
      sql: 'DELETE FROM delivery_zones WHERE name = ?',
      args: [decodeURIComponent(req.params.name)]
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.get('/api/customers', authMiddleware, async (req, res) => {
  try {
    const result = await db.execute('SELECT customer, total, timestamp, status FROM orders');
    const customersMap = {};
    result.rows.forEach(row => {
      const customer = JSON.parse(row.customer || '{}');
      if (customer.phone) {
        const phone = customer.phone;
        if (!customersMap[phone]) {
          customersMap[phone] = {
            name: customer.name,
            phone: phone,
            totalSpent: 0,
            orderCount: 0,
            lastOrder: null,
            loyaltyPoints: 0
          };
        }
        if (row.status === 'completed') {
          customersMap[phone].totalSpent += row.total;
          customersMap[phone].loyaltyPoints += Math.floor(row.total / 100);
        }
        customersMap[phone].orderCount += 1;
        if (!customersMap[phone].lastOrder || new Date(row.timestamp) > new Date(customersMap[phone].lastOrder)) {
          customersMap[phone].lastOrder = row.timestamp;
        }
      }
    });
    res.json(Object.values(customersMap));
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

app.get('/api/stock-logs', authMiddleware, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM stock_logs ORDER BY timestamp DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('[DB ERROR]', err.message);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Serve static files from Vite's build directory
app.use(express.static(path.join(rootDir, 'dist')));

// SPA Fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path === '/health') {
    return res.status(404).json({ error: 'Not Found' });
  }
  const indexPath = path.join(rootDir, 'dist', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('[ERROR] Failed to send index.html:', err.message);
      res.status(500).send('Frontend build not found. Please run build first.');
    }
  });
});

// Explicitly bind to 0.0.0.0
app.listen(port, '0.0.0.0', () => {
  console.log(`[SUCCESS] Server listening on 0.0.0.0:${port}`);
});
