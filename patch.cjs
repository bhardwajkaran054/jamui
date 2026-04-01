const fs = require('fs');

const localPath = 'api/local-server.ts';
const indexPath = 'api/index.ts';

let localContent = fs.readFileSync(localPath, 'utf8');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Fix SQLite parsing for Order items
localContent = localContent.replace(
  `const isSelect = /^\\s*SELECT\\b/i.test(query) || /\\bRETURNING\\b/i.test(query);\n      if (isSelect) {\n        db.all(query, values, (err, rows) => {\n          if (err) reject(err); else resolve(rows || []);\n        });`,
  `const isSelect = /^\\s*SELECT\\b/i.test(query) || /\\bRETURNING\\b/i.test(query);\n      if (isSelect) {\n        db.all(query, values, (err, rows) => {\n          if (err) return reject(err);\n          const parsed = rows.map(r => {\n            const pr = {...r};\n            if(typeof pr.items === 'string') { try { pr.items = JSON.parse(pr.items); } catch(e){} }\n            return pr;\n          });\n          resolve(parsed);\n        });`
);

const localEndpoints = `
app.post('/api/products', authenticate, async (req, res) => {
  try {
    const { id, name, price, unit, category, emoji, stock, image } = req.body;
    if (id) {
      await sql\`UPDATE products SET name=\${name}, price=\${price}, unit=\${unit}, category=\${category}, emoji=\${emoji}, stock=\${stock || 100}, image=\${image || null} WHERE id=\${id}\`;
    } else {
      await sql\`INSERT INTO products (name, price, unit, category, emoji, stock, image) VALUES (\${name}, \${price}, \${unit}, \${category}, \${emoji}, \${stock || 100}, \${image || null})\`;
    }
    res.json({success:true});
  } catch(err: any) { res.status(500).json({error: err.message}); }
});
app.delete('/api/products/:id', authenticate, async (req, res) => {
  try { await sql\`DELETE FROM products WHERE id=\${req.params.id}\`; res.json({success:true}); } catch(err: any) { res.status(500).json({error: err.message}); }
});
app.delete('/api/categories/:name', authenticate, async (req, res) => {
  try { await sql\`UPDATE products SET category='Other' WHERE category=\${req.params.name}\`; res.json({success:true}); } catch(err: any) { res.status(500).json({error: err.message}); }
});
app.post('/api/categories', authenticate, (req, res) => res.json({success:true}));
app.post('/api/notices', authenticate, async (req, res) => {
  try {
    await sql\`UPDATE notices SET active=false\`;
    await sql\`INSERT INTO notices (text, active) VALUES (\${req.body.text}, true)\`;
    res.json({success:true});
  } catch(err: any) { res.status(500).json({error: err.message}); }
});
app.post('/api/promo-codes', authenticate, async (req, res) => {
  try {
    await sql\`INSERT INTO promo_codes (code, discount, type) VALUES (\${req.body.code}, \${req.body.discount}, 'percentage')\`;
    res.json({success:true});
  } catch(err: any) { res.status(500).json({error: err.message}); }
});
app.delete('/api/promo-codes/:code', authenticate, async (req, res) => {
  try { await sql\`DELETE FROM promo_codes WHERE code=\${req.params.code}\`; res.json({success:true}); } catch(err: any) { res.status(500).json({error: err.message}); }
});
app.delete('/api/delivery-zones/:name', authenticate, async (req, res) => {
  try { await sql\`DELETE FROM delivery_zones WHERE name=\${req.params.name}\`; res.json({success:true}); } catch(err: any) { res.status(500).json({error: err.message}); }
});
app.post('/api/delivery-zones', authenticate, async (req, res) => {
  try { await sql\`INSERT INTO delivery_zones (name, fee) VALUES (\${req.body.name}, \${req.body.fee})\`; res.json({success:true}); } catch(err: any) { res.status(500).json({error: err.message}); }
});
app.delete('/api/orders/:id', authenticate, async (req, res) => {
  try { await sql\`DELETE FROM orders WHERE id=\${req.params.id}\`; res.json({success:true}); } catch(err: any) { res.status(500).json({error: err.message}); }
});
app.get('/api/settings', async (req, res) => {
  try { const r = await sql\`SELECT * FROM settings ORDER BY id DESC LIMIT 1\`; res.json(r[0] || {publicOrderToken:''}); } catch(err) { res.json({publicOrderToken:''}); }
});
app.post('/api/settings', authenticate, async (req, res) => {
  try { await sql\`INSERT INTO settings (public_order_token) VALUES (\${req.body.publicOrderToken})\`; res.json({success:true}); } catch(err: any) { res.status(500).json({error: err.message}); }
});
app.get('/api/drivers', async (req, res) => {
  try { const r = await sql\`SELECT * FROM drivers\`; res.json(r); } catch(err) { res.json([]); }
});
app.post('/api/drivers', authenticate, async (req, res) => {
  try { await sql\`INSERT INTO drivers (name, phone, status) VALUES (\${req.body.name}, \${req.body.phone}, \${req.body.status})\`; res.json({success:true}); } catch(err: any) { res.status(500).json({error: err.message}); }
});
app.delete('/api/drivers/:id', authenticate, async (req, res) => {
  try { await sql\`DELETE FROM drivers WHERE id=\${req.params.id}\`; res.json({success:true}); } catch(err: any) { res.status(500).json({error: err.message}); }
});
app.get('/api/customers', async (req, res) => {
  try { const r = await sql\`SELECT * FROM customers\`; res.json(r); } catch(err) { res.json([]); }
});
app.get('/api/stock-logs', async (req, res) => {
  try { const r = await sql\`SELECT * FROM stock_logs\`; res.json(r); } catch(err) { res.json([]); }
});
`;

