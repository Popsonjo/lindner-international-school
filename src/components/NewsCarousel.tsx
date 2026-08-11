import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { NEWS_ARTICLES } from '../data/mockData';

const VISIBLE_COUNT = 2;

export default function NewsCarousel() {
  const [startIdx, setStartIdx] = useState(0);
  const maxStart = Math.max(0, NEWS_ARTICLES.length - VISIBLE_COUNT);

  const visible = NEWS_ARTICLES.slice(startIdx, startIdx + VISIBLE_COUNT);

  return (
    <section className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-2xl font-serif font-bold text-slate-800">Campus News & Events</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStartIdx(i => Math.max(0, i - 1))}
            disabled={startIdx === 0}
            aria-label="Previous news items"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setStartIdx(i => Math.min(maxStart, i + 1))}
            disabled={startIdx >= maxStart}
            aria-label="Next news items"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <Link to="/news-events" className="text-xs font-semibold text-navy-700 hover:underline ml-2">
            View All
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {visible.map(item => (
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
  );
}
