import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';

const QUICK_LINKS: { label: string; to: string }[] = [
  { label: 'About Us', to: '/about' },
  { label: 'Academics', to: '/academics' },
  { label: 'Admissions', to: '/admissions' },
  { label: 'Campus Life', to: '/campus-life' },
  { label: 'News & Events', to: '/news-events' },
  { label: 'Alumni', to: '/alumni' },
];

/** Admin Panel is deliberately absent here — it's role-gated in the header nav
 *  instead so it isn't advertised in a footer visible on every public page. */
const PORTAL_LINKS: { label: string; to: string }[] = [
  { label: 'Events Calendar', to: '/calendar' },
  { label: 'Parent Portal', to: '/parent-portal' },
];

export default function Footer() {
  return (
    <footer className="w-full bg-navy-950 text-navy-200 border-t border-navy-800 text-xs print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

        <div className="space-y-3 lg:col-span-1">
          <p className="font-serif tracking-widest text-white uppercase text-sm">Lindner International School</p>
          <p className="text-gold-200 text-[11px] font-sans font-medium tracking-wider uppercase italic">
            "Excellence from Foundation to Graduation"
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-white font-semibold uppercase tracking-wider text-[11px]">Quick Links</h4>
          <ul className="space-y-2">
            {QUICK_LINKS.map(link => (
              <li key={link.to}>
                <Link to={link.to} className="hover:text-gold-200 transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="text-white font-semibold uppercase tracking-wider text-[11px]">Portal</h4>
          <ul className="space-y-2">
            {PORTAL_LINKS.map(link => (
              <li key={link.to}>
                <Link to={link.to} className="hover:text-gold-200 transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="text-white font-semibold uppercase tracking-wider text-[11px]">Contact</h4>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-gold-300 shrink-0 mt-0.5" />
              <span>Simawa Road, Ogun State, Nigeria</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-gold-300 shrink-0" />
              <span>+234 703 798 8653</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-gold-300 shrink-0" />
              <a href="mailto:Lindnerinternationalschool@gmail.com" className="hover:text-gold-200 transition-colors">
                Lindnerinternationalschool@gmail.com
              </a>
            </li>
          </ul>
        </div>

      </div>

      <div className="border-t border-navy-800 py-5 text-center">
        <p className="text-navy-400 font-mono text-[10px]">&copy; 2026 Lindner International School Academic Registry. All rights reserved.</p>
      </div>
    </footer>
  );
}
