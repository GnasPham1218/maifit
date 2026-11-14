import { useEffect, useMemo, useState } from 'react';
import { workoutApi } from '../apis/workoutApi';
import { getErrorMessage } from '../constants/errorMessages';
import type { DailyWorkouts, MonthlyWorkoutSummary, Workout } from '../types/workout';
import { monthOf, todayVn } from '../utils/date';

// State shared by the history card (sets of one day) and the month calendar (other column of the page).
// The server is the source of truth: after a save or a delete, day and month are fetched again.
export function useWorkoutHistory(refreshKey: number) {
  const today = todayVn();
  const [date, setDate] = useState(today);
  const [viewMonth, setViewMonth] = useState(monthOf(today));
  const [day, setDay] = useState<DailyWorkouts | null>(null);
  const [summary, setSummary] = useState<MonthlyWorkoutSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0); // bumped after a delete

  // setState only inside .then(): the effects re-run when the day, month, or a refresh key changes
  useEffect(() => {
    let ignore = false;
    workoutApi
      .listDay(date)
      .then((data) => {
        if (!ignore) setDay(data);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(getErrorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, [date, refreshKey, reloadKey]);

  useEffect(() => {
    let ignore = false;
    workoutApi
      .monthSummary(viewMonth)
      .then((data) => {
        if (!ignore) setSummary(data);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(getErrorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, [viewMonth, refreshKey, reloadKey]);

  // Calendar shows total reps of all exercises per day
  const repsByDate = useMemo(() => {
    const map = new Map<string, number>();
    if (summary?.month === viewMonth) {
      for (const d of summary.days) map.set(d.date, (map.get(d.date) ?? 0) + d.reps);
    }
    return map;
  }, [summary, viewMonth]);

  // null while the chosen day is loading
  const sessions: Workout[] | null = day?.date === date ? day.sessions : null;

  function selectDate(newDate: string) {
    setDate(newDate);
    setViewMonth(monthOf(newDate));
    setError(null);
  }

  async function remove(id: number): Promise<boolean> {
    setError(null);
    try {
      await workoutApi.remove(id);
      setReloadKey((k) => k + 1);
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    }
  }

  return {
    today, date, viewMonth, setViewMonth, selectDate, sessions, repsByDate, error, remove,
    streakDays: day?.date === date ? day.streakDays : 0,
  };
}

export type WorkoutHistoryState = ReturnType<typeof useWorkoutHistory>;
