import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname.replace('/api', '');

  console.log('[API] Request:', path);

  if (!process.env.DATABASE_URL) {
    return Response.json({ error: 'DATABASE_URL not set' }, { status: 500 });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    
    if (path === '/products' && req.method === 'GET') {
      const products = await sql('SELECT * FROM products ORDER BY id');
      return Response.json({ products, settings: {} });
    }
    
    if (path === '/categories' && req.method === 'GET') {
      const cats = await sql('SELECT DISTINCT category FROM products ORDER BY category');
      return Response.json(['All', ...cats.map((r: any) => r.category)]);
    }
    
    return Response.json({ error: 'Not found', path }, { status: 404 });
  } catch (err: any) {
    console.error('[API] Error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}