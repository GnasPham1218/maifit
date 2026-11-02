import type { ReactNode } from 'react';

type Tone = 'sky' | 'lime' | 'peach';

interface StatTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  tone: Tone;
}

const TONES: Record<Tone, string> = { sky: 'bg-sky', lime: 'bg-lime', peach: 'bg-peach' };

// Pastel tile with a big, light number (the style's signature look)
export function StatTile({ label, value, unit, hint, tone }: StatTileProps) {
  return (
    <div className={`grid gap-3 rounded-3xl p-5 ${TONES[tone]}`}>
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <strong className="text-4xl font-light tracking-tight">{value}</strong>
        {unit && <span className="text-sm text-ink-soft">{unit}</span>}
      </div>
      {hint && <span className="text-xs text-ink-soft">{hint}</span>}
    </div>
  );
}
