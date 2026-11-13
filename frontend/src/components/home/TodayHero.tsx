import { Activity, Bot, Utensils } from 'lucide-react';
import { MACROS } from '../../constants/macros';
import type { MacroBarRow } from '../MacroBars';
import { MacroBars } from '../MacroBars';
import { MacroDonut } from '../MacroDonut';
import { BigNumber } from '../BigNumber';
import { ButtonLink } from '../ButtonLink';
import type { Nutrition } from '../../types/meal';
import type { Macros } from '../../types/profile';
import { formatNumber } from '../../utils/number';

interface TodayHeroProps {
  eaten: Nutrition;
  targetKcal: number;
  targets: Macros;
}

// The one dark block of the home page: the calorie ring split by macro, the macro bars and the three main actions
export function TodayHero({ eaten, targetKcal, targets }: TodayHeroProps) {
  const protein = eaten.proteinG ?? 0;
  const carb = eaten.carbG ?? 0;
  const fat = eaten.fatG ?? 0;
  const kcal = Math.round(eaten.kcal);
  const left = targetKcal - kcal;

  const rows: MacroBarRow[] = [
    { key: 'protein', value: protein, target: targets.proteinG },
    { key: 'carb', value: carb, target: targets.carbG },
    { key: 'fat', value: fat, target: targets.fatG },
    // Fiber has no target of its own; shown only when the foods have the data
    ...(eaten.fiberG != null ? [{ key: MACROS.fiber.key, value: eaten.fiberG }] : []),
  ];

  return (
    <section aria-labelledby="today-title" className="grid gap-6 rounded-card bg-hero p-6 text-hero-ink md:p-8">
      <h2 id="today-title" className="sr-only">Hôm nay</h2>
      <div className="grid items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)] md:gap-10">
        <MacroDonut eatenKcal={kcal} targetKcal={targetKcal} proteinG={protein} carbG={carb} fatG={fat} size={196}
          label={`Đã nạp ${formatNumber(kcal)} trên ${formatNumber(targetKcal)} kcal`}>
          <BigNumber value={kcal} className="text-5xl leading-none" />
          <span className="mt-1 text-sm text-hero-muted">/ {formatNumber(targetKcal)} kcal</span>
        </MacroDonut>
        <div className="grid min-w-0 gap-4">
          <p className="text-lg font-semibold">
            {left >= 0 ? `Còn ${formatNumber(left)} kcal hôm nay` : `Vượt ${formatNumber(-left)} kcal so với mục tiêu`}
          </p>
          <MacroBars rows={rows} onHero />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <ButtonLink to="/workout" size="lg"><Activity aria-hidden="true" className="size-5" />Bắt đầu tập</ButtonLink>
        <ButtonLink to="/meals" variant="hero" size="lg"><Utensils aria-hidden="true" className="size-5" />Ghi bữa ăn</ButtonLink>
        <ButtonLink to="/chat" variant="hero" size="lg"><Bot aria-hidden="true" className="size-5" />Hỏi MBotFit</ButtonLink>
      </div>
    </section>
  );
}
