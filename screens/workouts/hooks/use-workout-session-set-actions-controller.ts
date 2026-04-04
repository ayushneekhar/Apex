import { useEffect, useMemo, useRef, useState } from "react";

import {
  triggerLightImpactHaptic,
  triggerLongPressHaptic,
  triggerSuccessHaptic,
} from "@/lib/haptics";
import {
  cancelScheduledNotification,
  scheduleRestCompleteNotification,
} from "@/lib/rest-notifications";
import {
  formatWeightInputFromKg,
  parseWeightInputToKg,
  type WeightUnit,
} from "@/lib/weight";
import type {
  ActiveWorkoutSession,
  ActiveWorkoutSet,
  NewWorkoutExerciseInput,
  Workout,
} from "@/types/workout";

import type {
  ActiveRestTimer,
  CustomSetEditMode,
  CustomWeightApplyScope,
} from "../types";
import { clampRestSeconds } from "../utils";

type SessionSetActionsDeps = {
  activeSession: ActiveWorkoutSession | null;
  workouts: Workout[];
  weightUnit: WeightUnit;
  now: number;
  setSessionActionError: (value: string | null) => void;
  closeSessionScreen: () => void;
  decrementOrCompleteSessionSet: (
    setId: string
  ) => Promise<{
    shouldStartRest: boolean;
    restSet: ActiveWorkoutSet | null;
  }>;
  setSessionSetCustomValues: (
    setId: string,
    reps: number,
    weightKg: number,
    weightScope?: CustomWeightApplyScope
  ) => Promise<void>;
  updateActiveSessionExerciseTargets: (
    workoutExerciseId: string,
    sets: number,
    reps: number
  ) => Promise<void>;
  editWorkout: (input: {
    id: string;
    name: string;
    templateOrder: number;
    exercises: NewWorkoutExerciseInput[];
  }) => Promise<void>;
  finishActiveWorkoutSession: () => Promise<void>;
  discardActiveWorkoutSession: () => Promise<void>;
};

type CustomSetSaveResult =
  | {
      error: string;
    }
  | {
      reps: number;
      weightKg: number;
    };

function getRestRemainingMs(
  activeRestTimer: ActiveRestTimer | null,
  now: number
) {
  if (!activeRestTimer) {
    return 0;
  }

  return Math.max(0, activeRestTimer.endsAt - now);
}

function getRestProgress(
  activeRestTimer: ActiveRestTimer | null,
  restRemainingMs: number
) {
  if (!activeRestTimer || activeRestTimer.durationMs <= 0) {
    return 0;
  }

  return Math.min(
    1,
    Math.max(
      0,
      (activeRestTimer.durationMs - restRemainingMs) /
        activeRestTimer.durationMs
    )
  );
}

function getRestOvertimeMs(
  activeRestTimer: ActiveRestTimer | null,
  now: number
) {
  if (!activeRestTimer) {
    return 0;
  }

  return Math.max(0, now - activeRestTimer.endsAt);
}

async function cancelRestNotificationIfPresent(notificationId: string | null) {
  if (!notificationId) {
    return;
  }

  await cancelScheduledNotification(notificationId);
}

function resolveCustomSetValues({
  setEntry,
  editMode,
  repsInput,
  weightInput,
  weightUnit,
}: {
  setEntry: ActiveWorkoutSet;
  editMode: CustomSetEditMode;
  repsInput: string;
  weightInput: string;
  weightUnit: WeightUnit;
}): CustomSetSaveResult {
  if (editMode === "reps") {
    const parsedReps = Number.parseInt(repsInput.trim(), 10);

    if (!Number.isFinite(parsedReps) || parsedReps < 0) {
      return { error: "Reps must be zero or above." };
    }

    return {
      reps: parsedReps,
      weightKg: setEntry.actualWeightKg,
    };
  }

  const parsedWeightKg = parseWeightInputToKg(weightInput.trim(), weightUnit);

  if (parsedWeightKg === null) {
    return { error: "Weight is invalid. Use a valid number." };
  }

  return {
    reps: setEntry.actualReps,
    weightKg: parsedWeightKg,
  };
}

