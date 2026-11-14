import { Check, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { userApi } from '../../apis/userApi';
import { getErrorMessage } from '../../constants/errorMessages';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ACCENTS, applyAccent, DEFAULT_ACCENT, type AccentColor } from '../../utils/accent';

// "Giao diện" in the profile: light / dark switch (or follow the system), and the accent color.
// Light/dark stays per device (a phone at night, a laptop by day); the accent is kept per account.
export function AppearanceCard() {
  const { preference, theme, setPreference } = useTheme();
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const followSystem = preference === 'system';
  const dark = theme === 'dark';
  const accent = user?.accentColor ?? DEFAULT_ACCENT;

  // The color changes at once; if the server refuses, it goes back
  async function pickAccent(next: AccentColor) {
    if (next === accent || saving || !user) return;
    setError(null);
    setSaving(true);
    applyAccent(next);
    try {
      updateUser(await userApi.updateAccentColor(next));
    } catch (err) {
      applyAccent(accent);
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-5 rounded-card bg-surface p-5 text-ink md:p-6" aria-labelledby="appearance-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="appearance-title" className="text-lg font-semibold">Giao diện</h2>
          <p className="text-sm text-muted">Sáng tối áp dụng trên thiết bị này, màu chủ đạo theo tài khoản</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" aria-hidden="true">{dark ? 'Tối' : 'Sáng'}</span>
          <button type="button" role="switch" aria-checked={dark} aria-label="Giao diện tối" disabled={followSystem}
            onClick={() => setPreference(dark ? 'light' : 'dark')}
            className={`relative h-10 w-[76px] shrink-0 cursor-pointer rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${dark ? 'bg-accent' : 'bg-line'}`}>
            <Sun aria-hidden="true" className={`absolute top-[11px] left-[10px] size-[18px] ${dark ? 'text-white/60' : 'text-gold'}`} />
            <Moon aria-hidden="true" className={`absolute top-[11px] right-[10px] size-[18px] ${dark ? 'text-white' : 'text-muted'}`} />
            <span aria-hidden="true"
              className={`absolute top-1 left-1 flex size-8 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-200 ${
                dark ? 'translate-x-9' : ''}`}>
              {dark ? <Moon className="size-4 text-accent" /> : <Sun className="size-4 text-[#e09a1a]" />}
            </span>
          </button>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
        <input type="checkbox" checked={followSystem} className="size-5 cursor-pointer accent-[var(--color-accent)]"
          onChange={(e) => setPreference(e.target.checked ? 'system' : theme)} />
        Theo cài đặt sáng tối của máy
      </label>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
        <div>
          <p className="font-semibold">Màu chủ đạo</p>
          <p className="text-sm text-muted">Nút, mục đang chọn, biểu đồ. Đều đủ tương phản cho chữ trắng.</p>
        </div>
        <div role="radiogroup" aria-label="Màu chủ đạo" className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => {
            const selected = a.value === accent;
            return (
              <button key={a.value} type="button" role="radio" aria-checked={selected} aria-label={a.label} title={a.label}
                disabled={saving} onClick={() => void pickAccent(a.value)}
                className={`flex size-9 cursor-pointer items-center justify-center rounded-full transition-shadow disabled:cursor-wait
                  focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink ${
                  selected ? 'shadow-[0_0_0_3px_var(--color-surface),0_0_0_5px_var(--swatch)]' : ''}`}
                style={{ backgroundColor: a.swatch, ['--swatch' as string]: a.swatch }}>
                {selected && <Check aria-hidden="true" className="size-4 text-white" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </section>
  );
}
