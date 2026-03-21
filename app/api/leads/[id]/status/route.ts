import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

const VALID_STATUSES = ['contacted', 'replied', 'interested', 'closed', 'lost'];

/**
 * PATCH /api/leads/[id]/status — Update lead status only (kanban drag)
 * Body: { status: string }
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/leads/[id]/status'>
) {
  const { id } = await ctx.params;
  const body = await request.json();
  const { status } = body as { status?: string };

  if (!status || !VALID_STATUSES.includes(status)) {
    return Response.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  const result = db
    .prepare(`UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(status, id);

  if (result.changes === 0) {
    return Response.json({ error: 'Lead not found' }, { status: 404 });
  }

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  return Response.json(lead);
}
