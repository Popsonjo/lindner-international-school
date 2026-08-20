import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatThreadProps {
  conversationId: string | null;
  /** 'admin' renders every bubble read-only — the oversight view can look but not write. */
  role: 'parent' | 'teacher' | 'admin';
  fetchMessages: (conversationId: string) => Promise<ChatMessage[]>;
  sendMessage: (conversationId: string, body: string) => Promise<ChatMessage>;
  subscribeMessages: (conversationId: string, onInsert: (message: ChatMessage) => void) => () => void;
  placeholder?: string;
  emptyLabel?: string;
}

export default function ChatThread({
  conversationId, role, fetchMessages, sendMessage, subscribeMessages,
  placeholder = 'Write a message…',
  emptyLabel = 'Select a conversation to begin.',
}: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchMessages(conversationId)
      .then((rows) => { if (!cancelled) setMessages(rows); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load messages.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    const unsubscribe = subscribeMessages(conversationId, (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversationId || !draft.trim() || role === 'admin') return;
    const body = draft.trim();
    setDraft('');
    setBusy(true);
    setError('');
    try {
      const sent = await sendMessage(conversationId, body);
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send that message.');
      setDraft(body);
    } finally {
      setBusy(false);
    }
  };

  if (!conversationId) {
    return <p className="text-xs text-slate-400 italic p-6 text-center">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
        {loading && <p className="text-slate-400 italic">Loading…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-slate-400 italic">No messages yet — say hello.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.senderRole === 'teacher' ? 'items-end' : 'items-start'}`}>
            <span className="text-[9px] uppercase tracking-wide font-semibold text-slate-400 mb-1">
              {m.senderRole === 'teacher' ? 'Teacher' : 'Parent'}
            </span>
            <div
              className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                m.senderRole === 'teacher'
                  ? 'bg-navy-700 text-white rounded-br-none'
                  : 'bg-slate-100 text-slate-700 rounded-bl-none border border-slate-200/50'
              }`}
            >
              {m.body}
            </div>
            <span className="text-[9px] text-slate-400 mt-1 font-mono font-light">
              {new Date(m.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-2 text-[10px] text-rose-600">{error}</p>}

      {role !== 'admin' && (
        <form onSubmit={handleSubmit} className="p-2 border-t border-slate-100 bg-slate-50 flex gap-1 items-center shrink-0">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            disabled={busy}
            aria-label="Message"
            className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-navy-500 bg-white disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="p-2 bg-navy-700 hover:bg-navy-600 text-white rounded-xl transition-all disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}
