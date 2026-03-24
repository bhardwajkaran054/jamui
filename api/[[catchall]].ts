import { initDb, sql } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const JWT_SECRET = process.env.JWT_SECRET || 'jamui_secret_123';

async function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return sql(url);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const path = (req.url || '').replace('/api', '');

  try {
    const db = await getDb();

    // GET /products
    if (path === '/products' && req.method === 'GET') {
      const products = await db`SELECT * FROM products ORDER BY id`;
      res.json({ products, settings: {} });
      return;
    }

    // GET /categories  
    if (path === '/categories' && req.method === 'GET') {
      const cats = await db`SELECT DISTINCT category FROM products ORDER BY category`;
      res.json(['All', ...cats.map((r: any) => r.category)]);
      return;
    }

    // Default - not found
    res.status(404).json({ error: 'Not found' });
  } catch (err: any) {
    console.error('API Error:', err);
    res.status(500).json({ error: err.message });
  }
}