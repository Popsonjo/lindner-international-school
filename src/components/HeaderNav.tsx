import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Calendar, User, Shield, Home, LogOut, Menu, X, ChevronDown, KeyRound } from 'lucide-react';
import { PortalUser } from '../types';
import NavDropdown, { NavSubItem } from './NavDropdown';

interface HeaderNavProps {
  user: PortalUser;
  onLogout: () => void;
}

interface NavGroup {
  label: string;
  to: string;
  items: NavSubItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'About',
    to: '/about',
    items: [
      { label: 'Our Story', hash: 'history' },
      { label: 'Leadership Message', hash: 'leadership' },
      { label: 'Mission & Values', hash: 'mission' },
    ],
  },
  {
    label: 'Academics',
    to: '/academics',
    items: [
      { label: 'Curriculum Overview', hash: 'curriculum' },
      { label: 'Departments', hash: 'departments' },
      { label: 'Learning Support', hash: 'support' },
    ],
  },
  {
    label: 'Beyond Academics',
    to: '/beyond-academics',
    items: [
      { label: 'Clubs & Societies', hash: 'clubs' },
      { label: 'Sports', hash: 'sports' },
      { label: 'Performing Arts', hash: 'arts' },
    ],
  },
  {
    label: 'Nursery & Primary',
    to: '/nursery-primary',
    items: [
      { label: 'Early Years', hash: 'early-years' },
      { label: 'Primary Curriculum', hash: 'primary' },
      { label: 'Transition to Secondary', hash: 'transition' },
    ],
  },
  {
    label: 'News & Events',
    to: '/news-events',
    items: [
      { label: 'Latest News', hash: 'news' },
      { label: 'Upcoming Events', hash: 'calendar-preview' },
    ],
  },
  {
    label: 'Campus Life',
    to: '/campus-life',
    items: [
      { label: 'Facilities', hash: 'facilities' },
      { label: 'House System', hash: 'houses' },
      { label: 'Gallery', hash: 'gallery' },
    ],
  },
  {
    label: 'Admissions',
    to: '/admissions',
    items: [
      { label: 'How to Apply', hash: 'process' },
      { label: 'Requirements', hash: 'requirements' },
      { label: 'Fees & Financial Aid', hash: 'fees' },
    ],
  },
  {
    label: 'Alumni',
    to: '/alumni',
    items: [
      { label: 'Alumni Network', hash: 'network' },
      { label: 'Success Stories', hash: 'stories' },
      { label: 'Give Back', hash: 'giveback' },
    ],
  },
];

/** Visible to every visitor — these are legitimate public/parent entry points. */
const PORTAL_LINKS = [
  { id: 'calendar', to: '/calendar', label: 'Events Calendar', icon: Calendar },
  { id: 'parent', to: '/parent-portal', label: 'Parent Portal', icon: User },
];

