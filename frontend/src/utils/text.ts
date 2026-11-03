// Accent-insensitive search: "ga" matches "gà", "duong" matches "Đường"
export function normalize(s: string): string {
  return s
    .normalize('NFD') // "à" -> "a" + a separate combining accent
    .replace(/\p{Diacritic}/gu, '') // drop the accents
    .replace(/đ/g, 'd') // "đ" is its own letter, not "d" + accent
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}
