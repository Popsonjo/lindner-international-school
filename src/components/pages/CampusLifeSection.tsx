import { Building2, FlaskConical, Library, UtensilsCrossed } from 'lucide-react';
import PageHero from '../PageHero';
import HouseLeaderboard from '../HouseLeaderboard';

const FACILITIES = [
  { icon: FlaskConical, name: 'Science Laboratories', description: 'Fully equipped Physics, Chemistry, and Biology labs across the Stavros Science Atrium.' },
  { icon: Library, name: 'Library & Research Center', description: 'A quiet study campus wing stocked with print and digital collections for every grade.' },
  { icon: Building2, name: 'Liszt Auditorium', description: 'A 400-seat performing arts hall used for recitals, assemblies, and theatre productions.' },
  { icon: UtensilsCrossed, name: 'Dining Hall', description: 'Nutritionist-reviewed daily menus served campus-wide at lunch.' },
];

const GALLERY_IMAGES = [
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&h=450&q=80',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&h=450&q=80',
  'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=600&h=450&q=80',
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&h=450&q=80',
  'https://images.unsplash.com/photo-1591123120675-6f7f1aae0e5b?auto=format&fit=crop&w=600&h=450&q=80',
  'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&h=450&q=80',
];

export default function CampusLifeSection() {
  return (
    <div className="space-y-12">
      <PageHero
        eyebrow="CAMPUS LIFE"
        title="A Campus Designed for Community"
        subtitle="From our science laboratories to the House system that anchors every scholar's daily life, campus life at LIS is built around belonging."
      />

      <section id="facilities" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-6">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3">Facilities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FACILITIES.map(facility => {
            const Icon = facility.icon;
            return (
              <div key={facility.name} className="flex gap-4 p-4 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-navy-700/10 text-navy-700 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-800">{facility.name}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-light">{facility.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div id="houses">
        <HouseLeaderboard />
      </div>

      <section id="gallery" className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm space-y-6">
        <h2 className="text-2xl font-serif font-bold text-slate-800 border-b border-slate-100 pb-3">Campus Gallery</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {GALLERY_IMAGES.map((src, idx) => (
            <img
              key={idx}
              src={src}
              alt="Lindner International School campus"
              className="w-full aspect-4/3 object-cover rounded-xl shadow-sm"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
