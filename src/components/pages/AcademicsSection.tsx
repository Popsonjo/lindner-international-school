import { Atom, Calculator, Globe2, Palette, HeartHandshake } from 'lucide-react';
import PageHero from '../PageHero';

const DEPARTMENTS = [
  { icon: Calculator, name: 'Mathematics & Computer Science', description: 'From foundational numeracy to IB Higher Level Mathematics and Computer Science.' },
  { icon: Atom, name: 'Sciences', description: 'Physics, Chemistry and Biology laboratories with hands-on, inquiry-driven practicals.' },
  { icon: Globe2, name: 'Humanities & Languages', description: 'History, Geography, Literature and a modern-language programme spanning French and Spanish.' },
  { icon: Palette, name: 'Creative & Performing Arts', description: 'Visual arts, music performance, and theatre studios open to every grade level.' },
];

export default function AcademicsSection() {
  return (
    <div className="space-y-12">
      <PageHero
        eyebrow="ACADEMICS"
        title="A Curriculum Built for Global Universities"
        subtitle="From Foundation Year through the IB Diploma Programme, our academic pathway is designed to build rigor, curiosity, and confidence at every stage."
      />

      <section id="curriculum" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-4">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3">Curriculum Overview</h2>
        <p className="text-sm text-slate-600 leading-relaxed font-light">
          Secondary scholars progress through IGCSE coursework before entering the International Baccalaureate
          Diploma Programme in Grades 11 and 12 — the same globally recognized qualification accepted by
          universities worldwide. Every subject pairs disciplinary depth with the IB's emphasis on critical
          thinking, research, and reflective practice.
        </p>
        <p className="text-sm text-slate-600 leading-relaxed font-light">
          A 6:1 student-teacher ratio means instruction stays personal even as coursework grows more advanced,
          and every scholar is supported by a dedicated academic advisor throughout their secondary years.
        </p>
      </section>

      <section id="departments" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-6">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3">Departments</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {DEPARTMENTS.map(dept => {
            const Icon = dept.icon;
            return (
              <div key={dept.name} className="flex gap-4 p-4 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-navy-700/10 text-navy-700 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-800">{dept.name}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-light">{dept.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="support" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-4">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-gold-500" />
          <span>Learning Support</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed font-light">
          Our Learning Support team works alongside subject teachers to provide differentiated instruction,
          study-skills coaching, and individualized accommodations for scholars who need them — so every
          student, regardless of learning profile, has a genuine path to the IB Diploma.
        </p>
      </section>
    </div>
  );
}
