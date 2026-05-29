// src/app/api/admin/inbox/attachment/route.js
//
// GET ?email_id=...&attachment_id=...  — returns a fresh signed download URL
// for one attachment on a received email (admin only).
//
// Resend's attachment download URLs expire, so we never persist them; we ask
// Resend for a new one each time the admin clicks an attachment.

export const runtime = 'nodejs';

import { requireAdmin } from '@/lib/adminAuth';
import { resend } from '@/lib/resendClient';

export async function GET(req) {
  try {
    const admin = await requireAdmin();
    if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const email_id = searchParams.get('email_id');
    const attachment_id = searchParams.get('attachment_id');

    if (!email_id || !attachment_id) {
      return Response.json({ error: 'Missing params' }, { status: 400 });
    }

    const { data, error } = await resend.emails.receiving.attachments.get({
      emailId: email_id,
      id: attachment_id,
    });

    if (error || !data?.download_url) {
      console.error('[INBOX ATTACHMENT] error:', JSON.stringify(error));
      return Response.json({ error: 'Failed to get attachment' }, { status: 500 });
    }

    return Response.json({ download_url: data.download_url, expires_at: data.expires_at });
  } catch (error) {
    console.error('[INBOX ATTACHMENT] error:', error);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
