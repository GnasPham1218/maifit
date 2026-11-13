import { useEffect, useState } from 'react';
import { mealApi } from '../apis/mealApi';
import { profileApi } from '../apis/profileApi';
import { workoutApi } from '../apis/workoutApi';
import { Alert } from '../components/Alert';
import { HomeEmptyState } from '../components/home/HomeEmptyState';
import { MealsTodayCard } from '../components/home/MealsTodayCard';
import { StreakWeekCard } from '../components/home/StreakWeekCard';
import { TodayHero } from '../components/home/TodayHero';
import { WeekRepsCard } from '../components/home/WeekRepsCard';
import { getErrorMessage } from '../constants/errorMessages';
import { EXERCISE_IDS } from '../exercises';
import type { DailyMeals } from '../types/meal';
import type { Profile } from '../types/profile';
import type { Leaderboard, MonthlyWorkoutSummary } from '../types/workout';
import { todayVn } from '../utils/date';
import { activeDays, monthsOf, weekDays } from '../utils/week';

interface WeekData {
  boards: Leaderboard[];
  summaries: MonthlyWorkoutSummary[];
}

interface HomeData {
  profile: Profile | null;
  day: DailyMeals;
  week: WeekData | null; // null: the workout part failed to load; the rest of the page still shows
}

// Workout data is a nice-to-have on this page: its failure must not hide today's calories
async function loadWeek(days: string[]): Promise<WeekData | null> {
  try {
    const [boards, summaries] = await Promise.all([
      Promise.all(EXERCISE_IDS.map((id) => workoutApi.leaderboard(id, 'WEEK'))),
      Promise.all(monthsOf(days).map((m) => workoutApi.monthSummary(m))),
    ]);
    return { boards, summaries };
  } catch {
    return null;
  }
}

export default function HomePage() {
  const [today] = useState(todayVn);
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const days = weekDays(today);

  useEffect(() => {
    let ignore = false;
    // All requests in parallel: profile, today's meals, and the week (leaderboards + monthly reps)
    Promise.all([profileApi.find(), mealApi.listDay(today), loadWeek(weekDays(today))])
      .then(([profile, day, week]) => {
        if (!ignore) setData({ profile, day, week });
      })
      .catch((err: unknown) => {
        if (!ignore) setError(getErrorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, [today]);

  if (error) return <Alert type="error">{error}</Alert>;
  if (!data) return <p className="text-muted">Đang tải…</p>;

  const { profile, day, week } = data;
  if (!profile?.energy) return <HomeEmptyState hasProfile={profile != null} />;

  const energy = profile.energy;
  const targets = energy.macros.find((m) => m.split === 'MODERATE_CARB') ?? energy.macros[0];
  const streakDays = week ? Math.max(0, ...week.boards.map((b) => b.streakDays)) : 0;

  return (
    <div className="grid gap-5">
      <TodayHero eaten={day.totals} targetKcal={energy.targetKcal} targets={targets} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <MealsTodayCard meals={day.meals} />
        {week ? (
          <div className="grid content-start gap-5">
            <WeekRepsCard boards={week.boards} />
            <StreakWeekCard streakDays={streakDays} days={days} active={activeDays(days, week.summaries)} today={today} />
          </div>
        ) : (
          <Alert type="error">Không tải được số rep tuần này. Thử tải lại trang.</Alert>
        )}
      </div>
    </div>
  );
}
