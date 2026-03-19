'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, Send, Loader2, User } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { getSupabaseBrowser } from '@/lib/db/supabase-browser';

function makeTempMessage({ conversationId, senderType, senderName, message }) {
  return {
    id: 'temp_' + Math.random().toString(36).slice(2) + Date.now(),
    conversation_id: conversationId,
    sender_type: senderType,
    sender_name: senderName,
    message,
    created_at: new Date().toISOString(),
    _optimistic: true,
  };
}

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
  const realtimeReadyRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const appendMessageIfMissing = useCallback((newMessage) => {
    if (!newMessage?.id) return;

    setMessages((prev) => {
      if (prev.some((m) => m.id === newMessage.id)) return prev;

      const optimisticIndex = prev.findIndex(
        (m) =>
          m._optimistic &&
          m.sender_type === newMessage.sender_type &&
          m.sender_name === newMessage.sender_name &&
          m.message === newMessage.message
      );

      if (optimisticIndex !== -1) {
        const next = [...prev];
        next[optimisticIndex] = newMessage;
        return next;
      }

      return [...prev, newMessage];
    });
  }, []);

  const removeTempMessage = useCallback((tempId) => {
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/support/conversations', {
        cache: 'no-store',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch conversations');
      }

      setConversations(data.conversations || []);
    } catch (e) {
      console.error('[ADMIN SUPPORT] fetchConversations failed:', e);
    } finally {
      setLoadingConvos(false);
    }
  }, []);

  const fetchMessages = useCallback(
    async (convoId) => {
      if (!convoId) return;

      setLoadingMsgs(true);

      try {
        const res = await fetch(
          '/api/support/messages?conversation_id=' + encodeURIComponent(convoId),
          { cache: 'no-store' }
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || 'Failed to fetch messages');
        }

        setMessages(data.messages || []);
      } catch (e) {
        console.error('[ADMIN SUPPORT] fetchMessages failed:', e);
        setMessages([]);
      } finally {
        setLoadingMsgs(false);
        requestAnimationFrame(scrollToBottom);
      }
    },
    [scrollToBottom]
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (activeConvo?.id) {
      fetchMessages(activeConvo.id);
    } else {
      setMessages([]);
    }
  }, [activeConvo, fetchMessages]);

  useEffect(() => {
    if (!activeConvo?.id) return;

    realtimeReadyRef.current = false;

    const sb = getSupabaseBrowser();
    if (!sb) return;

    const channel = sb
      .channel('admin-support-' + activeConvo.id, {
        config: { broadcast: { self: true } },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: 'conversation_id=eq.' + activeConvo.id,
        },
        (payload) => {
          appendMessageIfMissing(payload.new);
          requestAnimationFrame(scrollToBottom);
        }
      )
      .subscribe((status) => {
        console.log('[ADMIN SUPPORT] messages realtime status:', status);
        if (status === 'SUBSCRIBED') {
          realtimeReadyRef.current = true;
        }
      });

    return () => {
      realtimeReadyRef.current = false;
      sb.removeChannel(channel);
    };
  }, [activeConvo, appendMessageIfMissing, scrollToBottom]);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) return;

    const channel = sb
      .channel('admin-convos', {
        config: { broadcast: { self: true } },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_conversations',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe((status) => {
        console.log('[ADMIN SUPPORT] conversations realtime status:', status);
      });

    return () => {
      sb.removeChannel(channel);
    };
  }, [fetchConversations]);

  useEffect(() => {
    requestAnimationFrame(scrollToBottom);
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || !activeConvo?.id) return;

    const msg = input.trim();
    const tempMessage = makeTempMessage({
      conversationId: activeConvo.id,
      senderType: 'admin',
      senderName: 'Admin',
      message: msg,
    });

    setInput('');
    setSending(true);
    appendMessageIfMissing(tempMessage);
    requestAnimationFrame(scrollToBottom);

    try {
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConvo.id,
          sender_type: 'admin',
          sender_name: 'Admin',
          message: msg,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to send message');
      }

      if (data.message) {
        appendMessageIfMissing(data.message);
      } else {
        removeTempMessage(tempMessage.id);
      }

      requestAnimationFrame(scrollToBottom);
    } catch (e) {
      console.error('[ADMIN SUPPORT] send failed:', e);
      removeTempMessage(tempMessage.id);
      setInput(msg);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
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
      <Card className="overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border-light">
          <h3 className="font-display font-semibold text-text text-sm">Conversations</h3>
          <p className="text-[10px] text-muted-dim mt-0.5">{conversations.length} total</p>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {loadingConvos ? (
            <div className="p-8 text-center">
              <Loader2 size={20} className="animate-spin text-accent mx-auto" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">No conversations yet</div>
          ) : (
            conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => setActiveConvo(convo)}
                className={
                  'w-full text-left px-4 py-3 border-b border-border-light hover:bg-white/[0.03] transition-colors ' +
                  (activeConvo?.id === convo.id ? 'bg-white/[0.05]' : '')
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <User size={14} className="text-accent" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm text-text font-medium truncate max-w-[160px]">
                        {convo.visitor_name || 'Anonymous'}
                      </p>
                      <p className="text-[10px] text-muted-dim">{timeAgo(convo.updated_at)}</p>
                    </div>
                  </div>

                  <Badge
                    color={convo.status === 'open' ? 'success' : 'default'}
                    className="!text-[9px]"
                  >
                    {convo.status || 'open'}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>
      </Card>

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
            <div className="px-5 py-3 border-b border-border-light flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <User size={14} className="text-accent" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text truncate">
                    {activeConvo.visitor_name || 'Anonymous'}
                  </p>
                  <p className="text-[10px] text-muted-dim truncate">
                    ID: {activeConvo.visitor_id}
                  </p>
                </div>
              </div>

              <Badge color={activeConvo.status === 'open' ? 'success' : 'default'}>
                {activeConvo.status || 'open'}
              </Badge>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-5 space-y-3"
              style={{ scrollbarWidth: 'thin' }}
            >
              {loadingMsgs ? (
                <div className="text-center py-8">
                  <Loader2 size={20} className="animate-spin text-accent mx-auto" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted">No messages yet</div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={'flex gap-2.5 ' + (msg.sender_type === 'admin' ? 'flex-row-reverse' : '')}
                  >
                    <div
                      className={
                        'rounded-2xl px-4 py-2.5 max-w-[70%] ' +
                        (msg.sender_type === 'admin'
                          ? 'bg-accent-violet/20 rounded-tr-sm'
                          : 'bg-white/[0.04] rounded-tl-sm')
                      }
                    >
                      <p className="text-sm text-text whitespace-pre-wrap break-words">
                        {msg.message}
                      </p>

                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-muted-dim">{msg.sender_name}</p>
                        <p className="text-[10px] text-muted-dim">
                          {msg._optimistic
                            ? 'Sending...'
                            : new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-border-light">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Type your reply..."
                  disabled={!activeConvo?.id}
                  className="flex-1 bg-surface2/60 border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-muted-dim focus:outline-none focus:border-accent/40 disabled:opacity-60"
                />

                <button
                  onClick={handleSend}
                  disabled={!input.trim() || !activeConvo?.id}
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