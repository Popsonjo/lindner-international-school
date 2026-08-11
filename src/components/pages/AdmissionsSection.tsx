import { ClipboardList, FileCheck2, Wallet } from 'lucide-react';
import PageHero from '../PageHero';
import AdmissionsPathwayCards from '../AdmissionsPathwayCards';

const STEPS = [
  { title: 'Submit Inquiry', description: 'Complete the online inquiry form or contact the admissions office directly.' },
  { title: 'Campus Tour & Assessment', description: 'Prospective scholars complete an age-appropriate placement assessment and family tour.' },
  { title: 'Offer & Enrollment', description: 'Admitted families receive an offer letter and complete enrollment paperwork and fees.' },
];

const REQUIREMENTS = [
  'Completed application form',
  'Two most recent school report cards (transfer students)',
  'Copy of birth certificate / passport',
  'Immunization record',
  'Two passport-sized photographs',
];

export default function AdmissionsSection() {
  return (
    <div className="space-y-12">
      <PageHero
        eyebrow="ADMISSIONS"
        title="Join the Lindner Community"
        subtitle="Our admissions office supports every family from first inquiry through enrollment day, whichever pathway fits your child."
      />

      <section id="process" className="space-y-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-6">
          <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-gold-500" />
            <span>How to Apply</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {STEPS.map((step, idx) => (
              <div key={step.title} className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-navy-50 text-navy-700 font-bold flex items-center justify-center border border-navy-100 text-sm">
                  {idx + 1}
                </div>
                <h4 className="text-sm font-semibold text-slate-800">{step.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-light">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
        <AdmissionsPathwayCards />
      </section>

      <section id="requirements" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-4">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-gold-500" />
          <span>Requirements</span>
        </h2>
        <ul className="space-y-2">
          {REQUIREMENTS.map(req => (
            <li key={req} className="flex items-start gap-2 text-sm text-slate-600 font-light">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400 mt-1.5 shrink-0" />
              <span>{req}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="fees" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-4">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-gold-500" />
          <span>Fees & Financial Aid</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed font-light">
          Tuition varies by grade level and is published annually by the admissions office. A limited number
          of merit- and need-based scholarships are available each year — contact the admissions office to
          discuss eligibility.
        </p>
      </section>
    </div>
  );
}
