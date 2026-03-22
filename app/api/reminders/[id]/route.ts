import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/reminders/[id] — mark reminder as done */
export async function PATCH(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const result = db.prepare(`UPDATE reminders SET sent = 1 WHERE id = ?`).run(id);
  if (result.changes === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

/** DELETE /api/reminders/[id] — remove a reminder */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  db.prepare(`DELETE FROM reminders WHERE id = ?`).run(id);
  return new Response(null, { status: 204 });
}
