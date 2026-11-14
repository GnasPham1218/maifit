import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';

// Landing illustrations for the name's pun: "mai" is Vietnamese for tomorrow.
// The mountains and the rising sun are the logo's own shapes. Decorative: one sentence for screen readers.
// With reduced motion they render in their final state and the parallax is off.

const EASE = [0.2, 0.8, 0.2, 1] as const;

// The trail up the mountain: every point is a training day, the last two are today and tomorrow (the sun).
const TRAIL: [number, number][] = [[56, 356], [160, 338], [100, 310], [178, 290], [132, 266], [205, 246]];
const TRAIL_PATH = `M${TRAIL.map(([x, y]) => `${x} ${y}`).join(' L')}`;
const TODAY = TRAIL.length - 2;
const STARS: [number, number][] = [[48, 60], [96, 112], [330, 72], [362, 132], [286, 40], [150, 48]];

// Parallax: how far (in SVG units) each layer moves while the picture scrolls out of the top of the screen.
// Far layers move with the page less than near ones, and the sun keeps rising as you scroll down.
// Measured on the picture itself, not the page: on phones it sits below the text, and must look
// untouched when it first comes into view.

// Hero: a trail of training days climbing to the sun rising between two peaks
export function JourneyPreview({ className = '' }: { className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // 0 while the picture's top is below the top of the screen, 1 once it has fully scrolled out
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const layer = (to: number) => [0, reduce ? 0 : to];
  const starsY = useTransform(scrollYProgress, [0, 1], layer(90));
  const sunY = useTransform(scrollYProgress, [0, 1], layer(-50));
  const ridgeY = useTransform(scrollYProgress, [0, 1], layer(40));
  const hillY = useTransform(scrollYProgress, [0, 1], layer(10));
  const from = <T,>(value: T) => (reduce ? false : value);
  const [todayX, todayY] = TRAIL[TODAY];
  const [maiX, maiY] = TRAIL[TRAIL.length - 1];

  return (
    <div ref={ref} className={`relative overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#161a23,#2a3348)] ${className}`}>
      <span className="sr-only">Minh hoạ: con đường lên núi, mỗi chấm là một ngày tập, mặt trời ngày mai mọc trên đỉnh.</span>
      <svg aria-hidden="true" viewBox="0 0 400 420" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <motion.g style={{ y: starsY }}>
          {STARS.map(([x, y], i) => (
            <motion.circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} fill="#e9eef8"
              initial={from({ opacity: 0.15 })} animate={reduce ? { opacity: 0.5 } : { opacity: [0.15, 0.7, 0.15] }}
              transition={{ duration: 3, delay: i * 0.4, repeat: reduce ? 0 : Infinity, ease: 'easeInOut' }} />
          ))}
        </motion.g>

        {/* The sun rises from behind the peaks, then its halo breathes */}
        <motion.g style={{ y: sunY }}>
          <motion.g initial={from({ y: 140 })} animate={{ y: 0 }} transition={{ duration: 2.2, ease: EASE }}>
            <motion.circle cx="205" cy="196" r="54" fill="none" className="stroke-gold" strokeWidth="2"
              initial={from({ opacity: 0 })} animate={reduce ? { opacity: 0.2 } : { opacity: [0.08, 0.28, 0.08] }}
              transition={{ duration: 3.2, delay: 2.2, repeat: reduce ? 0 : Infinity, ease: 'easeInOut' }} />
            <circle cx="205" cy="196" r="38" className="fill-gold" />
          </motion.g>
        </motion.g>

        <motion.polygon style={{ y: ridgeY }} points="0,470 0,290 128,148 205,252 282,136 400,300 400,470" fill="#323c52" />
        {/* Near hills; both shapes extend below the frame so the parallax never shows a gap */}
        <motion.polygon style={{ y: hillY }} points="0,470 0,372 90,330 190,388 300,350 400,392 400,470" fill="#1f2533" />

        {/* The trail is drawn on the ridge, so it moves with it (on top of the hills) */}
        <motion.g style={{ y: ridgeY }}>
          <motion.path d={TRAIL_PATH} fill="none" stroke="#7ea6ff" strokeWidth="2.5" strokeDasharray="4 6" strokeLinecap="round"
            initial={from({ pathLength: 0 })} animate={{ pathLength: 1 }} transition={{ duration: 1.8, delay: 0.4, ease: 'easeInOut' }} />

          {TRAIL.slice(0, TODAY).map(([x, y], i) => (
            <motion.circle key={`${x}-${y}`} cx={x} cy={y} r="7" className="fill-accent"
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              initial={from({ scale: 0 })} animate={{ scale: 1 }}
              transition={{ duration: 0.35, delay: 0.5 + i * 0.32, ease: EASE }} />
          ))}

          {/* Today: a ring that keeps pulsing, the next step is yours */}
          <motion.g initial={from({ opacity: 0 })} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 1.8 }}>
            <motion.circle cx={todayX} cy={todayY} r="9" fill="none" stroke="#fff" strokeWidth="2"
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              animate={reduce ? undefined : { scale: [1, 1.9], opacity: [0.7, 0] }}
              transition={{ duration: 1.6, delay: 2.2, repeat: Infinity, ease: 'easeOut' }} />
            <circle cx={todayX} cy={todayY} r="8" className="fill-accent" stroke="#fff" strokeWidth="3" />
            <text x={todayX - 16} y={todayY + 5} textAnchor="end" fill="#fff" fontFamily="Oswald, sans-serif" fontSize="16" fontWeight="600">Hôm nay</text>
          </motion.g>

          {/* Tomorrow: an empty gold ring under the sun */}
          <motion.g initial={from({ opacity: 0 })} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 2.3 }}>
            <circle cx={maiX} cy={maiY} r="7" fill="#323c52" className="stroke-gold" strokeWidth="2.5" />
            <text x={maiX + 14} y={maiY + 5} className="fill-gold" fontFamily="Oswald, sans-serif" fontSize="16" fontWeight="600">Mai</text>
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}

