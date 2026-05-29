// src/lib/adminAuth.js — verify the admin_session cookie in API routes
//
// Mirrors the inline check used by /api/admin/auth and /api/admin/email:
// an HttpOnly JWT cookie named `admin_session`, signed with SESSION_SECRET
// (falling back to ADMIN_SECRET / a dev fallback), carrying { role: 'admin' }.
//
// Usage in a route:
//   const admin = await requireAdmin();
//   if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'admin_session';

function getSecret() {
  const raw =
    process.env.SESSION_SECRET ||
    process.env.ADMIN_SECRET ||
    'aurora-admin-fallback-secret-change-me';
  return new TextEncoder().encode(raw);
}

/**
 * Returns the decoded admin JWT payload if the request carries a valid
 * admin_session cookie, otherwise null.
 * @returns {Promise<{ role: string, username?: string } | null>}
 */
export async function requireAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== 'admin') return null;

    return payload;
  } catch {
    return null;
  }
}
