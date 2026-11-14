import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { MACROS } from '../constants/macros';
import { ringSegments } from '../utils/macroRing';

interface MacroDonutProps {
  eatenKcal: number;
  targetKcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  size?: number;
  children?: ReactNode; // the center (usually the eaten number)
  label: string; // accessible description, e.g. "Đã nạp 1.240 trên 2.100 kcal"
}

const R = 76;
const GAP = 0.8; // a small surface gap between two colored segments (in % of the ring)
const ORDER = [MACROS.protein, MACROS.carb, MACROS.fat];

// The daily calorie ring, split by macro. Segments draw in one after the other when it appears.
export function MacroDonut({ eatenKcal, targetKcal, proteinG, carbG, fatG, size = 200, children, label }: MacroDonutProps) {
  const reduce = useReducedMotion();
  const segments = ringSegments(eatenKcal, targetKcal, { protein: proteinG, carb: carbG, fat: fatG });
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg role="img" aria-label={label} viewBox="0 0 200 200" width={size} height={size}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth="20" />
        {segments.map((s, i) => {
          const length = Math.max(s.length - GAP, 0);
          if (length === 0) return null;
          return (
            <motion.circle key={ORDER[i].key} cx="100" cy="100" r={R} pathLength={100} fill="none"
              stroke={ORDER[i].color} strokeWidth="20" transform="rotate(-90 100 100)" strokeDashoffset={-s.start}
              initial={reduce ? false : { strokeDasharray: '0 100' }}
              animate={{ strokeDasharray: `${length} 100` }}
              transition={{ duration: 0.7, delay: 0.15 + i * 0.25, ease: [0.2, 0.8, 0.2, 1] }} />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
