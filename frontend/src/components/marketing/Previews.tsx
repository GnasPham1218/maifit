import { BookOpen } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useInViewSteps } from '../../hooks/useInViewSteps';
import { BotAvatar } from '../chat/BotAvatar';
import { MacroDonut } from '../MacroDonut';

// Static previews of the app for the sign-in pages and the landing page. Made of the same pieces as the
// real screens (accent token, macro colors), so they follow the theme and the chosen accent.
// Decorative: each has one sentence for screen readers instead of its numbers.

type Point = [number, number];
interface Pose { head: Point; neck: Point; hip: Point; kneeL: Point; kneeR: Point; ankL: Point; ankR: Point; handL: Point; handR: Point; elbL: Point; elbR: Point }

// Bottom of the squat (knee 88°): the still picture used on the sign-in pages
const SQUAT: Pose = {
  head: [200, 88], neck: [198, 130], hip: [196, 210], kneeL: [140, 250], kneeR: [250, 250], ankL: [150, 330], ankR: [242, 330],
  elbL: [150, 170], handL: [120, 150], elbR: [250, 170], handR: [282, 150],
};
// Standing up: same feet, everything above them higher, knees almost straight
const STAND: Pose = {
  head: [200, 52], neck: [198, 94], hip: [196, 182], kneeL: [168, 256], kneeR: [226, 256], ankL: [150, 330], ankR: [242, 330],
  elbL: [158, 136], handL: [134, 112], elbR: [240, 136], handR: [266, 112],
};

const line = (...pts: Point[]) => `M${pts.map(([x, y]) => `${x} ${y}`).join(' L')}`;
const bones = (p: Pose) => [
  line([p.head[0], p.head[1] + 22], p.hip),
  line(p.hip, p.kneeL, p.ankL),
  line(p.hip, p.kneeR, p.ankR),
  line(p.neck, p.elbL, p.handL),
  line(p.neck, p.elbR, p.handR),
];
const joints = (p: Pose) => [p.hip, p.kneeL, p.kneeR, p.ankL, p.ankR, p.neck];

// The camera while counting: skeleton, knee angle, rep number.
// animated (landing page): once in view, one squat goes down to 88° and back up, and the count goes 11 → 12.
export function RepPreview({ className = '', animated = false }: { className?: string; animated?: boolean }) {
  const reduce = useReducedMotion();
  // steps: 1 = at the bottom, 2 = back up and counted
  const { ref, step } = useInViewSteps([500, 1300], reduce);
  const still = !animated;
  const pose = still || step === 1 ? SQUAT : STAND;
  const counted = still || step >= 2;
  const showAngle = still || step === 1;
  const move = { duration: 0.9, ease: [0.45, 0, 0.25, 1] } as const;

  return (
    <div ref={ref} className={`relative overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#2a3348,#161a23)] ${className}`}>
      <span className="sr-only">Camera đang đếm squat: 12 rep, gối 88 độ.</span>
      <svg aria-hidden="true" viewBox="0 0 400 420" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 size-full">
        <g stroke="#e9eef8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9">
          {bones(pose).map((d, i) => <motion.path key={i} initial={false} animate={{ d }} transition={move} />)}
        </g>
        <motion.circle r="22" fill="none" stroke="#e9eef8" strokeWidth="5" initial={false}
          animate={{ cx: pose.head[0], cy: pose.head[1] }} transition={move} />
        {joints(pose).map(([x, y], i) => (
          <motion.circle key={i} r="7" className="fill-accent" initial={false} animate={{ cx: x, cy: y }} transition={move} />
        ))}
        <motion.g initial={false} animate={{ opacity: showAngle ? 1 : 0 }} transition={{ duration: 0.3 }}>
          <path d="M 158 238 A 22 22 0 0 0 144 271" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <text x="92" y="262" fill="#fff" fontFamily="Oswald, sans-serif" fontSize="22" fontWeight="600">88°</text>
        </motion.g>
      </svg>
      <div aria-hidden="true" className="absolute top-4 right-5 flex flex-col items-end text-[#c9d2e6]">
        <span className="text-xs">Squat</span>
        <motion.span key={counted ? 12 : 11} className="font-display text-[88px] leading-[0.9] font-bold text-white tabular-nums"
          initial={counted && !still ? { scale: 1.35 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 14 }}>
          {counted ? 12 : 11}
        </motion.span>
        <span className="text-xs">rep</span>
      </div>
      <div aria-hidden="true" className="absolute inset-x-4 bottom-4 flex items-center gap-2 rounded-2xl bg-black/70 px-3.5 py-2.5 text-sm text-white">
        {animated && counted
          ? <><span className="size-2 rounded-full bg-[#5bd08f]" /> Đủ sâu, đã tính thêm 1 rep</>
          : <><span className="size-2 animate-pulse rounded-full bg-[#ff5a5a]" /> Đang đếm, xuống sâu hơn để tính rep</>}
      </div>
    </div>
  );
}

const MACRO_ROWS = [
  { name: 'Đạm', color: 'bg-protein', eaten: 86, target: 140 },
  { name: 'Carb', color: 'bg-carb', eaten: 148, target: 260 },
  { name: 'Béo', color: 'bg-fat', eaten: 38, target: 70 },
];

// The day's calorie ring with the macros
export function CaloriePreview({ size = 112 }: { size?: number }) {
  return (
    <div className="flex items-center gap-4">
      <MacroDonut eatenKcal={1240} targetKcal={2100} proteinG={86} carbG={148} fatG={38} size={size}
        label="Ví dụ: đã nạp 1.240 trên 2.100 kcal">
        <span className="font-display text-2xl leading-none font-bold tabular-nums">1.240</span>
        <span className="text-[11px] opacity-70">/ 2.100 kcal</span>
      </MacroDonut>
      <ul aria-hidden="true" className="grid min-w-0 flex-1 gap-2 text-sm">
        {MACRO_ROWS.map((m) => (
          <li key={m.name} className="flex items-center gap-2.5">
            <span className={`size-2.5 shrink-0 rounded-[3px] ${m.color}`} />
            <span className="flex-1">{m.name}</span>
            <span className="tabular-nums opacity-80">{m.eaten} / {m.target} g</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// One MBotFit answer with its source chip. dark: on a graphite panel
export function BotPreview({ text, source, dark = false }: { text: string; source: string; dark?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <BotAvatar />
      <div className="min-w-0">
        <p className="text-sm leading-relaxed">{text}</p>
        <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ${
          dark ? 'bg-accent/25 text-[#cfe0ff]' : 'bg-soft text-link'}`}>
          <BookOpen aria-hidden="true" className="size-3" /> {source}
        </span>
      </div>
    </div>
  );
}
