'use client';
import { useState, useEffect, useCallback } from 'react';
import { Send, Loader2, Check, Mail, Clock, User, Eye, ChevronDown, ChevronUp, AlertTriangle, Inbox } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function AdminEmailComposer() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [sentEmails, setSentEmails] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedEmail, setExpandedEmail] = useState(null);

  // Load sent emails history
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/email');
      const data = await res.json();
      if (data.emails) setSentEmails(data.emails);
    } catch (e) { console.error(e); }
    setLoadingHistory(false);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setSending(true);
    setError('');
    setSent(false);

    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), subject: subject.trim(), body: body.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to send');

      setSent(true);
      setTimeout(() => {
        setSent(false);
        setTo('');
        setSubject('');
        setBody('');
      }, 3000);

      loadHistory();
    } catch (e) {
      setError(e.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Compose */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Mail size={18} className="text-accent" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-text">Compose Email</h3>
            <p className="text-xs text-muted">
              Send from <span className="text-accent font-mono">support@auroranft.art</span> with branded template
            </p>
          </div>
        </div>

        <Input
          label="To"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="user@example.com"
          type="email"
        />

        <Input
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Welcome to AuroraNFT!"
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-text">Message Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message here. Line breaks are preserved."
            rows={6}
            className="w-full px-4 py-3 rounded-xl bg-surface2/60 border border-border-light text-text placeholder:text-muted-dim focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors text-sm resize-none font-[inherit]"
          />
        </div>

        {/* Preview toggle */}
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
        >
          <Eye size={14} />
          {showPreview ? 'Hide' : 'Show'} Email Preview
          {showPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showPreview && (
          <div className="rounded-xl border border-border-light overflow-hidden">
            <div className="bg-[#050810] p-4">
              <div className="max-w-[560px] mx-auto rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: 'linear-gradient(180deg,#0B1121 0%,#0A0F1E 100%)' }}>
                {/* Preview header */}
                <div className="p-6 text-center border-b border-white/[0.06]">
                  <img src="/pictures/logo.png" alt="AuroraNFT" className="h-[44px] mx-auto object-contain" />
                </div>
                {/* Preview subject */}
                <div className="px-6 pt-5">
                  <h2 className="text-lg font-bold text-white">{subject || 'Subject line'}</h2>
                </div>
                {/* Preview body */}
                <div className="px-6 py-4">
                  <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                    {body || 'Your message will appear here...'}
                  </div>
                </div>
                {/* Preview CTA */}
                <div className="px-6 pb-5 text-center">
                  <span className="inline-block px-6 py-3 rounded-xl text-sm font-bold text-[#071019]" style={{ background: 'linear-gradient(135deg,#22d3ee 0%,#8b5cf6 100%)' }}>
                    Visit AuroraNFT
                  </span>
                </div>
                {/* Preview footer */}
                <div className="px-6 py-4 border-t border-white/[0.06] text-center">
                  <p className="text-[11px] text-white/30">
                    From support@auroranft.art · © {new Date().getFullYear()} AuroraNFT
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20">
            <AlertTriangle size={14} className="text-danger shrink-0" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleSend}
            disabled={sending || sent || !to || !subject || !body}
          >
            {sending ? (
              <><Loader2 size={14} className="animate-spin" /> Sending...</>
            ) : sent ? (
              <><Check size={14} /> Sent!</>
            ) : (
              <><Send size={14} /> Send Email</>
            )}
          </Button>
          {sent && <Badge color="success">Email delivered successfully</Badge>}
        </div>
      </Card>

      {/* Sent History */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-border-light flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-violet/10 flex items-center justify-center">
              <Inbox size={16} className="text-accent-violet" />
            </div>
            <h3 className="font-display font-semibold text-text">Sent Emails</h3>
          </div>
          <Badge color="default">{sentEmails.length} total</Badge>
        </div>

        <div className="divide-y divide-border-light">
          {loadingHistory ? (
            <div className="p-8 text-center">
              <Loader2 size={20} className="animate-spin text-accent mx-auto mb-2" />
              <p className="text-sm text-muted">Loading history...</p>
            </div>
          ) : sentEmails.length === 0 ? (
            <div className="p-8 text-center">
              <Mail size={28} className="mx-auto mb-3 text-muted-dim" />
              <p className="text-sm text-muted">No emails sent yet</p>
              <p className="text-xs text-muted-dim mt-1">Compose your first email above</p>
            </div>
          ) : (
            sentEmails.map((email) => (
              <div key={email.id} className="hover:bg-white/[0.02] transition-colors">
                <button
                  onClick={() => setExpandedEmail(expandedEmail === email.id ? null : email.id)}
                  className="w-full px-5 py-4 text-left flex items-center gap-4"
                >
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <Send size={13} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text truncate">{email.subject}</p>
                      <Badge color="success" className="!text-[9px] shrink-0">Sent</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted flex items-center gap-1">
                        <User size={10} /> {email.to_email}
                      </span>
                      <span className="text-xs text-muted-dim flex items-center gap-1">
                        <Clock size={10} /> {new Date(email.sent_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {expandedEmail === email.id ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
                </button>

                {expandedEmail === email.id && (
                  <div className="px-5 pb-4">
                    <div className="ml-12 p-4 rounded-xl bg-surface2/40 border border-border-light">
                      <p className="text-sm text-muted whitespace-pre-wrap">{email.body}</p>
                      {email.resend_id && (
                        <p className="text-[10px] text-muted-dim mt-3 font-mono">Resend ID: {email.resend_id}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