if(!localContent.includes('/api/products/:id')) {
  localContent = localContent.replace('app.listen(PORT, async () => {', localEndpoints + '\napp.listen(PORT, async () => {');
}

const newTables = `
    try { await sql\`ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 100\`; } catch(e) {}
    try { await sql\`ALTER TABLE products ADD COLUMN image TEXT\`; } catch(e) {}
    await sql\`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, public_order_token TEXT)\`;
    await sql\`CREATE TABLE IF NOT EXISTS drivers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, status TEXT)\`;
    await sql\`CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, loyalty_points INTEGER DEFAULT 0, total_spent REAL DEFAULT 0, order_count INTEGER DEFAULT 0)\`;
    await sql\`CREATE TABLE IF NOT EXISTS stock_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, change INTEGER, reason TEXT, created_at TEXT)\`;
`;
if(!localContent.includes('ALTER TABLE products')) {
  localContent = localContent.replace("const existing = await sql`SELECT COUNT(*) as count FROM products`;", newTables + "\n    const existing = await sql`SELECT COUNT(*) as count FROM products`;");
}

fs.writeFileSync(localPath, localContent);

const indexEndpoints = `
    if (path === '/products' && req.method === 'POST') {
      authenticate(req.headers.get('authorization'));
      const { id, name, price, unit, category, emoji, stock, image } = await req.json() as any;
      if (id) {
        await sql('UPDATE products SET name=$1, price=$2, unit=$3, category=$4, emoji=$5, stock=$6, image=$7 WHERE id=$8', [name, price, unit, category, emoji, stock || 100, image || null, id]);
      } else {
        await sql('INSERT INTO products (name, price, unit, category, emoji, stock, image) VALUES ($1, $2, $3, $4, $5, $6, $7)', [name, price, unit, category, emoji, stock || 100, image || null]);
      }
      return Response.json({success:true});
    }
    if (path.startsWith('/products/') && req.method === 'DELETE') {
      authenticate(req.headers.get('authorization'));
      await sql('DELETE FROM products WHERE id=$1', [path.split('/')[2]]);
      return Response.json({success:true});
    }
    if (path === '/categories' && req.method === 'POST') {
      authenticate(req.headers.get('authorization'));
      return Response.json({success:true});
    }
    if (path.startsWith('/categories/') && req.method === 'DELETE') {
      authenticate(req.headers.get('authorization'));
      await sql("UPDATE products SET category='Other' WHERE category=$1", [decodeURIComponent(path.split('/')[2])]);
      return Response.json({success:true});
    }
    if (path === '/notices' && req.method === 'POST') {
      authenticate(req.headers.get('authorization'));
      const { text } = await req.json() as any;
      await sql('UPDATE notices SET active=false');
      await sql('INSERT INTO notices (text, active) VALUES ($1, true)', [text]);
      return Response.json({success:true});
    }
    if (path === '/promo-codes' && req.method === 'POST') {
        authenticate(req.headers.get('authorization'));
        const {code, discount} = await req.json() as any;
        await sql('INSERT INTO promo_codes (code, discount, type) VALUES ($1, $2, $3)', [code, discount, 'percentage']);
        return Response.json({success:true});
    }
    if (path.startsWith('/promo-codes/') && req.method === 'DELETE') {
        authenticate(req.headers.get('authorization'));
        await sql('DELETE FROM promo_codes WHERE code=$1', [path.split('/')[2]]);
        return Response.json({success:true});
    }
    if (path === '/delivery-zones' && req.method === 'POST') {
        authenticate(req.headers.get('authorization'));
        const {name, fee} = await req.json() as any;
        await sql('INSERT INTO delivery_zones (name, fee) VALUES ($1, $2)', [name, fee]);
        return Response.json({success:true});
    }
    if (path.startsWith('/delivery-zones/') && req.method === 'DELETE') {
        authenticate(req.headers.get('authorization'));
        await sql('DELETE FROM delivery_zones WHERE name=$1', [decodeURIComponent(path.split('/')[2])]);
        return Response.json({success:true});
    }
    if (path.startsWith('/orders/') && req.method === 'DELETE') {
        authenticate(req.headers.get('authorization'));
        await sql('DELETE FROM orders WHERE id=$1', [path.split('/')[2]]);
        return Response.json({success:true});
    }
    if (path === '/settings' && req.method === 'GET') {
        try { const r = await sql('SELECT * FROM settings ORDER BY id DESC LIMIT 1'); return Response.json(r[0] || {publicOrderToken:''}); } catch(e) { return Response.json({publicOrderToken:''}); }
    }
    if (path === '/settings' && req.method === 'POST') {
        authenticate(req.headers.get('authorization'));
        const {publicOrderToken} = await req.json() as any;
        await sql('INSERT INTO settings (public_order_token) VALUES ($1)', [publicOrderToken]);
        return Response.json({success:true});
    }
    if (path === '/drivers' && req.method === 'GET') {
        try { const r = await sql('SELECT * FROM drivers'); return Response.json(r); } catch(e) { return Response.json([]); }
    }
    if (path === '/drivers' && req.method === 'POST') {
        authenticate(req.headers.get('authorization'));
        const {name, phone, status} = await req.json() as any;
        await sql('INSERT INTO drivers (name, phone, status) VALUES ($1, $2, $3)', [name, phone, status]);
        return Response.json({success:true});
    }
    if (path.startsWith('/drivers/') && req.method === 'DELETE') {
        authenticate(req.headers.get('authorization'));
        await sql('DELETE FROM drivers WHERE id=$1', [path.split('/')[2]]);
        return Response.json({success:true});
    }
    if (path === '/customers' && req.method === 'GET') {
        try { const r = await sql('SELECT * FROM customers'); return Response.json(r); } catch(e) { return Response.json([]); }
    }
    if (path === '/stock-logs' && req.method === 'GET') {
        try { const r = await sql('SELECT * FROM stock_logs'); return Response.json(r); } catch(e) { return Response.json([]); }
    }
`;

