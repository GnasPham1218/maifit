// Accent colors the user can pick (kept per account, see AccentColor in the backend).
// Every accent passed >= 4.5:1 with white text on it (WCAG AA): no free color picker on purpose.
// public/theme-init.js reads the same storage key before React starts: keep both in sync.

export type AccentColor = 'BLUE' | 'TEAL' | 'GREEN' | 'ORANGE' | 'PURPLE' | 'PINK';

export const ACCENT_STORAGE_KEY = 'maifit-accent';
export const DEFAULT_ACCENT: AccentColor = 'BLUE';

// swatch: the accent itself (same value as --color-accent in global.css for that accent)
export const ACCENTS: { value: AccentColor; label: string; swatch: string }[] = [
  { value: 'BLUE', label: 'Xanh dương', swatch: '#2b6cf6' },
  { value: 'TEAL', label: 'Xanh ngọc', swatch: '#0f766e' },
  { value: 'GREEN', label: 'Xanh lá', swatch: '#15803d' },
  { value: 'ORANGE', label: 'Cam', swatch: '#c2410c' },
  { value: 'PURPLE', label: 'Tím', swatch: '#7c3aed' },
  { value: 'PINK', label: 'Hồng', swatch: '#db2777' },
];

export function isAccentColor(value: unknown): value is AccentColor {
  return ACCENTS.some((a) => a.value === value);
}

// data-accent on <html> switches the accent tokens in global.css; no attribute = the default blue.
// Also remembered on this device, so the next page load paints the right color before the user is known.
export function applyAccent(accent: AccentColor): void {
  if (accent === DEFAULT_ACCENT) delete document.documentElement.dataset.accent;
  else document.documentElement.dataset.accent = accent.toLowerCase();
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  } catch {
    // Not remembered on this device: the account still has it
  }
}

// The accent as a CSS color, for drawing on a canvas (which cannot use CSS variables)
export function currentAccentColor(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#2b6cf6';
}
