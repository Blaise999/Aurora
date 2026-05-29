// src/app/api/admin/inbox/route.js
//
// GET   — list the most recent inbound emails (admin only)
// PATCH — mark a single email read / unread (admin only)
//
// Auth: admin_session cookie (see src/lib/adminAuth.js). No bearer token —
// the HttpOnly cookie is sent automatically on same-origin requests.

export const runtime = 'nodejs';

import { requireAdmin } from '@/lib/adminAuth';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = getServiceSupabase();
    const { data: emails, error } = await sb
      .from('inbound_emails')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[INBOX] list error:', JSON.stringify(error));
      return Response.json({ emails: [], note: 'Table may not exist. Run sql/007-inbound-emails.sql.' });
    }

    return Response.json({ emails: emails || [] });
  } catch (err) {
    console.error('[INBOX] error:', err);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const admin = await requireAdmin();
    if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, is_read } = await req.json();
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    const sb = getServiceSupabase();
    await sb.from('inbound_emails').update({ is_read: !!is_read }).eq('id', id);

    return Response.json({ success: true });
  } catch (err) {
    console.error('[INBOX] patch error:', err);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
