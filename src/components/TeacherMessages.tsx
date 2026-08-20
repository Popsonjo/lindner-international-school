import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Search, Users, X } from 'lucide-react';
import { ChatMessage, Conversation, StudentProfile } from '../types';
import ChatThread from './ChatThread';

interface TeacherMessagesProps {
  students: StudentProfile[];
  teacherId: string;
  onClose: () => void;
  onGetOrCreateConversation: (studentId: string, teacherId: string) => Promise<Conversation>;
  onFetchMessages: (conversationId: string) => Promise<ChatMessage[]>;
  onSendMessage: (conversationId: string, body: string) => Promise<ChatMessage>;
  onSubscribeMessages: (conversationId: string, onInsert: (message: ChatMessage) => void) => () => void;
}

export default function TeacherMessages({
  students, teacherId, onClose,
  onGetOrCreateConversation, onFetchMessages, onSendMessage, onSubscribeMessages,
}: TeacherMessagesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id ?? '');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationError, setConversationError] = useState('');

  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.parentName.toLowerCase().includes(q),
    );
  }, [students, searchTerm]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null;

  useEffect(() => {
    if (!selectedStudentId) {
      setConversationId(null);
      return;
    }
    let cancelled = false;
    setConversationError('');
    onGetOrCreateConversation(selectedStudentId, teacherId)
      .then((conversation) => { if (!cancelled) setConversationId(conversation.id); })
      .catch((err) => {
        if (!cancelled) {
          setConversationId(null);
          setConversationError(err instanceof Error ? err.message : 'Could not open that conversation.');
        }
      });
    return () => { cancelled = true; };
  }, [selectedStudentId, teacherId, onGetOrCreateConversation]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-label="Teacher Messages">
      <div className="bg-white w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
        <div className="bg-[#16305F] text-white p-5 flex items-center justify-between shrink-0">
          <h3 className="font-serif font-bold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gold-400" />
            <span>Message Parents</span>
          </h3>
          <button onClick={onClose} aria-label="Close messages" className="text-gold-200 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {students.length === 0 ? (
          <p className="text-sm text-slate-400 font-light italic text-center py-12">
            No students are assigned to you yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[220px_minmax(0,1fr)] flex-1 min-h-0">
            <div className="border-r border-slate-100 flex flex-col min-h-0">
              <div className="relative p-3 border-b border-slate-100 shrink-0">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search students…"
                  className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
              <div className="overflow-y-auto divide-y divide-slate-100">
                {filteredStudents.length === 0 && (
                  <p className="text-xs text-slate-400 italic p-4">No students match.</p>
                )}
                {filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStudentId(s.id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-2 transition-colors ${
                      s.id === selectedStudentId ? 'bg-[#16305F]/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{s.parentName}</p>
                      <p className="text-[10px] text-slate-400 truncate">Re: {s.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col min-h-0">
              <div className="border-b border-slate-100 px-5 py-3 shrink-0">
                <p className="text-xs text-slate-500">Currently messaging</p>
                <h4 className="text-sm font-semibold text-slate-900">{selectedStudent?.parentName ?? '—'}</h4>
              </div>
              <div className="flex-1 min-h-0">
                {conversationError ? (
                  <p className="text-xs text-rose-600 p-6 text-center">{conversationError}</p>
                ) : (
                  <ChatThread
                    conversationId={conversationId}
                    role="teacher"
                    fetchMessages={onFetchMessages}
                    sendMessage={(id, body) => onSendMessage(id, body)}
                    subscribeMessages={onSubscribeMessages}
                    placeholder={selectedStudent ? `Message ${selectedStudent.parentName}…` : 'Write a message…'}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
