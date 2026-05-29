-- ═══════════════════════════════════════════════════
-- 007 — INBOUND EMAILS (inbox for emails received via Resend Inbound)
-- Run AFTER 006-public-profile-views.sql
--
-- Stores metadata + body for every email Resend delivers to the
-- email.received webhook. Attachment FILES are NOT stored here — only
-- their metadata. The signed download URL is fetched fresh on demand
-- from Resend (URLs expire), see /api/admin/inbox/attachment.
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS inbound_emails (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_email   text,
  to_email     text,
  subject      text,
  body_text    text,
  body_html    text,
  attachments  jsonb,
  email_id     text,                 -- Resend email_id (used to fetch body/attachments)
  is_read      boolean DEFAULT false,
  received_at  timestamptz DEFAULT now(),
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_received ON inbound_emails (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_unread   ON inbound_emails (is_read) WHERE is_read = false;
CREATE UNIQUE INDEX IF NOT EXISTS idx_inbound_emails_email_id ON inbound_emails (email_id) WHERE email_id IS NOT NULL;

-- Access is via the service-role key only (server-side API routes).
-- Lock the table down from anon/authenticated clients with RLS + deny policies,
-- matching the pattern used by admin_emails (004). The service role bypasses RLS.
ALTER TABLE inbound_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inbound_emails_no_anon_read"  ON inbound_emails FOR SELECT USING (false);
CREATE POLICY "inbound_emails_no_anon_write" ON inbound_emails FOR INSERT WITH CHECK (false);
