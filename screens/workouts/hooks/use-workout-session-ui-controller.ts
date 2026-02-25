import { useEffect, useMemo, useState } from "react";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { designTokens } from "@/constants/design-system";
import {
  formatWeightInputFromKg,
  parseWeightInputToKg,
  type WeightUnit,
} from "@/lib/weight";
import type { ActiveWorkoutSession } from "@/types/workout";

import { SESSION_HEADER_COMPACT_AFTER_MS } from "../constants";
import { getElapsedMs, groupActiveSetsByExercise } from "../utils";

const { spacing } = designTokens;

type SessionUiDeps = {
  activeSession: ActiveWorkoutSession | null;
  weightUnit: WeightUnit;
  clearStoreError: () => void;
  startWorkoutSession: (workoutId: string) => Promise<void>;
  setActiveWorkoutBodyweight: (bodyweightKg: number | null) => Promise<void>;
  pauseActiveWorkoutSession: () => Promise<void>;
  resumeActiveWorkoutSession: () => Promise<void>;
};

export function useWorkoutSessionUiController({
  activeSession,
  weightUnit,
  clearStoreError,
  startWorkoutSession,
  setActiveWorkoutBodyweight,
  pauseActiveWorkoutSession,
  resumeActiveWorkoutSession,
}: SessionUiDeps) {
  const [sessionActionError, setSessionActionError] = useState<string | null>(
    null
  );
  const [bodyweightInput, setBodyweightInput] = useState("");
  const [bodyweightError, setBodyweightError] = useState<string | null>(null);
  const [isSessionScreenOpen, setIsSessionScreenOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  const sessionHeaderCompactProgress = useSharedValue(0);

  const activeWorkoutId = activeSession?.workoutId ?? null;
  const activeBodyweightKg = activeSession?.bodyweightKg ?? null;

  const groupedActiveSets = useMemo(
    () => {
      const grouped = groupActiveSetsByExercise(activeSession?.sets ?? []);

      return grouped
        .map((group, index) => ({
          group,
          index,
          isCompleted: group.sets.length > 0 && group.sets.every((setEntry) => setEntry.actualReps > 0),
        }))
        .sort((a, b) => {
          if (a.isCompleted !== b.isCompleted) {
            return a.isCompleted ? 1 : -1;
          }

          return a.index - b.index;
        })
        .map(({ group }) => group);
    },
    [activeSession?.sets]
  );

  const completedSetCount = useMemo(
    () =>
      activeSession?.sets.filter((setEntry) => setEntry.actualReps > 0)
        .length ?? 0,
    [activeSession?.sets]
  );

  const totalSessionVolumeKg = useMemo(
    () =>
      activeSession?.sets.reduce(
        (total, setEntry) =>
          total + Math.abs(setEntry.actualWeightKg) * setEntry.actualReps,
        0
      ) ?? 0,
    [activeSession?.sets]
  );

  const sessionElapsed = useMemo(() => {
    if (!activeSession) {
      return 0;
    }

    return getElapsedMs(activeSession, now);
  }, [activeSession, now]);

  const shouldCompactSessionHeader =
    sessionElapsed >= SESSION_HEADER_COMPACT_AFTER_MS;

  const sessionHeaderAnimatedStyle = useAnimatedStyle(() => {
    const compactProgress = sessionHeaderCompactProgress.value;

    return {
      paddingTop: spacing.lg + (spacing.sm - spacing.lg) * compactProgress,
      paddingBottom: spacing.lg + (spacing.sm - spacing.lg) * compactProgress,
    };
  });

  const sessionHeaderDetailsAnimatedStyle = useAnimatedStyle(() => {
    const compactProgress = sessionHeaderCompactProgress.value;

    return {
      opacity: 1 - compactProgress,
      maxHeight: 120 * (1 - compactProgress),
      marginTop: spacing.md * (1 - compactProgress),
      transform: [{ translateY: -8 * compactProgress }],
    };
  });

  useEffect(() => {
    if (!isSessionScreenOpen || !activeSession) {
      return;
    }

    setNow(Date.now());
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isSessionScreenOpen, activeSession]);

  useEffect(() => {
    if (!activeSession) {
      setIsSessionScreenOpen(false);
    }
  }, [activeSession]);

  useEffect(() => {
    sessionHeaderCompactProgress.value = withTiming(
      shouldCompactSessionHeader ? 1 : 0,
      {
        duration: 340,
        easing: Easing.linear,
      }
    );
  }, [sessionHeaderCompactProgress, shouldCompactSessionHeader]);

  useEffect(() => {
    if (!activeWorkoutId) {
      setBodyweightInput("");
      setBodyweightError(null);
      return;
    }

    if (activeBodyweightKg === null) {
      setBodyweightInput("");
      return;
    }

    setBodyweightInput(formatWeightInputFromKg(activeBodyweightKg, weightUnit));
  }, [activeBodyweightKg, activeWorkoutId, weightUnit]);

  async function saveSessionBodyweight() {
    const trimmed = bodyweightInput.trim();

    if (!trimmed) {
      try {
        await setActiveWorkoutBodyweight(null);
        setBodyweightError(null);
      } catch {
        setBodyweightError("Could not clear bodyweight right now.");
      }
      return;
    }

    const parsed = parseWeightInputToKg(trimmed, weightUnit);
    if (parsed === null || parsed <= 0) {
      setBodyweightError("Enter a valid bodyweight above zero.");
      return;
    }

    try {
      await setActiveWorkoutBodyweight(parsed);
      setBodyweightError(null);
    } catch {
      setBodyweightError("Could not save bodyweight right now.");
    }
  }

  async function beginWorkout(workoutId: string) {
    setSessionActionError(null);
    clearStoreError();

    if (activeSession && activeSession.workoutId !== workoutId) {
      setSessionActionError(
        "Finish or discard your active workout session before starting another."
      );
      return;
    }

    try {
      if (!activeSession) {
        await startWorkoutSession(workoutId);
      }

      setIsSessionScreenOpen(true);
    } catch {
      setSessionActionError(
        "Could not start this workout right now. Try again."
      );
    }
  }

  async function toggleSessionPaused() {
    if (!activeSession) {
      return;
    }

    if (activeSession.isPaused) {
      await resumeActiveWorkoutSession();
      return;
    }

    await pauseActiveWorkoutSession();
  }

  function clearBodyweightError() {
    setBodyweightError((current) => (current ? null : current));
  }

  function openSessionScreen() {
    setIsSessionScreenOpen(true);
  }

  function closeSessionScreen() {
    setIsSessionScreenOpen(false);
  }

  return {
    sessionActionError,
    setSessionActionError,

    bodyweightInput,
    bodyweightError,
    setBodyweightInput,
    saveSessionBodyweight,
    clearBodyweightError,

    isSessionScreenOpen,
    openSessionScreen,
    closeSessionScreen,
    now,

    groupedActiveSets,
    completedSetCount,
    totalSessionVolumeKg,
    sessionElapsed,
    shouldCompactSessionHeader,
    sessionHeaderAnimatedStyle,
    sessionHeaderDetailsAnimatedStyle,

    beginWorkout,
    toggleSessionPaused,
  };
}

export type WorkoutSessionUiController = ReturnType<
  typeof useWorkoutSessionUiController
>;
