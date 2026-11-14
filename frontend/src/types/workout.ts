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

// GET /api/workouts/time-summary (Vietnam time, weeks start on Monday)
export interface TimeTotal {
  seconds: number;
  sets: number;
  days: number; // days with at least one set
}

export interface TimeBucket {
  start: string; // yyyy-MM-dd: the day, the Monday of the week, or the 1st of the month
  seconds: number;
}

export interface WorkoutTimeSummary {
  today: TimeTotal;
  thisWeek: TimeTotal;
  thisMonth: TimeTotal;
  days: TimeBucket[]; // last 7 days, oldest first
  weeks: TimeBucket[]; // last 6 weeks
  months: TimeBucket[]; // last 6 months
}
