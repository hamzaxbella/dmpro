import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySignature, parseWebhookPayload } from '@/lib/meta';

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const PAGE_ID = process.env.META_PAGE_ID;

/**
 * GET /api/webhook — Meta verification handshake
 * Meta sends hub.mode, hub.verify_token, hub.challenge as query params
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode      = (await searchParams.get('hub.mode'));
  const token     = (await searchParams.get('hub.verify_token'));
  const challenge = (await searchParams.get('hub.challenge'));

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[webhook] Verification successful');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[webhook] Verification failed — token mismatch');
  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * POST /api/webhook — Receive DM events from Meta
 * Verifies X-Hub-Signature-256 then ingests events.
 * Direction is inferred: if sender.id === PAGE_ID it's outbound, else inbound.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = (await request.headers.get('x-hub-signature-256')) ?? '';

  if (!verifySignature(rawBody, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as Record<string, unknown>;
  const events = parseWebhookPayload(body);

  const insertEvent = db.prepare(
    `INSERT OR IGNORE INTO events (lead_id, direction, body, ig_message_id)
     VALUES (?, ?, ?, ?)`
  );

  const upsertLeadInbound = db.prepare(
    `INSERT INTO leads (ig_username, status) VALUES (?, 'replied')
     ON CONFLICT(ig_username) DO UPDATE SET
       status = CASE WHEN status = 'contacted' THEN 'replied' ELSE status END,
       updated_at = datetime('now')`
  );

  const upsertLeadOutbound = db.prepare(
    `INSERT INTO leads (ig_username, status) VALUES (?, 'contacted')
     ON CONFLICT(ig_username) DO UPDATE SET updated_at = datetime('now')`
  );

  const getLeadId = db.prepare(`SELECT id FROM leads WHERE ig_username = ?`);

  for (const event of events) {
    const isOutbound = PAGE_ID ? event.senderId === PAGE_ID : false;
    const direction = isOutbound ? 'outbound' : 'inbound';
    const igUsername = isOutbound ? event.recipientId : event.senderId;

    if (isOutbound) {
      await upsertLeadOutbound.run(igUsername);
    } else {
      await upsertLeadInbound.run(igUsername);
    }

    const lead = (await getLeadId.get(igUsername)) as { id: number } | undefined;
    if (lead) {
      await insertEvent.run(lead.id, direction, event.text ?? null, event.messageId);
    }
  }

  return Response.json({ received: events.length }, { status: 200 });
}