if(!indexContent.includes('/products/:id')) {
  indexContent = indexContent.replace("if (path === '/health' && req.method === 'GET') {", indexEndpoints + "\n    if (path === '/health' && req.method === 'GET') {");
}

const indexNewTables = `
      try { await sql('ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 100'); } catch(e) {}
      try { await sql('ALTER TABLE products ADD COLUMN image TEXT'); } catch(e) {}
      await sql('CREATE TABLE IF NOT EXISTS settings (id SERIAL PRIMARY KEY, public_order_token TEXT)');
      await sql('CREATE TABLE IF NOT EXISTS drivers (id SERIAL PRIMARY KEY, name TEXT, phone TEXT, status TEXT)');
      await sql('CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY, name TEXT, phone TEXT, loyalty_points INTEGER DEFAULT 0, total_spent REAL DEFAULT 0, order_count INTEGER DEFAULT 0)');
      await sql('CREATE TABLE IF NOT EXISTS stock_logs (id SERIAL PRIMARY KEY, product_id INTEGER, change INTEGER, reason TEXT, created_at TIMESTAMP DEFAULT NOW())');
`;
if(!indexContent.includes('ALTER TABLE products')) {
  indexContent = indexContent.replace("const products = await sql`SELECT COUNT(*) as count FROM products`;", indexNewTables + "\n      const products = await sql`SELECT COUNT(*) as count FROM products`;");
}

fs.writeFileSync(indexPath, indexContent);
console.log('Patch complete.');
