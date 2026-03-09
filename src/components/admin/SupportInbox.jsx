'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, Send, Loader2, Check, Archive, Clock, User } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { getSupabaseBrowser } from '@/lib/db/supabase-browser';

export default function SupportInbox() {
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/support/conversations');
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } catch (e) { console.error(e); }
    setLoadingConvos(false);
  }, []);

  const fetchMessages = useCallback(async (convoId) => {
    setLoadingMsgs(true);
    try {
      const res = await fetch('/api/support/messages?conversation_id=' + convoId);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (e) { console.error(e); }
    setLoadingMsgs(false);
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (activeConvo) {
      fetchMessages(activeConvo.id);
    }
  }, [activeConvo, fetchMessages]);

  // Realtime for messages
  useEffect(() => {
    if (!activeConvo) return;
    const sb = getSupabaseBrowser();
    if (!sb) return;

    const channel = sb.channel('admin-support-' + activeConvo.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: 'conversation_id=eq.' + activeConvo.id,
      }, (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 50);
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [activeConvo]);

  // Realtime for new conversations
  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) return;

    const channel = sb.channel('admin-convos')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_conversations',
      }, () => { fetchConversations(); })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [fetchConversations]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeConvo || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    try {
      await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConvo.id,
          sender_type: 'admin',
          sender_name: 'Admin',
          message: msg,
        }),
      });
    } catch (e) { console.error(e); }
    setSending(false);
    inputRef.current?.focus();
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Now';
    if (mins < 60) return mins + 'm';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h';
    return Math.floor(hrs / 24) + 'd';
  };

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-200px)] min-h-[500px]">
      {/* Conversation list */}
      <Card className="overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border-light">
          <h3 className="font-display font-semibold text-text text-sm">Conversations</h3>
          <p className="text-[10px] text-muted-dim mt-0.5">{conversations.length} total</p>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {loadingConvos ? (
            <div className="p-8 text-center"><Loader2 size={20} className="animate-spin text-accent mx-auto" /></div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">No conversations yet</div>
          ) : (
            conversations.map(convo => (
              <button
                key={convo.id}
                onClick={() => setActiveConvo(convo)}
                className={"w-full text-left px-4 py-3 border-b border-border-light hover:bg-white/[0.03] transition-colors " + (activeConvo?.id === convo.id ? 'bg-white/[0.05]' : '')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <User size={14} className="text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-text font-medium truncate max-w-[160px]">{convo.visitor_name || 'Anonymous'}</p>
                      <p className="text-[10px] text-muted-dim">{timeAgo(convo.updated_at)}</p>
                    </div>
                  </div>
                  <Badge color={convo.status === 'open' ? 'success' : 'default'} className="!text-[9px]">
                    {convo.status}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Chat area */}
      <Card className="overflow-hidden flex flex-col">
        {!activeConvo ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-surface2 flex items-center justify-center mb-4">
              <MessageCircle size={28} className="text-muted-dim" />
            </div>
            <p className="text-sm text-muted">Select a conversation to start replying</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-5 py-3 border-b border-border-light flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                  <User size={14} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">{activeConvo.visitor_name || 'Anonymous'}</p>
                  <p className="text-[10px] text-muted-dim">ID: {activeConvo.visitor_id}</p>
                </div>
              </div>
              <Badge color={activeConvo.status === 'open' ? 'success' : 'default'}>{activeConvo.status}</Badge>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3" style={{ scrollbarWidth: 'thin' }}>
              {loadingMsgs ? (
                <div className="text-center py-8"><Loader2 size={20} className="animate-spin text-accent mx-auto" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted">No messages yet</div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={"flex gap-2.5 " + (msg.sender_type === 'admin' ? 'flex-row-reverse' : '')}>
                    <div className={"rounded-2xl px-4 py-2.5 max-w-[70%] " + (
                      msg.sender_type === 'admin'
                        ? 'bg-accent-violet/20 rounded-tr-sm'
                        : 'bg-white/[0.04] rounded-tl-sm'
                    )}>
                      <p className="text-sm text-text">{msg.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-muted-dim">{msg.sender_name}</p>
                        <p className="text-[10px] text-muted-dim">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply input */}
            <div className="p-4 border-t border-border-light">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type your reply..."
                  className="flex-1 bg-surface2/60 border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-muted-dim focus:outline-none focus:border-accent/40"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-violet flex items-center justify-center text-bg disabled:opacity-30 hover:opacity-90 transition-opacity"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