// A training streak: past days, today, and tomorrow's sun. Animates once when scrolled into view.
export function StreakPreview({ className = '' }: { className?: string }) {
  const reduce = useReducedMotion();
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return (
    <div className={`grid gap-5 rounded-card bg-hero p-6 text-hero-ink md:p-7 ${className}`}>
      <span className="sr-only">Ví dụ chuỗi ngày tập: 12 ngày, hôm nay đã tập 48 rep và ghi 1.820 kcal.</span>
      <div aria-hidden="true" className="grid gap-5">
        <p className="text-sm text-hero-muted">Chuỗi ngày tập</p>
        <p className="flex items-baseline gap-2">
          <span className="font-display text-7xl leading-none font-bold tabular-nums">12</span>
          <span className="text-hero-muted">ngày</span>
        </p>
        <ol className="flex items-end gap-2">
          {days.map((day, i) => {
            const today = i === days.length - 1;
            return (
              <li key={day} className="grid justify-items-center gap-1.5">
                <motion.span
                  className={`block size-8 rounded-lg bg-accent ${today ? 'ring-2 ring-hero-ink ring-offset-2 ring-offset-hero' : ''}`}
                  initial={reduce ? false : { scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.3, delay: i * 0.12, ease: EASE }} />
                <span className={`text-[11px] ${today ? 'font-semibold' : 'text-hero-muted'}`}>{today ? 'Nay' : day}</span>
              </li>
            );
          })}
          <li className="grid justify-items-center gap-1.5">
            <motion.span className="block size-8 rounded-full bg-gold"
              initial={reduce ? false : { scale: 0.4, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.5, delay: days.length * 0.12 + 0.1, ease: EASE }} />
            <span className="text-[11px] font-semibold text-gold">Mai</span>
          </li>
        </ol>
        <div className="rounded-2xl bg-white/[0.06] px-4 py-3">
          <p className="text-xs text-hero-muted">Hôm nay</p>
          <p className="font-display text-2xl font-bold tabular-nums">48 rep · 1.820 kcal</p>
        </div>
      </div>
    </div>
  );
}
