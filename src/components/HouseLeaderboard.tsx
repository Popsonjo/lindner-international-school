import { Trophy } from 'lucide-react';
import { HOUSES, HOUSE_POINTS } from '../data/mockData';
import { currentAcademicSession } from '../lib/grading';

const RANK_LABEL = ['1st', '2nd', '3rd', '4th'];

export default function HouseLeaderboard() {
  const ranked = (Object.keys(HOUSES) as (keyof typeof HOUSES)[])
    .map(house => ({ house, points: HOUSE_POINTS[house], color: HOUSES[house].color }))
    .sort((a, b) => b.points - a.points);

  const topPoints = ranked[0]?.points ?? 1;

  return (
    <section className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-2xl font-serif font-bold text-slate-800 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-gold-500" />
          <span>House Points Leaderboard</span>
        </h2>
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{currentAcademicSession()} Session</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ranked.map((entry, idx) => (
          <div
            key={entry.house}
            className={`rounded-2xl border-0 p-5 space-y-3 bg-gradient-to-br shadow-sm ${entry.color
              .split(' ')
              .filter(c => c.startsWith('from-') || c.startsWith('to-'))
              .join(' ')}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/90 bg-black/20 px-2 py-0.5 rounded-full">
                {RANK_LABEL[idx]}
              </span>
              <span className="text-lg font-serif font-bold text-white drop-shadow">
                {entry.points.toLocaleString()}
              </span>
            </div>
            <h3 className="text-base font-serif font-bold text-white">
              {entry.house} House
            </h3>
            <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/90 rounded-full transition-all"
                style={{ width: `${(entry.points / topPoints) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
