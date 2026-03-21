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

  // Auto-run migrations from db/schema.sql
  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  return db;
}

export const db: Database.Database = globalForDb.__db ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__db = db;
}
