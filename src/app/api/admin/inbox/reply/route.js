// src/app/api/admin/inbox/reply/route.js
//
// POST — reply to an inbound email (admin only). The reply is sent FROM the
// same address the original email was received on, so threads stay consistent.
//
// The list of addresses you're allowed to send from is configured via the
// RESEND_INBOX_ADDRESSES env var (comma-separated). It falls back to
// RESEND_SUPPORT_EMAIL, then RESEND_FROM_EMAIL. If the requested from_address
// isn't in the allow-list, the first allowed address is used instead.

export const runtime = 'nodejs';

import { requireAdmin } from '@/lib/adminAuth';
import { resend } from '@/lib/resendClient';

function getValidFromAddresses() {
  const list = (process.env.RESEND_INBOX_ADDRESSES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (list.length > 0) return list;

  const fallback =
    process.env.RESEND_SUPPORT_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    'support@auroranft.art';
  return [fallback];
}

export async function POST(req) {
  try {
    const admin = await requireAdmin();
    if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to, subject, message, from_address } = await req.json();
    if (!to || !message) {
      return Response.json({ error: 'Missing to or message' }, { status: 400 });
    }

    const validFromAddresses = getValidFromAddresses();
    const fromAddress = validFromAddresses.includes(from_address)
      ? from_address
      : validFromAddresses[0];

    const safeMessage = String(message).replace(/\n/g, '<br/>');

    const { error } = await resend.emails.send({
      from: `AuroraNFT Support <${fromAddress}>`,
      to,
      subject: subject || 'Re:',
      replyTo: fromAddress,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#333;">${safeMessage}</div>`,
      text: String(message),
    });

    if (error) {
      console.error('[INBOX REPLY] Resend error:', JSON.stringify(error));
      return Response.json({ error: error?.message || 'Failed to send' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[INBOX REPLY] error:', error);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
