import type { ReactNode } from 'react';

// white = normal card; the pastel tones are for small highlight tiles (dashboard stats)
type Tone = 'white' | 'sky' | 'lime' | 'peach';

interface CardProps {
  title?: string;
  tone?: Tone;
  className?: string;
  children: ReactNode;
}

const TONES: Record<Tone, string> = {
  white: 'bg-surface',
  sky: 'bg-sky',
  lime: 'bg-lime',
  peach: 'bg-peach',
};

export function Card({ title, tone = 'white', className = '', children }: CardProps) {
  return (
    <div className={`rounded-card p-6 ${TONES[tone]} ${className}`}>
      {title && <h3 className="mb-4 text-lg font-semibold">{title}</h3>}
      {children}
    </div>
  );
}
