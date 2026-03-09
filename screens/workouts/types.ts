import type { useAppTheme } from '@/hooks/use-app-theme';
import type { WeightUnit } from '@/lib/weight';
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
  sortOrder: number;
  targetWeightKg: number;
  restSeconds: number;
  supersetExerciseId: string | null;
  supersetExerciseName: string | null;
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

export type WorkoutBuilderViewController = {
  theme: AppTheme;
  settings: {
    weightUnit: WeightUnit;
  };
  mutating: boolean;
  editingWorkoutId: string | null;
  workoutName: string;
  customExerciseName: string;
  exerciseDrafts: ExerciseDraft[];
  formError: string | null;
  selectedExercises: Set<string>;
  defaultOverload: string;
  clearFormError: () => void;
  setWorkoutName: (value: string) => void;
  setCustomExerciseName: (value: string) => void;
  addExerciseToDraft: (name: string) => void;
  addCustomExercise: () => void;
  removeExerciseDraft: (id: string) => void;
  updateExerciseDraft: (id: string, patch: Record<string, string>) => void;
  moveExerciseDraft: (id: string, direction: 'up' | 'down') => void;
  toggleDraftSupersetWithNext: (id: string) => void;
  adjustDraftRestSeconds: (id: string, delta: number) => void;
  submitWorkout: () => Promise<boolean>;
};
