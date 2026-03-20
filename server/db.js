import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

// Create Turso client
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://jamui-whoismonesh.aws-ap-south-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM5ODU5NzAsImlkIjoiMDE5ZDA5Y2QtOTcwMS03YWU4LWI4MWMtNzcwMTQ2NDMzNDY4IiwicmlkIjoiNjY4Y2IzNDctZDk1MC00NDgxLTljYzctODc2ZjE3NzEyNDVlIn0.EV-0lHS2u7QEsdopmMgSyxQRPulD70msJOk35s-IzAhcU-18dhmXWri5ahEP_sgTZPX7OVP4ZdfnykBxL67PDA',
});

console.log('[DB] Turso client initialized.');

// Initialize tables
async function initDb() {
  await db.execute(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    unit TEXT,
    category TEXT NOT NULL,
    emoji TEXT,
    stock INTEGER DEFAULT 0
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    customer TEXT,
    promoCode TEXT,
    deliveryFee REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending',
    estimatedDelivery TEXT,
    rejectReason TEXT
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS promo_codes (
    code TEXT PRIMARY KEY,
    discount REAL NOT NULL,
    type TEXT NOT NULL,
    minOrder REAL,
    active INTEGER DEFAULT 1
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    text TEXT NOT NULL,
    active INTEGER DEFAULT 1
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS delivery_zones (
    name TEXT PRIMARY KEY,
    fee REAL NOT NULL,
    minOrder REAL,
    active INTEGER DEFAULT 1
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS stock_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productId INTEGER NOT NULL,
    productName TEXT NOT NULL,
    oldStock INTEGER NOT NULL,
    newStock INTEGER NOT NULL,
    reason TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed products if empty
  const products = await db.execute("SELECT COUNT(*) as count FROM products");
  if (products.rows[0].count === 0) {
    const initialProducts = [
      { name: 'Kasturi Rice 26 kg', price: 830, unit: '26kg', category: 'Rice', emoji: '🌾', stock: 10 },
      { name: 'Kasturi Rice 1 kg', price: 35, unit: '1kg', category: 'Rice', emoji: '🌾', stock: 50 },
      { name: 'Vardhman Mini Kit 26 kg', price: 1320, unit: '26kg', category: 'Rice', emoji: '🌾', stock: 5 },
      { name: 'Fortune Mini Kit 26 kg', price: 1430, unit: '26kg', category: 'Rice', emoji: '🌾', stock: 8 },
      { name: 'Fortune Mini Kit 1 kg', price: 58, unit: '1kg', category: 'Rice', emoji: '🌾', stock: 40 },
      { name: 'Refined Oil 1 Liter', price: 135, unit: '1L', category: 'Oil', emoji: '🫙', stock: 30 },
      { name: 'Mustard Oil 1 Liter', price: 170, unit: '1L', category: 'Oil', emoji: '🫙', stock: 25 },
      { name: 'Toor Dal 1 kg', price: 125, unit: '1kg', category: 'Dal', emoji: '🫘', stock: 20 },
      { name: 'Dalmia Gold 250 gm', price: 110, unit: '250gm', category: 'Dal', emoji: '🫘', stock: 15 },
      { name: 'Sugar 1 kg', price: 48, unit: '1kg', category: 'Atta & Sugar', emoji: '🍬', stock: 60 },
      { name: 'Aashirvaad Atta 5 kg', price: 235, unit: '5kg', category: 'Atta & Sugar', emoji: '🌿', stock: 12 },
      { name: 'Loose Atta 1 kg', price: 35, unit: '1kg', category: 'Atta & Sugar', emoji: '🌿', stock: 45 },
      { name: 'Chana Dal 1 kg', price: 80, unit: '1kg', category: 'Dal', emoji: '🫘', stock: 18 },
      { name: 'Kabuli Chana 1 kg', price: 110, unit: '1kg', category: 'Dal', emoji: '🫘', stock: 14 },
      { name: 'Atta 26 kg', price: 850, unit: '26kg', category: 'Atta & Sugar', emoji: '🌿', stock: 7 },
    ];
    for (const p of initialProducts) {
      await db.execute(
        'INSERT INTO products (name, price, unit, category, emoji, stock) VALUES (?, ?, ?, ?, ?, ?)',
        [p.name, p.price, p.unit, p.category, p.emoji, p.stock]
      );
    }
    console.log('[DB] Initial products seeded.');
  }

  // Seed admin if empty
  const admins = await db.execute("SELECT COUNT(*) as count FROM admins");
  if (admins.rows[0].count === 0) {
    const hashedPassword = bcrypt.hashSync('TjBraWE=', 10);
    await db.execute("INSERT INTO admins (username, password) VALUES (?, ?)", ['kbcode', hashedPassword]);
    console.log('[DB] Admin account "kbcode" seeded.');
  }
}

initDb().catch(console.error);

// Turso client uses promise-based API, export it directly
export default db;
