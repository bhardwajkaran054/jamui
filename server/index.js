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
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) {
      console.error('[DB ERROR]', err.message);
      return res.status(500).json({ error: 'Database Error' });
    }
    res.json(rows);
  });
});

app.get('/api/categories', (req, res) => {
  db.all('SELECT DISTINCT category FROM products', [], (err, rows) => {
    if (err) {
      console.error('[DB ERROR]', err.message);
      return res.status(500).json({ error: 'Database Error' });
    }
    const categories = ['All', ...rows.map(row => row.category)];
    res.json(categories);
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM admins WHERE username = ?', [username], (err, admin) => {
    if (err) return res.status(500).json({ error: 'Database Error' });
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: admin.username });
  });
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

app.post('/api/products', authMiddleware, (req, res) => {
  const { id, name, price, unit, category, emoji, stock } = req.body;
  if (id) {
    const sql = `UPDATE products SET name = ?, price = ?, unit = ?, category = ?, emoji = ?, stock = ? WHERE id = ?`;
    db.run(sql, [name, price, unit, category, emoji, stock, id], function(err) {
      if (err) return res.status(500).json({ error: 'Update failed' });
      res.json({ message: 'Updated', id });
    });
  } else {
    const sql = `INSERT INTO products (name, price, unit, category, emoji, stock) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [name, price, unit, category, emoji, stock], function(err) {
      if (err) return res.status(500).json({ error: 'Create failed' });
      res.json({ message: 'Created', id: this.lastID });
    });
  }
});

app.delete('/api/products/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', req.params.id, function(err) {
    if (err) return res.status(500).json({ error: 'Delete failed' });
    res.json({ message: 'Deleted' });
  });
});

app.post('/api/orders', (req, res) => {
  const { items, total } = req.body;
  db.serialize(() => {
    db.run(`INSERT INTO orders (items, total) VALUES (?, ?)`, [JSON.stringify(items), total], function(err) {
      if (err) return res.status(500).json({ error: 'Order failed' });
      const stmt = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
      items.forEach(item => stmt.run(item.quantity, item.id));
      stmt.finalize();
      res.json({ message: 'Success', id: this.lastID });
    });
  });
});

app.get('/api/orders', authMiddleware, (req, res) => {
  db.all('SELECT * FROM orders ORDER BY timestamp DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Fetch failed' });
    res.json(rows.map(row => ({ ...row, items: JSON.parse(row.items) })));
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Serve static files from Vite's build directory
app.use(express.static(path.join(rootDir, 'dist')));

// SPA Fallback
app.get('*', (req, res) => {
  // Don't fallback for API routes or health check
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
