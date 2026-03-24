import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'jamui_secret_123';

function getSql() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (!dbUrl) {
    console.error('[API] No database URL. DATABASE_URL:', !!process.env.DATABASE_URL, 'POSTGRES_URL:', !!process.env.POSTGRES_URL);
    throw new Error('DATABASE_URL not set');
  }
  return neon(dbUrl);
}

function authenticate(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const token = authHeader.slice(7);
  return jwt.verify(token, JWT_SECRET);
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname.replace('/api', '');

  console.log('[API] Request:', path, req.method);

  try {
    const sql = getSql();

    if (path === '/products' && req.method === 'GET') {
      const products = await sql('SELECT * FROM products ORDER BY id');
      return Response.json({ products, settings: {} });
    }

    if (path === '/categories' && req.method === 'GET') {
      const cats = await sql('SELECT DISTINCT category FROM products ORDER BY category');
      return Response.json(['All', ...cats.map((r: any) => r.category)]);
    }

    if (path === '/login' && req.method === 'POST') {
      const { username, password } = await req.json() as { username: string; password: string };
      const admins = await sql('SELECT * FROM admins WHERE username = $1', [username]);
      if (admins.length === 0) {
        return Response.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      const admin = admins[0];
      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) {
        return Response.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
      return Response.json({ token, username: admin.username });
    }

    if (path === '/orders' && req.method === 'GET') {
      authenticate(req.headers.get('authorization'));
      const orders = await sql('SELECT * FROM orders ORDER BY id DESC');
      return Response.json(orders);
    }

    if (path === '/orders' && req.method === 'POST') {
      const { customer, items, total } = await req.json() as { 
        customer: { name: string; phone: string }; 
        items: any[]; 
        total: number 
      };
      const result = await sql(
        'INSERT INTO orders (customer_name, customer_phone, items, total) VALUES ($1, $2, $3, $4) RETURNING id',
        [customer.name, customer.phone, JSON.stringify(items), total]
      );
      return Response.json({ order: { id: result[0].id } });
    }

    if (path.startsWith('/orders/') && req.method === 'PUT') {
      authenticate(req.headers.get('authorization'));
      const id = path.split('/')[2];
      const { status, deliveryHours, deliveryMessage, rejectionReason } = await req.json() as {
        status: string;
        deliveryHours?: number;
        deliveryMessage?: string;
        rejectionReason?: string;
      };
      await sql(
        'UPDATE orders SET status = $1, delivery_hours = $2, delivery_message = $3, rejection_reason = $4 WHERE id = $5',
        [status, deliveryHours || null, deliveryMessage || null, rejectionReason || null, id]
      );
      return Response.json({ success: true });
    }

    if (path === '/promo-codes' && req.method === 'GET') {
      const codes = await sql('SELECT * FROM promo_codes');
      return Response.json(codes);
    }

    if (path === '/notices' && req.method === 'GET') {
      const notices = await sql('SELECT * FROM notices WHERE active = true LIMIT 1');
      if (notices.length > 0) {
        return Response.json({ text: notices[0].text, active: true });
      }
      return Response.json({ text: '', active: false });
    }

    if (path === '/delivery-zones' && req.method === 'GET') {
      const zones = await sql('SELECT * FROM delivery_zones');
      return Response.json(zones);
    }

    if (path === '/setup-admin' && req.method === 'POST') {
      const { username, password } = await req.json() as { username: string; password: string };
      const hash = await bcrypt.hash(password, 10);
      await sql(
        'INSERT INTO admins (username, password) VALUES ($1, $2) ON CONFLICT (username) DO UPDATE SET password = $2',
        [username, hash]
      );
      return Response.json({ success: true });
    }

    if (path === '/setup-db' && req.method === 'POST') {
      await sql`CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, price DECIMAL(10,2) NOT NULL, unit VARCHAR(50), category VARCHAR(100), emoji VARCHAR(10), in_stock BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW())`;
      await sql`CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, customer_name VARCHAR(255), customer_phone VARCHAR(50), items JSONB, total DECIMAL(10,2), status VARCHAR(50) DEFAULT 'pending', delivery_hours INTEGER, delivery_message TEXT, rejection_reason TEXT, created_at TIMESTAMP DEFAULT NOW())`;
      await sql`CREATE TABLE IF NOT EXISTS promo_codes (id SERIAL PRIMARY KEY, code VARCHAR(50) UNIQUE, discount DECIMAL(10,2), type VARCHAR(20) DEFAULT 'percentage', active BOOLEAN DEFAULT true)`;
      await sql`CREATE TABLE IF NOT EXISTS notices (id SERIAL PRIMARY KEY, text TEXT, active BOOLEAN DEFAULT false)`;
      await sql`CREATE TABLE IF NOT EXISTS delivery_zones (id SERIAL PRIMARY KEY, name VARCHAR(100), fee DECIMAL(10,2), min_order DECIMAL(10,2))`;
      await sql`CREATE TABLE IF NOT EXISTS admins (id SERIAL PRIMARY KEY, username VARCHAR(100) UNIQUE, password VARCHAR(255))`;
      
      const products = await sql`SELECT COUNT(*) as count FROM products`;
      if (parseInt(products[0].count) === 0) {
        await sql`INSERT INTO products (name, price, unit, category, emoji) VALUES ('Kasturi Rice 26 kg', 830, '26kg', 'Rice', '🌾'), ('Kasturi Rice 1 kg', 35, '1kg', 'Rice', '🌾'), ('Vardhman Mini Kit 26 kg', 1320, '26kg', 'Rice', '🌾'), ('Fortune Mini Kit 26 kg', 1430, '26kg', 'Rice', '🌾'), ('Fortune Mini Kit 1 kg', 58, '1kg', 'Rice', '🌾'), ('Refined Oil 1 Liter', 135, '1L', 'Oil', '🫙'), ('Mustard Oil 1 Liter', 170, '1L', 'Oil', '🫙'), ('Toor Dal 1 kg', 125, '1kg', 'Dal', '🫘'), ('Dalmia Gold 250 gm', 110, '250gm', 'Dal', '🫘'), ('Sugar 1 kg', 48, '1kg', 'Atta & Sugar', '🍬'), ('Aashirvaad Atta 5 kg', 235, '5kg', 'Atta & Sugar', '🌿'), ('Loose Atta 1 kg', 35, '1kg', 'Atta & Sugar', '🌿'), ('Chana Dal 1 kg', 80, '1kg', 'Dal', '🫘'), ('Kabuli Chana 1 kg', 110, '1kg', 'Dal', '🫘'), ('Atta 26 kg', 850, '26kg', 'Atta & Sugar', '🌿')`;
      }
      
      const promoCount = await sql`SELECT COUNT(*) as count FROM promo_codes`;
      if (parseInt(promoCount[0].count) === 0) {
        await sql`INSERT INTO promo_codes (code, discount, type) VALUES ('WELCOME10', 10, 'percentage'), ('FIRST5', 5, 'percentage')`;
      }
      
      const adminCount = await sql`SELECT COUNT(*) as count FROM admins`;
      if (parseInt(adminCount[0].count) === 0) {
        const hash = await bcrypt.hash('admin123', 10);
        await sql`INSERT INTO admins (username, password) VALUES ('admin', ${hash})`;
      }
      
      return Response.json({ success: true, message: 'Database initialized' });
    }

    if (path === '/health' && req.method === 'GET') {
      return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    return Response.json({ error: 'Not found', path }, { status: 404 });
  } catch (err: any) {
    console.error('[API] Error:', err.message);
    return Response.json({ error: err.message }, { status: err.message === 'Unauthorized' ? 401 : 500 });
  }
}
