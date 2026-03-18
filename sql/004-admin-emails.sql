-- ═══════════════════════════════════════════════════
-- 004 — ADMIN EMAILS (outbox log for support@auroranft.art)
-- Run AFTER 003-user-listed.sql
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS admin_emails (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  to_email    text NOT NULL,
  subject     text NOT NULL,
  body        text NOT NULL,
  resend_id   text,
  sent_by     text,
  sent_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_emails_sent ON admin_emails (sent_at DESC);

ALTER TABLE admin_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_emails_no_anon_read" ON admin_emails FOR SELECT USING (false);
CREATE POLICY "admin_emails_no_anon_write" ON admin_emails FOR INSERT WITH CHECK (false);
