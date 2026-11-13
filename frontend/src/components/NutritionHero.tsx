import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Nutrition } from '../types/meal';
import type { Macros } from '../types/profile';
import { formatNumber } from '../utils/number';
import { BigNumber } from './BigNumber';
import { MacroBars, type MacroBarRow } from './MacroBars';
import { MacroDonut } from './MacroDonut';

interface NutritionHeroProps {
  title: string; // for screen readers ("Hôm nay", "Tổng trong ngày")
  eaten: Nutrition;
  targetKcal: number | null; // null: no profile / weigh-in yet
  targets: Macros | null;
  children?: ReactNode; // actions under the numbers (home page)
}

// The dark block shared by the home and meals pages: calorie ring split by macro + macro bars.
// Without a target there is nothing to fill a ring against, so it shows the plain total instead.
export function NutritionHero({ title, eaten, targetKcal, targets, children }: NutritionHeroProps) {
  const protein = eaten.proteinG ?? 0;
  const carb = eaten.carbG ?? 0;
  const fat = eaten.fatG ?? 0;
  const kcal = Math.round(eaten.kcal);

  const rows: MacroBarRow[] = [
    { key: 'protein', value: protein, target: targets?.proteinG },
    { key: 'carb', value: carb, target: targets?.carbG },
    { key: 'fat', value: fat, target: targets?.fatG },
    // Fiber has no target of its own; shown only when the foods have the data
    ...(eaten.fiberG != null ? [{ key: 'fiber' as const, value: eaten.fiberG }] : []),
  ];

  return (
    <section aria-label={title} className="grid gap-6 rounded-card bg-hero p-6 text-hero-ink md:p-8">
      <div className="grid items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)] md:gap-10">
          {targetKcal != null ? (
          // Phones: one column, the ring centered. From sm: ring left, bars right.
          <div className="justify-self-center sm:justify-self-auto">
            <MacroDonut eatenKcal={kcal} targetKcal={targetKcal} proteinG={protein} carbG={carb} fatG={fat} size={196}
              label={`Đã nạp ${formatNumber(kcal)} trên ${formatNumber(targetKcal)} kcal`}>
              <BigNumber value={kcal} className="text-5xl leading-none" />
              <span className="mt-1 text-sm text-hero-muted">/ {formatNumber(targetKcal)} kcal</span>
            </MacroDonut>
          </div>
        ) : (
          <p className="grid justify-items-center justify-self-center text-center sm:justify-items-start sm:justify-self-auto sm:text-left">
            <BigNumber value={kcal} className="text-6xl leading-none" />
            <span className="mt-1 text-hero-muted">kcal đã nạp</span>
          </p>
        )}
        <div className="grid min-w-0 gap-4">
          {targetKcal != null ? (
            <p className="text-lg font-semibold justify-self-center">
              {kcal <= targetKcal
                ? `Còn ${formatNumber(targetKcal - kcal)} kcal`
                : `Vượt ${formatNumber(kcal - targetKcal)} kcal so với mục tiêu`}
            </p>
          ) : (
            <p className="text-hero-muted">
              <Link to="/profile" className="font-semibold text-hero-ink">Thiết lập hồ sơ và ghi cân nặng</Link>{' '}
              để có mục tiêu calo mỗi ngày.
            </p>
          )}
          <MacroBars rows={rows} onHero />
        </div>
      </div>
      {children}
    </section>
  );
}
