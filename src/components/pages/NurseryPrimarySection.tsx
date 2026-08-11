import { Baby, BookOpen, ArrowLeftRight } from 'lucide-react';
import PageHero from '../PageHero';

export default function NurseryPrimarySection() {
  return (
    <div className="space-y-12">
      <PageHero
        eyebrow="NURSERY & PRIMARY"
        title="Where Curiosity Gets Its Start"
        subtitle="Our earliest years focus on play-based discovery, language development, and the social confidence that carries a child through the rest of their schooling."
      />

      <section id="early-years" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-4">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Baby className="w-5 h-5 text-gold-500" />
          <span>Early Years (Ages 2-5)</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed font-light">
          Our Early Years classrooms are built around structured play: sensory stations, storytelling circles,
          and guided exploration that build pre-literacy, numeracy, and fine-motor skills at each child's own
          pace. Small class groups mean every child is greeted by name each morning.
        </p>
      </section>

      <section id="primary" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-4">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-gold-500" />
          <span>Primary Curriculum (Ages 6-10)</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed font-light">
          Primary scholars follow a structured, enquiry-driven curriculum spanning literacy, numeracy, science,
          and the arts, taught by homeroom teachers who track each child's progress closely and communicate
          regularly with families.
        </p>
      </section>

      <section id="transition" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-4">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-gold-500" />
          <span>Transition to Secondary</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed font-light">
          In their final primary year, scholars begin a structured transition programme — subject-specialist
          taster lessons, study-skills workshops, and House assignment — so the move into secondary school
          feels familiar rather than daunting.
        </p>
      </section>
    </div>
  );
}
