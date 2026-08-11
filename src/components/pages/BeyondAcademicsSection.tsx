import { Drama, Music, Trophy, Users } from 'lucide-react';
import PageHero from '../PageHero';

const CLUBS = ['Varsity Debate', 'Robotics Society', 'Model United Nations', 'Chess Club', 'Environmental League', 'Creative Writing Circle'];
const SPORTS = ['Football', 'Swimming', 'Athletics', 'Basketball', 'Table Tennis'];
const ARTS = ['Chamber Orchestra', 'Symphonic Winds', 'Drama Guild', 'Visual Arts Studio', 'Choral Ensemble'];

export default function BeyondAcademicsSection() {
  return (
    <div className="space-y-12">
      <PageHero
        eyebrow="BEYOND ACADEMICS"
        title="A Full Life Outside the Classroom"
        subtitle="Clubs, sports, and the performing arts round out the LIS experience — every scholar is encouraged to find at least one pursuit that is entirely their own."
      />

      <section id="clubs" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-4">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-gold-500" />
          <span>Clubs & Societies</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed font-light">
          Over 35 extracurricular modules run each term, led by faculty advisors and student officers alike.
        </p>
        <div className="flex flex-wrap gap-2">
          {CLUBS.map(club => (
            <span key={club} className="text-xs font-medium text-navy-700 bg-navy-700/10 px-3 py-1.5 rounded-full">
              {club}
            </span>
          ))}
        </div>
      </section>

      <section id="sports" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-4">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-gold-500" />
          <span>Sports</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed font-light">
          Inter-House sporting competition runs all year, culminating in the Inter-House Cup Finals each June.
        </p>
        <div className="flex flex-wrap gap-2">
          {SPORTS.map(sport => (
            <span key={sport} className="text-xs font-medium text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              {sport}
            </span>
          ))}
        </div>
      </section>

      <section id="arts" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-4">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Music className="w-5 h-5 text-gold-500" />
          <Drama className="w-5 h-5 text-gold-500" />
          <span>Performing Arts</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed font-light">
          The Music & Dramatics Faculty stages an end-of-term recital each cycle in the Liszt Auditorium,
          alongside a full spring theatre production.
        </p>
        <div className="flex flex-wrap gap-2">
          {ARTS.map(art => (
            <span key={art} className="text-xs font-medium text-purple-800 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200">
              {art}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
