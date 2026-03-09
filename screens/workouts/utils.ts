import {
  DEFAULT_REST_SECONDS,
  MAX_REST_SECONDS,
  MIN_REST_SECONDS,
} from '@/constants/workout';
import { createId } from '@/lib/id';
import type { ActiveWorkoutSession, ActiveWorkoutSet, Workout } from '@/types/workout';

import type { ActiveSetGroup, ExerciseDraft } from './types';

export function createExerciseDraft(name: string): ExerciseDraft {
  return {
    id: createId('draft'),
    name,
    sets: '3',
    reps: '10',
    restSeconds: String(DEFAULT_REST_SECONDS),
    startWeight: '0',
    overload: '',
    supersetWithNext: false,
  };
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getElapsedMs(session: ActiveWorkoutSession, now: number): number {
  const pausedDelta =
    session.isPaused && session.pauseStartedAt !== null ? now - session.pauseStartedAt : 0;

  return Math.max(0, now - session.startedAt - session.totalPausedMs - pausedDelta);
}

export function estimateWorkoutMinutes(workout: Workout): number {
  const setCount = workout.exercises.reduce((total, exercise) => total + exercise.sets, 0);
  return Math.max(20, Math.round(setCount * 2.3));
}

export function groupActiveSetsByExercise(sets: ActiveWorkoutSet[]): ActiveSetGroup[] {
  const groups = new Map<string, ActiveSetGroup>();
  const order: string[] = [];
  const exerciseNameById = new Map<string, string>();

  sets.forEach((setEntry) => {
    exerciseNameById.set(setEntry.workoutExerciseId, setEntry.exerciseName);
    const existing = groups.get(setEntry.workoutExerciseId);

    if (existing) {
      existing.sets.push(setEntry);
      return;
    }

    groups.set(setEntry.workoutExerciseId, {
      workoutExerciseId: setEntry.workoutExerciseId,
      exerciseName: setEntry.exerciseName,
      sortOrder: setEntry.sortOrder,
      targetWeightKg: setEntry.targetWeightKg,
      restSeconds: setEntry.restSeconds,
      supersetExerciseId: setEntry.supersetExerciseId,
      supersetExerciseName: null,
      sets: [setEntry],
    });
    order.push(setEntry.workoutExerciseId);
  });

  return order.map((workoutExerciseId) => {
    const group = groups.get(workoutExerciseId);

    return {
      workoutExerciseId,
      exerciseName: group?.exerciseName ?? '',
      sortOrder: group?.sortOrder ?? 0,
      targetWeightKg: group?.targetWeightKg ?? 0,
      restSeconds: group?.restSeconds ?? DEFAULT_REST_SECONDS,
      supersetExerciseId: group?.supersetExerciseId ?? null,
      supersetExerciseName:
        group?.supersetExerciseId
          ? exerciseNameById.get(group.supersetExerciseId) ?? null
          : null,
      sets: [...(group?.sets ?? [])].sort((a, b) => a.setNumber - b.setNumber),
    };
  });
}

export function clampRestSeconds(seconds: number): number {
  return Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, Math.floor(seconds)));
}

export function parseRestSecondsInput(value: string): number | null {
  const parsed = Number.parseInt(value.trim(), 10);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}
