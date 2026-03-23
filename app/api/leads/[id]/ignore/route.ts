import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/leads/[id]/ignore — mark a lead as ignored */
export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const result = (await db
      .prepare(`UPDATE leads SET ignored = 1, updated_at = datetime('now') WHERE id = ?`)
      .run(id));
  if (result.changes === 0) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

/** DELETE /api/leads/[id]/ignore — unignore a lead */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const result = (await db
      .prepare(`UPDATE leads SET ignored = 0, updated_at = datetime('now') WHERE id = ?`)
      .run(id));
  if (result.changes === 0) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
