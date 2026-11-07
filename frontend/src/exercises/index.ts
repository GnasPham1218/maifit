// The list of exercises. To add one: write it in its own file (implementing Exercise) and add it here.
import { PUSH_UP } from './pushUp';
import { SQUAT } from './squat';
import type { Exercise, ExerciseId } from './types';

export type { Exercise, ExerciseId } from './types';

export const EXERCISES: Record<ExerciseId, Exercise> = { SQUAT, PUSH_UP };

export const EXERCISE_IDS = Object.keys(EXERCISES) as ExerciseId[];
