import { Activity, Bot, Utensils } from 'lucide-react';
import type { Nutrition } from '../../types/meal';
import type { Macros } from '../../types/profile';
import { ButtonLink } from '../ButtonLink';
import { NutritionHero } from '../NutritionHero';

interface TodayHeroProps {
  eaten: Nutrition;
  targetKcal: number;
  targets: Macros;
}

// Home page: today's numbers plus the three main actions
export function TodayHero({ eaten, targetKcal, targets }: TodayHeroProps) {
  return (
    <NutritionHero title="Hôm nay" eaten={eaten} targetKcal={targetKcal} targets={targets}>
      <div className="flex flex-wrap gap-3">
        <ButtonLink to="/workout" size="lg"><Activity aria-hidden="true" className="size-5" />Bắt đầu tập</ButtonLink>
        <ButtonLink to="/meals" variant="hero" size="lg"><Utensils aria-hidden="true" className="size-5" />Ghi bữa ăn</ButtonLink>
        <ButtonLink to="/chat" variant="hero" size="lg"><Bot aria-hidden="true" className="size-5" />Hỏi MBotFit</ButtonLink>
      </div>
    </NutritionHero>
  );
}
