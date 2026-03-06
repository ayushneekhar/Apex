import { useMemo, useState } from "react";

import {
  DEFAULT_REST_SECONDS,
  MAX_REST_SECONDS,
  MIN_REST_SECONDS,
} from "@/constants/workout";
import {
  formatWeightFromKg,
  formatWeightInputFromKg,
  getDefaultWeeklyIncrementKg,
  parseWeightInputToKg,
  type WeightUnit,
} from "@/lib/weight";
import type { NewWorkoutExerciseInput, Workout } from "@/types/workout";

import type { ExerciseDraft } from "../types";
import {
  clampRestSeconds,
  createExerciseDraft,
  parseRestSecondsInput,
} from "../utils";

function normalizeSupersetDrafts(drafts: ExerciseDraft[]): ExerciseDraft[] {
  return drafts.map((draft, index) => {
    const previousStartsSuperset = index > 0 ? drafts[index - 1].supersetWithNext : false;
    const canStartSuperset = index < drafts.length - 1 && !previousStartsSuperset;

    if (draft.supersetWithNext === canStartSuperset || !draft.supersetWithNext) {
      return canStartSuperset ? draft : { ...draft, supersetWithNext: false };
    }

    return draft;
  });
}

type BuilderDeps = {
  weightUnit: WeightUnit;
  clearStoreError: () => void;
  addWorkout: (input: {
    name: string;
    exercises: NewWorkoutExerciseInput[];
  }) => Promise<void>;
  editWorkout: (input: {
    id: string;
    name: string;
    exercises: NewWorkoutExerciseInput[];
  }) => Promise<void>;
};

