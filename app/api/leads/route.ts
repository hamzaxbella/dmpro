import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

interface Lead {
  id: number;
  ig_username: string;
  igsid: string | null;
  full_name: string | null;
  profile_pic: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  event_count: number;
  last_message: string | null;
}

const BASE_QUERY = `
  SELECT l.*,
    (SELECT COUNT(*) FROM events WHERE lead_id = l.id) as event_count,
    (SELECT body FROM events WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as last_message
  FROM leads l
`;

/**
 * GET /api/leads — List all leads, optionally filtered by status
 * ?ignored=1 returns ignored leads; default returns non-ignored
 */
export async function GET(request: NextRequest) {
  const status  = request.nextUrl.searchParams.get('status');
  const ignored = request.nextUrl.searchParams.get('ignored') === '1' ? 1 : 0;

  let leads: Lead[];
  if (status) {
    leads = db
      .prepare(BASE_QUERY + 'WHERE l.status = ? AND l.ignored = ? ORDER BY l.updated_at DESC')
      .all(status, ignored) as Lead[];
  } else {
    leads = db
      .prepare(BASE_QUERY + 'WHERE l.ignored = ? ORDER BY l.updated_at DESC')
      .all(ignored) as Lead[];
  }

  return Response.json(leads);
}

/**
 * POST /api/leads — Create a new lead
 * Body: { ig_username: string, full_name?: string, notes?: string }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ig_username, full_name, notes } = body as {
    ig_username?: string;
    full_name?: string;
    notes?: string;
  };

  if (!ig_username) {
    return Response.json({ error: 'ig_username is required' }, { status: 400 });
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO leads (ig_username, full_name, notes) VALUES (?, ?, ?)`
      )
      .run(ig_username, full_name ?? null, notes ?? null);

    const lead = db
      .prepare('SELECT * FROM leads WHERE id = ?')
      .get(result.lastInsertRowid) as Lead;

    return Response.json(lead, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('UNIQUE constraint')) {
      return Response.json({ error: 'Lead already exists' }, { status: 409 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
