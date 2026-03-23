import { loadDb, saveDb } from './db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'jamui_secret_123';

// In-memory store for admin sessions (reset on cold starts)
const adminSessions = new Map();

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];
  const path = url.replace('/api', '');

  try {
    // GET /api/products
    if (path === '/products' && req.method === 'GET') {
      const db = loadDb();
      res.json({ products: db.products, settings: db.settings || {} });
      return;
    }

    // GET /api/categories
    if (path === '/categories' && req.method === 'GET') {
      const db = loadDb();
      res.json(['All', ...db.categories]);
      return;
    }

    // POST /api/login
    if (path === '/login' && req.method === 'POST') {
      const body = JSON.parse(await getRawBody(req));
      const { username, password } = body;
      const db = loadDb();
      const admin = db.admins.find(a => a.username === username);
      if (!admin || !bcrypt.compareSync(password, admin.password)) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Invalid credentials' }));
        return;
      }
      const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, username: admin.username });
      return;
    }

    // Auth middleware
    const token = req.headers.authorization?.split(' ')[1];
    let admin = null;
    if (token) {
      try {
        admin = jwt.verify(token, JWT_SECRET);
      } catch (e) {
        // Token invalid, continue without auth for public endpoints
      }
    }

    // POST /api/products (protected)
    if (path === '/products' && req.method === 'POST') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const body = JSON.parse(await getRawBody(req));
      const db = loadDb();
      const { id, name, price, unit, category, emoji, stock } = body;
      if (id) {
        const idx = db.products.findIndex(p => p.id === id);
        if (idx !== -1) {
          const oldStock = db.products[idx].stock || 0;
          if (oldStock !== stock) {
            db.stockLogs.unshift({
              id: Date.now(), productId: id, productName: name,
              oldStock, newStock: stock, reason: 'Manual Admin Update',
              timestamp: new Date().toISOString()
            });
          }
          db.products[idx] = { ...db.products[idx], name, price, unit, category, emoji, stock };
        }
      } else {
        const newId = Math.max(0, ...db.products.map(p => p.id)) + 1;
        db.products.push({ id: newId, name, price, unit, category, emoji, stock });
        db.stockLogs.unshift({
          id: Date.now(), productId: newId, productName: name,
          oldStock: 0, newStock: stock, reason: 'New Product Added',
          timestamp: new Date().toISOString()
        });
      }
      if (category && !db.categories.includes(category)) db.categories.push(category);
      saveDb(db);
      res.json({ success: true });
      return;
    }

    // DELETE /api/products/:id (protected)
    if (path.match(/^\/products\/\d+$/) && req.method === 'DELETE') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const id = parseInt(path.split('/')[2]);
      const db = loadDb();
      const product = db.products.find(p => p.id === id);
      if (product) {
        db.stockLogs.unshift({
          id: Date.now(), productId: id, productName: product.name,
          oldStock: product.stock || 0, newStock: 0, reason: 'Product Deleted',
          timestamp: new Date().toISOString()
        });
      }
      db.products = db.products.filter(p => p.id !== id);
      saveDb(db);
      res.json({ success: true });
      return;
    }

    // POST /api/orders
    if (path === '/orders' && req.method === 'POST') {
      const body = JSON.parse(await getRawBody(req));
      const { items, total, customer, promoCode, deliveryFee } = body;
      const db = loadDb();
      const orderId = Date.now();
      db.orders.unshift({
        id: orderId, items, total, customer, promoCode, deliveryFee,
        timestamp: new Date().toISOString(), status: 'pending'
      });
      saveDb(db);
      res.json({ success: true, order: db.orders[0] });
      return;
    }

    // GET /api/orders (protected)
    if (path === '/orders' && req.method === 'GET') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const db = loadDb();
      res.json(db.orders);
      return;
    }

    // PUT /api/orders/:id (protected)
    if (path.match(/^\/orders\/\d+$/) && req.method === 'PUT') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const id = parseInt(path.split('/')[2]);
      const body = JSON.parse(await getRawBody(req));
      const { status, deliveryMessage, rejectionReason, deliveryHours, driver, cancelReason } = body;
      const db = loadDb();
      const order = db.orders.find(o => o.id === id);
      if (order) {
        if (status === 'completed' && order.status !== 'completed') {
          order.items.forEach(item => {
            const product = db.products.find(p => p.id === item.id);
            if (product) {
              const oldStock = product.stock || 0;
              product.stock = Math.max(0, oldStock - item.quantity);
              db.stockLogs.unshift({
                id: Date.now() + Math.random(), productId: product.id,
                productName: product.name, oldStock, newStock: product.stock,
                reason: `Order Approved (#JM-${order.id.toString().slice(-6)})`,
                timestamp: new Date().toISOString()
              });
            }
          });
        }
        if (status) order.status = status;
        if (deliveryMessage) order.deliveryMessage = deliveryMessage;
        if (rejectionReason) order.rejectionReason = rejectionReason;
        if (deliveryHours) { order.deliveryHours = parseInt(deliveryHours); order.approvalTimestamp = new Date().toISOString(); }
        if (driver) order.driver = driver;
        if (cancelReason) order.cancelReason = cancelReason;
        saveDb(db);
      }
      res.json({ success: true });
      return;
    }

    // DELETE /api/orders/:id (protected)
    if (path.match(/^\/orders\/\d+$/) && req.method === 'DELETE') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const id = parseInt(path.split('/')[2]);
      const db = loadDb();
      db.orders = db.orders.filter(o => o.id !== id);
      saveDb(db);
      res.json({ success: true });
      return;
    }

    // GET /api/stock-logs (protected)
    if (path === '/stock-logs' && req.method === 'GET') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const db = loadDb();
      res.json(db.stockLogs || []);
      return;
    }

    // GET /api/drivers (protected)
    if (path === '/drivers' && req.method === 'GET') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const db = loadDb();
      res.json(db.drivers || []);
      return;
    }

    // POST /api/drivers (protected)
    if (path === '/drivers' && req.method === 'POST') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const body = JSON.parse(await getRawBody(req));
      const db = loadDb();
      if (!db.drivers) db.drivers = [];
      const idx = db.drivers.findIndex(d => d.id === body.id);
      if (idx !== -1) db.drivers[idx] = body;
      else db.drivers.push({ ...body, id: Date.now() });
      saveDb(db);
      res.json({ success: true });
      return;
    }

    // DELETE /api/drivers/:id (protected)
    if (path.match(/^\/drivers\/\d+$/) && req.method === 'DELETE') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const id = parseInt(path.split('/')[2]);
      const db = loadDb();
      db.drivers = (db.drivers || []).filter(d => d.id !== id);
      saveDb(db);
      res.json({ success: true });
      return;
    }

    // GET/POST /api/promo-codes (protected for POST)
    if (path === '/promo-codes') {
      const db = loadDb();
      if (req.method === 'GET') {
        res.json(db.promoCodes || []);
        return;
      }
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const body = JSON.parse(await getRawBody(req));
      if (!db.promoCodes) db.promoCodes = [];
      const idx = db.promoCodes.findIndex(c => c.code === body.code);
      if (idx !== -1) db.promoCodes[idx] = body;
      else db.promoCodes.push(body);
      saveDb(db);
      res.json({ success: true });
      return;
    }

    // DELETE /api/promo-codes/:code (protected)
    if (path.match(/^\/promo-codes\/.+$/) && req.method === 'DELETE') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const code = path.split('/')[2];
      const db = loadDb();
      db.promoCodes = (db.promoCodes || []).filter(c => c.code !== code);
      saveDb(db);
      res.json({ success: true });
      return;
    }

    // GET/POST /api/notices (protected for POST)
    if (path === '/notices') {
      const db = loadDb();
      if (req.method === 'GET') {
        res.json(db.notices || { text: '', active: false });
        return;
      }
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      db.notices = JSON.parse(await getRawBody(req));
      saveDb(db);
      res.json({ success: true });
      return;
    }

    // GET/POST /api/delivery-zones (protected for POST)
    if (path === '/delivery-zones') {
      const db = loadDb();
      if (req.method === 'GET') {
        res.json(db.deliveryZones || []);
        return;
      }
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const body = JSON.parse(await getRawBody(req));
      if (!db.deliveryZones) db.deliveryZones = [];
      const idx = db.deliveryZones.findIndex(z => z.name === body.name);
      if (idx !== -1) db.deliveryZones[idx] = body;
      else db.deliveryZones.push(body);
      saveDb(db);
      res.json({ success: true });
      return;
    }

    // DELETE /api/delivery-zones/:name (protected)
    if (path.match(/^\/delivery-zones\/.+$/) && req.method === 'DELETE') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const name = decodeURIComponent(path.split('/')[2]);
      const db = loadDb();
      db.deliveryZones = (db.deliveryZones || []).filter(z => z.name !== name);
      saveDb(db);
      res.json({ success: true });
      return;
    }

    // GET /api/customers (protected)
    if (path === '/customers' && req.method === 'GET') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const db = loadDb();
      const customers = {};
      (db.orders || []).forEach(order => {
        if (order.customer && order.customer.phone) {
          const phone = order.customer.phone;
          if (!customers[phone]) {
            customers[phone] = { name: order.customer.name, phone, totalSpent: 0, orderCount: 0, lastOrder: null, loyaltyPoints: 0 };
          }
          if (order.status === 'completed') {
            customers[phone].totalSpent += order.total;
            customers[phone].loyaltyPoints += Math.floor(order.total / 100);
          }
          customers[phone].orderCount += 1;
          if (!customers[phone].lastOrder || new Date(order.timestamp) > new Date(customers[phone].lastOrder)) {
            customers[phone].lastOrder = order.timestamp;
          }
        }
      });
      res.json(Object.values(customers));
      return;
    }

    // GET /api/settings
    if (path === '/settings' && req.method === 'GET') {
      const db = loadDb();
      res.json(db.settings || {});
      return;
    }

    // POST /api/settings (protected)
    if (path === '/settings' && req.method === 'POST') {
      if (!admin) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const db = loadDb();
      db.settings = { ...(db.settings || {}), ...JSON.parse(await getRawBody(req)) };
      saveDb(db);
      res.json({ success: true });
      return;
    }

    // Health check
    if (path === '/health' && req.method === 'GET') {
      res.json({ status: 'ok', time: new Date().toISOString() });
      return;
    }

    // 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  } catch (err) {
    console.error('[API ERROR]', err.message);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Server Error' }));
  }
}

export default handler;
