import type { useAppTheme } from '@/hooks/use-app-theme';
import type { ActiveWorkoutSet } from '@/types/workout';

export type AppTheme = ReturnType<typeof useAppTheme>;

export type ExerciseDraft = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  restSeconds: string;
  startWeight: string;
  overload: string;
  supersetWithNext: boolean;
};

export type ActiveSetGroup = {
  workoutExerciseId: string;
  exerciseName: string;
  targetWeightKg: number;
  restSeconds: number;
  supersetGroupId: string | null;
  supersetPartnerExerciseName: string | null;
  supersetPosition: ActiveWorkoutSet['supersetPosition'];
  sets: ActiveWorkoutSet[];
};

export type ActiveRestTimer = {
  setId: string;
  exerciseName: string;
  startedAt: number;
  endsAt: number;
  durationMs: number;
};

export type CustomSetEditMode = 'reps' | 'weight';

export type CustomWeightApplyScope = 'current' | 'remaining' | 'all';
