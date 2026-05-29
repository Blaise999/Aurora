// src/app/api/email/inbound/route.js
//
// Resend "email.received" webhook. The webhook payload is METADATA ONLY —
// the body and attachment contents are fetched separately from the Resend
// Inbound API. This route:
//   1. (optionally) verifies the svix signature when RESEND_WEBHOOK_SECRET is set
//   2. fetches the full email body via resend.emails.receiving.get()
//   3. stores metadata + body (+ attachment metadata) in `inbound_emails`
//   4. fires a Pushover notification
//
// Must always return 200 quickly — Resend retries non-200 responses.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { getServiceSupabase } from '@/lib/supabase/server';
import { resend } from '@/lib/resendClient';
import { sendPushover } from '@/lib/pushover';

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || '';

export async function POST(req) {
  try {
    const payload = await req.text();

    // ── 1. Verify signature (recommended). Falls back to plain parse if no
    //       secret is configured yet, so initial setup still works. ──
    let body;
    if (WEBHOOK_SECRET) {
      try {
        body = resend.webhooks.verify({
          payload,
          webhookSecret: WEBHOOK_SECRET,
          headers: {
            id: req.headers.get('svix-id') || req.headers.get('webhook-id'),
            timestamp: req.headers.get('svix-timestamp') || req.headers.get('webhook-timestamp'),
            signature: req.headers.get('svix-signature') || req.headers.get('webhook-signature'),
          },
        });
      } catch (err) {
        console.error('[INBOUND] Signature verification failed:', err?.message || err);
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.warn('[INBOUND] RESEND_WEBHOOK_SECRET not set — skipping signature verification');
      body = JSON.parse(payload);
    }

    if (body.type !== 'email.received') {
      return Response.json({ success: true });
    }

    const {
      email_id,
      from,
      subject,
      to,
      attachments: attachmentsMeta,
    } = body.data;

    // ── 2. Fetch full email body from the Resend Inbound API ──
    let bodyText = '';
    let bodyHtml = '';
    try {
      const { data: fullEmail } = await resend.emails.receiving.get(email_id);
      bodyText = fullEmail?.text || '';
      bodyHtml = fullEmail?.html || '';
    } catch (err) {
      console.error('[INBOUND] Failed to fetch email body:', err?.message || err);
    }

    // Store attachment metadata only — signed download URLs expire, so we
    // fetch a fresh one on demand (see /api/admin/inbox/attachment).
    const attachments = (attachmentsMeta || []).map((att) => ({
      id: att.id,
      filename: att.filename,
      content_type: att.content_type,
      size: att.size || null,
    }));

    const toEmail = Array.isArray(to) ? to[0] : to || '';

    // ── 3. Store ──
    const sb = getServiceSupabase();
    const { error: insertError } = await sb.from('inbound_emails').insert({
      from_email: from,
      to_email: toEmail,
      subject: subject || '(no subject)',
      body_text: bodyText,
      body_html: bodyHtml,
      attachments: attachments.length > 0 ? attachments : null,
      email_id,
      received_at: body.created_at || new Date().toISOString(),
    });

    if (insertError) {
      console.error('[INBOUND] Insert error:', JSON.stringify(insertError));
    }

    // ── 4. Pushover notification ──
    try {
      const preview = (bodyText || '').slice(0, 200);
      await sendPushover({
        title: `📧 New Email — ${toEmail || 'support'}`,
        message:
          `<b>From:</b> ${from}\n` +
          `<b>Subject:</b> ${subject || '(no subject)'}` +
          (preview ? `\n\n${preview}` : ''),
        priority: 1,
      });
    } catch (err) {
      console.error('[INBOUND] Pushover failed:', err?.message || err);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[INBOUND] error:', error);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
