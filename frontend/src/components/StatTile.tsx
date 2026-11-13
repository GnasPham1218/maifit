import type { ReactNode } from 'react';

// tone is accepted for the old pastel calls; every tile is a surface card now
type Tone = 'surface' | 'hero' | 'sky' | 'lime' | 'peach';

interface StatTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  tone?: Tone;
}

// A label, a big scoreboard number, a unit
export function StatTile({ label, value, unit, hint, tone = 'surface' }: StatTileProps) {
  const hero = tone === 'hero';
  return (
    <div className={`grid min-w-0 gap-2 rounded-card p-5 ${hero ? 'bg-hero text-hero-ink' : 'bg-surface text-ink'}`}>
      <span className={`text-sm ${hero ? 'text-hero-muted' : 'text-muted'}`}>{label}</span>
      <div className="flex items-baseline gap-1.5">
        <strong className="font-display text-4xl leading-none font-bold tabular-nums">{value}</strong>
        {unit && <span className={`text-sm ${hero ? 'text-hero-muted' : 'text-muted'}`}>{unit}</span>}
      </div>
      {hint && <span className={`text-xs ${hero ? 'text-hero-muted' : 'text-muted'}`}>{hint}</span>}
    </div>
  );
}
