import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, Newspaper } from 'lucide-react';
import PageHero from '../PageHero';
import { NEWS_ARTICLES } from '../../data/mockData';
import { SchoolEvent } from '../../types';

const formatEventDate = (iso: string): string => {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
};

interface NewsEventsSectionProps {
  events: SchoolEvent[];
}

export default function NewsEventsSection({ events }: NewsEventsSectionProps) {
  const upcoming = [...events].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);

  return (
    <div className="space-y-12">
      <PageHero
        eyebrow="NEWS & EVENTS"
        title="What's Happening at LIS"
        subtitle="Campus announcements, faculty highlights, and the latest from our academic calendar — all in one place."
      />

      <section id="news" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-6">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-gold-500" />
          <span>Latest News</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {NEWS_ARTICLES.map(item => (
            <div key={item.id} className="border border-slate-100 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-medium text-navy-700 bg-navy-700/10 px-2 py-0.5 rounded uppercase tracking-wider">
                  {item.tag}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1 font-light">
                  <Clock className="w-3 h-3 text-slate-300" />
                  {item.date}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-800">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-light">{item.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="calendar-preview" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-2xl font-serif font-bold text-slate-800">Upcoming Events</h2>
          <Link
            to="/calendar"
            className="text-xs font-semibold text-navy-700 hover:underline flex items-center gap-1"
          >
            View Full Calendar <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="space-y-4">
          {upcoming.map(ev => (
            <div key={ev.id} className="border-l-3 border-navy-600 pl-4 py-1.5 space-y-1">
              <h4 className="text-sm font-semibold text-slate-800">
                {ev.title} ({formatEventDate(ev.date)})
              </h4>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-300" />
                  {ev.time}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-300" />
                  {ev.location}
                </span>
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
