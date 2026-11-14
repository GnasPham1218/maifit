import { describe, expect, it } from 'vitest';
import { dayLabel, formatTrainingTime, monthLabel, weekLabel } from './workoutTime';

describe('formatTrainingTime', () => {
  it('shows minutes under an hour, hours with one decimal above', () => {
    expect(formatTrainingTime(0)).toEqual({ value: '0', unit: 'phút' });
    expect(formatTrainingTime(2100)).toEqual({ value: '35', unit: 'phút' });
    expect(formatTrainingTime(5040)).toEqual({ value: '1,4', unit: 'giờ' });
  });
});

describe('bar labels', () => {
  it('names the weekday, the Monday of a week and the month', () => {
    expect(dayLabel('2026-11-14')).toBe('T7'); // a Saturday
    expect(dayLabel('2026-11-15')).toBe('CN');
    expect(weekLabel('2026-11-09')).toBe('9/11');
    expect(monthLabel('2026-06-01')).toBe('T6');
  });
});
