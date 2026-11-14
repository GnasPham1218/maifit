import { formatNumber } from './number';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']; // Date.getUTCDay(): 0 = Sunday

// Under an hour in minutes ("35 phút"), then hours with one decimal ("1,4 giờ")
export function formatTrainingTime(seconds: number): { value: string; unit: string } {
  if (seconds < 3600) return { value: String(Math.round(seconds / 60)), unit: 'phút' };
  return { value: formatNumber(Math.round((seconds / 3600) * 10) / 10), unit: 'giờ' };
}

// Bar labels. start is yyyy-MM-dd; read as a plain date (UTC), no time zone shift
export function dayLabel(start: string): string {
  return WEEKDAYS[new Date(`${start}T00:00:00Z`).getUTCDay()];
}

export function weekLabel(start: string): string {
  const [, m, d] = start.split('-').map(Number);
  return `${d}/${m}`;
}

export function monthLabel(start: string): string {
  return `T${Number(start.split('-')[1])}`;
}
