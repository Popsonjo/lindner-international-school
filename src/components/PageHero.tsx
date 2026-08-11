interface PageHeroProps {
  eyebrow: string;
  title: string;
  subtitle: string;
}

export default function PageHero({ eyebrow, title, subtitle }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-radial from-navy-700 to-navy-950 text-white py-12 px-8 sm:px-12 md:py-14 md:px-16 shadow-2xl">
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-radial from-navy-400/25 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
      <div className="relative max-w-3xl space-y-3 z-10">
        <span className="inline-block bg-navy-900/70 border border-gold-400/30 px-3 py-1 rounded-full text-[11px] font-sans font-semibold tracking-wider text-gold-200">
          {eyebrow}
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif leading-tight tracking-tight text-white">{title}</h1>
        <p className="text-navy-100/90 text-sm sm:text-base leading-relaxed max-w-2xl font-light">{subtitle}</p>
      </div>
    </section>
  );
}
