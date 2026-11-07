import type { ExerciseId } from '../exercises';
import type { CreateWorkoutRequest, DailyWorkouts, Leaderboard, LeaderboardPeriod, Workout } from '../types/workout';
import { api } from './client';

export const workoutApi = {
  // Same clientId sent twice (retry after a network error) = saved once, the saved set is returned
  create: (data: CreateWorkoutRequest) => api<Workout>('/workouts', { method: 'POST', body: data }),

  // date: yyyy-MM-dd (Vietnam time), default today
  listDay: (date?: string) => api<DailyWorkouts>(date ? `/workouts?date=${date}` : '/workouts'),

  leaderboard: (exercise: ExerciseId, period: LeaderboardPeriod) =>
    api<Leaderboard>(`/leaderboard?exercise=${exercise}&period=${period}`),
};
