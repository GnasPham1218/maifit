import { useInView } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

// Landing page scroll effects start a little before the element is fully in:
// on phones a tall block may never be 100% visible.
export const IN_VIEW_MARGIN = '0px 0px -12% 0px';

// For the landing previews' own moments: a step counter that advances on a timeline once the element
// is in view (once: scrolling back up does not replay it). steps: delays in ms between steps.
// Returns the ref to attach and the current step (0 until in view). Reduced motion: straight to the last step.
export function useInViewSteps(steps: number[], reduce: boolean | null) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: IN_VIEW_MARGIN });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    let elapsed = 0;
    const timers = steps.map((ms, i) => {
      elapsed += ms;
      return setTimeout(() => setStep(i + 1), elapsed);
    });
    return () => timers.forEach(clearTimeout);
    // steps is a constant list per caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce]);

  return { ref, step: reduce && inView ? steps.length : step };
}
