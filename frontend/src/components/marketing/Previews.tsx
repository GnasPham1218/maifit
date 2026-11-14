import { BookOpen } from 'lucide-react';
import { BotAvatar } from '../chat/BotAvatar';
import { MacroDonut } from '../MacroDonut';

// Static previews of the app for the sign-in pages and the landing page. Made of the same pieces as the
// real screens (accent token, macro colors), so they follow the theme and the chosen accent.
// Decorative: each has one sentence for screen readers instead of its numbers.

// The camera while counting: skeleton, knee angle, rep number
export function RepPreview({ className = '' }: { className?: string }) {
  const joints: [number, number][] = [[196, 210], [140, 250], [250, 250], [150, 330], [242, 330], [198, 130]];
  return (
    <div className={`relative overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#2a3348,#161a23)] ${className}`}>
      <span className="sr-only">Camera đang đếm squat: 12 rep, gối 88 độ.</span>
      <svg aria-hidden="true" viewBox="0 0 400 420" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 size-full">
        <g stroke="#e9eef8" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.9">
          <path d="M200 110 L196 210" /><path d="M196 210 L140 250 L150 330" /><path d="M196 210 L250 250 L242 330" />
          <path d="M198 130 L150 170 L120 150" /><path d="M198 130 L250 170 L282 150" />
        </g>
        <circle cx="200" cy="88" r="22" fill="none" stroke="#e9eef8" strokeWidth="5" />
        {joints.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="7" className="fill-accent" />)}
        <path d="M 158 238 A 22 22 0 0 0 144 271" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <text x="92" y="262" fill="#fff" fontFamily="Oswald, sans-serif" fontSize="22" fontWeight="600">88°</text>
      </svg>
      <div aria-hidden="true" className="absolute top-4 right-5 flex flex-col items-end text-[#c9d2e6]">
        <span className="text-xs">Squat</span>
        <span className="font-display text-[88px] leading-[0.9] font-bold text-white tabular-nums">12</span>
        <span className="text-xs">rep</span>
      </div>
      <div aria-hidden="true" className="absolute inset-x-4 bottom-4 flex items-center gap-2 rounded-2xl bg-black/70 px-3.5 py-2.5 text-sm text-white">
        <span className="size-2 animate-pulse rounded-full bg-[#ff5a5a]" /> Đang đếm, xuống sâu hơn để tính rep
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