export default function HeaderNav({ user, onLogout }: HeaderNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpandedGroup, setMobileExpandedGroup] = useState<string | null>(null);
  const location = useLocation();

  const navLinkClass = (path: string) =>
    `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      location.pathname === path
        ? 'bg-navy-600 text-white shadow-lg border-b-2 border-gold-400'
        : 'text-navy-100 hover:bg-navy-600/40 hover:text-white'
    }`;

  return (
    <header className="w-full bg-navy-700 text-white shadow-xl">
      {/* Top utility bar exhibiting the official school motto */}
      <div className="w-full bg-navy-900 py-1.5 text-center text-xs font-sans tracking-[0.16em] text-gold-200 border-b border-white/5 uppercase font-semibold">
        ✨ Excellence from Foundation to Graduation ✨
      </div>
      <section className="w-full border-b border-white/10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 gap-4">

            {/* Brand Crest representation matching the official school logo exactly */}
            <Link
              to="/"
              className="flex items-center space-x-3 cursor-pointer select-none shrink-0"
              aria-label="Lindner International School — go to home"
              onClick={() => setMobileOpen(false)}
            >
              <div className="bg-white p-1 rounded-full shadow-md flex items-center justify-center border-2 border-gold-400/50">
                {/* High-fidelity SVG crest matching the official LIS seal: navy rings,
                    a gold band, and a single-tone navy LIS monogram. */}
                <svg className="w-12 h-12" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Clean white background container so the ring dividers read cleanly */}
                  <circle cx="50" cy="50" r="49" fill="#FFFFFF" />

                  {/* Outermost thin circular outline in brand Navy */}
                  <circle cx="50" cy="50" r="48.5" stroke="#16305F" strokeWidth="1.0" fill="none" />

                  {/* Gold ring — the school's signature accent band */}
                  <circle cx="50" cy="50" r="45.5" stroke="#C9A227" strokeWidth="3.6" fill="none" />

                  {/* Main broad Navy circular band which holds the school name */}
                  <circle cx="50" cy="50" r="35.5" stroke="#16305F" strokeWidth="10.8" fill="none" />

                  {/* Circular path centered inside the main band for the curved text */}
                  <path id="logoTextPath" d="M 19.9,68.8 A 35.5,35.5 0 1,1 80.1,68.8" fill="none" />

                  {/* School name wrapping in white across the navy band */}
                  <text fill="#FFFFFF" fontSize="4.65" fontWeight="950" letterSpacing="0.045em" fontFamily="'Montserrat', sans-serif">
                    <textPath href="#logoTextPath" startOffset="50%" textAnchor="middle">
                      LINDNER INTERNATIONAL SCHOOL
                    </textPath>
                  </text>

                  {/* Bottom details of the main band: concentric white curve and radial ticks */}
                  <path d="M 22.8,71.3 A 34.5,34.5 0 0,0 77.2,71.3" stroke="#FFFFFF" strokeWidth="0.85" fill="none" />
                  <line x1="28.3" y1="66.9" x2="18.1" y2="74.9" stroke="#FFFFFF" strokeWidth="1.2" />
                  <line x1="71.7" y1="66.9" x2="81.9" y2="74.9" stroke="#FFFFFF" strokeWidth="1.2" />

                  {/* Inner white disc with a crisp Navy outline border */}
                  <circle cx="50" cy="50" r="28.5" fill="#FFFFFF" stroke="#16305F" strokeWidth="1.2" />

                  {/* Monogram letters: L I S — single-tone Navy, matching the official crest */}
                  <text x="26.5" y="55.5" fontFamily="'Montserrat', sans-serif" fontWeight="900" fontSize="22" fill="#16305F">L</text>
                  <rect x="47.1" y="40.0" width="5.8" height="15.5" fill="#16305F" />
                  <text x="54.2" y="55.5" fontFamily="'Montserrat', sans-serif" fontWeight="900" fontSize="22" fill="#16305F">S</text>

                  {/* Globe sitting directly above the I as the title crown */}
                  <circle cx="50.0" cy="31.2" r="7.0" fill="#FFFFFF" stroke="#16305F" strokeWidth="1.2" />

                  {/* Globe continents (Atlantic-ocean projection) */}
                  <g>
                    <path d="M 48.5,25.5 C 49.3,25.3 50.1,25.5 50.3,26.0 C 49.9,26.4 49.1,26.3 48.5,25.5 Z" fill="#16305F" />
                    <path d="M 44.5,26.5 C 43.8,27.2 44.2,28.3 45.2,28.5 C 46.2,28.7 46.5,27.8 47.2,28.2 C 47.9,28.6 47.1,29.8 47.8,30.2 C 48.3,30.5 48.8,31.2 48.3,31.7 C 47.9,32.1 47.5,31.6 47.2,31.9 C 46.8,32.2 47.0,32.6 46.8,32.9 C 46.4,32.5 45.8,32.2 45.5,31.4 C 45.1,30.5 44.1,30.3 43.6,29.5 C 43.1,28.7 43.5,27.6 44.5,26.5 Z" fill="#16305F" />
                    <path d="M 48.1,32.0 C 48.8,32.0 49.4,32.5 49.8,33.2 C 50.2,33.9 50.5,34.8 50.2,35.5 C 49.8,36.3 49.1,37.2 48.6,37.8 C 48.2,38.0 47.9,37.5 47.9,37.1 C 47.9,36.3 48.3,35.7 48.2,35.1 C 48.1,34.5 47.5,34.0 47.4,33.4 C 47.3,33.8 47.7,33.2 48.1,32.0 Z" fill="#16305F" />
                    <path d="M 51.5,26.5 C 52.2,26.1 53.5,26.3 54.2,26.7 C 54.9,27.1 55.4,27.8 55.7,28.4 C 55.3,28.7 54.8,28.4 54.3,28.8 C 53.8,29.2 53.5,29.9 53.1,30.2 C 52.6,30.0 52.2,29.5 51.8,29.5 C 51.4,29.5 51.1,27.5 51.5,26.5 Z" fill="#16305F" />
                    <path d="M 52.8,30.8 C 53.4,30.5 54.2,30.7 54.8,31.1 C 55.4,31.5 56.4,31.8 56.5,32.5 C 56.6,33.2 55.9,34.2 55.3,34.8 C 54.8,35.3 54.3,35.7 54.0,36.1 C 53.7,35.8 53.8,35.2 53.5,34.7 C 53.1,34.1 52.4,33.6 52.3,32.9 C 52.2,32.1 52.2,31.2 52.8,30.8 Z" fill="#16305F" />
                  </g>

                  {/* Detailed open book at the bottom center of the inner disc */}
                  <path d="M 28.5,65.2 C 34.5,62.2 43.5,62.2 50,66 C 56.5,62.2 65.5,62.2 71.5,65.2 L 70.3,66.8 C 64.8,63.8 56.3,63.8 50,67.5 C 43.7,63.8 35.2,63.8 29.7,66.8 Z" fill="#16305F" fillOpacity="0.1" />
                  <path d="M 28,65.6 C 33.6,62.6 42.1,62.6 48.5,66 M 72,65.6 C 66.4,62.6 57.9,62.6 51.5,66" stroke="#16305F" strokeWidth="1.0" fill="none" />
                  <path d="M 29,64.8 C 34.3,61.8 42.8,61.8 49,65.2 M 71,64.8 C 65.7,61.8 57.2,61.8 51,65.2" stroke="#16305F" strokeWidth="1.0" fill="none" />
                  <path d="M 30,64 C 35,61 43.5,61 49.5,64.5 L 49.5,58 C 43.5,54.5 35,54.5 30,57.5 Z" fill="#FFFFFF" stroke="#16305F" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M 70,64 C 65,61 56.5,61 50.5,64.5 L 50.5,58 C 56.5,54.5 65,54.5 70,57.5 Z" fill="#FFFFFF" stroke="#16305F" strokeWidth="1.3" strokeLinejoin="round" />

                  {/* Gold accent lines on the book pages, echoing the crest's gold ring */}
                  <path d="M 32,62 C 36,59.5 42,59.5 47,62" stroke="#C9A227" strokeWidth="0.8" fill="none" />
                  <path d="M 33.5,60 C 37,58 41.5,58 45.5,60" stroke="#C9A227" strokeWidth="0.8" fill="none" />
                  <path d="M 68,62 C 64,59.5 58,59.5 53,62" stroke="#C9A227" strokeWidth="0.8" fill="none" />
                  <path d="M 66.5,60 C 63,58 58.5,58 54.5,60" stroke="#C9A227" strokeWidth="0.8" fill="none" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-serif font-extrabold tracking-[0.08em] text-white flex items-center gap-1">
                  LINDNER
                </h1>
                <p className="text-[9px] md:text-[11px] font-sans font-bold uppercase tracking-[0.25em] text-gold-200">
                  International School
                </p>
              </div>
            </Link>

            {/* Desktop navigation */}
            <div className="hidden lg:flex flex-wrap justify-end items-center gap-1 flex-1">
              <NavLink to="/" end className={() => navLinkClass('/')}>
                <Home className="w-4 h-4 text-gold-300" />
                <span>Home</span>
              </NavLink>

              {NAV_GROUPS.map(group => (
                <NavDropdown key={group.to} label={group.label} to={group.to} items={group.items} />
              ))}

              <div className="flex items-center gap-1 ml-2 border-l border-navy-600 pl-2">
                {PORTAL_LINKS.map(link => {
                  const Icon = link.icon;
                  return (
                    <Link key={link.id} to={link.to} className={navLinkClass(link.to)}>
                      <Icon className="w-4 h-4 text-gold-300" />
                      <span className="hidden xl:inline">{link.label}</span>
                    </Link>
                  );
                })}

                {/* Admin Panel is only advertised in the nav once someone is already
                    staff — a logged-out visitor sees a small, unlabeled "Staff Login"
                    link instead, so the admin dashboard isn't signposted to the public. */}
                {(user.role === 'admin' || user.role === 'teacher') ? (
                  <Link to="/admin" className={navLinkClass('/admin')}>
                    <Shield className="w-4 h-4 text-gold-300" />
                    <span className="hidden xl:inline">Admin Panel</span>
                  </Link>
                ) : (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1 px-2 py-2 rounded-lg text-[11px] text-navy-300/70 hover:text-navy-100 transition-colors"
                    title="Staff Login"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              {user.role !== 'public' && (
                <div className="flex items-center space-x-2 border-l border-navy-600 pl-3 ml-1">
                  <span className="hidden xl:inline text-xs font-mono text-gold-200 bg-navy-900 py-1 px-2.5 rounded-full border border-navy-600/40">
                    {user.role === 'admin'
                      ? 'Administrator'
                      : user.role === 'teacher'
                      ? `Teacher: ${user.username}`
                      : user.role === 'pending_parent'
                      ? 'Application Pending'
                      : `Parent: ${user.studentName}`}
                  </span>
                  <button
                    onClick={onLogout}
                    className="p-1.5 hover:bg-rose-950/40 rounded-lg text-rose-300 hover:text-rose-200 transition-colors duration-200"
                    title="Log Out Secure Session"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen(prev => !prev)}
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2 rounded-lg text-gold-200 hover:bg-navy-600/40 shrink-0"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>
      </section>

      {/* Mobile accordion nav */}
      {mobileOpen && (
        <div className="lg:hidden max-h-[75vh] overflow-y-auto bg-navy-800 border-t border-navy-600/50 px-4 py-4 space-y-1">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className={navLinkClass('/') + ' w-full'}
          >
            <Home className="w-4 h-4 text-gold-300" />
            <span>Home</span>
          </Link>

          {NAV_GROUPS.map(group => (
            <div key={group.to} className="border-b border-navy-700/60 last:border-0">
              <div className="flex items-center">
                <Link
                  to={group.to}
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 px-3 py-2.5 text-sm font-medium text-navy-100 hover:text-white"
                >
                  {group.label}
                </Link>
                <button
                  type="button"
                  aria-label={`Toggle ${group.label} submenu`}
                  onClick={() => setMobileExpandedGroup(prev => (prev === group.to ? null : group.to))}
                  className="p-2.5 text-gold-300"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${mobileExpandedGroup === group.to ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
              {mobileExpandedGroup === group.to && (
                <div className="pb-2 pl-4 space-y-1">
                  {group.items.map(item => (
                    <Link
                      key={item.hash}
                      to={`${group.to}#${item.hash}`}
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 text-xs text-navy-200 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="pt-2 mt-2 border-t border-navy-600/50 space-y-1">
            {PORTAL_LINKS.map(link => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.id}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={navLinkClass(link.to) + ' w-full'}
                >
                  <Icon className="w-4 h-4 text-gold-300" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {(user.role === 'admin' || user.role === 'teacher') ? (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className={navLinkClass('/admin') + ' w-full'}
              >
                <Shield className="w-4 h-4 text-gold-300" />
                <span>Admin Panel</span>
              </Link>
            ) : (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-[11px] text-navy-400 hover:text-navy-200"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Staff Login</span>
              </Link>
            )}

            {user.role !== 'public' && (
              <button
                onClick={() => {
                  onLogout();
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-rose-300 hover:text-rose-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
