import { Check } from 'lucide-react';
import { WEEKDAY_SHORT } from '../../utils/week';

interface StreakWeekCardProps {
  streakDays: number;
  days: string[]; // Monday..Sunday
  active: Set<string>;
  today: string;
}

const WEEKDAY_LONG = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

// The streak and the seven days of this week: filled = trained, ring = today not yet trained.
// Each day says its state in words too, so the color is never the only signal.
export function StreakWeekCard({ streakDays, days, active, today }: StreakWeekCardProps) {
  return (
    <section aria-labelledby="streak" className="rounded-card bg-surface p-6">
      <h2 id="streak" className="font-medium text-muted">
        {streakDays > 0 ? `Chuỗi ${streakDays} ngày liên tiếp` : 'Chưa có chuỗi ngày tập'}
      </h2>
      <ol className="mt-4 flex justify-between">
        {days.map((day, i) => {
          const done = active.has(day);
          const isToday = day === today;
          const state = done ? 'đã tập' : day > today ? 'chưa tới' : 'chưa tập';
          return (
            <li key={day} className="flex flex-col items-center gap-1.5" aria-label={`${WEEKDAY_LONG[i]}: ${state}`}>
              <span aria-hidden="true" className={`flex size-8 items-center justify-center rounded-full border-2 ${
                done ? 'border-accent bg-accent text-on-accent' : isToday ? 'border-accent' : 'border-line'}`}>
                {done && <Check className="size-4" strokeWidth={3} />}
              </span>
              <span aria-hidden="true" className={`text-xs ${isToday ? 'font-semibold text-ink' : 'text-muted'}`}>
                {WEEKDAY_SHORT[i]}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
