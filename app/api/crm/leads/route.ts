import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthorized } from '@/lib/crm-auth';

/**
 * POST /api/crm/leads
 * Called by n8n when an OUTBOUND echo is detected (you sent a DM).
 * Creates or touches a lead and logs the outbound event.
 *
 * Body: { igsid, status, messageText, messageMid, timestamp, direction }
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { igsid, messageText, messageMid } = await req.json() as {
    igsid: string;
    messageText?: string;
    messageMid?: string;
  };

  if (!igsid) {
    return NextResponse.json({ error: 'igsid is required' }, { status: 400 });
  }

  const findByIgsid  = db.prepare(`SELECT id, ignored FROM leads WHERE igsid = ? LIMIT 1`);
  const findByName   = db.prepare(`SELECT id, ignored FROM leads WHERE ig_username = ? LIMIT 1`);
  const insertLead   = db.prepare(`INSERT INTO leads (ig_username, igsid, status) VALUES (?, ?, 'contacted')`);
  const touchLead    = db.prepare(`UPDATE leads SET updated_at = datetime('now') WHERE id = ?`);
  const setIgsid     = db.prepare(`UPDATE leads SET igsid = ?, updated_at = datetime('now') WHERE id = ?`);
  const insertEvent  = db.prepare(`
    INSERT OR IGNORE INTO events (lead_id, direction, body, ig_message_id)
    VALUES (?, 'outbound', ?, ?)
  `);

  let lead = (await findByIgsid.get(igsid)) as { id: number; ignored: number } | undefined;

  if (!lead) {
    // Check if a lead already exists with ig_username = igsid (old webhook style)
    const existing = (await findByName.get(igsid)) as { id: number; ignored: number } | undefined;
    if (existing) {
      if (existing.ignored) return NextResponse.json({ ok: true }); // silently skip ignored accounts
      await setIgsid.run(igsid, existing.id);
      lead = existing;
    } else {
      const info = (await insertLead.run(igsid, igsid));
      lead = { id: info.lastInsertRowid as number, ignored: 0 };
    }
  } else {
    if (lead.ignored) return NextResponse.json({ ok: true }); // silently skip ignored accounts
    await touchLead.run(lead.id);
  }

  if (messageText || messageMid) {
    await insertEvent.run(lead.id, messageText ?? null, messageMid ?? null);
  }

  return NextResponse.json({ ok: true });
}
