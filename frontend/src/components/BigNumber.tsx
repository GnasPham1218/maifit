import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

interface BigNumberProps {
  value: number;
  className?: string;
  maximumFractionDigits?: number;
}

const format = (n: number, digits: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: digits });

// Decimals the final value really shows ("130" -> 0, "75,7" -> 1). In-between frames use exactly that
// many, so 365 -> 130 never flashes "247,3" and the number never grows a decimal part mid-count.
const decimalsOf = (n: number, max: number) => format(n, max).split(',')[1]?.length ?? 0;

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
    const digits = decimalsOf(value, maximumFractionDigits);
    // Hold the width of the wider of the two ends while counting: the text next to the number
    // ("kcal trên 100 g…") stays put instead of jumping as digits come and go. min-width needs a box.
    if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
    el.textContent = format(value, digits);
    const toWidth = el.getBoundingClientRect().width;
    el.textContent = format(from, digits);
    el.style.minWidth = `${Math.max(toWidth, el.getBoundingClientRect().width)}px`;

    const release = () => { el.style.minWidth = ''; };
    const controls = animate(from, value, {
      duration: 0.6,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => { el.textContent = format(v, digits); },
      onComplete: () => {
        el.textContent = format(value, maximumFractionDigits);
        release(); // back to its natural width: no empty space left after a shorter number
      },
    });
    return () => {
      controls.stop();
      release();
    };
  }, [value, reduce, maximumFractionDigits]);

  return (
    <span ref={ref} className={`font-display font-bold tabular-nums ${className}`}>
      {format(value, maximumFractionDigits)}
    </span>
  );
}
