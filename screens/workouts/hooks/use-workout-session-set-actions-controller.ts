import { useEffect, useMemo, useRef, useState } from "react";

import { triggerSelectionHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import {
  cancelScheduledNotification,
  scheduleRestCompleteNotification,
} from "@/lib/rest-notifications";
import {
  formatWeightInputFromKg,
  parseWeightInputToKg,
  type WeightUnit,
} from "@/lib/weight";
import type { ActiveWorkoutSession, ActiveWorkoutSet } from "@/types/workout";

import type { ActiveRestTimer, CustomSetEditMode } from "../types";
import { clampRestSeconds } from "../utils";

type SessionSetActionsDeps = {
  activeSession: ActiveWorkoutSession | null;
  weightUnit: WeightUnit;
  now: number;
  setSessionActionError: (value: string | null) => void;
  closeSessionScreen: () => void;
  decrementOrCompleteSessionSet: (setId: string) => Promise<void>;
  setSessionSetCustomValues: (
    setId: string,
    reps: number,
    weightKg: number
  ) => Promise<void>;
  finishActiveWorkoutSession: () => Promise<void>;
  discardActiveWorkoutSession: () => Promise<void>;
};

export function useWorkoutSessionSetActionsController({
  activeSession,
  weightUnit,
  now,
  setSessionActionError,
  closeSessionScreen,
  decrementOrCompleteSessionSet,
  setSessionSetCustomValues,
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
  const [isDiscardSessionModalOpen, setIsDiscardSessionModalOpen] =
    useState(false);

  const setBoxLongPressRef = useRef(false);

  const customSetEntry = useMemo(
    () =>
      activeSession?.sets.find((setEntry) => setEntry.id === customSetId) ??
      null,
    [activeSession?.sets, customSetId]
  );

  const restRemainingMs = useMemo(() => {
    if (!activeRestTimer) {
      return 0;
    }

    return Math.max(0, activeRestTimer.endsAt - now);
  }, [activeRestTimer, now]);

  const restProgress = useMemo(() => {
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
  }, [activeRestTimer, restRemainingMs]);

  const restIsComplete = activeRestTimer !== null && restRemainingMs === 0;

  useEffect(() => {
    if (!activeSession) {
      closeCustomSetModal();
      setIsDiscardSessionModalOpen(false);
      setActiveRestTimer(null);

      if (restNotificationId) {
        void cancelScheduledNotification(restNotificationId);
        setRestNotificationId(null);
      }
    }
  }, [activeSession, restNotificationId]);

  useEffect(() => {
    if (!activeRestTimer || restRemainingMs > 0 || !restNotificationId) {
      return;
    }

    void cancelScheduledNotification(restNotificationId);
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
  }

  function closeCustomSetModal() {
    setCustomSetId(null);
    setCustomSetEditMode("reps");
    setCustomSetRepsInput("");
    setCustomSetWeightInput("");
    setCustomSetError(null);
  }

  async function saveCustomSetValues() {
    if (!customSetId || !customSetEntry) {
      return;
    }

    let nextReps = customSetEntry.actualReps;
    let nextWeightKg = customSetEntry.actualWeightKg;

    if (customSetEditMode === "reps") {
      const parsedReps = Number.parseInt(customSetRepsInput.trim(), 10);

      if (!Number.isFinite(parsedReps) || parsedReps < 0) {
        setCustomSetError("Reps must be zero or above.");
        return;
      }

      nextReps = parsedReps;
    } else {
      const parsedWeightKg = parseWeightInputToKg(
        customSetWeightInput.trim(),
        weightUnit
      );

      if (parsedWeightKg === null) {
        setCustomSetError("Weight is invalid. Use a valid number.");
        return;
      }

      nextWeightKg = parsedWeightKg;
    }

    try {
      await setSessionSetCustomValues(customSetId, nextReps, nextWeightKg);
      triggerSuccessHaptic();
      closeCustomSetModal();
    } catch {
      setCustomSetError("Could not save set values. Try again.");
    }
  }

  async function clearRestTimer() {
    restScheduleTokenRef.current += 1;

    const notificationToCancel = restNotificationId;
    setActiveRestTimer(null);
    setRestNotificationId(null);

    if (notificationToCancel) {
      await cancelScheduledNotification(notificationToCancel);
    }
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
      await cancelScheduledNotification(notificationToCancel);
    }

    const nextNotificationId = await scheduleRestCompleteNotification(
      restSeconds,
      setEntry.exerciseName
    );

    if (restScheduleTokenRef.current !== nextToken) {
      await cancelScheduledNotification(nextNotificationId);
      return;
    }

    setRestNotificationId(nextNotificationId);
  }

  async function handleSetPress(setEntry: ActiveWorkoutSet) {
    const shouldStartRest = setEntry.actualReps === 0;

    try {
      await decrementOrCompleteSessionSet(setEntry.id);
      setSessionActionError(null);

      if (shouldStartRest) {
        triggerSuccessHaptic();
        await startRestTimer(setEntry);
        return;
      }

      triggerSelectionHaptic();

      if (activeRestTimer?.setId === setEntry.id) {
        await clearRestTimer();
      }
    } catch {
      setSessionActionError("Could not update this set right now.");
    }
  }

  function handleSetWeightPress(setEntry: ActiveWorkoutSet) {
    triggerSelectionHaptic();
    openCustomSetModal(setEntry, "weight");
  }

  function handleSetLongPress(setEntry: ActiveWorkoutSet) {
    triggerSelectionHaptic();
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

  return {
    activeRestTimer,
    restRemainingMs,
    restProgress,
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
    setCustomSetRepsInput,
    setCustomSetWeightInput,
    saveCustomSetValues,
    closeCustomSetModal,
    clearCustomSetError,

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
