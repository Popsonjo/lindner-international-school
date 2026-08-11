import { GraduationCap, Handshake, Sparkle } from 'lucide-react';
import PageHero from '../PageHero';

const STORIES = [
  { name: 'Amara Okoye', cohort: 'Class of 2019', note: 'Studying Mechanical Engineering at Imperial College London, credits the Robotics Society for sparking her path into engineering.' },
  { name: 'Tobenna Adeyemi', cohort: 'Class of 2021', note: 'Reading Politics, Philosophy & Economics at Oxford after four years of Model United Nations at LIS.' },
  { name: 'Priya Nair', cohort: 'Class of 2017', note: 'Now a resident physician, and returns each June to mentor Grade 12 scholars preparing for university applications.' },
];

export default function AlumniSection() {
  return (
    <div className="space-y-12">
      <PageHero
        eyebrow="ALUMNI"
        title="The LIS Story Doesn't End at Graduation"
        subtitle="Our alumni network spans universities and careers across the globe, and stays closely connected to the campus that shaped them."
      />

      <section id="network" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-4">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-gold-500" />
          <span>Alumni Network</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed font-light">
          Graduates stay connected through annual reunions, mentorship pairings with current Grade 12 scholars,
          and a private alumni directory maintained by the school office. Email the office to be added to the
          network if you graduated from LIS and haven't yet connected.
        </p>
      </section>

      <section id="stories" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-6">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Sparkle className="w-5 h-5 text-gold-500" />
          <span>Success Stories</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {STORIES.map(story => (
            <div key={story.name} className="p-4 rounded-xl border border-slate-100 space-y-2">
              <h4 className="text-sm font-semibold text-slate-800">{story.name}</h4>
              <span className="text-[10px] font-mono uppercase tracking-wider text-gold-600 font-semibold block">
                {story.cohort}
              </span>
              <p className="text-xs text-slate-500 leading-relaxed font-light">{story.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="giveback" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-4">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Handshake className="w-5 h-5 text-gold-500" />
          <span>Give Back</span>
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed font-light">
          Alumni support the current student body as guest speakers, university-application mentors, and
          contributors to the LIS Scholarship Fund, which underwrites need-based tuition assistance each year.
        </p>
      </section>
    </div>
  );
}
