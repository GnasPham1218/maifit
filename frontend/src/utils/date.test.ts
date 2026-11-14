import { describe, expect, it } from 'vitest';
import { mealTypeAt } from './date';

describe('mealTypeAt', () => {
  // Vietnam is UTC+7: 00:00Z = 07:00 in Vietnam
  it('picks the meal from the hour in Vietnam, not the browser zone', () => {
    expect(mealTypeAt(new Date('2026-11-14T00:00:00Z'))).toBe('BREAKFAST'); // 07:00
    expect(mealTypeAt(new Date('2026-11-14T05:00:00Z'))).toBe('LUNCH'); // 12:00
    expect(mealTypeAt(new Date('2026-11-14T09:30:00Z'))).toBe('SNACK'); // 16:30
    expect(mealTypeAt(new Date('2026-11-14T10:00:00Z'))).toBe('DINNER'); // 17:00
    expect(mealTypeAt(new Date('2026-11-14T17:30:00Z'))).toBe('BREAKFAST'); // 00:30 the next day
  });
});
