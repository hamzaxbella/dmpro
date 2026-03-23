import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

interface FunnelRow {
  status: string;
  count: number;
}

interface VolumeRow {
  date: string;
  total: number;
  outbound: number;
  inbound: number;
}

/**
 * GET /api/analytics — Aggregated metrics
 * Query: ?range=7d | 30d | 90d | all (default: 30d)
 */
export async function GET(request: NextRequest) {
  const range = (await request.nextUrl.searchParams.get('range')) ?? '30d';

  // Compute date floor based on range
  let dateFilter = '';
  const days = range === '7d' ? 7 : range === '90d' ? 90 : range === 'all' ? 0 : 30;
  if (days > 0) {
    dateFilter = `AND e.created_at >= datetime('now', '-${days} days')`;
  }

  // 1. Funnel counts — leads per status
  const funnel = (await db
      .prepare('SELECT status, COUNT(*) as count FROM leads GROUP BY status')
      .all()) as FunnelRow[];

  // 2. Total leads
  const totalLeads = (
    (await db.prepare('SELECT COUNT(*) as n FROM leads').get()) as { n: number }
  ).n;

  // 3. Reply rate — distinct leads who have inbound events / total leads with any event
  const replyRate = (await db
      .prepare(
        `SELECT
         CAST(COUNT(DISTINCT CASE WHEN direction = 'inbound' THEN lead_id END) AS REAL) /
         NULLIF(COUNT(DISTINCT lead_id), 0) as rate
       FROM events`
      )
      .get()) as { rate: number | null };

  // 4. Conversion rate — leads reaching 'closed' / total leads
  const conversionRate = (await db
      .prepare(
        `SELECT CAST(COUNT(CASE WHEN status = 'closed' THEN 1 END) AS REAL) /
              NULLIF(COUNT(*), 0) as rate
       FROM leads`
      )
      .get()) as { rate: number | null };

  // 5. Daily DM volume (within range)
  const volume = (await db
      .prepare(
        `SELECT
         date(e.created_at) as date,
         COUNT(*) as total,
         COUNT(CASE WHEN direction = 'outbound' THEN 1 END) as outbound,
         COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as inbound
       FROM events e
       WHERE 1=1 ${dateFilter}
       GROUP BY date(e.created_at)
       ORDER BY date(e.created_at) ASC`
      )
      .all()) as VolumeRow[];

  // 6. Avg response time (first inbound - first outbound, per lead)
  const avgResponseTime = (await db
      .prepare(
        `SELECT AVG(response_hours) as avg_hours FROM (
         SELECT
           lead_id,
           (julianday(MIN(CASE WHEN direction='inbound' THEN created_at END)) -
            julianday(MIN(CASE WHEN direction='outbound' THEN created_at END))) * 24 as response_hours
         FROM events
         GROUP BY lead_id
         HAVING response_hours IS NOT NULL AND response_hours > 0
       )`
      )
      .get()) as { avg_hours: number | null };

  return Response.json({
    totalLeads,
    replyRate: replyRate?.rate ?? 0,
    conversionRate: conversionRate?.rate ?? 0,
    avgResponseHours: avgResponseTime?.avg_hours ?? null,
    funnel,
    volume,
    range,
  });
}
