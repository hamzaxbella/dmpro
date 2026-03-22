import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthorized } from '@/lib/crm-auth';

interface Profile {
  username?: string;
  name?: string;
  profilePic?: string;
  followerCount?: number;
  instagramUrl?: string;
  isUserFollowBusiness?: boolean;
  isBusinessFollowUser?: boolean;
}

/**
 * POST /api/crm/leads/reply
 * Called by n8n when an INBOUND message is detected (lead replied).
 * Enriches the lead with the real Instagram profile and logs the inbound event.
 *
 * Body: { igsid, status, messageText, messageMid, timestamp, direction, profile }
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { igsid, messageText, messageMid, profile = {} } = await req.json() as {
    igsid: string;
    messageText?: string;
    messageMid?: string;
    profile?: Profile;
  };

  if (!igsid) {
    return NextResponse.json({ error: 'igsid is required' }, { status: 400 });
  }

  const igUsername = profile.username ?? igsid;

  const findByIgsid = db.prepare(`SELECT id, status, ignored FROM leads WHERE igsid = ? LIMIT 1`);
  const findByName  = db.prepare(`SELECT id, status, ignored FROM leads WHERE ig_username = ? LIMIT 1`);

  const insertLead  = db.prepare(`
    INSERT INTO leads (ig_username, igsid, full_name, profile_pic, status)
    VALUES (?, ?, ?, ?, 'replied')
  `);

  const updateLead  = db.prepare(`
    UPDATE leads SET
      ig_username = CASE WHEN ? != igsid THEN ? ELSE ig_username END,
      igsid       = COALESCE(igsid, ?),
      full_name   = COALESCE(?, full_name),
      profile_pic = COALESCE(?, profile_pic),
      status      = CASE WHEN status = 'contacted' THEN 'replied' ELSE status END,
      updated_at  = datetime('now')
    WHERE id = ?
  `);

  const insertEvent = db.prepare(`
    INSERT OR IGNORE INTO events (lead_id, direction, body, ig_message_id)
    VALUES (?, 'inbound', ?, ?)
  `);

  db.transaction(() => {
    let lead = findByIgsid.get(igsid) as { id: number; status: string; ignored: number } | undefined;

    if (!lead) {
      // Fall back to ig_username match (handles igsid-as-username from outbound step)
      lead = findByName.get(igsid) as { id: number; status: string; ignored: number } | undefined
          ?? findByName.get(igUsername) as { id: number; status: string; ignored: number } | undefined;
    }

    if (lead?.ignored) return; // silently skip ignored accounts

    if (lead) {
      updateLead.run(
        igUsername, igUsername,           // update ig_username if it differs from igsid
        igsid,                            // set igsid if null
        profile.name ?? null,
        profile.profilePic ?? null,
        lead.id
      );
    } else {
      const info = insertLead.run(igUsername, igsid, profile.name ?? null, profile.profilePic ?? null);
      lead = { id: info.lastInsertRowid as number, status: 'replied', ignored: 0 };
    }

    if (messageText || messageMid) {
      insertEvent.run(lead!.id, messageText ?? null, messageMid ?? null);
    }
  })();

  return NextResponse.json({ ok: true });
}
