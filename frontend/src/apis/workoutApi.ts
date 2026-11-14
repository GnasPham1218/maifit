import type { ExerciseId } from '../exercises';
import type {
  CreateWorkoutRequest, DailyWorkouts, Leaderboard, LeaderboardPeriod, MonthlyWorkoutSummary, Workout, WorkoutTimeSummary,
} from '../types/workout';
import { api } from './client';

export const workoutApi = {
  // Same clientId sent twice (retry after a network error) = saved once, the saved set is returned
  create: (data: CreateWorkoutRequest) => api<Workout>('/workouts', { method: 'POST', body: data }),

  // date: yyyy-MM-dd (Vietnam time), default today
  listDay: (date?: string) => api<DailyWorkouts>(date ? `/workouts?date=${date}` : '/workouts'),

  // month: yyyy-MM, reps per day and exercise (days without sets are missing)
  monthSummary: (month: string) => api<MonthlyWorkoutSummary>(`/workouts/summary?month=${month}`),

  // Training time today / this week / this month, with the bars of the last days, weeks and months
  timeSummary: () => api<WorkoutTimeSummary>('/workouts/time-summary'),

  // Only the owner can delete; another user's id answers 404
  remove: (id: number) => api<null>(`/workouts/${id}`, { method: 'DELETE' }),

  leaderboard: (exercise: ExerciseId, period: LeaderboardPeriod) =>
    api<Leaderboard>(`/leaderboard?exercise=${exercise}&period=${period}`),
};
