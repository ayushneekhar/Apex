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

function sanitizeSupersetDrafts(drafts: ExerciseDraft[]): ExerciseDraft[] {
  return drafts.map((draft, index) => {
    const isLast = index === drafts.length - 1;
    const previousLinksToCurrent = index > 0 && drafts[index - 1]?.supersetWithNext;

    if (isLast || previousLinksToCurrent) {
      if (!draft.supersetWithNext) {
        return draft;
      }

      return {
        ...draft,
        supersetWithNext: false,
      };
    }

    return draft;
  });
}

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
        .map((exercise, index, exercises) => ({
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
          supersetWithNext:
            index < exercises.length - 1 &&
            exercise.supersetExerciseId === exercises[index + 1]?.id,
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
      sanitizeSupersetDrafts(current.filter((item) => item.id !== id))
    );
  }

  function updateExerciseDraft(id: string, patch: Record<string, string>) {
    setExerciseDrafts((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function moveExerciseDraft(id: string, direction: "up" | "down") {
    setExerciseDrafts((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index < 0) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const nextDrafts = [...current];
      const [draft] = nextDrafts.splice(index, 1);
      nextDrafts.splice(targetIndex, 0, draft);
      return sanitizeSupersetDrafts(nextDrafts);
    });
  }

  function toggleDraftSupersetWithNext(id: string) {
    setExerciseDrafts((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index < 0 || index === current.length - 1) {
        return current;
      }

      const enabled = !current[index]?.supersetWithNext;

      return sanitizeSupersetDrafts(
        current.map((item, itemIndex) => {
          if (itemIndex === index) {
            return {
              ...item,
              supersetWithNext: enabled,
            };
          }

          if (enabled && (itemIndex === index - 1 || itemIndex === index + 1)) {
            return {
              ...item,
              supersetWithNext: false,
            };
          }

          return item;
        })
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
      return false;
    }

    if (exerciseDrafts.length === 0) {
      setFormError("Add at least one exercise.");
      return false;
    }

    const parsedExercises: NewWorkoutExerciseInput[] = [];

    for (const draft of exerciseDrafts) {
      const sets = Number.parseInt(draft.sets, 10);
      const reps = Number.parseInt(draft.reps, 10);
      const restSecondsInput = parseRestSecondsInput(draft.restSeconds);
      const startWeightKg = parseWeightInputToKg(draft.startWeight, weightUnit);

      if (!Number.isFinite(sets) || sets < 1) {
        setFormError(`Sets for ${draft.name} must be 1 or greater.`);
        return false;
      }

      if (!Number.isFinite(reps) || reps < 1) {
        setFormError(`Reps for ${draft.name} must be 1 or greater.`);
        return false;
      }

      if (
        restSecondsInput === null ||
        restSecondsInput < MIN_REST_SECONDS ||
        restSecondsInput > MAX_REST_SECONDS
      ) {
        setFormError(
          `Rest timer for ${draft.name} must be between ${MIN_REST_SECONDS} and ${MAX_REST_SECONDS} seconds.`
        );
        return false;
      }

      if (startWeightKg === null) {
        setFormError(`Starting weight for ${draft.name} is invalid.`);
        return false;
      }

      const overloadValue = draft.overload.trim();
      const overloadKg = overloadValue
        ? parseWeightInputToKg(overloadValue, weightUnit)
        : getDefaultWeeklyIncrementKg(weightUnit);

      if (overloadKg === null || overloadKg <= 0) {
        setFormError(
          `Progressive overload for ${draft.name} must be above zero.`
        );
        return false;
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
      return true;
    } catch {
      setFormError("Could not save this workout template. Try again.");
      return false;
    }
  }

  function clearFormError() {
    setFormError((current) => (current ? null : current));
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
    moveExerciseDraft,
    toggleDraftSupersetWithNext,
    adjustDraftRestSeconds,
    submitWorkout,
    clearFormError,
  };
}

export type WorkoutBuilderController = ReturnType<
  typeof useWorkoutBuilderController
>;
