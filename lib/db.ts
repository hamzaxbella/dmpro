import { createClient, Client } from '@libsql/client';

const DB_URL = process.env.TURSO_DATABASE_URL || 'file:dmpro.db';
const DB_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

// Singleton: reuse the same connection across hot reloads in dev
const globalForDb = globalThis as unknown as { __client?: any };

/** Run idempotent column migrations — errors on "duplicate column" are expected and swallowed. */
async function runMigrations(client: Client) {
  const addColumn = async (sql: string) => {
    try { await client.execute(sql); } catch { /* column already exists */ }
  };
  await addColumn('ALTER TABLE leads ADD COLUMN ignored INTEGER NOT NULL DEFAULT 0');
}

function createDbClient() {
  const client = createClient({
    url: DB_URL,
    authToken: DB_AUTH_TOKEN,
  });

  // Fire-and-forget: run migrations on first init.
  // Errors only if the column already exists, which is fine.
  runMigrations(client).catch(() => {});

  // Compat wrapper
  return {
    ...client,
    execute: client.execute.bind(client),
    prepare: (sql: string) => {
      return {
        all: async (...args: any[]) => {
          const res = await client.execute({ sql, args });
          // Convert array of Row objects to plain objects for Next.js Server Actions/Components
          return res.rows.map(row => Object.assign({}, row));
        },
        get: async (...args: any[]) => {
          const res = await client.execute({ sql, args });
          return res.rows.length ? Object.assign({}, res.rows[0]) : undefined;
        },
        run: async (...args: any[]) => {
          const res = await client.execute({ sql, args });
          return { lastInsertRowid: Number(res.lastInsertRowid), changes: res.rowsAffected };
        }
      };
    }
  } as any;
}

export const db = globalForDb.__client ?? createDbClient();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__client = db;
}
