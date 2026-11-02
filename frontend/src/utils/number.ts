// "" -> null, "72.5" -> 72.5 (for optional number inputs)
export function optionalNumber(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}
