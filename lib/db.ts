import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'dmpro.db');

// Singleton: reuse the same connection across hot reloads in dev
const globalForDb = globalThis as unknown as { __db?: Database.Database };

function createDb(): Database.Database {
  const db = new Database(DB_PATH);

  // Performance & durability settings
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  // Auto-run base schema
  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // Additive migrations — safe to run on existing DBs (errors = column already exists)
  const migrations = [
    'ALTER TABLE leads ADD COLUMN igsid       TEXT',
    'ALTER TABLE leads ADD COLUMN profile_pic TEXT',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_igsid ON leads(igsid) WHERE igsid IS NOT NULL',
    'ALTER TABLE leads ADD COLUMN ignored INTEGER NOT NULL DEFAULT 0',
    `CREATE TABLE IF NOT EXISTS settings (
       key   TEXT PRIMARY KEY,
       value TEXT NOT NULL
     )`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES
       ('contacted_days',  '3'),
       ('replied_days',    '5'),
       ('interested_days', '7')`,
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* already applied */ }
  }

  return db;
}

export const db: Database.Database = globalForDb.__db ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__db = db;
}
