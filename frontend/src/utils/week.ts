import type { Leaderboard, MonthlyWorkoutSummary } from '../types/workout';
import { addDays, mondayFirstWeekday, monthOf } from './date';

export const WEEKDAY_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// Monday..Sunday of the week that contains `date` (yyyy-MM-dd)
export function weekDays(date: string): string[] {
  const monday = addDays(date, -mondayFirstWeekday(date));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// The months a week touches: one, or two when it crosses a month end
export function monthsOf(days: string[]): string[] {
  return [...new Set(days.map(monthOf))];
}

// Days of the week with at least one rep, from the monthly summaries
export function activeDays(days: string[], summaries: MonthlyWorkoutSummary[]): Set<string> {
  const week = new Set(days);
  const active = new Set<string>();
  for (const summary of summaries) {
    for (const d of summary.days) {
      if (d.reps > 0 && week.has(d.date)) active.add(d.date);
    }
  }
  return active;
}

// The week's leaderboards hold my reps per exercise; their sum is my week total
export function weekRepTotal(boards: Leaderboard[]): number {
  return boards.reduce((sum, b) => sum + (b.me?.reps ?? 0), 0);
}
