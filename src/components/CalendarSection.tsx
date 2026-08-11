import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, MapPin, Clock, Plus, Search, AlertCircle, X } from 'lucide-react';
import { SchoolEvent, PortalUser } from '../types';

interface CalendarSectionProps {
  events: SchoolEvent[];
  onAddEvent: (event: Omit<SchoolEvent, 'id'>) => Promise<void>;
  user: PortalUser;
}

/** The calendar grid is scoped to a single month. Both the grid and the "add event"
 *  date picker are driven from these constants so they can never drift apart. */
const CALENDAR_YEAR = 2026;
const CALENDAR_MONTH = 6; // June
const CALENDAR_MONTH_LABEL = 'June';
/** June 2026 begins on a Monday, so the Mon-first grid needs no leading blanks. */
const DAYS_IN_MONTH = new Date(CALENDAR_YEAR, CALENDAR_MONTH, 0).getDate();

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (day: number) => `${CALENDAR_YEAR}-${pad(CALENDAR_MONTH)}-${pad(day)}`;

/** Render an ISO date as "June 18" without trusting it to be in the calendar month. */
const formatEventDate = (iso: string): string => {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  const label = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return year === CALENDAR_YEAR ? label : `${label}, ${year}`;
};

export default function CalendarSection({ events, onAddEvent, user }: CalendarSectionProps) {
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states for new event
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(dateKey(15));
  const [newTime, setNewTime] = useState('09:00 AM - 12:00 PM');
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState<SchoolEvent['category']>('Academic');
  const [newDescription, setNewDescription] = useState('');
  const [newOrganizer, setNewOrganizer] = useState('');
  const [formError, setFormError] = useState('');

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monthDays = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1);

  const getEventsForDay = (day: number) => events.filter(e => e.date === dateKey(day));

  const categories = ['All', 'Academic', 'Exams', 'Sports', 'Arts', 'Community', 'Holiday'];

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredEvents = useMemo(() => {
    return events
      .filter(event => {
        const matchesCategory = filterCategory === 'All' || event.category === filterCategory;
        const matchesSearch =
          !normalizedQuery ||
          event.title.toLowerCase().includes(normalizedQuery) ||
          event.description.toLowerCase().includes(normalizedQuery) ||
          event.location.toLowerCase().includes(normalizedQuery);
        return matchesCategory && matchesSearch;
      })
      // Chronological: the summary panel takes the first three, which previously
      // meant "whichever three happened to be added first".
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [events, filterCategory, normalizedQuery]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Academic': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Exams': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Sports': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Arts': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Community': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Holiday': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDayClass = (day: number) => {
    const isSelected = selectedDay === day;
    const hasEvents = getEventsForDay(day).length > 0;

    let base =
      'h-20 sm:h-24 w-full text-left p-1.5 border border-slate-100/80 rounded-xl transition-all cursor-pointer flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16305F] ';

    if (isSelected) {
      base += "bg-[#16305F]/10 border-[#16305F] ring-2 ring-[#16305F]/25 shadow-inner";
    } else if (hasEvents) {
      base += "bg-gold-50/40 hover:bg-gold-50/70 border-gold-100";
    } else {
      base += "bg-white hover:bg-slate-50";
    }
    return base;
  };

  const canManageEvents = user.role === 'admin';
  const [submitBusy, setSubmitBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Re-assert the role: the form must not rely solely on the button being hidden.
    if (!canManageEvents) {
      setFormError('Only administrators may schedule events.');
      return;
    }

    const title = newTitle.trim();
    const location = newLocation.trim();
    const description = newDescription.trim();
    const organizer = newOrganizer.trim();
    const time = newTime.trim();

    if (!title || !location || !description || !organizer || !time) {
      setFormError('Please fill in all mandatory event fields.');
      return;
    }

    setSubmitBusy(true);
    try {
      await onAddEvent({ title, date: newDate, time, location, category: newCategory, description, organizer });

      // Reset Form
      setNewTitle('');
      setNewLocation('');
      setNewDescription('');
      setNewOrganizer('');
      setFormError('');
      setShowAddModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not schedule that event.');
    } finally {
      setSubmitBusy(false);
    }
  };

  const selectedEventsList = selectedDay !== null ? getEventsForDay(selectedDay) : [];

  return (
    <div id="calendar-section" className="space-y-8">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-2xl font-serif font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-[#16305F]" />
            <span>LIS Academic & Campus Calendar</span>
          </h2>
          <p className="text-sm text-slate-500 font-light">
            Keep track of examinations, athletic cups, house forums, and orchestra workshops.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canManageEvents && (
            <button
              onClick={() => { setFormError(''); setShowAddModal(true); }}
              className="px-4 py-2 bg-[#16305F] hover:bg-[#1E4C8F] text-white rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
            </button>
          )}
          <span className="text-lg font-serif font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            {CALENDAR_MONTH_LABEL} {CALENDAR_YEAR}
          </span>
        </div>
      </div>

      {/* Categories & Search Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 justify-start w-full md:w-auto">
          {categories.map((cat, idx) => (
            <button
              key={idx}
              onClick={() => {
                setFilterCategory(cat);
                setSelectedDay(null); // Clear selected day to view all
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                filterCategory === cat
                  ? 'bg-[#16305F] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, organizers..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-navy-500"
          />
        </div>
      </div>

      {/* Main Layout Grid (Calendar + Selected Details) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Calendar Grid (8 Cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
          {/* Days of Week Row */}
          <div className="grid grid-cols-7 gap-2 mb-3">
            {daysOfWeek.map((day, idx) => (
              <div key={idx} className="text-center font-mono text-xs font-semibold uppercase text-slate-400 tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Month Days Grid (Starts exactly on Mon June 1) */}
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const shownEvents = dayEvents.filter(e => filterCategory === 'All' || e.category === filterCategory);
              
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  aria-pressed={selectedDay === day}
                  aria-label={`${CALENDAR_MONTH_LABEL} ${day}, ${CALENDAR_YEAR} — ${shownEvents.length} event(s)`}
                  className={getDayClass(day)}
                >
                  <span className="text-sm font-semibold font-mono text-slate-700 block">
                    {day}
                  </span>

                  {/* Event indicators */}
                  <div className="space-y-1 mt-1 overflow-hidden max-h-12 flex-1 flex flex-col justify-end w-full">
                    {shownEvents.slice(0, 2).map((ev) => (
                      <span
                        key={ev.id}
                        className="text-[9px] px-1 py-0.5 rounded font-medium truncate block leading-none border"
                        style={{
                          backgroundColor: ev.category === 'Academic' ? '#EFF6FF' : ev.category === 'Exams' ? '#FFF1F2' : ev.category === 'Sports' ? '#ECFDF5' : ev.category === 'Arts' ? '#F3E8FF' : '#FEF3C7',
                          color: ev.category === 'Academic' ? '#1E40AF' : ev.category === 'Exams' ? '#9F1239' : ev.category === 'Sports' ? '#065F46' : ev.category === 'Arts' ? '#5B21B6' : '#92400E',
                          borderColor: 'rgba(0,0,0,0.05)'
                        }}
                      >
                        {ev.title}
                      </span>
                    ))}
                    {shownEvents.length > 2 && (
                      <span className="text-[8px] font-bold text-slate-400 block text-right">
                        +{shownEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day details / Upcoming List (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {selectedDay !== null ? (
            <div className="bg-[#16305F] text-white p-6 rounded-2xl shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-serif font-semibold text-[#F4F8F6]">
                  Events on {CALENDAR_MONTH_LABEL} {selectedDay}, {CALENDAR_YEAR}
                </h3>
                <button
                  onClick={() => setSelectedDay(null)}
                  aria-label="Clear selected day"
                  className="p-1 hover:bg-navy-600/60 rounded-lg text-gold-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedEventsList.length === 0 ? (
                <p className="text-xs text-navy-100/80 font-light italic">
                  No events listed for this specific date. Click "Add Event" if signed in as administrator.
                </p>
              ) : (
                <div className="space-y-4">
                  {selectedEventsList.map((ev) => (
                    <div key={ev.id} className="bg-white/10 border border-white/10 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono tracking-wider uppercase text-gold-300">
                          {ev.category}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm text-[#F4F8F6]">
                        {ev.title}
                      </h4>
                      <p className="text-xs text-navy-100/90 leading-relaxed font-light">
                        {ev.description}
                      </p>

                      <div className="pt-2 border-t border-white/10 text-xs text-navy-100/80 space-y-1 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gold-300 shrink-0" />
                          <span>{ev.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gold-300 shrink-0" />
                          <span className="truncate">{ev.location}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-md font-serif font-bold text-slate-800">
                School Recesses & Examinations
              </h3>
              <p className="text-xs text-slate-500 font-light">
                Click any specific date cell on the left calendar to retrieve immediate coordinate briefings for scheduling.
              </p>

              {/* Show the 3 earliest matching events */}
              <div className="space-y-4 pt-2">
                {filteredEvents.length === 0 && (
                  <p className="text-xs text-slate-400 font-light italic">
                    No events match the current filters.
                  </p>
                )}
                {filteredEvents.slice(0, 3).map((ev) => (
                  <div key={ev.id} className="border-l-3 border-[#1E4C8F] pl-3.5 py-1.5 space-y-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border inline-block ${getCategoryColor(ev.category)}`}>
                      {ev.category}
                    </span>
                    <h4 className="text-xs font-semibold text-slate-800">
                      {/* Formatted from the event's own date — the month used to be
                          hard-coded as "June" regardless of what the record said. */}
                      {ev.title} ({formatEventDate(ev.date)})
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-300" />
                      {ev.time}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Notice Card */}
          <div className="bg-gold-50/40 border border-gold-200/60 p-5 rounded-2xl space-y-2">
            <h4 className="text-xs font-bold text-gold-600 tracking-wider uppercase font-mono flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>General Notice</span>
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed font-light">
              IB Diploma examinations follow absolute GMT timing coordinate standards. Scholars must report to designated examination halls exactly 20 minutes prior to exam start.
            </p>
          </div>

        </div>
      </div>

      {/* Add Event Modal — administrators only */}
      {showAddModal && canManageEvents && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-label="Schedule New School Event">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-slate-100">
            <div className="bg-[#16305F] text-white p-5 flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg">Schedule New School Event</h3>
              <button
                onClick={() => setShowAddModal(false)}
                aria-label="Close event form"
                className="text-gold-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label htmlFor="event-title" className="text-xs font-bold text-slate-700 block">Event Title</label>
                  <input
                    id="event-title"
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Honors Speech Day"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#16305F]"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="event-date" className="text-xs font-bold text-slate-700 block">
                    Date ({CALENDAR_MONTH_LABEL} {CALENDAR_YEAR})
                  </label>
                  <select
                    id="event-date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#16305F]"
                  >
                    {monthDays.map((d) => (
                      <option key={d} value={dateKey(d)}>
                        {CALENDAR_MONTH_LABEL} {d}, {CALENDAR_YEAR}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block font-sans">Event Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#16305F]"
                  >
                    <option value="Academic">Academic</option>
                    <option value="Exams">Exams</option>
                    <option value="Sports">Sports</option>
                    <option value="Arts">Arts</option>
                    <option value="Community">Community</option>
                    <option value="Holiday">Holiday</option>
                  </select>
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-bold text-slate-700 block">Time Span</label>
                  <input
                    type="text"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="e.g., 04:00 PM - 06:00 PM"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#16305F]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Location</label>
                  <input
                    type="text"
                    required
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g., Auditorium B"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#16305F]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Organizer Group</label>
                  <input
                    type="text"
                    required
                    value={newOrganizer}
                    onChange={(e) => setNewOrganizer(e.target.value)}
                    placeholder="e.g., PTA Committee"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#16305F]"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-bold text-slate-700 block">Description Brief</label>
                  <textarea
                    rows={3}
                    required
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Provide overview of targets, agendas or required coordinates..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#16305F]"
                  ></textarea>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitBusy}
                  className="px-4 py-2 bg-[#16305F] hover:bg-[#1E4C8F] text-white rounded-lg text-xs font-semibold disabled:opacity-60"
                >
                  {submitBusy ? 'Scheduling…' : 'Deploy Scheduled Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
