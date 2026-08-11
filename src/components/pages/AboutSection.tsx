import { Quote } from 'lucide-react';
import PageHero from '../PageHero';
import { MISSION_PILLARS, PRINCIPAL } from '../../data/mockData';

export default function AboutSection() {
  return (
    <div className="space-y-12">
      <PageHero
        eyebrow="ABOUT LINDNER INTERNATIONAL SCHOOL"
        title="A Community Built on Rigor and Belonging"
        subtitle="Since our founding, LIS has grown from a single classroom block into a full K-12 international campus, without ever losing sight of the student in front of us."
      />

      <section id="history" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-4">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3">Our Story</h2>
        <p className="text-sm text-slate-600 leading-relaxed font-light">
          Lindner International School was founded on Simawa Road, Ogun State, with a simple conviction: that
          a rigorous, internationally benchmarked education could be delivered without sacrificing the warmth
          of a small, tightly-knit campus community. What began as a single foundation-year cohort has grown
          into a full Nursery-through-Grade-12 institution, anchored by the International Baccalaureate
          Diploma Programme and a House-based pastoral system that keeps every scholar known by name.
        </p>
        <p className="text-sm text-slate-600 leading-relaxed font-light">
          Today our campus welcomes families representing 42+ nationalities, drawn by a shared commitment to
          academic excellence, ethical leadership, and a genuinely global outlook.
        </p>
      </section>

      <section id="leadership" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-3 flex md:flex-col items-center md:items-start gap-4">
            <img
              src={PRINCIPAL.photoUrl}
              alt={PRINCIPAL.name}
              className="w-20 h-20 md:w-full md:h-auto md:aspect-square rounded-2xl object-cover border-4 border-white shadow-md"
            />
            <div>
              <p className="font-serif font-bold text-slate-800">{PRINCIPAL.name}</p>
              <p className="text-xs text-gold-600 font-semibold uppercase tracking-wider">{PRINCIPAL.title}</p>
            </div>
          </div>
          <div className="md:col-span-9 space-y-4">
            <h2 className="text-2xl font-serif font-bold text-slate-800 flex items-center gap-2">
              <Quote className="w-5 h-5 text-gold-400" />
              <span>Leadership Message</span>
            </h2>
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed font-light">
              {PRINCIPAL.message.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="mission" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-6">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3">
          Mission & Values
        </h2>
        <div className="space-y-6">
          {MISSION_PILLARS.map((pillar, idx) => (
            <div key={pillar.id} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-navy-50 text-navy-700 font-bold flex items-center justify-center shrink-0 border border-navy-100 text-sm">
                {String(idx + 1).padStart(2, '0')}
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-semibold text-slate-800">{pillar.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed font-light">{pillar.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
