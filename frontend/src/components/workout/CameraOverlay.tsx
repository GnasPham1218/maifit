import { ArrowDown, ArrowUp, Check, Gauge, Maximize2, RotateCcw, Save, Square, TriangleAlert, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { RepPhase } from '../../utils/pose/repCounter';
import type { SessionStage } from '../../utils/pose/workoutSession';
import { clock, depthShare } from '../../utils/workoutDisplay';

// The layer drawn over the camera while training. Always dark on dark, whatever the app theme:
// it sits on a video, so the theme colors would not be readable there.

const GLASS = 'bg-black/60 text-white';
const ROUND = `flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full ${GLASS} hover:bg-black/75
  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`;

interface TopBarProps {
  focus: boolean;
  onToggleFocus: () => void;
  title: string; // "Squat, set 2"
  seconds: number | null; // since the set started; null = not started
  debug: boolean;
  onToggleDebug: () => void;
}

export function CameraTopBar({ focus, onToggleFocus, title, seconds, debug, onToggleDebug }: TopBarProps) {
  return (
    <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2 sm:inset-x-4 sm:top-4">
      <button type="button" onClick={onToggleFocus} className={ROUND} aria-label={focus ? 'Thoát toàn màn hình' : 'Toàn màn hình'}>
        {focus ? <X aria-hidden="true" className="size-5" /> : <Maximize2 aria-hidden="true" className="size-5" />}
      </button>
      <span className={`truncate rounded-full px-3.5 py-2 text-sm font-semibold ${GLASS}`}>{title}</span>
      <span className="flex items-center gap-2">
        <span className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm tabular-nums ${GLASS}`}>
          {seconds != null && <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-[#ff5a5a]" />}
          <span className="sr-only">Thời gian set </span>{clock(seconds ?? 0)}
        </span>
        <button type="button" onClick={onToggleDebug} aria-pressed={debug} aria-label="Hiện số đo" title="Hiện số đo"
          className={`${ROUND} ${debug ? 'bg-accent!' : ''}`}>
          <Gauge aria-hidden="true" className="size-5" />
        </button>
      </span>
    </div>
  );
}

// How deep the counting joint bends, as a bar filling from the top. The white mark is the angle that
// counts as "down". Red while a form rule is broken.
export function DepthMeter({ angle, downBelow, bad }: { angle: number | null; downBelow: number; bad: boolean }) {
  const share = angle == null ? 0 : depthShare(angle, downBelow);
  const target = depthShare(downBelow, downBelow);
  return (
    <div role="meter" aria-label="Độ sâu" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)}
      className="relative h-full w-3.5 rounded-full bg-white/20">
      <div className={`absolute inset-x-0 top-0 rounded-full transition-[height] duration-100 ${bad ? 'bg-[#ff6b6b]' : 'bg-accent'}`}
        style={{ height: `${share * 100}%` }} />
      <div className="absolute -inset-x-2 h-[3px] rounded bg-white" style={{ top: `${target * 100}%` }} />
      <span className="absolute right-6 -translate-y-1/2 text-xs whitespace-nowrap text-white" style={{ top: `${target * 100}%` }}>
        Đích {downBelow}°
      </span>
    </div>
  );
}

interface RepBlockProps {
  reps: number;
  stage: SessionStage;
  phase: RepPhase;
  big?: boolean;
}

export function RepBlock({ reps, stage, phase, big = false }: RepBlockProps) {
  const label = stage === 'SETUP' ? 'Chưa đếm' : phase === 'DOWN' ? 'Đang xuống' : phase === 'UP' ? 'Đang lên' : 'Vào tư thế';
  const Arrow = phase === 'DOWN' ? ArrowDown : ArrowUp;
  return (
    <div className="grid justify-items-start gap-1.5">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/25 px-3 py-1.5 text-sm font-semibold text-[#cfe0ff]">
        {stage !== 'SETUP' && phase !== 'WAITING' && <Arrow aria-hidden="true" className="size-3.5" strokeWidth={2.6} />}
        {label}
      </span>
      <p className="flex items-baseline gap-2" aria-live="polite">
        <span key={reps} className={`animate-rep-bump font-display leading-[0.85] font-bold text-white tabular-nums [text-shadow:0_4px_24px_rgb(0_0_0/0.5)] ${
          big ? 'text-[9rem] sm:text-[10.5rem]' : 'text-7xl sm:text-8xl'}`}>
          {reps}
        </span>
        <span className="font-display text-2xl text-[#c9d2e6]">rep</span>
      </p>
    </div>
  );
}

// Not counting yet: get into position, then hold still (the ring fills)
export function SetupPanel({ message, hold }: { message: string; hold: number }) {
  const holding = hold > 0;
  return (
    <div role="status" className="flex items-center gap-4 rounded-[22px] bg-black/78 p-4 text-white">
      <svg aria-hidden="true" viewBox="0 0 64 64" className="size-16 shrink-0">
        <circle cx="32" cy="32" r="26" fill="none" stroke="rgb(255 255 255 / 0.2)" strokeWidth="6" />
        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-accent)" strokeWidth="6" strokeLinecap="round"
          pathLength={100} strokeDasharray={`${hold * 100} 100`} transform="rotate(-90 32 32)" />
      </svg>
      <div className="grid gap-1">
        <span className="text-[17px] font-bold">{holding ? 'Giữ yên…' : 'Vào vị trí'}</span>
        <span className="text-sm leading-snug text-[#c9d2e6]">{message}</span>
      </div>
    </div>
  );
}

export function RepToast({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="animate-toast rounded-full bg-accent/90 px-4 py-2 text-sm font-semibold whitespace-nowrap text-white opacity-0">
      <Check aria-hidden="true" className="mr-1.5 inline size-4" strokeWidth={3} />{children}
    </p>
  );
}

// A broken form rule (stays while broken) or a rep that did not count (fades out)
export function WarningBanner({ children, fading = false }: { children: ReactNode; fading?: boolean }) {
  return (
    <p role="status" className={`flex items-center gap-2.5 rounded-2xl bg-[#c82828]/92 px-4 py-3 text-[15px] font-semibold text-white ${
      fading ? 'animate-toast opacity-0' : ''}`}>
      <TriangleAlert aria-hidden="true" className="size-5 shrink-0" />{children}
    </p>
  );
}

interface ControlsProps {
  reps: number;
  saving: boolean;
  onReset: () => void;
  onSave: () => void;
  onStop: () => void;
}

export function CameraControls({ reps, saving, onReset, onSave, onStop }: ControlsProps) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onReset} className={`${ROUND} size-14`} aria-label="Đếm lại">
        <RotateCcw aria-hidden="true" className="size-5" />
      </button>
      <button type="button" onClick={onSave} disabled={reps === 0 || saving}
        className="flex min-h-14 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-accent text-base font-bold text-white
          active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        <Save aria-hidden="true" className="size-5" />
        {saving ? 'Đang lưu…' : reps > 0 ? `Lưu set ${reps} rep` : 'Chưa có rep để lưu'}
      </button>
      <button type="button" onClick={onStop} className={`${ROUND} size-14`} aria-label="Tắt camera">
        <Square aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
