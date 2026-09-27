import { DatabaseSync } from 'node:sqlite'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const DB_PATH = process.env.DB_PATH || 'data/logistics.db'
mkdirSync(path.dirname(DB_PATH), { recursive: true })

const db = new DatabaseSync(DB_PATH)

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin','admin')),
    active INTEGER NOT NULL DEFAULT 1,
    must_reset_password INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shipments (
    id TEXT PRIMARY KEY,
    tracking_number TEXT UNIQUE NOT NULL,
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_phone TEXT DEFAULT '',
    sender_address TEXT DEFAULT '',
    recipient_name TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_phone TEXT DEFAULT '',
    recipient_address TEXT DEFAULT '',
    recipient_city TEXT DEFAULT '',
    recipient_country TEXT DEFAULT '',
    origin_city TEXT DEFAULT '',
    destination_city TEXT DEFAULT '',
    cargo_type TEXT NOT NULL DEFAULT 'Air' CHECK (cargo_type IN ('Air','Ocean','Road')),
    package_weight REAL DEFAULT 0,
    package_dimensions TEXT DEFAULT '',
    package_quantity INTEGER DEFAULT 1,
    package_description TEXT DEFAULT '',
    base_freight REAL NOT NULL DEFAULT 0,
    surcharge_fuel REAL NOT NULL DEFAULT 0,
    surcharge_customs REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (payment_status IN ('Paid','Unpaid','Pending')),
    current_status TEXT NOT NULL DEFAULT 'Created' CHECK (current_status IN ('Created','Shipped','In Transit','Held at Customs','Out for Delivery','Delivered','On Hold')),
    progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    email_sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY,
    shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    timestamp TEXT NOT NULL,
    location TEXT NOT NULL,
    status_tag TEXT NOT NULL,
    admin_notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_checkpoints_shipment ON checkpoints(shipment_id, timestamp);

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id TEXT,
    admin_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

function seedSuperAdmin() {
  const email = 'admin@gmail.com'
  const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(email)
  if (existing) return
  const hash = bcrypt.hashSync('password123', 10)
  db.prepare(
    `INSERT INTO admins (id, email, name, password_hash, role, must_reset_password)
     VALUES (?, ?, ?, ?, 'super_admin', 1)`,
  ).run(randomUUID(), email, 'Super Admin', hash)
  console.log('[db] Seeded super admin:', email)
}

seedSuperAdmin()

export default db
