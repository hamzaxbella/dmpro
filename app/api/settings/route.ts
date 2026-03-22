import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export interface ReminderSettings {
  contacted_days: number;
  replied_days: number;
  interested_days: number;
}

const KEYS: (keyof ReminderSettings)[] = ['contacted_days', 'replied_days', 'interested_days'];

/**
 * GET /api/settings — Returns current reminder threshold settings
 */
export async function GET() {
  const rows = db
    .prepare(`SELECT key, value FROM settings WHERE key IN ('contacted_days','replied_days','interested_days')`)
    .all() as { key: string; value: string }[];

  const settings: ReminderSettings = {
    contacted_days: 3,
    replied_days: 5,
    interested_days: 7,
  };
  for (const row of rows) {
    const k = row.key as keyof ReminderSettings;
    settings[k] = parseInt(row.value, 10);
  }

  return NextResponse.json(settings);
}

/**
 * PATCH /api/settings — Update one or more reminder thresholds
 * Body: { contacted_days?: number, replied_days?: number, interested_days?: number }
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json() as Partial<ReminderSettings>;

  const upsert = db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );

  const update = db.transaction(() => {
    for (const key of KEYS) {
      if (body[key] !== undefined) {
        const val = parseInt(String(body[key]), 10);
        if (!isNaN(val) && val > 0) {
          upsert.run(key, String(val));
        }
      }
    }
  });

  update();

  return GET();
}
