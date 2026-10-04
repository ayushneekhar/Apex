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
  supersetExerciseId: string | null;
};

export type WorkoutSessionSet = {
  id: string;
  workoutExerciseId: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  /** Warm-ups are kept for the log but left out of volume, PRs and XP. */
  isWarmup: boolean;
};

export type WorkoutSessionExerciseNote = {
  workoutExerciseId: string;
  exerciseName: string;
  note: string;
};

export type WorkoutSession = {
  id: string;
  workoutId: string;
  performedAt: number;
  durationMs: number | null;
  bodyweightKg: number | null;
  sets: WorkoutSessionSet[];
  exerciseNotes: WorkoutSessionExerciseNote[];
};

export type Workout = {
  id: string;
  name: string;
  templateOrder: number;
  createdAt: number;
  weeksCompleted: number;
  archivedAt: number | null;
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
  supersetWithNext: boolean;
};

export type NewWorkoutInput = {
  name: string;
  templateOrder: number;
  exercises: NewWorkoutExerciseInput[];
};

export type UpdateWorkoutInput = {
  id: string;
  name: string;
  templateOrder: number;
  exercises: NewWorkoutExerciseInput[];
};

export type NewWorkoutSessionSetInput = {
  workoutExerciseId: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  isWarmup?: boolean;
};

export type NewWorkoutSessionInput = {
  workoutId: string;
  performedAt?: number;
  durationMs?: number | null;
  bodyweightKg?: number | null;
  sets: NewWorkoutSessionSetInput[];
  exerciseNotes?: WorkoutSessionExerciseNote[];
};

export type UpdateWorkoutSessionInput = {
  sessionId: string;
  workoutId: string;
  performedAt: number;
  durationMs?: number | null;
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
  sortOrder: number;
  setNumber: number;
  targetReps: number;
  previousReps: number | null;
  targetWeightKg: number;
  actualWeightKg: number;
  restSeconds: number;
  actualReps: number;
  supersetExerciseId: string | null;
  completedAt: number | null;
  isWarmup: boolean;
};

export type ActiveRestTimer = {
  setId: string;
  exerciseName: string;
  startedAt: number;
  endsAt: number;
  durationMs: number;
  notificationId: string;
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
  currentExerciseId: string | null;
  restTimer: ActiveRestTimer | null;
  sets: ActiveWorkoutSet[];
  /** Note text keyed by workoutExerciseId. */
  exerciseNotes: Record<string, string>;
};
