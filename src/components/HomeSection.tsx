import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, BookOpen, Users, ArrowRight, Sparkles, Quote } from 'lucide-react';
import { PRINCIPAL, MISSION_PILLARS } from '../data/mockData';
import NewsCarousel from './NewsCarousel';
import HouseLeaderboard from './HouseLeaderboard';
import AdmissionsPathwayCards from './AdmissionsPathwayCards';
import VideoFeature from './VideoFeature';

export default function HomeSection() {
  const [welcomeExpanded, setWelcomeExpanded] = useState(false);

  const stats = [
    { label: 'IB Diploma Pass Rate', value: '100%', description: 'Worldwide Top-Tier Sector', icon: Award, color: 'text-gold-600 bg-gold-50' },
    { label: 'Student-Teacher Ratio', value: '6:1', description: 'Deep, Individualized Tutoring', icon: Users, color: 'text-navy-700 bg-navy-700/10' },
    { label: 'Global Nationalities', value: '42+', description: 'Inclusive Multicultural Cohort', icon: Sparkles, color: 'text-purple-600 bg-purple-50' },
    { label: 'Extracurricular Modules', value: '35+', description: 'Arts, Robotics, Debating & Sports', icon: BookOpen, color: 'text-rose-600 bg-rose-50' }
  ];

  return (
    <div id="home-section" className="space-y-12">

      {/* Hero Banner with Modern Layout */}
      <section className="relative overflow-hidden rounded-3xl bg-radial from-navy-700 to-navy-950 text-white py-16 px-8 sm:px-12 md:py-20 md:px-16 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-radial from-navy-400/25 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-radial from-gold-400/15 to-transparent rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>

        <div className="relative max-w-3xl space-y-6 z-10">
          <div className="inline-flex items-center space-x-2 bg-navy-900/70 border border-gold-400/30 px-4 py-1.5 rounded-full text-xs font-sans font-semibold tracking-wider text-gold-200 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-gold-400" />
            <span>EXCELLENCE FROM FOUNDATION TO GRADUATION</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif leading-tight tracking-tight text-white">
            Nurturing Global Thinkers, <br />
            <span className="text-gold-400 font-sans font-light italic">Inspiring Infinite Minds.</span>
          </h1>

          <p className="text-navy-100/90 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl font-light">
            Welcome to Lindner International School, where academic rigor converges with personal empowerment. Our classical curriculum, enriched by the prestigious International Baccalaureate framework, prepares creative scholars for global standard universities.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link
              to="/admissions"
              className="px-6 py-3.5 bg-gold-400 hover:bg-gold-500 text-navy-950 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base group"
            >
              <span>Apply Now</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/parent-portal"
              className="px-6 py-3.5 bg-navy-600/40 hover:bg-navy-600/60 border border-gold-400/40 text-white rounded-xl font-medium transition-all duration-200 text-sm sm:text-base flex items-center justify-center"
            >
              Access Parent Portal
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex items-start gap-4">
              <div className={`p-3 rounded-xl shrink-0 ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-sm font-medium text-slate-500 font-sans block">
                  {stat.label}
                </span>
                <span className="text-2xl sm:text-3xl font-serif font-semibold text-slate-800 block">
                  {stat.value}
                </span>
                <span className="text-xs text-slate-400 block leading-tight font-light">
                  {stat.description}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Welcome Message */}
      <section className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
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
              <span>A Welcome from Our Principal</span>
            </h2>
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed font-light">
              <p>{PRINCIPAL.message[0]}</p>
              {welcomeExpanded && PRINCIPAL.message.slice(1).map((para, idx) => <p key={idx}>{para}</p>)}
            </div>
            <button
              type="button"
              onClick={() => setWelcomeExpanded(prev => !prev)}
              className="text-xs font-semibold text-navy-700 hover:underline"
            >
              {welcomeExpanded ? 'Read less' : 'Read more'}
            </button>
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-6">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3">
          Our Mission & Values
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
        <blockquote className="border-l-4 border-gold-400 pl-4 italic text-slate-600 text-sm font-serif">
          "We strive not just to teach what is compiled in literature, but to empower seekers to ask questions that have yet to be researched."
          <span className="block text-xs font-sans not-italic text-navy-700 font-medium mt-1">
            — {PRINCIPAL.name}
          </span>
        </blockquote>
      </section>

      <VideoFeature />

      <NewsCarousel />

      <HouseLeaderboard />

      <AdmissionsPathwayCards />

    </div>
  );
}
