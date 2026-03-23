import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

let initialized = false;

const INITIAL_PRODUCTS = [
  { id: 1, name: 'Kasturi Rice 26 kg', price: 830, unit: '26kg', category: 'Rice', emoji: '🌾', stock: 10 },
  { id: 2, name: 'Kasturi Rice 1 kg', price: 35, unit: '1kg', category: 'Rice', emoji: '🌾', stock: 50 },
  { id: 3, name: 'Vardhman Mini Kit 26 kg', price: 1320, unit: '26kg', category: 'Rice', emoji: '🌾', stock: 5 },
  { id: 4, name: 'Fortune Mini Kit 26 kg', price: 1430, unit: '26kg', category: 'Rice', emoji: '🌾', stock: 8 },
  { id: 5, name: 'Fortune Mini Kit 1 kg', price: 58, unit: '1kg', category: 'Rice', emoji: '🌾', stock: 40 },
  { id: 6, name: 'Refined Oil 1 Liter', price: 135, unit: '1L', category: 'Oil', emoji: '🫙', stock: 30 },
  { id: 7, name: 'Mustard Oil 1 Liter', price: 170, unit: '1L', category: 'Oil', emoji: '🫙', stock: 25 },
  { id: 8, name: 'Toor Dal 1 kg', price: 125, unit: '1kg', category: 'Dal', emoji: '🫘', stock: 20 },
  { id: 9, name: 'Dalmia Gold 250 gm', price: 110, unit: '250gm', category: 'Dal', emoji: '🫘', stock: 15 },
  { id: 10, name: 'Sugar 1 kg', price: 48, unit: '1kg', category: 'Atta & Sugar', emoji: '🍬', stock: 60 },
  { id: 11, name: 'Aashirvaad Atta 5 kg', price: 235, unit: '5kg', category: 'Atta & Sugar', emoji: '🌿', stock: 12 },
  { id: 12, name: 'Loose Atta 1 kg', price: 35, unit: '1kg', category: 'Atta & Sugar', emoji: '🌿', stock: 45 },
  { id: 13, name: 'Chana Dal 1 kg', price: 80, unit: '1kg', category: 'Dal', emoji: '🫘', stock: 18 },
  { id: 14, name: 'Kabuli Chana 1 kg', price: 110, unit: '1kg', category: 'Dal', emoji: '🫘', stock: 14 },
  { id: 15, name: 'Atta 26 kg', price: 850, unit: '26kg', category: 'Atta & Sugar', emoji: '🌿', stock: 7 },
];

export async function initDb() {
  if (initialized) return;

  try {
    // Create products table
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        unit TEXT NOT NULL,
        category TEXT NOT NULL,
        emoji TEXT DEFAULT '',
        stock INTEGER DEFAULT 0
      )
    `;

    // Create orders table
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id BIGINT PRIMARY KEY,
        items JSON NOT NULL,
        total INTEGER NOT NULL,
        customer JSON,
        promo_code TEXT,
        delivery_fee INTEGER DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending',
        delivery_message TEXT,
        rejection_reason TEXT,
        delivery_hours INTEGER,
        approval_timestamp TIMESTAMP,
        driver JSON,
        cancel_reason TEXT
      )
    `;

    // Create admins table
    await sql`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `;

    // Create stock_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS stock_logs (
        id SERIAL PRIMARY KEY,
        product_id INTEGER,
        product_name TEXT,
        old_stock INTEGER,
        new_stock INTEGER,
        reason TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create drivers table
    await sql`
      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        vehicle TEXT,
        active BOOLEAN DEFAULT true
      )
    `;

    // Create promo_codes table
    await sql`
      CREATE TABLE IF NOT EXISTS promo_codes (
        code TEXT PRIMARY KEY,
        discount INTEGER NOT NULL,
        min_order INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true
      )
    `;

    // Create notices table
    await sql`
      CREATE TABLE IF NOT EXISTS notices (
        id INTEGER PRIMARY KEY DEFAULT 1,
        text TEXT DEFAULT '',
        active BOOLEAN DEFAULT false
      )
    `;

    // Create delivery_zones table
    await sql`
      CREATE TABLE IF NOT EXISTS delivery_zones (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        fee INTEGER DEFAULT 0,
        min_order INTEGER DEFAULT 0
      )
    `;

    // Create settings table
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value JSON NOT NULL
      )
    `;

    // Seed initial products if empty
    const { rows: existingProducts } = await sql`SELECT COUNT(*) as count FROM products`;
    if (parseInt(existingProducts[0].count) === 0) {
      for (const p of INITIAL_PRODUCTS) {
        await sql`INSERT INTO products (id, name, price, unit, category, emoji, stock) VALUES (${p.id}, ${p.name}, ${p.price}, ${p.unit}, ${p.category}, ${p.emoji}, ${p.stock})`;
      }
    }

    // Seed default admin if none exists
    const { rows: existingAdmins } = await sql`SELECT COUNT(*) as count FROM admins`;
    if (parseInt(existingAdmins[0].count) === 0) {
      const hash = bcrypt.hashSync('TjBraWE=', 10);
      await sql`INSERT INTO admins (username, password) VALUES (${'kbcode'}, ${hash})`;
    }

    // Seed default notice row
    await sql`INSERT INTO notices (id, text, active) VALUES (1, '', false) ON CONFLICT (id) DO NOTHING`;

    initialized = true;
    console.log('[DB] Initialized successfully');
  } catch (err) {
    console.error('[DB] Init error:', err.message);
    throw err;
  }
}

export { sql };
