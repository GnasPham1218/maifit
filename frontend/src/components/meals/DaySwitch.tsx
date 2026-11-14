import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, formatDayLabel } from '../../utils/date';

interface DaySwitchProps {
  date: string;
  today: string;
  onChange: (date: string) => void;
}

const ARROW =
  'flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-soft ' +
  'disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent';

// "‹ Hôm nay ›" pill. No future days: meals are logged when eaten.
export function DaySwitch({ date, today, onChange }: DaySwitchProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1">
      <button type="button" className={ARROW} onClick={() => onChange(addDays(date, -1))} aria-label="Ngày trước">
        <ChevronLeft aria-hidden="true" className="size-4" />
      </button>
      <h2 aria-live="polite" className="min-w-28 px-2 text-center font-semibold first-letter:uppercase">{formatDayLabel(date)}</h2>
      <button type="button" className={ARROW} onClick={() => onChange(addDays(date, 1))} disabled={date >= today}
        aria-label="Ngày sau">
        <ChevronRight aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
