import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import type { ThemePreference } from '../utils/theme';

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: 'Theo máy', icon: Monitor },
  { value: 'light', label: 'Sáng', icon: Sun },
  { value: 'dark', label: 'Tối', icon: Moon },
];

// "Giao diện" in the profile. A radio group: one choice, arrow keys move between options natively
export function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">Giao diện</legend>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <label key={value}
          className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors
            has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent
            ${preference === value ? 'border-accent bg-accent text-on-accent' : 'border-line text-ink hover:bg-soft'}`}>
          <input type="radio" name="theme" value={value} checked={preference === value}
            onChange={() => setPreference(value)} className="sr-only" />
          <Icon aria-hidden="true" className="size-4" />
          {label}
        </label>
      ))}
    </fieldset>
  );
}
