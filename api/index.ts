import { neon } from '@neondatabase/serverless';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname.replace('/api', '');

  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    if (path === '/products' && req.method === 'GET') {
      const products = await sql('SELECT * FROM products ORDER BY id');
      return Response.json({ products, settings: {} });
    }
    
    if (path === '/categories' && req.method === 'GET') {
      const cats = await sql('SELECT DISTINCT category FROM products ORDER BY category');
      return Response.json(['All', ...cats.map((r: any) => r.category)]);
    }
    
    return Response.json({ error: 'Not found' }, { status: 404 });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}