export function useWorkoutBuilderController({
  weightUnit,
  clearStoreError,
  addWorkout,
  editWorkout,
}: BuilderDeps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [workoutName, setWorkoutName] = useState("");
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [exerciseDrafts, setExerciseDrafts] = useState<ExerciseDraft[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedExercises = useMemo(
    () => new Set(exerciseDrafts.map((draft) => draft.name.toLowerCase())),
    [exerciseDrafts]
  );

  const defaultOverload = useMemo(
    () =>
      formatWeightFromKg(getDefaultWeeklyIncrementKg(weightUnit), weightUnit),
    [weightUnit]
  );

  function openComposer() {
    setIsComposerOpen(true);
    setWorkoutName("");
    setEditingWorkoutId(null);
    setCustomExerciseName("");
    setExerciseDrafts([]);
    setFormError(null);
    clearStoreError();
  }

  function openComposerForEdit(workout: Workout) {
    setWorkoutName(workout.name);
    setEditingWorkoutId(workout.id);
    setExerciseDrafts(
      [...workout.exercises]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((exercise) => ({
          id: createExerciseDraft(exercise.name).id,
          name: exercise.name,
          sets: String(exercise.sets),
          reps: String(exercise.reps),
          restSeconds: String(exercise.restSeconds),
          startWeight: formatWeightInputFromKg(
            exercise.startWeightKg,
            weightUnit
          ),
          overload: formatWeightInputFromKg(
            exercise.overloadIncrementKg,
            weightUnit
          ),
          supersetWithNext: exercise.supersetWithNext,
        }))
    );
    setCustomExerciseName("");
    setIsComposerOpen(true);
    setFormError(null);
    clearStoreError();
  }

  function closeComposer() {
    setIsComposerOpen(false);
    setWorkoutName("");
    setEditingWorkoutId(null);
    setCustomExerciseName("");
    setExerciseDrafts([]);
    setFormError(null);
  }

  function addExerciseToDraft(name: string) {
    const normalized = name.trim();
    if (!normalized) {
      return;
    }

    setExerciseDrafts((current) => {
      if (
        current.some(
          (item) => item.name.toLowerCase() === normalized.toLowerCase()
        )
      ) {
        return current;
      }

      return [...current, createExerciseDraft(normalized)];
    });
  }

  function addCustomExercise() {
    addExerciseToDraft(customExerciseName);
    setCustomExerciseName("");
  }

  function removeExerciseDraft(id: string) {
    setExerciseDrafts((current) =>
      normalizeSupersetDrafts(current.filter((item) => item.id !== id))
    );
  }

  function updateExerciseDraft(id: string, patch: Record<string, string>) {
    setExerciseDrafts((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function toggleExerciseSuperset(id: string) {
    setExerciseDrafts((current) => {
      const draftIndex = current.findIndex((item) => item.id === id);

      if (draftIndex === -1) {
        return current;
      }

      const isLastExercise = draftIndex >= current.length - 1;
      const previousStartsSuperset =
        draftIndex > 0 ? current[draftIndex - 1].supersetWithNext : false;
      const nextSupersetValue = !current[draftIndex].supersetWithNext;

      if (nextSupersetValue && (isLastExercise || previousStartsSuperset)) {
        return current;
      }

      return normalizeSupersetDrafts(
        current.map((item) =>
          item.id === id ? { ...item, supersetWithNext: nextSupersetValue } : item
        )
      );
    });
  }

  function adjustDraftRestSeconds(id: string, delta: number) {
    setExerciseDrafts((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const parsed = parseRestSecondsInput(item.restSeconds);
        const baseline =
          parsed === null ? DEFAULT_REST_SECONDS : clampRestSeconds(parsed);
        const nextRestSeconds = clampRestSeconds(baseline + delta);

        return {
          ...item,
          restSeconds: String(nextRestSeconds),
        };
      })
    );
  }

  async function submitWorkout() {
    const trimmedWorkoutName = workoutName.trim();

    if (!trimmedWorkoutName) {
      setFormError("Give this workout a name before saving.");
      return;
    }

    if (exerciseDrafts.length === 0) {
      setFormError("Add at least one exercise.");
      return;
    }

    const parsedExercises: NewWorkoutExerciseInput[] = [];

    for (const draft of exerciseDrafts) {
      const sets = Number.parseInt(draft.sets, 10);
      const reps = Number.parseInt(draft.reps, 10);
      const restSecondsInput = parseRestSecondsInput(draft.restSeconds);
      const startWeightKg = parseWeightInputToKg(draft.startWeight, weightUnit);

      if (!Number.isFinite(sets) || sets < 1) {
        setFormError(`Sets for ${draft.name} must be 1 or greater.`);
        return;
      }

      if (!Number.isFinite(reps) || reps < 1) {
        setFormError(`Reps for ${draft.name} must be 1 or greater.`);
        return;
      }

      if (
        restSecondsInput === null ||
        restSecondsInput < MIN_REST_SECONDS ||
        restSecondsInput > MAX_REST_SECONDS
      ) {
        setFormError(
          `Rest timer for ${draft.name} must be between ${MIN_REST_SECONDS} and ${MAX_REST_SECONDS} seconds.`
        );
        return;
      }

      if (startWeightKg === null) {
        setFormError(`Starting weight for ${draft.name} is invalid.`);
        return;
      }

      const overloadValue = draft.overload.trim();
      const overloadKg = overloadValue
        ? parseWeightInputToKg(overloadValue, weightUnit)
        : getDefaultWeeklyIncrementKg(weightUnit);

      if (overloadKg === null || overloadKg <= 0) {
        setFormError(
          `Progressive overload for ${draft.name} must be above zero.`
        );
        return;
      }

      parsedExercises.push({
        name: draft.name,
        sets,
        reps,
        restSeconds: restSecondsInput,
        startWeightKg,
        overloadIncrementKg: overloadKg,
        supersetWithNext: draft.supersetWithNext,
      });
    }

    for (let index = 0; index < parsedExercises.length; index += 1) {
      const exercise = parsedExercises[index];

      if (!exercise.supersetWithNext) {
        continue;
      }

      const nextExercise = parsedExercises[index + 1];

      if (!nextExercise) {
        setFormError(`${exercise.name} cannot start a superset without a following exercise.`);
        return;
      }

      if (exercise.sets !== nextExercise.sets) {
        setFormError(
          `${exercise.name} and ${nextExercise.name} need the same set count to run as a superset.`
        );
        return;
      }
    }

    try {
      setFormError(null);

      if (editingWorkoutId) {
        await editWorkout({
          id: editingWorkoutId,
          name: trimmedWorkoutName,
          exercises: parsedExercises,
        });
      } else {
        await addWorkout({
          name: trimmedWorkoutName,
          exercises: parsedExercises,
        });
      }

      closeComposer();
    } catch {
      setFormError("Could not save this workout template. Try again.");
    }
  }

  function clearFormError() {
    setFormError((current) => (current ? null : current));
  }

  function canExerciseStartSuperset(id: string) {
    const draftIndex = exerciseDrafts.findIndex((item) => item.id === id);

    if (draftIndex === -1) {
      return false;
    }

    const isLastExercise = draftIndex >= exerciseDrafts.length - 1;
    const previousStartsSuperset =
      draftIndex > 0 ? exerciseDrafts[draftIndex - 1].supersetWithNext : false;

    return !isLastExercise && !previousStartsSuperset;
  }

  return {
    isComposerOpen,
    workoutName,
    editingWorkoutId,
    customExerciseName,
    exerciseDrafts,
    formError,
    selectedExercises,
    defaultOverload,

    openComposer,
    openComposerForEdit,
    closeComposer,
    setWorkoutName,
    setCustomExerciseName,
    addExerciseToDraft,
    addCustomExercise,
    removeExerciseDraft,
    updateExerciseDraft,
    toggleExerciseSuperset,
    canExerciseStartSuperset,
    adjustDraftRestSeconds,
    submitWorkout,
    clearFormError,
  };
}

export type WorkoutBuilderController = ReturnType<
  typeof useWorkoutBuilderController
>;
