import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

interface Lead {
  id: number;
  ig_username: string;
  full_name: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Event {
  id: number;
  lead_id: number;
  direction: string;
  body: string | null;
  ig_message_id: string | null;
  created_at: string;
}

/**
 * GET /api/leads/[id] — Get a single lead with its events timeline
 */
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/leads/[id]'>
) {
  const { id } = await ctx.params;

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as Lead | undefined;
  if (!lead) {
    return Response.json({ error: 'Lead not found' }, { status: 404 });
  }

  const events = db
    .prepare('SELECT * FROM events WHERE lead_id = ? ORDER BY created_at DESC')
    .all(id) as Event[];

  return Response.json({ ...lead, events });
}

/**
 * PATCH /api/leads/[id] — Update lead fields
 * Body: { full_name?: string, notes?: string, status?: string }
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/leads/[id]'>
) {
  const { id } = await ctx.params;
  const body = await request.json();
  const { full_name, notes, status } = body as {
    full_name?: string;
    notes?: string;
    status?: string;
  };

  // Build dynamic SET clause
  const sets: string[] = [];
  const values: unknown[] = [];

  if (full_name !== undefined) {
    sets.push('full_name = ?');
    values.push(full_name);
  }
  if (notes !== undefined) {
    sets.push('notes = ?');
    values.push(notes);
  }
  if (status !== undefined) {
    sets.push('status = ?');
    values.push(status);
  }

  if (sets.length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 });
  }

  sets.push("updated_at = datetime('now')");
  values.push(id);

  try {
    const result = db
      .prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = ?`)
      .run(...values);

    if (result.changes === 0) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as Lead;
    return Response.json(lead);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('CHECK constraint')) {
      return Response.json(
        { error: 'Invalid status. Must be: contacted, replied, interested, closed, lost' },
        { status: 400 }
      );
    }
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/leads/[id] — Delete a lead (cascades events and reminders)
 */
export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/leads/[id]'>
) {
  const { id } = await ctx.params;

  const result = db.prepare('DELETE FROM leads WHERE id = ?').run(id);

  if (result.changes === 0) {
    return Response.json({ error: 'Lead not found' }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
