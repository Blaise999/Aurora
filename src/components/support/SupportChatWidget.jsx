'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Loader2, Minimize2 } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/db/supabase-browser';

function generateVisitorId() {
  if (typeof window === 'undefined') return 'ssr';

  let id = sessionStorage.getItem('aurora_visitor_id');

  if (!id) {
    id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('aurora_visitor_id', id);
  }

  return id;
}

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

export default function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [visitorName, setVisitorName] = useState('');
  const [nameSet, setNameSet] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [unread, setUnread] = useState(0);

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

  const initConversation = useCallback(
    async (name) => {
      setStartingChat(true);

      try {
        const visitorId = generateVisitorId();

        const res = await fetch('/api/support/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitor_id: visitorId,
            visitor_name: name?.trim() || 'Anonymous',
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || 'Failed to start conversation');
        }

        if (data.conversation) {
          setConversationId(data.conversation.id);

          const msgRes = await fetch(
            '/api/support/messages?conversation_id=' +
              encodeURIComponent(data.conversation.id),
            { cache: 'no-store' }
          );

          const msgData = await msgRes.json();

          if (!msgRes.ok) {
            throw new Error(msgData?.error || 'Failed to load messages');
          }

          setMessages(msgData.messages || []);
          setNameSet(true);

          requestAnimationFrame(() => {
            scrollToBottom();
            inputRef.current?.focus();
          });
        }
      } catch (e) {
        console.error('[SUPPORT WIDGET] Failed to init conversation:', e);
      } finally {
        setStartingChat(false);
      }
    },
    [scrollToBottom]
  );

  useEffect(() => {
    if (!conversationId) return;

    realtimeReadyRef.current = false;

    const sb = getSupabaseBrowser();
    if (!sb) return;

    const channel = sb
      .channel('support-' + conversationId, {
        config: { broadcast: { self: true } },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: 'conversation_id=eq.' + conversationId,
        },
        (payload) => {
          appendMessageIfMissing(payload.new);

          if (!isOpen && payload.new.sender_type === 'admin') {
            setUnread((prev) => prev + 1);
          }

          requestAnimationFrame(scrollToBottom);
        }
      )
      .subscribe((status) => {
        console.log('[SUPPORT WIDGET] realtime status:', status);
        if (status === 'SUBSCRIBED') {
          realtimeReadyRef.current = true;
        }
      });

    return () => {
      realtimeReadyRef.current = false;
      sb.removeChannel(channel);
    };
  }, [conversationId, isOpen, appendMessageIfMissing, scrollToBottom]);

  useEffect(() => {
    requestAnimationFrame(scrollToBottom);
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId) return;

    const msg = input.trim();
    const senderName = visitorName?.trim() || 'Anonymous';

    const tempMessage = makeTempMessage({
      conversationId,
      senderType: 'visitor',
      senderName,
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
          conversation_id: conversationId,
          sender_type: 'visitor',
          sender_name: senderName,
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
      console.error('[SUPPORT WIDGET] Failed to send message:', e);
      removeTempMessage(tempMessage.id);
      setInput(msg);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    if (startingChat) return;
    await initConversation(visitorName);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setUnread(0);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent-violet shadow-glow-lg flex items-center justify-center text-bg hover:scale-110 transition-transform duration-300"
        >
          <MessageCircle size={24} />

          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[520px] max-h-[calc(100vh-6rem)] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{
            background: 'rgba(11,16,32,0.95)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-gradient-to-r from-accent/10 to-accent-violet/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-violet flex items-center justify-center">
                <MessageCircle size={16} className="text-bg" />
              </div>

              <div>
                <p className="text-sm font-semibold text-text">AuroraNft Support</p>
                <p className="text-[10px] text-success flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Online
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-muted hover:text-text transition-colors rounded-lg hover:bg-white/[0.06]"
            >
              <Minimize2 size={18} />
            </button>
          </div>

          {!nameSet ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent/20 to-accent-violet/20 flex items-center justify-center mb-4">
                <MessageCircle size={28} className="text-accent" />
              </div>

              <h3 className="text-lg font-display font-semibold text-text mb-1">Hi there!</h3>
              <p className="text-sm text-muted mb-6">
                Enter your name to start chatting with our team.
              </p>

              <form onSubmit={handleNameSubmit} className="w-full space-y-3">
                <input
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="Your name..."
                  disabled={startingChat}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-text placeholder:text-muted-dim focus:outline-none focus:border-accent/40 disabled:opacity-60"
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={startingChat}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-accent-violet text-bg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {startingChat ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Starting chat...
                    </span>
                  ) : (
                    'Start Chat'
                  )}
                </button>
              </form>
            </div>
          ) : (
            <>
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3"
                style={{ scrollbarWidth: 'thin' }}
              >
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageCircle size={12} className="text-accent" />
                  </div>

                  <div className="bg-white/[0.04] rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[80%]">
                    <p className="text-sm text-text">
                      Welcome {visitorName || 'there'}! How can we help you today?
                    </p>
                    <p className="text-[10px] text-muted-dim mt-1">Support Team</p>
                  </div>
                </div>

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.sender_type === 'visitor' ? 'flex-row-reverse' : ''}`}
                  >
                    {msg.sender_type === 'admin' && (
                      <div className="w-7 h-7 rounded-full bg-accent-violet/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-accent-violet">A</span>
                      </div>
                    )}

                    <div
                      className={`rounded-2xl px-4 py-2.5 max-w-[80%] ${
                        msg.sender_type === 'visitor'
                          ? 'bg-accent/20 rounded-tr-sm'
                          : 'bg-white/[0.04] rounded-tl-sm'
                      }`}
                    >
                      <p className="text-sm text-text whitespace-pre-wrap break-words">
                        {msg.message}
                      </p>

                      <p className="text-[10px] text-muted-dim mt-1">
                        {msg._optimistic
                          ? 'Sending...'
                          : new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-white/[0.06]">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={conversationId ? 'Type a message...' : 'Starting chat...'}
                    disabled={!conversationId}
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-muted-dim focus:outline-none focus:border-accent/40 disabled:opacity-60"
                  />

                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || !conversationId}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-violet flex items-center justify-center text-bg disabled:opacity-30 hover:opacity-90 transition-opacity"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}