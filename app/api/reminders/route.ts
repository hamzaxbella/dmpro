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
}

/**
 * GET /api/reminders — Get reminders, optionally filtered
 * Query: ?filter=due (only unsent, due now) | upcoming (unsent, future) | all (default)
 */
export async function GET(request: NextRequest) {
  const filter = request.nextUrl.searchParams.get('filter') ?? 'all';

  let reminders: Reminder[];
  switch (filter) {
    case 'due':
      reminders = db
        .prepare(
          `SELECT r.*, l.ig_username FROM reminders r
           JOIN leads l ON l.id = r.lead_id
           WHERE r.sent = 0 AND r.due_at <= datetime('now')
           ORDER BY r.due_at ASC`
        )
        .all() as Reminder[];
      break;
    case 'upcoming':
      reminders = db
        .prepare(
          `SELECT r.*, l.ig_username FROM reminders r
           JOIN leads l ON l.id = r.lead_id
           WHERE r.sent = 0 AND r.due_at > datetime('now')
           ORDER BY r.due_at ASC`
        )
        .all() as Reminder[];
      break;
    default:
      reminders = db
        .prepare(
          `SELECT r.*, l.ig_username FROM reminders r
           JOIN leads l ON l.id = r.lead_id
           ORDER BY r.due_at DESC`
        )
        .all() as Reminder[];
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
  const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(lead_id);
  if (!lead) {
    return Response.json({ error: 'Lead not found' }, { status: 404 });
  }

  const result = db
    .prepare('INSERT INTO reminders (lead_id, due_at, note) VALUES (?, ?, ?)')
    .run(lead_id, due_at, note ?? null);

  const reminder = db
    .prepare('SELECT * FROM reminders WHERE id = ?')
    .get(result.lastInsertRowid) as Reminder;

  return Response.json(reminder, { status: 201 });
}
