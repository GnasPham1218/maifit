import { useEffect, useRef, useState } from 'react';
import { daysInMonth } from '../utils/date';
import { formatNumber } from '../utils/number';

interface Props {
  month: string; // yyyy-MM
  kcalByDate: Map<string, number>; // only days with meals: no bar is drawn for the others
  targetKcal: number | null;
  selectedDate: string;
  today: string;
  onSelectDate: (date: string) => void;
}

const PAD = { top: 14, right: 12, bottom: 24, left: 46 };
const MIN_HEIGHT = 200; // stacked on mobile there is no neighbour to stretch to

// 1, 2, 2.5, 5 x 10^n: clean axis steps (0 / 500 / 1.000 ...)
function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

// Column with a 4px rounded top and a square base on the baseline
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  const base = y + h;
  return `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${base} Z`;
}

// Calories per day of the month, one series (no legend: the card title names it) + the target line
export function MonthlyKcalChart({ month, kcalByDate, targetKcal, selectedDate, today, onSelectDate }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  // The chart fills whatever box the layout gives it (same height as the calendar on desktop):
  // measure that box and draw in real pixels, so text is never stretched or squashed.
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 720, h: 240 });
  const hasData = kcalByDate.size > 0;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.max(280, width), h: Math.max(MIN_HEIGHT, height) });
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [hasData]); // the box only exists once there is data

  if (!hasData) {
    return <p className="text-sm text-muted">Tháng này chưa có bữa ăn nào được ghi.</p>;
  }

  const W = size.w;
  const H = size.h;
  const PLOT_W = W - PAD.left - PAD.right;
  const PLOT_H = H - PAD.top - PAD.bottom;
  const count = daysInMonth(month);
  const maxValue = Math.max(...kcalByDate.values(), targetKcal ?? 0);
  const step = niceStep(maxValue / 4);
  const yMax = Math.ceil((maxValue * 1.05) / step) * step;
  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);
  const y = (v: number) => PAD.top + PLOT_H - (v / yMax) * PLOT_H;

  const band = PLOT_W / count;
  const barW = Math.min(14, band * 0.62); // thin, capped; the rest of the band is air
  const dateOf = (day: number) => `${month}-${String(day).padStart(2, '0')}`;

  // Readout above the chart: the hovered day, else the selected day
  const shown = hovered ?? selectedDate;
  const shownKcal = kcalByDate.get(shown);

  return (
    <div className="flex h-full flex-col">
      <p className="mb-2 min-h-6 text-sm" aria-live="polite">
        <span className="font-medium">Ngày {Number(shown.slice(8))}/{Number(shown.slice(5, 7))}:</span>{' '}
        {shownKcal != null ? `${formatNumber(shownKcal)} kcal` : 'chưa ghi bữa ăn'}
        {shownKcal != null && targetKcal != null && (
          <span className="text-muted"> · {Math.round((shownKcal / targetKcal) * 100)}% mục tiêu</span>
        )}
      </p>

      <div ref={boxRef} className="relative min-h-[200px] flex-1">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0" role="img"
        aria-label={`Biểu đồ calo theo ngày, ${kcalByDate.size} ngày có dữ liệu`}
        onMouseLeave={() => setHovered(null)}>
        {/* Recessive hairline grid + y labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted text-[11px]">
              {formatNumber(t)}
            </text>
          </g>
        ))}

        {Array.from({ length: count }, (_, i) => {
          const day = i + 1;
          const date = dateOf(day);
          const kcal = kcalByDate.get(date);
          const x = PAD.left + i * band;
          const future = date > today;
          const active = date === selectedDate || date === hovered;
          return (
            <g key={date}>
              {kcal != null && kcal > 0 && (
                <path d={columnPath(x + (band - barW) / 2, y(kcal), barW, PAD.top + PLOT_H - y(kcal))}
                  className={active ? 'fill-ink' : 'fill-sky-strong'} />
              )}
              {(day === 1 || day % 5 === 0) && (
                <text x={x + band / 2} y={H - 6} textAnchor="middle" className="fill-muted text-[11px]">{day}</text>
              )}
              {/* Hit target: the whole column band, much bigger than the bar */}
              {!future && (
                <rect x={x} y={PAD.top} width={band} height={PLOT_H} fill="transparent" className="cursor-pointer"
                  onMouseEnter={() => setHovered(date)} onClick={() => onSelectDate(date)}>
                  <title>{`Ngày ${day}: ${kcal != null ? `${formatNumber(kcal)} kcal` : 'chưa ghi'}`}</title>
                </rect>
              )}
            </g>
          );
        })}

        {/* Target: a reference line, labeled in text ink (never the data color) */}
        {targetKcal != null && (
          <g pointerEvents="none">
            <line x1={PAD.left} x2={W - PAD.right} y1={y(targetKcal)} y2={y(targetKcal)}
              className="stroke-ink-soft" strokeWidth={1.5} />
            <text x={W - PAD.right} y={y(targetKcal) - 6} textAnchor="end" className="fill-ink-soft text-[11px] font-medium">
              Mục tiêu {formatNumber(targetKcal)}
            </text>
          </g>
        )}
      </svg>
      </div>
    </div>
  );
}
