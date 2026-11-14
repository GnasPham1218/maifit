import { Check, X } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { depthShare, type Attempt } from '../../utils/workoutDisplay';

interface Props {
  attempts: Attempt[]; // every attempt of the set, newest last
  reps: number; // counted reps of the whole set (attempts may be cut)
  joint: string; // "gối" / "khuỷu"
  downBelow: number; // depth target of the exercise
  title: string; // "Squat, set 2"
  live: boolean; // camera on: blinking dot next to the title
}

const BAR = 14;
const GAP = 6;
const STEP = BAR + GAP;
const CHART_H = 110;
const ROWS = 4; // rows shown before "Xem cả N lần"

// Card next to the camera: stats of the set, the depth of every attempt, the latest attempts and why one did not count
export function SetLogCard({ attempts, reps, joint, downBelow, title, live }: Props) {
  const [showAll, setShowAll] = useState(false);
  const last = attempts.at(-1);
  // seq counts every attempt of the set
  const notCounted = last ? Math.max(0, last.seq - reps) : 0;
  const deepest = attempts.reduce<number | null>((min, a) => (a.ok && a.low != null && (min == null || a.low < min) ? a.low : min), null);
  const rows = [...attempts].reverse();

  return (
    <section className="min-w-0 rounded-card bg-surface p-5 text-ink sm:p-6" aria-labelledby="setlog-title">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id="setlog-title" className="text-lg font-semibold">Nhật ký set</h3>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted">
          {live && <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-[#ff5a5a]" />}
          {title}
        </span>
      </div>

      {attempts.length === 0 ? (
        <div className="mt-3 grid gap-2.5">
          <div aria-hidden="true" className="flex h-14 items-end gap-1.5">
            {[18, 30, 24, 40, 34, 46, 28, 38].map((h, i) => (
              <span key={i} className="w-3.5 rounded bg-line" style={{ height: h }} />
            ))}
          </div>
          <p className="font-semibold">Chưa có lần nào trong set này</p>
          <p className="text-sm text-muted">
            Bật camera và bắt đầu tập. Mỗi lần {joint === 'gối' ? 'ngồi xuống' : 'hạ người'} sẽ hiện ở đây cùng độ sâu, và lý do nếu chưa được tính.
          </p>
        </div>
      ) : (
        <>
          <dl className="mt-3.5 mb-4 grid grid-cols-3 gap-2">
            <Stat value={String(reps)} label="hợp lệ" />
            <Stat value={String(notCounted)} label="chưa tính" dim />
            <Stat value={deepest != null ? `${deepest}°` : '—'} label="sâu nhất" />
          </dl>

          <DepthChart attempts={attempts} reps={reps} notCounted={notCounted} downBelow={downBelow} />

          <ol className={`mt-3.5 ${showAll ? 'scroll-soft scroll-fade -mr-2 max-h-80 overflow-y-auto pr-2' : ''}`}>
            {(showAll ? rows : rows.slice(0, ROWS)).map((a) => <Row key={a.seq} attempt={a} joint={joint} />)}
          </ol>
          {rows.length > ROWS && (
            <button type="button" onClick={() => setShowAll(!showAll)}
              className="mt-2 cursor-pointer py-1 text-sm font-semibold text-link hover:text-ink">
              {showAll ? 'Thu gọn' : `Xem cả ${rows.length} lần`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function Stat({ value, label, dim = false }: { value: string; label: string; dim?: boolean }) {
  return (
    <div className="flex flex-col-reverse gap-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`font-display text-3xl leading-none font-semibold tabular-nums ${dim ? 'text-muted' : ''}`}>{value}</dd>
    </div>
  );
}

// One fixed-width bar per attempt in a horizontal scroll, opened at the newest.
// Bar height = how deep the joint went, on the same scale as the depth bar on the camera.
// Touch: swipe. Mouse: drag the chart, the thin scrollbar, or the buttons under it (one view per click).
function DepthChart({ attempts, reps, notCounted, downBelow }: { attempts: Attempt[]; reps: number; notCounted: number; downBelow: number }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const atEndRef = useRef(true); // follow new attempts only while the newest is in view
  const dragRef = useRef<{ x: number; left: number } | null>(null);
  const [before, setBefore] = useState(0); // bars scrolled out on the left
  const [after, setAfter] = useState(0); // bars scrolled out on the right
  const width = attempts.length * STEP - GAP;
  const targetY = CHART_H - depthShare(downBelow, downBelow) * CHART_H;

  function measure() {
    const el = scrollerRef.current;
    if (!el) return;
    const rest = el.scrollWidth - el.clientWidth - el.scrollLeft;
    atEndRef.current = rest < STEP;
    setBefore(Math.floor(el.scrollLeft / STEP));
    setAfter(Math.max(0, Math.floor(rest / STEP)));
  }

  // A new attempt: follow it if the newest was in view (not while looking at old ones)
  useEffect(() => {
    const el = scrollerRef.current;
    if (el && atEndRef.current) el.scrollLeft = el.scrollWidth;
    measure();
  }, [attempts.length]);

  function page(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: direction * Math.max(STEP, el.clientWidth - 2 * STEP), behavior: 'smooth' });
  }

  // Mouse drag to scroll (touch already swipes natively)
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    dragRef.current = { x: e.clientX, left: e.currentTarget.scrollLeft };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (dragRef.current) e.currentTarget.scrollLeft = dragRef.current.left - (e.clientX - dragRef.current.x);
  }
  function endDrag() {
    dragRef.current = null;
  }

  const NAV = 'cursor-pointer rounded-full px-1 py-0.5 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent';

  return (
    <div>
      <div className="relative" style={{ height: CHART_H + 8 }}>
        <div ref={scrollerRef} tabIndex={0} role="region"
          aria-label={`Độ sâu từng lần: ${reps} hợp lệ, ${notCounted} chưa tính. Kéo ngang để xem lần trước.`}
          onScroll={measure} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
          className="h-full cursor-grab overflow-x-auto overflow-y-hidden pb-2 select-none [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-accent
            active:cursor-grabbing pointer-fine:[scrollbar-width:thin] [&::-webkit-scrollbar]:hidden pointer-fine:[&::-webkit-scrollbar]:block pointer-fine:[&::-webkit-scrollbar]:h-1.5">
          <svg aria-hidden="true" width={width} height={CHART_H} className="block">
            {attempts.map((a, i) => {
              const h = a.low != null ? Math.max(4, depthShare(a.low, downBelow) * CHART_H) : 4;
              return (
                <rect key={a.seq} x={i * STEP} y={CHART_H - h} width={BAR} height={h} rx={4}
                  className={a.ok ? 'fill-accent' : 'fill-muted opacity-45'}>
                  <title>{a.ok ? `Rep ${a.rep}` : `Lần ${a.seq}: ${a.tag ?? a.reason}`}{a.low != null && `, ${a.low}°`}</title>
                </rect>
              );
            })}
          </svg>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-ink" style={{ top: targetY }} />
        {before > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute left-0 w-12 bg-gradient-to-r from-surface to-transparent" style={{ top: 0, height: CHART_H }} />
        )}
        {after > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute right-0 w-12 bg-gradient-to-l from-surface to-transparent" style={{ top: 0, height: CHART_H }} />
        )}
      </div>
      <div className="mt-1 flex justify-between gap-2 text-[11px] text-muted">
        {before > 0
          ? <button type="button" onClick={() => page(-1)} className={NAV}>← {before} lần trước</button>
          : <span className="py-0.5">Lần đầu</span>}
        {after > 0
          ? <button type="button" onClick={() => page(1)} className={NAV}>{after} lần sau →</button>
          : <span className="py-0.5">Mới nhất</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-3.5 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-accent" />Hợp lệ</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-muted opacity-45" />Chưa tính</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3.5 border-t-2 border-dashed border-ink" />Đích {downBelow}°</span>
      </div>
    </div>
  );
}

function Row({ attempt: a, joint }: { attempt: Attempt; joint: string }) {
  const detail = [a.low != null && `${joint} ${a.low}°`, a.high != null && `lên ${a.high}°`].filter(Boolean).join(' · ');
  return (
    <li className="flex items-center gap-2.5 border-t border-line py-2.5">
      {a.ok ? (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-soft text-good">
          <Check aria-hidden="true" className="size-4" strokeWidth={2.6} />
        </span>
      ) : (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-muted">
          <X aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="font-semibold">{a.ok ? `Rep ${a.rep}` : `Lần ${a.seq}`}</span>
        {detail && <span className="inline-block text-sm whitespace-nowrap text-muted">&nbsp;· {detail}</span>}
      </span>
      {a.ok
        ? <span className="text-xs font-semibold text-good">Hợp lệ</span>
        : <span className="shrink-0 rounded-full bg-danger-bg px-2.5 py-0.5 text-xs font-semibold text-danger">{a.tag ?? 'Chưa tính'}</span>}
    </li>
  );
}
