import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, MessageSquare, Search, Send, Users } from 'lucide-react';
import { PortalUser, StudentProfile } from '../types';

interface TeacherMessagesProps {
  students: StudentProfile[];
  user: PortalUser;
  onTransferStudent?: (studentId: string, updatedFields: Partial<StudentProfile>) => void;
}

type ChatMessage = {
  sender: 'teacher' | 'parent';
  text: string;
  time: string;
};

const deriveParentUsername = (student: StudentProfile) =>
  student.parentEmail.split('@')[0].toLowerCase();

export default function TeacherMessages({ students, user, onTransferStudent }: TeacherMessagesProps) {
  const contactList = useMemo(
    () =>
      students.map((student) => ({
        student,
        parentUsername: deriveParentUsername(student),
      })),
    [students]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsername, setSelectedUsername] = useState(
    contactList[0]?.parentUsername || ''
  );
  const [messageDraft, setMessageDraft] = useState('');
  const [transferGradeLevel, setTransferGradeLevel] = useState('');
  const [transferClassroom, setTransferClassroom] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [chatLogs, setChatLogs] = useState<Record<string, ChatMessage[]>>(() => {
    const initial: Record<string, ChatMessage[]> = {};
    contactList.forEach((contact) => {
      initial[contact.parentUsername] = [
        {
          sender: 'teacher',
          text: `Hello ${contact.student.parentName}, this is ${user.username || 'your teacher'} from Lindner International School. I wanted to share a quick update about ${contact.student.name}.`,
          time: 'Today, 08:10 AM'
        },
        {
          sender: 'parent',
          text: `Thank you. I appreciate the update about ${contact.student.name}. Can we schedule a short call later this week?`,
          time: 'Today, 08:12 AM'
        }
      ];
    });
    return initial;
  });

  const filteredContacts = contactList.filter((contact) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      contact.parentUsername.includes(term) ||
      contact.student.parentName.toLowerCase().includes(term) ||
      contact.student.name.toLowerCase().includes(term)
    );
  });

  const selectedContact =
    filteredContacts.find((contact) => contact.parentUsername === selectedUsername) ||
    filteredContacts[0] ||
    contactList[0];

  useEffect(() => {
    if (selectedContact) {
      setTransferGradeLevel(selectedContact.student.gradeLevel);
      setTransferClassroom(selectedContact.student.classroom);
      setTransferNote('');
    }
  }, [selectedContact]);

  const activeMessages = selectedContact
    ? chatLogs[selectedContact.parentUsername] || []
    : [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !messageDraft.trim()) return;

    const username = selectedContact.parentUsername;
    const newMessage: ChatMessage = {
      sender: 'teacher',
      text: messageDraft.trim(),
      time: 'Just now'
    };

    setChatLogs((prev) => ({
      ...prev,
      [username]: [...(prev[username] || []), newMessage]
    }));
    setMessageDraft('');

    setTimeout(() => {
      setChatLogs((prev) => ({
        ...prev,
        [username]: [
          ...(prev[username] || []),
          {
            sender: 'parent',
            text: `Thanks for the update. I’ll look into this and follow up by tomorrow morning.`,
            time: 'Just now'
          }
        ]
      }));
    }, 1400);
  };

  const handleTransferStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !transferGradeLevel.trim() || !transferClassroom.trim()) return;

    const username = selectedContact.parentUsername;
    const transferMessage: ChatMessage = {
      sender: 'teacher',
      text: `I have scheduled ${selectedContact.student.name} to move to ${transferGradeLevel} in ${transferClassroom} after the next session.`,
      time: 'Just now'
    };

    if (typeof onTransferStudent === 'function') {
      onTransferStudent(selectedContact.student.id, {
        gradeLevel: transferGradeLevel.trim(),
        classroom: transferClassroom.trim()
      });
    }

    setChatLogs((prev) => ({
      ...prev,
      [username]: [...(prev[username] || []), transferMessage]
    }));
    setTransferNote('Student transfer scheduled for next session.');

    setTimeout(() => setTransferNote(''), 4000);
  };

  if (!selectedContact) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center">
        <MessageSquare className="mx-auto mb-4 w-10 h-10 text-slate-500" />
        <h3 className="text-lg font-semibold text-slate-800">No parent contacts assigned.</h3>
        <p className="text-sm text-slate-500 mt-2">Once your assigned students are updated, the parent messaging board will appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="bg-[#16305F] px-6 py-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-serif font-bold">Teacher ↔ Parent Messaging</h3>
          <p className="text-sm text-slate-200 mt-1 max-w-2xl">
            Message parents directly using their portal usernames and keep conversations linked to their student records.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-900/95 px-4 py-3 text-sm font-medium text-slate-100">
          Signed in as: <span className="font-semibold">{user.username || 'Teacher'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-6 p-6">
        <div className="space-y-4">
          <div className="relative rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by parent username, student, or name"
              className="w-full pl-10 pr-4 py-3 text-sm bg-transparent outline-none"
            />
          </div>

          <div className="rounded-3xl border border-slate-200 overflow-hidden shadow-sm bg-white">
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500 font-semibold">
              <Users className="w-3.5 h-3.5" />
              Parent Contacts
            </div>
            <div className="divide-y divide-slate-200">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.parentUsername}
                  type="button"
                  onClick={() => setSelectedUsername(contact.parentUsername)}
                  className={`w-full text-left px-4 py-4 flex items-center justify-between gap-3 transition-colors ${
                    contact.parentUsername === selectedUsername ? 'bg-[#16305F]/5 text-slate-900' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{contact.student.parentName}</p>
                    <p className="text-xs text-slate-500 truncate">@{contact.parentUsername}</p>
                    <p className="text-[10px] text-slate-400 truncate">Student: {contact.student.name}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
              {filteredContacts.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  No parents match that username.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 overflow-hidden shadow-sm bg-white flex flex-col">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4 bg-slate-50">
            <div>
              <p className="text-sm text-slate-500">Currently messaging</p>
              <h4 className="text-lg font-semibold text-slate-900">@{selectedContact.parentUsername}</h4>
            </div>
            <div className="text-xs text-slate-500">
              Student: <span className="font-semibold text-slate-700">{selectedContact.student.name}</span>
            </div>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-4 min-h-[320px]">
            {activeMessages.map((message, index) => (
              <div
                key={`${message.time}-${index}`}
                className={`rounded-3xl p-4 max-w-[88%] ${
                  message.sender === 'teacher'
                    ? 'bg-[#16305F]/10 self-end text-slate-900'
                    : 'bg-slate-100 self-start text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-[0.24em] font-semibold text-slate-500">
                  {message.sender === 'teacher' ? 'Teacher' : 'Parent'}
                </div>
                <p className="text-sm leading-6">{message.text}</p>
                <p className="mt-3 text-[10px] text-slate-400">{message.time}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 space-y-4">
            <form onSubmit={handleTransferStudent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.24em] text-slate-500 font-semibold mb-2 block">
                    Transfer grade after next session
                  </label>
                  <input
                    type="text"
                    value={transferGradeLevel}
                    onChange={(e) => setTransferGradeLevel(e.target.value)}
                    placeholder="e.g. Grade 11 - IB Science Track"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#16305F] focus:ring-1 focus:ring-[#16305F]/25"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.24em] text-slate-500 font-semibold mb-2 block">
                    New classroom after next session
                  </label>
                  <input
                    type="text"
                    value={transferClassroom}
                    onChange={(e) => setTransferClassroom(e.target.value)}
                    placeholder="e.g. Room 410 (Science Wing)"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#16305F] focus:ring-1 focus:ring-[#16305F]/25"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center w-full rounded-2xl bg-navy-700 px-4 py-3 text-sm font-semibold text-white hover:bg-navy-600 transition-colors"
              >
                Schedule transfer after next session
              </button>
            </form>

            {transferNote && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                {transferNote}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="space-y-3">
              <label className="text-[10px] uppercase tracking-[0.24em] text-slate-500 font-semibold mb-2 block">
                Send a message to @{selectedContact.parentUsername}
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  placeholder="Write your message here..."
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#16305F] focus:ring-1 focus:ring-[#16305F]/25"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#16305F] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1E4C8F] transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
