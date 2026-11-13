import { describe, expect, it } from 'vitest';
import type { Leaderboard, MonthlyWorkoutSummary } from '../types/workout';
import { activeDays, monthsOf, weekDays, weekRepTotal } from './week';

describe('weekDays', () => {
  it('starts on Monday', () => {
    // 2026-11-13 is a Friday
    expect(weekDays('2026-11-13')).toEqual([
      '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15',
    ]);
  });

  it('keeps a Sunday in the week that ends on it', () => {
    expect(weekDays('2026-11-15')[0]).toBe('2026-11-09');
  });

  it('crosses a month end', () => {
    const days = weekDays('2026-12-01');
    expect(days[0]).toBe('2026-11-30');
    expect(monthsOf(days)).toEqual(['2026-11', '2026-12']);
  });
});

describe('activeDays', () => {
  it('keeps only this week\'s days with reps', () => {
    const summaries: MonthlyWorkoutSummary[] = [{
      month: '2026-11',
      days: [
        { date: '2026-11-08', exercise: 'SQUAT', reps: 20 }, // last week
        { date: '2026-11-10', exercise: 'SQUAT', reps: 15 },
        { date: '2026-11-10', exercise: 'PUSH_UP', reps: 10 },
        { date: '2026-11-12', exercise: 'PUSH_UP', reps: 0 },
      ],
    }];
    expect([...activeDays(weekDays('2026-11-13'), summaries)]).toEqual(['2026-11-10']);
  });
});

describe('weekRepTotal', () => {
  const board = (reps: number | null): Leaderboard => ({
    exercise: 'SQUAT', period: 'WEEK', from: '2026-11-09', to: '2026-11-15', top: [], streakDays: 0,
    me: reps == null ? null : { rank: 1, displayName: 'Sang', reps, me: true },
  });

  it('sums my reps and counts a missing entry as zero', () => {
    expect(weekRepTotal([board(120), board(null), board(45)])).toBe(165);
  });
});
