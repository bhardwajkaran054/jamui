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
  const { items, total, customer, promoCode, deliveryFee } = req.body;
  db.serialize(() => {
    db.run(
      `INSERT INTO orders (items, total, customer, promoCode, deliveryFee) VALUES (?, ?, ?, ?, ?)`, 
      [JSON.stringify(items), total, JSON.stringify(customer), promoCode, deliveryFee], 
      function(err) {
        if (err) {
          console.error('[DB ERROR]', err.message);
          return res.status(500).json({ error: 'Order failed' });
        }
        res.json({ message: 'Success', id: this.lastID });
      }
    );
  });
});

app.get('/api/orders', authMiddleware, (req, res) => {
  db.all('SELECT * FROM orders ORDER BY timestamp DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Fetch failed' });
    res.json(rows.map(row => ({ 
      ...row, 
      items: JSON.parse(row.items),
      customer: JSON.parse(row.customer || '{}')
    })));
  });
});

// Public: Fetch single order by ID for tracking
app.get('/api/orders/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM orders WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database Error' });
    if (!row) return res.status(404).json({ error: 'Order not found' });
    
    res.json({ 
      ...row, 
      items: JSON.parse(row.items),
      customer: JSON.parse(row.customer || '{}')
    });
  });
});

// Public: Fetch order history by phone (requires matching one valid order ID for "verification")
app.get('/api/orders/history/:phone', (req, res) => {
  const phone = req.params.phone;
  const verifyId = req.query.verifyId; // Optional security check
  
  db.all('SELECT * FROM orders WHERE customer LIKE ? ORDER BY timestamp DESC', [`%${phone}%`], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database Error' });
    
    const parsedRows = rows.map(row => ({
      ...row,
      items: JSON.parse(row.items),
      customer: JSON.parse(row.customer || '{}')
    })).filter(row => row.customer.phone && row.customer.phone.includes(phone));

    if (verifyId) {
      const ownsOne = parsedRows.some(o => 
        o.id.toString() === verifyId || 
        o.id.toString().endsWith(verifyId)
      );
      if (!ownsOne) return res.status(403).json({ error: 'Verification failed' });
    }

    res.json(parsedRows);
  });
});

app.put('/api/orders/:id', authMiddleware, (req, res) => {
  const { status, estimatedDelivery, rejectReason } = req.body;
  const id = req.params.id;
  
  // 1. Get the current order and its items
  db.get('SELECT items, status FROM orders WHERE id = ?', [id], (err, order) => {
    if (err || !order) return res.status(404).json({ error: 'Order not found' });
    
    const items = JSON.parse(order.items);
    
    // 2. If transitioning to 'completed' (approved)
    if (status === 'completed' && order.status !== 'completed') {
      db.serialize(() => {
        const stmt = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
        const logStmt = db.prepare("INSERT INTO stock_logs (productId, productName, oldStock, newStock, reason) VALUES (?, ?, ?, ?, ?)");
        
        items.forEach(item => {
          db.get('SELECT name, stock FROM products WHERE id = ?', [item.id], (err, product) => {
            if (product) {
              const oldStock = product.stock;
              const newStock = Math.max(0, oldStock - item.quantity);
              stmt.run(item.quantity, item.id);
              logStmt.run(item.id, product.name, oldStock, newStock, `Order Approved (#JM-${id.toString().slice(-6)})`);
            }
          });
        });
        
        stmt.finalize();
        logStmt.finalize();
      });
    }

    // 3. Update the order record
    const sql = `UPDATE orders SET status = ?, estimatedDelivery = ?, rejectReason = ? WHERE id = ?`;
    db.run(sql, [status, estimatedDelivery, rejectReason, id], function(err) {
      if (err) return res.status(500).json({ error: 'Update failed' });
      res.json({ success: true });
    });
  });
});

app.delete('/api/orders/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM orders WHERE id = ?', req.params.id, function(err) {
    if (err) return res.status(500).json({ error: 'Delete failed' });
    res.json({ success: true });
  });
});

// Promo Codes
app.get('/api/promo-codes', (req, res) => {
  db.all('SELECT * FROM promo_codes', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Fetch failed' });
    res.json(rows);
  });
});

app.post('/api/promo-codes', authMiddleware, (req, res) => {
  const { code, discount, type, minOrder } = req.body;
  const sql = `INSERT OR REPLACE INTO promo_codes (code, discount, type, minOrder) VALUES (?, ?, ?, ?)`;
  db.run(sql, [code, discount, type, minOrder], function(err) {
    if (err) return res.status(500).json({ error: 'Save failed' });
    res.json({ success: true });
  });
});

app.delete('/api/promo-codes/:code', authMiddleware, (req, res) => {
  db.run('DELETE FROM promo_codes WHERE code = ?', req.params.code, function(err) {
    if (err) return res.status(500).json({ error: 'Delete failed' });
    res.json({ success: true });
  });
});

// Notices
app.get('/api/notices', (req, res) => {
  db.get('SELECT * FROM notices WHERE id = 1', [], (err, row) => {
    if (err) return res.status(500).json({ error: 'Fetch failed' });
    res.json(row || { text: '', active: 0 });
  });
});

app.post('/api/notices', authMiddleware, (req, res) => {
  const { text, active } = req.body;
  const sql = `INSERT OR REPLACE INTO notices (id, text, active) VALUES (1, ?, ?)`;
  db.run(sql, [text, active ? 1 : 0], function(err) {
    if (err) return res.status(500).json({ error: 'Save failed' });
    res.json({ success: true });
  });
});

// Delivery Zones
app.get('/api/delivery-zones', (req, res) => {
  db.all('SELECT * FROM delivery_zones', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Fetch failed' });
    res.json(rows);
  });
});

app.post('/api/delivery-zones', authMiddleware, (req, res) => {
  const { name, fee, minOrder } = req.body;
  const sql = `INSERT OR REPLACE INTO delivery_zones (name, fee, minOrder) VALUES (?, ?, ?)`;
  db.run(sql, [name, fee, minOrder], function(err) {
    if (err) return res.status(500).json({ error: 'Save failed' });
    res.json({ success: true });
  });
});

app.delete('/api/delivery-zones/:name', authMiddleware, (req, res) => {
  db.run('DELETE FROM delivery_zones WHERE name = ?', decodeURIComponent(req.params.name), function(err) {
    if (err) return res.status(500).json({ error: 'Delete failed' });
    res.json({ success: true });
  });
});

// Customers
app.get('/api/customers', authMiddleware, (req, res) => {
  // Generate customer list from orders
  db.all('SELECT customer, total, timestamp, status FROM orders', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Fetch failed' });
    
    const customersMap = {};
    rows.forEach(row => {
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
  });
});

// Stock Logs
app.get('/api/stock-logs', authMiddleware, (req, res) => {
  db.all('SELECT * FROM stock_logs ORDER BY timestamp DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Fetch failed' });
    res.json(rows);
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
