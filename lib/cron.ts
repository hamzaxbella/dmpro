import cron from 'node-cron';
import { db } from './db';

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

// Query due reminders and send notifications every 60 seconds
cron.schedule('* * * * *', async () => {
  try {
    const dueReminders = (await db
          .prepare(
            `SELECT r.id, r.lead_id, r.note, r.due_at, l.ig_username
         FROM reminders r
         JOIN leads l ON l.id = r.lead_id
         WHERE r.due_at <= datetime('now') AND r.sent = 0`
          )
          .all()) as Reminder[];

    for (const reminder of dueReminders) {
      const sent = await sendNotification(reminder);
      if (sent) {
        (await db.prepare('UPDATE reminders SET sent = 1 WHERE id = ?').run(reminder.id));
        console.log(`[cron] Reminder #${reminder.id} sent for @${reminder.ig_username}`);
      }
    }
  } catch (err) {
    console.error('[cron] Error processing reminders:', err);
  }
});

console.log('[cron] Reminder job started — checking every 60s');
