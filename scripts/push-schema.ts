/**
 * Push the database schema to Turso.
 * Usage: npx tsx scripts/push-schema.ts
 *
 * Requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local
 */
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  console.log('Pushing schema to Turso...');

  // Base schema
  const schema = readFileSync(join(process.cwd(), 'db', 'schema.sql'), 'utf-8');
  await db.executeMultiple(schema);
  console.log('Base schema applied.');

  // Additive migrations
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
    try {
      await db.execute(sql);
    } catch {
      // already applied
    }
  }
  console.log('Migrations applied.');

  // Enable foreign keys
  await db.execute('PRAGMA foreign_keys = ON');
  console.log('Done!');
}

main().catch(console.error);
