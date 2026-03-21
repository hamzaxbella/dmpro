import crypto from 'crypto';

/**
 * Verify the X-Hub-Signature-256 header on incoming Meta webhook POSTs.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifySignature(rawBody: string, signatureHeader: string): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error('[meta] META_APP_SECRET is not set');
    return false;
  }

  const expected = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody, 'utf-8')
    .digest('hex');

  const expectedBuffer = Buffer.from(`sha256=${expected}`, 'utf-8');
  const receivedBuffer = Buffer.from(signatureHeader, 'utf-8');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

/**
 * Represents a single parsed messaging event from Meta's webhook payload.
 */
export interface ParsedEvent {
  senderId: string;
  recipientId: string;
  messageId: string;
  text?: string;
  timestamp: number;
}

/**
 * Normalize Meta's deeply-nested webhook payload into flat event objects.
 * Meta's format: body.entry[].messaging[].{sender, recipient, message, timestamp}
 */
export function parseWebhookPayload(body: Record<string, unknown>): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  const entries = (body.entry ?? []) as Array<Record<string, unknown>>;
  for (const entry of entries) {
    const messaging = (entry.messaging ?? []) as Array<Record<string, unknown>>;
    for (const msg of messaging) {
      const sender = msg.sender as Record<string, string> | undefined;
      const recipient = msg.recipient as Record<string, string> | undefined;
      const message = msg.message as Record<string, string> | undefined;

      if (sender?.id && recipient?.id && message?.mid) {
        events.push({
          senderId: sender.id,
          recipientId: recipient.id,
          messageId: message.mid,
          text: message.text,
          timestamp: (msg.timestamp as number) ?? Date.now(),
        });
      }
    }
  }

  return events;
}
