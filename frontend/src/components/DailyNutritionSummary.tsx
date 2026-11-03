import { Link } from 'react-router';
import type { Nutrition } from '../types/meal';
import type { EnergyTargets } from '../types/profile';
import { formatNumber } from '../utils/number';
import { ProgressBar } from './ProgressBar';

interface Props {
  totals: Nutrition;
  energy: EnergyTargets | null; // null until the profile + first weigh-in exist
}

function MacroRow({ label, value, target }: { label: string; value: number; target: number | undefined }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-ink-soft">
          {formatNumber(value)}
          {target != null && ` / ${formatNumber(target)}`} g
        </span>
      </div>
      {target != null && <ProgressBar value={value} max={target} label={`${label} trong ngày`} />}
    </div>
  );
}

// Today's progress: calories vs target + macros (same macro split as the home page)
export function DailyNutritionSummary({ totals, energy }: Props) {
  const macros = energy ? (energy.macros.find((m) => m.split === 'MODERATE_CARB') ?? energy.macros[0]) : null;
  const remaining = energy ? energy.targetKcal - totals.kcal : null;

  return (
    <section className="rounded-card bg-sky p-6">
      <span className="rounded-full bg-sky-strong px-3 py-1 text-sm font-medium text-white">Đã ăn</span>
      <p className="mt-5 flex flex-wrap items-baseline gap-x-2">
        <strong className="text-5xl font-light tracking-tight">{formatNumber(totals.kcal)}</strong>
        <span className="text-lg text-ink-soft">{energy ? `/ ${formatNumber(energy.targetKcal)} kcal` : 'kcal'}</span>
      </p>

      {energy && remaining != null && (
        <div className="mt-4 grid gap-2">
          <ProgressBar value={totals.kcal} max={energy.targetKcal} label="Calo trong ngày" />
          {/* Neutral wording: going over is not "bad" for someone whose goal is to gain */}
          <p className="text-sm text-ink-soft">
            {remaining >= 0 ? `Còn ${formatNumber(remaining)} kcal` : `Vượt ${formatNumber(-remaining)} kcal`}
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4">
        <MacroRow label="Đạm" value={totals.proteinG ?? 0} target={macros?.proteinG} />
        <MacroRow label="Chất béo" value={totals.fatG ?? 0} target={macros?.fatG} />
        <MacroRow label="Carb" value={totals.carbG ?? 0} target={macros?.carbG} />
      </div>
      <p className="mt-4 text-sm text-ink-soft">Chất xơ: {formatNumber(totals.fiberG ?? 0)} g</p>

      {!energy && (
        <p className="mt-4 text-sm">
          <Link to="/profile">Thiết lập hồ sơ và ghi cân nặng</Link> để có mục tiêu calo mỗi ngày.
        </p>
      )}
    </section>
  );
}
