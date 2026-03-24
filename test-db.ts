import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

const products = await sql('SELECT * FROM products ORDER BY id');
console.log(JSON.stringify({ products: products.slice(0,3) }, null, 2));