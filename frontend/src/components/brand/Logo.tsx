import { useId } from 'react';

// The MAIFit mark: the "M" is two mountain peaks with the sun rising between them.
// "MAI" reads as "My AI" and as the Vietnamese "mai" (tomorrow): train today, fit tomorrow.
// Shapes live on a 64x64 grid; public/favicon.svg draws the same shapes with fixed colors.
const M_POINTS = '6.6,56 23,27 32,40 41,27 57.4,56';

function MountainSun({ mColor }: { mColor: string }) {
  // Ids must be unique per instance: the logo can appear several times on one page.
  // useId may contain characters like ':' that are awkward inside url(#...), so keep only safe ones.
  const id = `maifit${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <>
      <defs>
        <clipPath id={`${id}-base`}><rect width="64" height="50" /></clipPath>
        {/* Cuts a gap around the M out of the sun, so they stay apart on any background */}
        <mask id={`${id}-gap`} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <polyline points={M_POINTS} fill="none" stroke="#000" strokeWidth="11.5" strokeMiterlimit="10" />
        </mask>
      </defs>
      <circle cx="36" cy="26" r="10" fill="var(--color-gold)" mask={`url(#${id}-gap)`} />
      <polyline points={M_POINTS} fill="none" stroke={mColor} strokeWidth="7" strokeMiterlimit="10" clipPath={`url(#${id}-base)`} />
    </>
  );
}

// App icon: the mark on an accent tile. Follows the account's accent color.
export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={`shrink-0 ${className}`}>
      <rect width="64" height="64" rx="14" fill="var(--color-accent)" />
      <MountainSun mColor="#fff" />
    </svg>
  );
}

// Wordmark: mountain M + "AIFit" in the display font, "AI" in the accent color.
// Size it with a text size class (e.g. "text-2xl"). tone="hero" for graphite blocks (always dark).
export function Logo({ className = 'text-2xl', tone = 'default' }: { className?: string; tone?: 'default' | 'hero' }) {
  const ink = tone === 'hero' ? 'text-hero-ink' : 'text-ink';
  return (
    <span className={`inline-flex items-baseline font-display leading-none font-bold tracking-wide ${ink} ${className}`}>
      {/* The M's feet sit on the text baseline; the sun rises above the cap height */}
      <svg viewBox="5 13 54 37" aria-hidden="true" className="mr-[0.04em] h-[1.3em] w-auto shrink-0 self-baseline">
        <MountainSun mColor="currentColor" />
      </svg>
      <span aria-hidden="true"><span className="text-accent">AI</span>Fit</span>
      <span className="sr-only">MAIFit</span>
    </span>
  );
}
