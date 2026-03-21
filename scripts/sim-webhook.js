/**
 * sim-webhook.js — Simulate inbound/outbound Instagram DM webhook events
 * Usage:
 *   node scripts/sim-webhook.js inbound   <sender_id> "message text"
 *   node scripts/sim-webhook.js outbound  <recipient_id> "message text"
 *
 * Examples:
 *   node scripts/sim-webhook.js inbound  friend123 "Hey, I'm interested!"
 *   node scripts/sim-webhook.js outbound friend123 "Thanks for reaching out"
 */

const crypto = require('crypto');
const http   = require('http');

// Load env vars from .env.local
const fs = require('fs');
const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const APP_SECRET = env.META_APP_SECRET;
const PAGE_ID    = env.META_PAGE_ID;

if (!APP_SECRET || !PAGE_ID) {
  console.error('Missing META_APP_SECRET or META_PAGE_ID in .env.local');
  process.exit(1);
}

const [,, direction = 'inbound', otherId = 'testfriend001', ...msgParts] = process.argv;
const text = msgParts.join(' ') || 'Test message from simulator';

const isOutbound = direction === 'outbound';
const senderId    = isOutbound ? PAGE_ID : otherId;
const recipientId = isOutbound ? otherId : PAGE_ID;

const payload = JSON.stringify({
  object: 'instagram',
  entry: [{
    id: PAGE_ID,
    time: Date.now(),
    messaging: [{
      sender:    { id: senderId },
      recipient: { id: recipientId },
      timestamp: Date.now(),
      message: {
        mid: `mid.sim.${Date.now()}.${Math.random().toString(36).slice(2)}`,
        text,
      },
    }],
  }],
});

const signature = 'sha256=' + crypto
  .createHmac('sha256', APP_SECRET)
  .update(payload, 'utf8')
  .digest('hex');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-hub-signature-256': signature,
    'Content-Length': Buffer.byteLength(payload),
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log(`✓ ${direction.toUpperCase()} event sent`);
      console.log(`  Other party ID : ${otherId}`);
      console.log(`  Message        : "${text}"`);
      console.log(`  Response       : ${data}`);
    } else {
      console.error(`✗ Server returned ${res.statusCode}: ${data}`);
    }
  });
});

req.on('error', (e) => console.error('Failed to reach localhost:3000 —', e.message));
req.write(payload);
req.end();
