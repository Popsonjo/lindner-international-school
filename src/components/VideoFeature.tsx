import { useState } from 'react';
import { Play, X } from 'lucide-react';

/** Poster-only placeholder — swap VIDEO_EMBED_URL for a real hosted video/YouTube embed link. */
const VIDEO_EMBED_URL = '';
const POSTER_URL =
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&h=675&q=80';

export default function VideoFeature() {
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-serif font-bold text-slate-800 text-center">Life at LIS</h2>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg block"
        aria-label="Play the Life at LIS video"
      >
        <img src={POSTER_URL} alt="Students at Lindner International School" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-navy-950/40 group-hover:bg-navy-950/50 transition-colors flex items-center justify-center">
          <span className="w-16 h-16 rounded-full bg-gold-400 group-hover:bg-gold-500 flex items-center justify-center shadow-xl transition-colors">
            <Play className="w-6 h-6 text-navy-950 ml-1" fill="currentColor" />
          </span>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Life at LIS video"
        >
          <div className="relative w-full max-w-3xl aspect-video bg-navy-950 rounded-xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close video"
              className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-black/40 text-white hover:bg-black/60"
            >
              <X className="w-5 h-5" />
            </button>
            {VIDEO_EMBED_URL ? (
              <iframe
                src={VIDEO_EMBED_URL}
                title="Life at LIS"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-navy-200 text-sm px-8 text-center">
                Video coming soon — the school office will add the campus tour video here.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
