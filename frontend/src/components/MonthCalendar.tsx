import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, daysInMonth, formatMonthLabel, mondayFirstWeekday } from '../utils/date';
import { formatNumber } from '../utils/number';

interface Props {
  month: string; // yyyy-MM shown
  kcalByDate: Map<string, number>; // only days with meals
  targetKcal: number | null;
  selectedDate: string;
  today: string;
  onSelectDate: (date: string) => void;
  onChangeMonth: (month: string) => void;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const ARROW =
  'flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-bg disabled:cursor-not-allowed disabled:opacity-40';

// Month grid: each day shows the calories logged + a small bar vs the target. Tap a day to open it.
export function MonthCalendar({ month, kcalByDate, targetKcal, selectedDate, today, onSelectDate, onChangeMonth }: Props) {
  const count = daysInMonth(month);
  const leadingBlanks = mondayFirstWeekday(`${month}-01`);
  const dates = Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className={ARROW} onClick={() => onChangeMonth(addMonths(month, -1))} aria-label="Tháng trước">
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <p className="font-semibold">{formatMonthLabel(month)}</p>
        <button type="button" className={ARROW} onClick={() => onChangeMonth(addMonths(month, 1))}
          disabled={month >= today.slice(0, 7)} aria-label="Tháng sau">
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-xs text-muted">{w}</span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => <span key={`blank-${i}`} />)}

        {dates.map((date) => {
          const kcal = kcalByDate.get(date);
          const selected = date === selectedDate;
          const future = date > today;
          const percent = kcal != null && targetKcal ? Math.min(100, (kcal / targetKcal) * 100) : null;
          return (
            <button
              key={date}
              type="button"
              disabled={future}
              onClick={() => onSelectDate(date)}
              aria-pressed={selected}
              aria-label={`Ngày ${Number(date.slice(8))}: ${kcal != null ? `${formatNumber(kcal)} kcal` : 'chưa ghi bữa ăn'}`}
              className={
                'flex min-h-14 min-w-0 cursor-pointer flex-col items-center justify-start gap-0.5 rounded-2xl px-0.5 pt-1.5 ' +
                'transition-colors disabled:cursor-not-allowed disabled:opacity-30 ' +
                (selected ? 'bg-ink text-white' : `hover:bg-bg ${date === today ? 'ring-1 ring-ink' : ''}`)
              }
            >
              <span className="text-sm font-medium">{Number(date.slice(8))}</span>
              {kcal != null && (
                <>
                  <span className={`text-[10px] leading-tight ${selected ? 'text-white/80' : 'text-muted'}`}>
                    {formatNumber(Math.round(kcal))}
                  </span>
                  {percent != null && (
                    <span className={`h-1 w-3/4 overflow-hidden rounded-full ${selected ? 'bg-white/25' : 'bg-line'}`}>
                      <span className={`block h-full rounded-full ${selected ? 'bg-white' : 'bg-sky-strong'}`}
                        style={{ width: `${percent}%` }} />
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
      {targetKcal != null && <p className="mt-3 text-xs text-muted">Thanh dưới mỗi ngày: calo so với mục tiêu.</p>}
    </div>
  );
}
