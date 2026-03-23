import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface Reminder {
  id: number;
  lead_id: number;
  note: string | null;
  due_at: string;
  ig_username: string;
}

const NOTIFY_WEBHOOK = process.env.NOTIFY_WEBHOOK;

async function sendNotification(reminder: Reminder): Promise<boolean> {
  if (!NOTIFY_WEBHOOK) {
    console.warn('[cron] NOTIFY_WEBHOOK is not set — skipping notification');
    return false;
  }

  const message = [
    `⏰ DMPro Reminder`,
    `Lead: @${reminder.ig_username}`,
    reminder.note ? `Note: ${reminder.note}` : '',
    `Due: ${reminder.due_at}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const resp = await fetch(NOTIFY_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message, chat_id: undefined }),
    });
    return resp.ok;
  } catch (err) {
    console.error('[cron] Failed to send notification:', err);
    return false;
  }
}

/**
 * GET /api/cron — Called by Vercel Cron every minute
 * Processes due reminders and sends notifications.
 */
export async function GET(req: NextRequest) {
  // Verify the request comes from Vercel Cron (production) or allow in dev
  const authHeader = (await req.headers.get('authorization'));
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await db.execute(
      `SELECT r.id, r.lead_id, r.note, r.due_at, l.ig_username
       FROM reminders r
       JOIN leads l ON l.id = r.lead_id
       WHERE r.due_at <= datetime('now') AND r.sent = 0`
    );

    const dueReminders = result.rows as unknown as Reminder[];
    let sent = 0;

    for (const reminder of dueReminders) {
      const ok = await sendNotification(reminder);
      if (ok) {
        await db.execute({
          sql: 'UPDATE reminders SET sent = 1 WHERE id = ?',
          args: [reminder.id],
        });
        console.log(`[cron] Reminder #${reminder.id} sent for @${reminder.ig_username}`);
        sent++;
      }
    }

    return NextResponse.json({ processed: dueReminders.length, sent });
  } catch (err) {
    console.error('[cron] Error processing reminders:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
