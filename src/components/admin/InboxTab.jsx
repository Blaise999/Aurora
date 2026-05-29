'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, Send, Loader2, Paperclip, Image as ImageIcon, RefreshCw } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

// All admin API calls rely on the HttpOnly `admin_session` cookie, which the
// browser sends automatically on same-origin requests — no token handling here.

export default function InboxTab() {
  const [emails, setEmails] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchEmails = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/inbox');
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      }
    } catch {
      /* ignore transient poll errors */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
    const interval = setInterval(fetchEmails, 30000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  async function handleSelect(email) {
    setSelected(email);
    setReply('');
    setSuccess('');
    setError('');

    if (!email.is_read) {
      setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, is_read: true } : e)));
      try {
        await fetch('/api/admin/inbox', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: email.id, is_read: true }),
        });
      } catch {
        /* non-fatal */
      }
    }
  }

  async function handleReply() {
    if (!reply.trim() || !selected) return;
    setSending(true);
    setSuccess('');
    setError('');
    try {
      const res = await fetch('/api/admin/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selected.from_email,
          subject: `Re: ${selected.subject || ''}`.trim(),
          message: reply,
          from_address: selected.to_email,
        }),
      });
      if (res.ok) {
        setSuccess('Reply sent.');
        setReply('');
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Failed to send reply.');
      }
    } catch {
      setError('Failed to send reply.');
    } finally {
      setSending(false);
    }
  }

  async function openAttachment(att) {
    try {
      const res = await fetch(
        `/api/admin/inbox/attachment?email_id=${encodeURIComponent(selected.email_id)}&attachment_id=${encodeURIComponent(att.id)}`
      );
      const data = await res.json();
      if (data.download_url) window.open(data.download_url, '_blank', 'noopener');
      else setError('Could not load attachment.');
    } catch {
      setError('Could not load attachment.');
    }
  }

  const unread = emails.filter((e) => !e.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted">
        <Loader2 size={18} className="animate-spin mr-2" /> Loading inbox…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-text">Inbox</h3>
          <p className="text-xs text-muted mt-0.5">
            {unread > 0 ? `${unread} unread` : 'All caught up'} · {emails.length} total
          </p>
        </div>
        <button
          onClick={fetchEmails}
          className="inline-flex items-center gap-2 text-xs text-muted hover:text-text transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* ── Email list ── */}
        <Card className="overflow-hidden max-h-[70vh] overflow-y-auto">
          {emails.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted">No emails yet.</div>
          ) : (
            emails.map((email) => (
              <button
                key={email.id}
                onClick={() => handleSelect(email)}
                className={`w-full text-left px-4 py-3.5 border-b border-border-light last:border-0 transition-colors
                  ${selected?.id === email.id ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs truncate ${email.is_read ? 'text-muted font-normal' : 'text-text font-semibold'}`}
                  >
                    {email.from_email}
                  </span>
                  {!email.is_read && <span className="w-2 h-2 rounded-full bg-accent shrink-0" />}
                </div>
                <div className="text-[11px] text-muted truncate mt-0.5">
                  {email.subject || '(no subject)'}
                </div>
                <div className="text-[9px] text-muted-dim mt-1">
                  {new Date(email.received_at).toLocaleString()}
                </div>
              </button>
            ))
          )}
        </Card>

        {/* ── Reading pane ── */}
        <Card className="flex flex-col max-h-[70vh] min-h-[420px]">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted gap-2 py-20">
              <Mail size={28} className="opacity-40" />
              <span className="text-sm">Select an email to read</span>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-border-light">
                <div className="text-base font-semibold text-text mb-1">
                  {selected.subject || '(no subject)'}
                </div>
                <div className="text-xs text-muted">
                  From: <span className="text-text">{selected.from_email}</span>
                </div>
                <div className="text-xs text-muted">To: {selected.to_email}</div>
                <div className="text-[11px] text-muted-dim mt-0.5">
                  {new Date(selected.received_at).toLocaleString()}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {selected.body_html ? (
                  <div
                    className="text-sm text-text/90 leading-relaxed [&_a]:text-accent"
                    dangerouslySetInnerHTML={{ __html: selected.body_html }}
                  />
                ) : (
                  <div className="text-sm text-text/90 leading-relaxed whitespace-pre-wrap">
                    {selected.body_text || '(no content)'}
                  </div>
                )}

                {selected.attachments && selected.attachments.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-border-light">
                    <div className="text-[11px] text-muted mb-2 flex items-center gap-1.5">
                      <Paperclip size={12} /> {selected.attachments.length} attachment
                      {selected.attachments.length > 1 ? 's' : ''}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selected.attachments.map((att, i) => (
                        <button
                          key={att.id || i}
                          onClick={() => openAttachment(att)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-border-light text-xs text-text hover:bg-white/[0.07] transition-colors"
                        >
                          {att.content_type?.startsWith('image/') ? (
                            <ImageIcon size={13} className="text-accent" />
                          ) : (
                            <Paperclip size={13} className="text-muted" />
                          )}
                          {att.filename || 'attachment'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-border-light">
                {success && <div className="text-[11px] text-success mb-2">{success}</div>}
                {error && <div className="text-[11px] text-danger mb-2">{error}</div>}
                <textarea
                  className="w-full bg-surface2/60 border border-border-light rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-muted-dim resize-y min-h-[80px] focus:outline-none focus:border-accent/40"
                  placeholder={`Reply to ${selected.from_email}…`}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleReply}
                    disabled={sending || !reply.trim()}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-accent to-accent-violet text-bg font-semibold text-[13px] px-5 py-2.5 rounded-xl transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {sending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Sending…
                      </>
                    ) : (
                      <>
                        <Send size={14} /> Send Reply
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
