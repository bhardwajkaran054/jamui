import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

let sql: any;
if (process.env.DATABASE_URL) {
  sql = neon(process.env.DATABASE_URL);
} else {
  console.log('Using local SQLite fallback');
  const db = new sqlite3.Database('database.sqlite');
  sql = function(strings: TemplateStringsArray, ...values: any[]) {
    return new Promise((resolve, reject) => {
      let query = strings.reduce((acc, str, i) => acc + str + (i < values.length ? '?' : ''), '');
      
      // SQLite specific replaces for Neon PostgreSQL schema
      query = query.replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT');
      query = query.replace(/JSONB/g, 'TEXT');
      query = query.replace(/NOW\(\)/g, 'CURRENT_TIMESTAMP');
      
      const isSelect = /^\s*SELECT\b/i.test(query) || /\bRETURNING\b/i.test(query);
      if (isSelect) {
        db.all(query, values, (err, rows) => {
          if (err) reject(err); else resolve(rows || []);
        });
      } else {
        db.run(query, values, function(err) {
          if (err) reject(err); else resolve([{ id: this.lastID }]);
        });
      }
    });
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'jamui_secret_123';

async function initDb() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        unit VARCHAR(50),
        category VARCHAR(100),
        emoji VARCHAR(10),
        in_stock BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        items JSONB,
        total DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'pending',
        delivery_hours INTEGER,
        delivery_message TEXT,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE,
        discount DECIMAL(10,2),
        type VARCHAR(20) DEFAULT 'percentage',
        active BOOLEAN DEFAULT true
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS notices (
        id SERIAL PRIMARY KEY,
        text TEXT,
        active BOOLEAN DEFAULT false
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS delivery_zones (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        fee DECIMAL(10,2),
        min_order DECIMAL(10,2)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE,
        password VARCHAR(255)
      )
    `;

    const existing = await sql`SELECT COUNT(*) as count FROM products`;
    if (parseInt(existing[0].count) === 0) {
      await sql`
        INSERT INTO products (name, price, unit, category, emoji) VALUES
        ('Kasturi Rice 26 kg', 830, '26kg', 'Rice', '🌾'),
        ('Kasturi Rice 1 kg', 35, '1kg', 'Rice', '🌾'),
        ('Vardhman Mini Kit 26 kg', 1320, '26kg', 'Rice', '🌾'),
        ('Fortune Mini Kit 26 kg', 1430, '26kg', 'Rice', '🌾'),
        ('Fortune Mini Kit 1 kg', 58, '1kg', 'Rice', '🌾'),
        ('Refined Oil 1 Liter', 135, '1L', 'Oil', '🫙'),
        ('Mustard Oil 1 Liter', 170, '1L', 'Oil', '🫙'),
        ('Toor Dal 1 kg', 125, '1kg', 'Dal', '🫘'),
        ('Dalmia Gold 250 gm', 110, '250gm', 'Dal', '🫘'),
        ('Sugar 1 kg', 48, '1kg', 'Atta & Sugar', '🍬'),
        ('Aashirvaad Atta 5 kg', 235, '5kg', 'Atta & Sugar', '🌿'),
        ('Loose Atta 1 kg', 35, '1kg', 'Atta & Sugar', '🌿'),
        ('Chana Dal 1 kg', 80, '1kg', 'Dal', '🫘'),
        ('Kabuli Chana 1 kg', 110, '1kg', 'Dal', '🫘'),
        ('Atta 26 kg', 850, '26kg', 'Atta & Sugar', '🌿')
      `;
    }

    const promoCount = await sql`SELECT COUNT(*) as count FROM promo_codes`;
    if (parseInt(promoCount[0].count) === 0) {
      await sql`
        INSERT INTO promo_codes (code, discount, type) VALUES
        ('WELCOME10', 10, 'percentage'),
        ('FIRST5', 5, 'percentage')
      `;
    }

    const adminCount = await sql`SELECT COUNT(*) as count FROM admins`;
    if (parseInt(adminCount[0].count) === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await sql`INSERT INTO admins (username, password) VALUES ('admin', ${hash})`;
    }

    console.log('Database initialized');
  } catch (err) {
    console.error('DB init error:', err);
  }
}

function authenticate(req: express.Request, res: express.Response, next: Function) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/api/products', async (req, res) => {
  try {
    const products = await sql`SELECT * FROM products ORDER BY id`;
    res.json({ products, settings: {} });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const cats = await sql`SELECT DISTINCT category FROM products ORDER BY category`;
    res.json(['All', ...cats.map((r: any) => r.category)]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admins = await sql`SELECT * FROM admins WHERE username = ${username}`;
    if (admins.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const admin = admins[0];
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: admin.username });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await sql`SELECT * FROM orders ORDER BY id DESC`;
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customer, items, total } = req.body;
    const result = await sql`
      INSERT INTO orders (customer_name, customer_phone, items, total)
      VALUES (${customer.name}, ${customer.phone}, ${JSON.stringify(items)}, ${total})
      RETURNING id
    `;
    res.json({ order: { id: result[0].id } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, deliveryHours, deliveryMessage, rejectionReason } = req.body;
    await sql`
      UPDATE orders SET 
        status = ${status},
        delivery_hours = ${deliveryHours || null},
        delivery_message = ${deliveryMessage || null},
        rejection_reason = ${rejectionReason || null}
      WHERE id = ${id}
    `;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/promo-codes', async (req, res) => {
  try {
    const codes = await sql`SELECT * FROM promo_codes`;
    res.json(codes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notices', async (req, res) => {
  try {
    const notices = await sql`SELECT * FROM notices WHERE active = true LIMIT 1`;
    if (notices.length > 0) {
      res.json({ text: notices[0].text, active: true });
    } else {
      res.json({ text: '', active: false });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/delivery-zones', async (req, res) => {
  try {
    const zones = await sql`SELECT * FROM delivery_zones`;
    res.json(zones);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/setup-admin', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await sql`
      INSERT INTO admins (username, password) VALUES (${username}, ${hash})
      ON CONFLICT (username) DO UPDATE SET password = ${hash}
    `;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, async () => {
  console.log(`🚀 Local server running at http://localhost:${PORT}`);
  await initDb();
});
