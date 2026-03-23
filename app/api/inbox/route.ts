import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface InboxItem {
  id: number;
  ig_username: string;
  full_name: string | null;
  status: string;
  updated_at: string;
  last_direction: string | null;
  last_message: string | null;
  last_event_at: string | null;
  event_count: number;
}

export async function GET() {
  const rows = (await db.prepare(`
    SELECT
      l.id,
      l.ig_username,
      l.full_name,
      l.status,
      l.updated_at,
      (SELECT direction FROM events WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) AS last_direction,
      (SELECT body     FROM events WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) AS last_message,
      (SELECT created_at FROM events WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) AS last_event_at,
      (SELECT COUNT(*) FROM events WHERE lead_id = l.id) AS event_count
    FROM leads l
    WHERE l.ignored = 0
    ORDER BY COALESCE(
      (SELECT created_at FROM events WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1),
      l.updated_at
    ) DESC
  `).all()) as InboxItem[];

  return NextResponse.json(rows);
}
