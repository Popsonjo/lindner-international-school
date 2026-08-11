import { Link } from 'react-router-dom';
import { ArrowRight, Baby, BookOpen, GraduationCap, Globe2 } from 'lucide-react';
import { ADMISSION_PATHWAYS } from '../data/mockData';

const ICONS: Record<string, typeof Baby> = {
  nursery: Baby,
  primary: BookOpen,
  secondary: GraduationCap,
  transfer: Globe2,
};

export default function AdmissionsPathwayCards() {
  return (
    <section className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-800">Find Your Admissions Pathway</h2>
        <p className="text-sm text-slate-500 font-light max-w-2xl mx-auto">
          Whichever stage your family is joining at, our admissions office has a dedicated pathway to guide you.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {ADMISSION_PATHWAYS.map(pathway => {
          const Icon = ICONS[pathway.id] ?? BookOpen;
          return (
            <Link
              key={pathway.id}
              to={`/admissions#${pathway.anchorId}`}
              className="group bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-navy-200 transition-all space-y-4"
            >
              <div className="w-11 h-11 rounded-xl bg-navy-700/10 text-navy-700 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gold-600 font-semibold">
                  {pathway.ageRange}
                </span>
                <h3 className="text-base font-semibold text-slate-800">{pathway.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-light">{pathway.description}</p>
              </div>
              <span className="text-xs font-semibold text-navy-700 flex items-center gap-1 group-hover:gap-2 transition-all">
                Learn More <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
