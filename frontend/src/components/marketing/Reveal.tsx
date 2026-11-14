import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { IN_VIEW_MARGIN } from '../../hooks/useInViewSteps';

// Landing page: text and blocks rise 16 px and fade in when scrolled to, once.
// delay staggers siblings (seconds). Reduced motion (MotionConfig in App.tsx): fade only, no movement.
export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: IN_VIEW_MARGIN }} transition={{ duration: 0.55, delay, ease: [0.2, 0.8, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}
