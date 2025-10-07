import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import Database from 'better-sqlite3';
import * as schemaPg from "@shared/schema";
import * as schemaSqlite from "@shared/schema-sqlite";

const isElectron = process.env.ELECTRON_MODE === 'true';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let db: any;
let pool: Pool | undefined;
let schema: any;

if (isElectron && databaseUrl.startsWith('sqlite:')) {
  const dbPath = databaseUrl.replace('sqlite:', '');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  schema = schemaSqlite;
  
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()) NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()) NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS sellers (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()) NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      stock_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      buying_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      quantity INTEGER DEFAULT 0 NOT NULL,
      supplier_id TEXT REFERENCES suppliers(id),
      created_at INTEGER DEFAULT (unixepoch()) NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      receipt_number TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      seller_id TEXT NOT NULL REFERENCES sellers(id),
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0 NOT NULL,
      discount_type TEXT DEFAULT 'percentage' NOT NULL,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()) NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      sale_id TEXT NOT NULL REFERENCES sales(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      stock_code TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      buying_price REAL NOT NULL,
      subtotal REAL NOT NULL
    );
  `);
  
  db = drizzle(sqlite, { schema });
} else {
  schema = schemaPg;
  pool = new Pool({ connectionString: databaseUrl });
  db = drizzlePg(pool, { schema });
}

export { db, pool, schema };
