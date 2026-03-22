import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/admin/clear
 * Wipes all leads, events, and reminders from the database.
 * Called from the Board UI after user confirms the action.
 */
export async function POST() {
  db.prepare('DELETE FROM leads').run();
  // events + reminders cascade automatically (ON DELETE CASCADE)
  return NextResponse.json({ ok: true });
}
