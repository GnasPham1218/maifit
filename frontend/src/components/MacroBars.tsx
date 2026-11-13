import { motion, useReducedMotion } from 'motion/react';
import { MACROS, type MacroKey } from '../constants/macros';
import { formatNumber } from '../utils/number';

export interface MacroBarRow {
  key: MacroKey;
  value: number;
  target?: number | null; // no target: the bar is hidden, the value alone is shown
}

interface MacroBarsProps {
  rows: MacroBarRow[];
  onHero?: boolean; // on the dark highlight block: lighter label colors
}

// Swatch, name, progress bar in the macro's color, "value / target g"
export function MacroBars({ rows, onHero = false }: MacroBarsProps) {
  const reduce = useReducedMotion();
  return (
    <ul className="grid gap-3">
      {rows.map(({ key, value, target }) => {
        const macro = MACROS[key];
        const pct = target ? Math.min(value / target, 1) * 100 : 0;
        return (
          <li key={key} className="grid grid-cols-[12px_5rem_minmax(0,1fr)_auto] items-center gap-2.5 text-sm">
            <span aria-hidden="true" className={`size-3 rounded ${macro.swatch}`} />
            <span>{macro.label}</span>
            <span aria-hidden="true" className={`h-2 overflow-hidden rounded-full ${onHero ? 'bg-hero-ink/15' : 'bg-line'}`}>
              {target ? (
                <motion.span className={`block h-full origin-left rounded-full ${macro.swatch}`} style={{ width: `${pct}%` }}
                  initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.9, delay: 0.25 }} />
              ) : null}
            </span>
            <span className="text-right tabular-nums">
              {formatNumber(value)}{target ? ` / ${formatNumber(target)}` : ''} g
            </span>
          </li>
        );
      })}
    </ul>
  );
}
