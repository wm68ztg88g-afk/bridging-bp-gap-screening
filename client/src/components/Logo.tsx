// Bridging the BP Gap mark: the heart-with-heartbeat graphic from the
// Know Your Numbers card, in the programme palette.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-label="Bridging the BP Gap" role="img">
      <rect width="64" height="64" rx="14" fill="#24387a" />
      <rect x="13" y="9" width="6" height="14" rx="1" fill="#b12f78" transform="rotate(-38 16 16)" />
      <rect x="6" y="27" width="13" height="6" rx="1" fill="#f37a4b" transform="rotate(8 12 30)" />
      <rect x="35" y="5" width="6" height="11" rx="1" fill="#f7c631" />
      <path
        d="M38 56 C28 48 20 41 20 32 C20 26 24.5 22 29.5 22 C33.5 22 36.5 24.5 38 27.5 C39.5 24.5 42.5 22 46.5 22 C51.5 22 56 26 56 32 C56 41 48 48 38 56 Z"
        fill="#fff"
      />
      <path
        d="M24 36 H31 L34 30 L38 43 L41.5 33 L43.5 36 H52"
        fill="none" stroke="#d62f3b" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

/** Navy banner matching the card header: eyebrow, title, tagline. */
export function BrandBanner({ title, highlight, subtitle }: { title: string; highlight?: string; subtitle?: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[#24387a] px-5 py-5 text-white" data-testid="brand-banner">
      <div className="flex items-center gap-3">
        <Logo className="w-14 h-14 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.18em] text-[#f7c631] uppercase">Bridging the BP Gap</p>
          <h1 className="font-sans text-2xl font-extrabold leading-tight tracking-tight" data-testid="text-app-title">{title}{highlight && <> <span className="text-[#f7c631]">{highlight}</span></>}</h1>
        </div>
      </div>
      {subtitle && <p className="mt-3 text-sm text-white/85">{subtitle}</p>}
      <p className="mt-2 text-sm font-bold italic text-[#f7c631]">Hypertension: By the People, For the People</p>
    </div>
  );
}
