import { NextRequest } from 'next/server';

/**
 * Validates the x-api-key header against CRM_API_SECRET.
 * Returns true if authorized, false otherwise.
 */
export function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRM_API_SECRET;
  if (!secret) return false;
  return req.headers.get('x-api-key') === secret;
}
