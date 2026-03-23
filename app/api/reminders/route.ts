import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

interface Reminder {
  id: number;
  lead_id: number;
  due_at: string;
  note: string | null;
  sent: number;
  created_at: string;
  ig_username?: string;
  profile_pic?: string | null;
}

export interface StaleLead {
  id: number;
  ig_username: string;
  full_name: string | null;
  profile_pic: string | null;
  status: string;
  updated_at: string;
  days_stale: number;
}

async function getSettings() {
  const rows = (await db
      .prepare(`SELECT key, value FROM settings WHERE key IN ('contacted_days','replied_days','interested_days')`)
      .all()) as { key: string; value: string }[];
  const map: Record<string, number> = { contacted_days: 3, replied_days: 5, interested_days: 7 };
  for (const r of rows) map[r.key] = parseInt(r.value, 10);
  return map;
}

/**
 * GET /api/reminders — Get reminders, optionally filtered
 * Query: ?filter=due | upcoming | stale | all (default)
 */
export async function GET(request: NextRequest) {
  const filter = (await request.nextUrl.searchParams.get('filter')) ?? 'all';

  if (filter === 'stale') {
    const s = await getSettings();
    const stale = (await db.prepare(`
      SELECT id, ig_username, full_name, profile_pic, status, updated_at,
        CAST(julianday('now') - julianday(updated_at) AS INTEGER) AS days_stale
      FROM leads
      WHERE ignored = 0
        AND (
          (status = 'contacted'  AND julianday('now') - julianday(updated_at) >= ?)
          OR (status = 'replied'    AND julianday('now') - julianday(updated_at) >= ?)
          OR (status = 'interested' AND julianday('now') - julianday(updated_at) >= ?)
        )
      ORDER BY days_stale DESC
    `).all(s.contacted_days, s.replied_days, s.interested_days)) as StaleLead[];
    return Response.json(stale);
  }

  let reminders: Reminder[];
  switch (filter) {
    case 'due':
      reminders = (await db
              .prepare(
                `SELECT r.*, l.ig_username, l.profile_pic FROM reminders r
           JOIN leads l ON l.id = r.lead_id
           WHERE r.sent = 0 AND r.due_at <= datetime('now')
           ORDER BY r.due_at ASC`
              )
              .all()) as Reminder[];
      break;
    case 'upcoming':
      reminders = (await db
              .prepare(
                `SELECT r.*, l.ig_username, l.profile_pic FROM reminders r
           JOIN leads l ON l.id = r.lead_id
           WHERE r.sent = 0 AND r.due_at > datetime('now')
           ORDER BY r.due_at ASC`
              )
              .all()) as Reminder[];
      break;
    default:
      reminders = (await db
              .prepare(
                `SELECT r.*, l.ig_username, l.profile_pic FROM reminders r
           JOIN leads l ON l.id = r.lead_id
           ORDER BY r.due_at DESC`
              )
              .all()) as Reminder[];
  }

  return Response.json(reminders);
}

/**
 * POST /api/reminders — Schedule a new reminder
 * Body: { lead_id: number, due_at: string (ISO-8601), note?: string }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { lead_id, due_at, note } = body as {
    lead_id?: number;
    due_at?: string;
    note?: string;
  };

  if (!lead_id || !due_at) {
    return Response.json(
      { error: 'lead_id and due_at are required' },
      { status: 400 }
    );
  }

  // Verify the lead exists
  const lead = (await db.prepare('SELECT id FROM leads WHERE id = ?').get(lead_id));
  if (!lead) {
    return Response.json({ error: 'Lead not found' }, { status: 404 });
  }

  const result = (await db
      .prepare('INSERT INTO reminders (lead_id, due_at, note) VALUES (?, ?, ?)')
      .run(lead_id, due_at, note ?? null));

  const reminder = (await db
      .prepare('SELECT * FROM reminders WHERE id = ?')
      .get(result.lastInsertRowid)) as Reminder;

  return Response.json(reminder, { status: 201 });
}
