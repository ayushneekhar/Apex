import type { ThemeId } from '@/constants/app-themes';
import type { WeightUnit } from '@/lib/weight';

export type WorkoutExercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
  startWeightKg: number;
  overloadIncrementKg: number;
  sortOrder: number;
};

export type WorkoutSessionSet = {
  id: string;
  workoutExerciseId: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weightKg: number;
};

export type WorkoutSession = {
  id: string;
  workoutId: string;
  performedAt: number;
  bodyweightKg: number | null;
  sets: WorkoutSessionSet[];
};

export type Workout = {
  id: string;
  name: string;
  createdAt: number;
  weeksCompleted: number;
  exercises: WorkoutExercise[];
  sessions: WorkoutSession[];
};

export type NewWorkoutExerciseInput = {
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
  startWeightKg: number;
  overloadIncrementKg: number;
};

export type NewWorkoutInput = {
  name: string;
  exercises: NewWorkoutExerciseInput[];
};

export type UpdateWorkoutInput = {
  id: string;
  name: string;
  exercises: NewWorkoutExerciseInput[];
};

export type NewWorkoutSessionSetInput = {
  workoutExerciseId: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weightKg: number;
};

export type NewWorkoutSessionInput = {
  workoutId: string;
  performedAt?: number;
  bodyweightKg?: number | null;
  sets: NewWorkoutSessionSetInput[];
};

export type UpdateWorkoutSessionInput = {
  sessionId: string;
  workoutId: string;
  performedAt: number;
  bodyweightKg?: number | null;
  sets: NewWorkoutSessionSetInput[];
};

export type AppSettings = {
  themeId: ThemeId;
  weightUnit: WeightUnit;
};

export type ActiveWorkoutSet = {
  id: string;
  workoutExerciseId: string;
  exerciseName: string;
  setNumber: number;
  targetReps: number;
  targetWeightKg: number;
  restSeconds: number;
  actualReps: number;
};

export type ActiveWorkoutSession = {
  workoutId: string;
  workoutName: string;
  startedAt: number;
  bodyweightKg: number | null;
  totalPausedMs: number;
  pauseStartedAt: number | null;
  isPaused: boolean;
  restoredFromAppClose: boolean;
  sets: ActiveWorkoutSet[];
};
