'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MessageCircle, Send, Loader2, X, Minimize2 } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/db/supabase-browser';

const VISITOR_ID_KEY = 'aurora_visitor_id';
const SUPPORT_NAME_KEY = 'aurora_support_name';
const SUPPORT_CONVO_KEY = 'aurora_support_conversation_id';
const SUPPORT_SESSION_CUT_KEY = 'aurora_support_session_cutoff';

function generateVisitorId() {
  if (typeof window === 'undefined') return 'ssr';

  let id = sessionStorage.getItem(VISITOR_ID_KEY);

  if (!id) {
    id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(VISITOR_ID_KEY, id);
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
  const [sessionCutoff, setSessionCutoff] = useState(null);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

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

  const persistSessionCutoff = useCallback((value) => {
    setSessionCutoff(value);

    if (typeof window !== 'undefined') {
      if (value) {
        sessionStorage.setItem(SUPPORT_SESSION_CUT_KEY, value);
      } else {
        sessionStorage.removeItem(SUPPORT_SESSION_CUT_KEY);
      }
    }
  }, []);

  const hydrateExistingSession = useCallback(() => {
    if (typeof window === 'undefined') return;

    const savedName = sessionStorage.getItem(SUPPORT_NAME_KEY) || '';
    const savedConvoId = sessionStorage.getItem(SUPPORT_CONVO_KEY) || '';
    const savedCutoff = sessionStorage.getItem(SUPPORT_SESSION_CUT_KEY) || '';

    if (savedName) {
      setVisitorName(savedName);
      setNameSet(true);
    }

    if (savedConvoId) {
      setConversationId(savedConvoId);
    }

    if (savedCutoff) {
      setSessionCutoff(savedCutoff);
    }
  }, []);

  useEffect(() => {
    hydrateExistingSession();
  }, [hydrateExistingSession]);

  const initConversation = useCallback(
    async (name) => {
      setStartingChat(true);

      try {
        const visitorId = generateVisitorId();
        const cleanName = name?.trim() || 'Anonymous';

        const res = await fetch('/api/support/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitor_id: visitorId,
            visitor_name: cleanName,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || 'Failed to start conversation');
        }

        if (data.conversation?.id) {
          const convoId = data.conversation.id;

          setConversationId(convoId);
          setVisitorName(cleanName);
          setNameSet(true);
          setMessages([]);

          sessionStorage.setItem(SUPPORT_NAME_KEY, cleanName);
          sessionStorage.setItem(SUPPORT_CONVO_KEY, convoId);

          const freshCutoff = new Date().toISOString();
          persistSessionCutoff(freshCutoff);

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
    [persistSessionCutoff, scrollToBottom]
  );

  useEffect(() => {
    if (!conversationId) return;

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
      });

    return () => {
      sb.removeChannel(channel);
    };
  }, [conversationId, isOpen, appendMessageIfMissing, scrollToBottom]);

  useEffect(() => {
    requestAnimationFrame(scrollToBottom);
  }, [messages, scrollToBottom]);

  const visibleMessages = useMemo(() => {
    if (!sessionCutoff) return messages;

    const cutoffTime = new Date(sessionCutoff).getTime();

    return messages.filter((msg) => {
      if (msg._optimistic) return true;
      const created = new Date(msg.created_at).getTime();
      return created >= cutoffTime;
    });
  }, [messages, sessionCutoff]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId || sending) return;

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
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleMinimize = () => {
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setInput('');
    setMessages([]);

    const freshCutoff = new Date().toISOString();
    persistSessionCutoff(freshCutoff);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-violet text-bg shadow-glow-lg transition-transform duration-300 hover:scale-110"
        >
          <MessageCircle size={24} />

          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 flex h-[520px] max-h-[calc(100vh-6rem)] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl shadow-2xl"
          style={{
            background: 'rgba(11,16,32,0.95)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] bg-gradient-to-r from-accent/10 to-accent-violet/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-violet">
                <MessageCircle size={16} className="text-bg" />
              </div>

              <div>
                <p className="text-sm font-semibold text-text">AuroraNft Support</p>
                <p className="flex items-center gap-1 text-[10px] text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  Online
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleMinimize}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-text"
                aria-label="Minimize chat"
              >
                <Minimize2 size={18} />
              </button>

              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-text"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {!nameSet ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent-violet/20">
                <MessageCircle size={28} className="text-accent" />
              </div>

              <h3 className="mb-1 text-lg font-display font-semibold text-text">Hi there!</h3>
              <p className="mb-6 text-sm text-muted">
                Enter your name to start chatting with our team.
              </p>

              <form onSubmit={handleNameSubmit} className="w-full space-y-3">
                <input
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="Your name..."
                  disabled={startingChat}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-text placeholder:text-muted-dim focus:border-accent/40 focus:outline-none disabled:opacity-60"
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={startingChat}
                  className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-violet py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
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
                className="flex-1 space-y-3 overflow-y-auto p-4"
                style={{ scrollbarWidth: 'thin' }}
              >
                {visibleMessages.length === 0 && (
                  <div className="flex gap-2.5">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20">
                      <MessageCircle size={12} className="text-accent" />
                    </div>

                    <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white/[0.04] px-4 py-2.5">
                      <p className="text-sm text-text">
                        Welcome {visitorName || 'there'}! How can we help you today?
                      </p>
                      <p className="mt-1 text-[10px] text-muted-dim">Support Team</p>
                    </div>
                  </div>
                )}

                {visibleMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${
                      msg.sender_type === 'visitor' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    {msg.sender_type === 'admin' && (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-violet/20">
                        <span className="text-[10px] font-bold text-accent-violet">A</span>
                      </div>
                    )}

                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        msg.sender_type === 'visitor'
                          ? 'rounded-tr-sm bg-accent/20'
                          : 'rounded-tl-sm bg-white/[0.04]'
                      }`}
                    >
                      <p className="break-words whitespace-pre-wrap text-sm text-text">
                        {msg.message}
                      </p>

                      <p className="mt-1 text-[10px] text-muted-dim">
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

              <div className="border-t border-white/[0.06] p-3">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={conversationId ? 'Type a message...' : 'Starting chat...'}
                    disabled={!conversationId || sending}
                    className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-text placeholder:text-muted-dim focus:border-accent/40 focus:outline-none disabled:opacity-60"
                  />

                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || !conversationId || sending}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-violet text-bg transition-opacity hover:opacity-90 disabled:opacity-30"
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