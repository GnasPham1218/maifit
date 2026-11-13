import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

interface BigNumberProps {
  value: number;
  className?: string;
  maximumFractionDigits?: number;
}

const format = (n: number, digits: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: digits });

// A scoreboard number that counts from its previous value to the new one (e.g. kcal after adding a food).
// Writes the text node directly during the animation: no React render per frame.
// Screen readers get the final value only (aria-live is left to the caller when it matters).
export function BigNumber({ value, className = '', maximumFractionDigits = 0 }: BigNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    const from = previous.current;
    previous.current = value;
    if (!el) return;
    if (reduce || from === value) {
      el.textContent = format(value, maximumFractionDigits);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.6,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => { el.textContent = format(v, maximumFractionDigits); },
    });
    return () => controls.stop();
  }, [value, reduce, maximumFractionDigits]);

  return (
    <span ref={ref} className={`font-display font-bold tabular-nums ${className}`}>
      {format(value, maximumFractionDigits)}
    </span>
  );
}
