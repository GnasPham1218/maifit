// "" -> null, "72.5" -> 72.5 (for optional number inputs)
export function optionalNumber(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}

// 70.5 -> "70,5" (Vietnamese decimal comma); also hides float noise like 0.30000000000000004
export function formatNumber(n: number): string {
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
}

// -1.24 -> "-1,2", 0.5 -> "+0,5"
export function formatDelta(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${formatNumber(rounded)}`;
}
