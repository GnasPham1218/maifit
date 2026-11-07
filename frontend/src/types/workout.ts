// Mirrors the backend DTOs in workout/dto
import type { ExerciseId } from '../exercises';

export type LeaderboardPeriod = 'DAY' | 'WEEK' | 'MONTH';

export interface CreateWorkoutRequest {
  exercise: ExerciseId;
  reps: number;
  startedAt: string; // ISO-8601
  durationSec: number; // 5..3600
  clientId: string; // UUID made by the browser once per set: a retried save is stored once
}

export interface Workout {
  id: number;
  exercise: ExerciseId;
  reps: number;
  startedAt: string;
  durationSec: number;
}

export interface DailyWorkouts {
  date: string; // yyyy-MM-dd, Vietnam time
  sessions: Workout[];
  streakDays: number;
}

export interface DayExerciseReps {
  date: string; // yyyy-MM-dd, Vietnam time
  exercise: ExerciseId;
  reps: number;
}

export interface MonthlyWorkoutSummary {
  month: string; // yyyy-MM
  days: DayExerciseReps[]; // only days with sets
}

export interface LeaderboardEntry {
  rank: number; // equal totals share a rank
  displayName: string;
  reps: number;
  me: boolean;
}

export interface Leaderboard {
  exercise: ExerciseId;
  period: LeaderboardPeriod;
  from: string; // yyyy-MM-dd
  to: string; // yyyy-MM-dd, inclusive
  top: LeaderboardEntry[];
  me: LeaderboardEntry | null; // null: no session in this window yet
  streakDays: number;
}
