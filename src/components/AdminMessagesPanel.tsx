import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Search, X } from 'lucide-react';
import { ChatMessage, Conversation, StudentProfile, TeacherProfile } from '../types';
import ChatThread from './ChatThread';

interface AdminMessagesPanelProps {
  students: StudentProfile[];
  teachers: TeacherProfile[];
  onClose: () => void;
  onFetchConversations: () => Promise<Conversation[]>;
  onFetchMessages: (conversationId: string) => Promise<ChatMessage[]>;
  onSubscribeMessages: (conversationId: string, onInsert: (message: ChatMessage) => void) => () => void;
}

/** Never sends — this is the school office's read-only oversight view of
 *  every parent<->teacher thread. */
export default function AdminMessagesPanel({
  students, teachers, onClose, onFetchConversations, onFetchMessages, onSubscribeMessages,
}: AdminMessagesPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    onFetchConversations()
      .then((rows) => { if (!cancelled) setConversations(rows); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load conversations.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(
    () =>
      conversations.map((c) => ({
        conversation: c,
        studentName: students.find((s) => s.id === c.studentId)?.name ?? 'Unknown student',
        teacherName: teachers.find((t) => t.id === c.teacherId)?.name ?? 'Unknown teacher',
      })),
    [conversations, students, teachers],
  );

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.studentName.toLowerCase().includes(q) || r.teacherName.toLowerCase().includes(q),
    );
  }, [rows, searchTerm]);

  const selected = rows.find((r) => r.conversation.id === selectedId) ?? null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-label="Messages Oversight">
      <div className="bg-white w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
        <div className="bg-[#16305F] text-white p-5 flex items-center justify-between shrink-0">
          <h3 className="font-serif font-bold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gold-400" />
            <span>Messages — School Office View</span>
          </h3>
          <button onClick={onClose} aria-label="Close messages" className="text-gold-200 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 font-light italic text-center py-12">Loading conversations…</p>
        ) : error ? (
          <p className="text-sm text-rose-600 text-center py-12">{error}</p>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-slate-400 font-light italic text-center py-12">
            No parent-teacher conversations have started yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[260px_minmax(0,1fr)] flex-1 min-h-0">
            <div className="border-r border-slate-100 flex flex-col min-h-0">
              <div className="relative p-3 border-b border-slate-100 shrink-0">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search student or teacher…"
                  className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
              <div className="overflow-y-auto divide-y divide-slate-100">
                {filteredRows.length === 0 && (
                  <p className="text-xs text-slate-400 italic p-4">No conversations match.</p>
                )}
                {filteredRows.map((r) => (
                  <button
                    key={r.conversation.id}
                    type="button"
                    onClick={() => setSelectedId(r.conversation.id)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      r.conversation.id === selectedId ? 'bg-[#16305F]/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-800 truncate">{r.teacherName}</p>
                    <p className="text-[10px] text-slate-400 truncate">Re: {r.studentName}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col min-h-0">
              <div className="border-b border-slate-100 px-5 py-3 shrink-0">
                <p className="text-xs text-slate-500">Read-only oversight</p>
                <h4 className="text-sm font-semibold text-slate-900">
                  {selected ? `${selected.teacherName} ↔ ${selected.studentName}'s parent` : 'Select a conversation'}
                </h4>
              </div>
              <div className="flex-1 min-h-0">
                <ChatThread
                  conversationId={selected?.conversation.id ?? null}
                  role="admin"
                  fetchMessages={onFetchMessages}
                  sendMessage={async () => { throw new Error('Admin oversight is read-only.'); }}
                  subscribeMessages={onSubscribeMessages}
                  emptyLabel="Select a conversation on the left to read it."
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
