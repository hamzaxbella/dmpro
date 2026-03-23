export async function register() {
  // Only run the node-cron background worker in local development.
  // In production (Vercel), we rely securely on Vercel Crons sending requests to /api/cron.
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV !== 'production') {
    await import('./lib/cron');
  }
}
