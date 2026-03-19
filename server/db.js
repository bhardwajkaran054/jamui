import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use absolute path resolve for better stability across different environments
const dbPath = resolve(__dirname, '..', 'database.sqlite');
console.log(`[DB] Attempting to open database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('[DB] FATAL ERROR opening database:', err.message);
    process.exit(1); // Exit if database can't be opened
  } else {
    console.log('[DB] Successfully connected to SQLite database.');
  }
});

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

db.serialize(() => {
  // Create tables with error handling
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    unit TEXT,
    category TEXT NOT NULL,
    emoji TEXT,
    stock INTEGER DEFAULT 0
  )`, (err) => { if (err) console.error('[DB] Error creating products table:', err.message); });

  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`, (err) => { if (err) console.error('[DB] Error creating admins table:', err.message); });

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending'
  )`, (err) => { if (err) console.error('[DB] Error creating orders table:', err.message); });

  // Seeding
  db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
    if (!err && row && row.count === 0) {
      const stmt = db.prepare("INSERT INTO products (name, price, unit, category, emoji, stock) VALUES (?, ?, ?, ?, ?, ?)");
      initialProducts.forEach(p => stmt.run(p.name, p.price, p.unit, p.category, p.emoji, p.stock));
      stmt.finalize();
      console.log('[DB] Initial products seeded.');
    }
  });

  db.get("SELECT COUNT(*) as count FROM admins", (err, row) => {
    if (!err && row && row.count === 0) {
      const hashedPassword = bcrypt.hashSync('TjBraWE=', 10);
      db.run("INSERT INTO admins (username, password) VALUES (?, ?)", ['kbcode', hashedPassword], (err) => {
        if (!err) console.log('[DB] Admin account "kbcode" seeded.');
      });
    }
  });
});

export default db;
