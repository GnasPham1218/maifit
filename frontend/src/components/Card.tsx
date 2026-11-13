import type { ReactNode } from 'react';

// surface = normal card. hero = the one dark highlight block of a page (same in both themes).
// sky / lime / peach: old pastel tones, kept until every page is rewritten (plan step 11)
type Tone = 'surface' | 'hero' | 'white' | 'sky' | 'lime' | 'peach';

interface CardProps {
  title?: ReactNode;
  tone?: Tone;
  className?: string;
  children: ReactNode;
}

const TONES: Record<Tone, string> = {
  surface: 'bg-surface text-ink',
  hero: 'bg-hero text-hero-ink',
  white: 'bg-surface text-ink',
  sky: 'bg-soft text-ink',
  lime: 'bg-soft text-ink',
  peach: 'bg-soft text-ink',
};

export function Card({ title, tone = 'surface', className = '', children }: CardProps) {
  return (
    <div className={`min-w-0 rounded-card p-6 ${TONES[tone]} ${className}`}>
      {title && <h3 className="mb-4 text-lg font-semibold">{title}</h3>}
      {children}
    </div>
  );
}
