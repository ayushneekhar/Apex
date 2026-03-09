import type { WorkoutSession, WorkoutSessionSet } from '@/types/workout';

export type WorkoutSessionSetGroup = {
  workoutExerciseId: string;
  exerciseName: string;
  sets: WorkoutSessionSet[];
};

export function getWorkoutSessionVolumeKg(session: WorkoutSession): number {
  return session.sets.reduce(
    (total, setEntry) => total + Math.abs(setEntry.weightKg) * setEntry.reps,
    0
  );
}

export function groupWorkoutSessionSets(
  sets: WorkoutSessionSet[]
): WorkoutSessionSetGroup[] {
  const groups = new Map<string, WorkoutSessionSetGroup>();
  const order: string[] = [];

  sets.forEach((setEntry) => {
    const existingGroup = groups.get(setEntry.workoutExerciseId);

    if (existingGroup) {
      existingGroup.sets.push(setEntry);
      return;
    }

    groups.set(setEntry.workoutExerciseId, {
      workoutExerciseId: setEntry.workoutExerciseId,
      exerciseName: setEntry.exerciseName,
      sets: [setEntry],
    });
    order.push(setEntry.workoutExerciseId);
  });

  return order.map((workoutExerciseId) => {
    const group = groups.get(workoutExerciseId);

    return {
      workoutExerciseId,
      exerciseName: group?.exerciseName ?? '',
      sets: [...(group?.sets ?? [])].sort((a, b) => a.setNumber - b.setNumber),
    };
  });
}
