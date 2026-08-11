import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

export interface NavSubItem {
  label: string;
  hash: string;
}

interface NavDropdownProps {
  label: string;
  to: string;
  items: NavSubItem[];
}

export default function NavDropdown({ label, to, items }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isActive = location.pathname === to;

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-navy-600 text-white shadow-lg border-b-2 border-gold-400'
            : 'text-navy-100 hover:bg-navy-600/40 hover:text-white'
        }`}
      >
        <span>{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gold-300 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 z-50">
          <Link
            to={to}
            className="block px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50 transition-colors"
          >
            {label} Overview
          </Link>
          <div className="my-1 border-t border-slate-100" />
          {items.map(item => (
            <Link
              key={item.hash}
              to={`${to}#${item.hash}`}
              className="block px-4 py-2 text-sm text-slate-600 hover:bg-navy-50 hover:text-navy-700 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