export function useWorkoutSessionSetActionsController({
  activeSession,
  workouts,
  weightUnit,
  now,
  setSessionActionError,
  closeSessionScreen,
  decrementOrCompleteSessionSet,
  setSessionSetCustomValues,
  updateActiveSessionExerciseTargets,
  editWorkout,
  finishActiveWorkoutSession,
  discardActiveWorkoutSession,
}: SessionSetActionsDeps) {
  const [activeRestTimer, setActiveRestTimer] =
    useState<ActiveRestTimer | null>(null);
  const [restNotificationId, setRestNotificationId] = useState<string | null>(
    null
  );
  const restScheduleTokenRef = useRef(0);

  const [customSetId, setCustomSetId] = useState<string | null>(null);
  const [customSetEditMode, setCustomSetEditMode] =
    useState<CustomSetEditMode>("reps");
  const [customSetRepsInput, setCustomSetRepsInput] = useState("");
  const [customSetWeightInput, setCustomSetWeightInput] = useState("");
  const [customSetError, setCustomSetError] = useState<string | null>(null);
  const [customWeightApplyScope, setCustomWeightApplyScope] =
    useState<CustomWeightApplyScope>("current");
  const [exerciseEditorExerciseId, setExerciseEditorExerciseId] = useState<string | null>(null);
  const [exerciseEditorSetsInput, setExerciseEditorSetsInput] = useState("");
  const [exerciseEditorRepsInput, setExerciseEditorRepsInput] = useState("");
  const [exerciseEditorError, setExerciseEditorError] = useState<string | null>(null);
  const [isDiscardSessionModalOpen, setIsDiscardSessionModalOpen] =
    useState(false);

  const setBoxLongPressRef = useRef(false);

  const customSetEntry = useMemo(
    () =>
      activeSession?.sets.find((setEntry) => setEntry.id === customSetId) ??
      null,
    [activeSession?.sets, customSetId]
  );
  const exerciseEditorSets = useMemo(
    () =>
      activeSession?.sets
        .filter(
          (setEntry) => setEntry.workoutExerciseId === exerciseEditorExerciseId
        )
        .sort((a, b) => a.setNumber - b.setNumber) ?? [],
    [activeSession?.sets, exerciseEditorExerciseId]
  );
  const exerciseEditorWorkout = useMemo(
    () =>
      activeSession
        ? workouts.find((workout) => workout.id === activeSession.workoutId) ?? null
        : null,
    [activeSession, workouts]
  );

  const restRemainingMs = useMemo(
    () => getRestRemainingMs(activeRestTimer, now),
    [activeRestTimer, now]
  );
  const restProgress = useMemo(
    () => getRestProgress(activeRestTimer, restRemainingMs),
    [activeRestTimer, restRemainingMs]
  );
  const restOvertimeMs = useMemo(
    () => getRestOvertimeMs(activeRestTimer, now),
    [activeRestTimer, now]
  );
  const restIsComplete = activeRestTimer !== null && restRemainingMs === 0;

  useEffect(() => {
    if (!activeSession) {
      closeCustomSetModal();
      closeExerciseEditor();
      setIsDiscardSessionModalOpen(false);
      setActiveRestTimer(null);

      if (restNotificationId) {
        void cancelRestNotificationIfPresent(restNotificationId);
        setRestNotificationId(null);
      }
    }
  }, [activeSession, restNotificationId]);

  useEffect(() => {
    if (!activeRestTimer || restRemainingMs > 0 || !restNotificationId) {
      return;
    }

    void cancelRestNotificationIfPresent(restNotificationId);
    setRestNotificationId(null);
  }, [activeRestTimer, restRemainingMs, restNotificationId]);

  function openCustomSetModal(
    setEntry: ActiveWorkoutSet,
    mode: CustomSetEditMode
  ) {
    setCustomSetId(setEntry.id);
    setCustomSetEditMode(mode);
    setCustomSetRepsInput(String(setEntry.actualReps));
    setCustomSetWeightInput(
      formatWeightInputFromKg(setEntry.actualWeightKg, weightUnit)
    );
    setCustomSetError(null);
    setCustomWeightApplyScope("current");
  }

  function closeCustomSetModal() {
    setCustomSetId(null);
    setCustomSetEditMode("reps");
    setCustomSetRepsInput("");
    setCustomSetWeightInput("");
    setCustomSetError(null);
    setCustomWeightApplyScope("current");
  }

  function openExerciseEditor(workoutExerciseId: string) {
    const selectedSets = activeSession?.sets
      .filter((setEntry) => setEntry.workoutExerciseId === workoutExerciseId)
      .sort((a, b) => a.setNumber - b.setNumber);

    if (!selectedSets || selectedSets.length === 0) {
      return;
    }

    setExerciseEditorExerciseId(workoutExerciseId);
    setExerciseEditorSetsInput(String(selectedSets.length));
    setExerciseEditorRepsInput(String(selectedSets[0]?.targetReps ?? 0));
    setExerciseEditorError(null);
  }

  function closeExerciseEditor() {
    setExerciseEditorExerciseId(null);
    setExerciseEditorSetsInput("");
    setExerciseEditorRepsInput("");
    setExerciseEditorError(null);
  }

  async function saveCustomSetValues() {
    if (!customSetId || !customSetEntry) {
      return;
    }

    const resolvedValues = resolveCustomSetValues({
      setEntry: customSetEntry,
      editMode: customSetEditMode,
      repsInput: customSetRepsInput,
      weightInput: customSetWeightInput,
      weightUnit,
    });

    if ("error" in resolvedValues) {
      setCustomSetError(resolvedValues.error);
      return;
    }

    try {
      await setSessionSetCustomValues(
        customSetId,
        resolvedValues.reps,
        resolvedValues.weightKg,
        customSetEditMode === "weight" ? customWeightApplyScope : "current"
      );
      closeCustomSetModal();
    } catch {
      setCustomSetError("Could not save set values. Try again.");
    }
  }

  async function saveExerciseEditorValues(scope: "session" | "template") {
    if (!exerciseEditorExerciseId || exerciseEditorSets.length === 0) {
      return;
    }

    const parsedSets = Number.parseInt(exerciseEditorSetsInput.trim(), 10);
    const parsedReps = Number.parseInt(exerciseEditorRepsInput.trim(), 10);

    if (!Number.isFinite(parsedSets) || parsedSets < 1) {
      setExerciseEditorError("Sets must be 1 or greater.");
      return;
    }

    if (!Number.isFinite(parsedReps) || parsedReps < 1) {
      setExerciseEditorError("Reps must be 1 or greater.");
      return;
    }

    const completedSetCount = exerciseEditorSets.filter(
      (setEntry) => setEntry.actualReps > 0
    ).length;

    if (parsedSets < completedSetCount) {
      setExerciseEditorError(
        `Sets cannot be lower than ${completedSetCount} because completed sets would be lost.`
      );
      return;
    }

    try {
      await updateActiveSessionExerciseTargets(
        exerciseEditorExerciseId,
        parsedSets,
        parsedReps
      );
    } catch (error) {
      if (error instanceof Error && error.message) {
        setExerciseEditorError(error.message);
        return;
      }

      setExerciseEditorError("Could not save exercise changes. Try again.");
      return;
    }

    if (scope === "template") {
      try {
        if (!exerciseEditorWorkout) {
          throw new Error("Workout not found.");
        }

        const selectedExerciseName = exerciseEditorSets[0]?.exerciseName.trim().toLowerCase() ?? "";
        const orderedExercises = exerciseEditorWorkout.exercises
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder);

        await editWorkout({
          id: exerciseEditorWorkout.id,
          name: exerciseEditorWorkout.name,
          templateOrder: exerciseEditorWorkout.templateOrder,
          exercises: orderedExercises.map((exercise, index, exercises) => {
            const isSelectedExercise =
              exercise.id === exerciseEditorExerciseId ||
              exercise.name.trim().toLowerCase() === selectedExerciseName;

            return {
              name: exercise.name,
              sets: isSelectedExercise ? parsedSets : exercise.sets,
              reps: isSelectedExercise ? parsedReps : exercise.reps,
              restSeconds: exercise.restSeconds,
              startWeightKg: exercise.startWeightKg,
              overloadIncrementKg: exercise.overloadIncrementKg,
              supersetWithNext:
                index < exercises.length - 1 &&
                exercise.supersetExerciseId === exercises[index + 1]?.id,
            };
          }),
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error && error.message
            ? error.message
            : "Could not save the template.";

        setExerciseEditorError(`Saved for this workout only. ${errorMessage}`);
        return;
      }
    }

    closeExerciseEditor();
  }

  async function clearRestTimer() {
    restScheduleTokenRef.current += 1;

    const notificationToCancel = restNotificationId;
    setActiveRestTimer(null);
    setRestNotificationId(null);

    await cancelRestNotificationIfPresent(notificationToCancel);
  }

  async function startRestTimer(setEntry: ActiveWorkoutSet) {
    const restSeconds = clampRestSeconds(setEntry.restSeconds);
    const durationMs = restSeconds * 1000;
    const startedAt = Date.now();
    const nextToken = restScheduleTokenRef.current + 1;
    restScheduleTokenRef.current = nextToken;

    const notificationToCancel = restNotificationId;

    setActiveRestTimer({
      setId: setEntry.id,
      exerciseName: setEntry.exerciseName,
      startedAt,
      endsAt: startedAt + durationMs,
      durationMs,
    });
    setRestNotificationId(null);

    if (notificationToCancel) {
      await cancelRestNotificationIfPresent(notificationToCancel);
    }

    const nextNotificationId = await scheduleRestCompleteNotification(
      restSeconds,
      setEntry.exerciseName
    );

    if (restScheduleTokenRef.current !== nextToken) {
      await cancelRestNotificationIfPresent(nextNotificationId);
      return;
    }

    setRestNotificationId(nextNotificationId);
  }

  async function handleSetPress(setEntry: ActiveWorkoutSet) {
    try {
      const result = await decrementOrCompleteSessionSet(setEntry.id);
      setSessionActionError(null);

      if (result.shouldStartRest && result.restSet) {
        triggerSuccessHaptic();
        await startRestTimer(result.restSet);
        return;
      }
    } catch {
      setSessionActionError("Could not update this set right now.");
    }
  }

  function handleSetWeightPress(setEntry: ActiveWorkoutSet) {
    triggerLightImpactHaptic();
    openCustomSetModal(setEntry, "weight");
  }

  function handleSetLongPress(setEntry: ActiveWorkoutSet) {
    triggerLongPressHaptic();
    openCustomSetModal(setEntry, "reps");
  }

  function openDiscardSessionModal() {
    setSessionActionError(null);
    setIsDiscardSessionModalOpen(true);
  }

  function closeDiscardSessionModal() {
    setIsDiscardSessionModalOpen(false);
  }

  async function handleDiscardSession() {
    try {
      await clearRestTimer();
      await discardActiveWorkoutSession();
      closeSessionScreen();
      setIsDiscardSessionModalOpen(false);
    } catch {
      setSessionActionError("Could not discard the current session.");
    }
  }

  async function handleFinishSession() {
    try {
      await clearRestTimer();
      await finishActiveWorkoutSession();
      closeSessionScreen();
    } catch {
      setSessionActionError("Could not save this workout session.");
    }
  }

  function clearCustomSetError() {
    setCustomSetError((current) => (current ? null : current));
  }

  function clearExerciseEditorError() {
    setExerciseEditorError((current) => (current ? null : current));
  }

  return {
    activeRestTimer,
    restRemainingMs,
    restProgress,
    restOvertimeMs,
    restIsComplete,

    handleSetPress,
    handleSetWeightPress,
    handleSetLongPress,
    setBoxLongPressRef,

    customSetId,
    customSetEditMode,
    customSetRepsInput,
    customSetWeightInput,
    customSetError,
    customWeightApplyScope,
    setCustomSetRepsInput,
    setCustomSetWeightInput,
    setCustomWeightApplyScope,
    saveCustomSetValues,
    closeCustomSetModal,
    clearCustomSetError,

    exerciseEditorExerciseId,
    exerciseEditorSets,
    exerciseEditorSetsInput,
    exerciseEditorRepsInput,
    exerciseEditorError,
    setExerciseEditorSetsInput,
    setExerciseEditorRepsInput,
    openExerciseEditor,
    closeExerciseEditor,
    saveExerciseEditorValues,
    clearExerciseEditorError,

    isDiscardSessionModalOpen,
    openDiscardSessionModal,
    closeDiscardSessionModal,
    handleDiscardSession,
    handleFinishSession,
  };
}

export type WorkoutSessionSetActionsController = ReturnType<
  typeof useWorkoutSessionSetActionsController
>;
