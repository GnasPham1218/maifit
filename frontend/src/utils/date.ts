import { MEAL_DEFAULT_HOUR } from '../constants/meal';
import type { MealType } from '../types/meal';

const ZONE = 'Asia/Ho_Chi_Minh';

// Today as yyyy-MM-dd in Vietnam time (en-CA formats dates as 2026-11-03)
export function todayVn(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ZONE });
}

// Calendar arithmetic on yyyy-MM-dd strings (done in UTC so no time zone can shift the day)
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDayLabel(date: string): string {
  const today = todayVn();
  if (date === today) return 'Hôm nay';
  if (date === addDays(today, -1)) return 'Hôm qua';
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    timeZone: 'UTC',
  });
}

// Today: undefined -> the backend uses "now".
// A past day: the meal's usual time that day. Vietnam is UTC+7 all year (no daylight saving).
export function eatenAtFor(date: string, mealType: MealType): string | undefined {
  if (date === todayVn()) return undefined;
  const hour = String(MEAL_DEFAULT_HOUR[mealType]).padStart(2, '0');
  return new Date(`${date}T${hour}:00:00+07:00`).toISOString();
}

// ---- Months (yyyy-MM) ----

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function addMonths(month: string, months: number): string {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 7);
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate(); // day 0 of next month = last day of this one
}

// 0 = Monday ... 6 = Sunday (Vietnamese calendars start the week on Monday)
export function mondayFirstWeekday(date: string): number {
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-');
  return `Tháng ${Number(m)}, ${y}`;
}
