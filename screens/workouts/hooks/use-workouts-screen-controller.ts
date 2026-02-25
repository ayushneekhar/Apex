import { useMemo } from "react";
import { useAnimatedStyle } from "react-native-reanimated";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAppStore } from "@/store/use-app-store";

import { useWorkoutBuilderController } from "./use-workout-builder-controller";
import { useWorkoutSessionSetActionsController } from "./use-workout-session-set-actions-controller";
import { useWorkoutSessionUiController } from "./use-workout-session-ui-controller";
import { useWorkoutSpotifyController } from "./use-workout-spotify-controller";

export function useWorkoutsScreenController() {
  const theme = useAppTheme();

  const workouts = useAppStore((state) => state.workouts);
  const settings = useAppStore((state) => state.settings);
  const mutating = useAppStore((state) => state.mutating);
  const error = useAppStore((state) => state.error);
  const activeSession = useAppStore((state) => state.activeSession);

  const clearError = useAppStore((state) => state.clearError);
  const addWorkout = useAppStore((state) => state.addWorkout);
  const editWorkout = useAppStore((state) => state.editWorkout);
  const applyWeeklyOverload = useAppStore((state) => state.applyWeeklyOverload);
  const removeWorkout = useAppStore((state) => state.removeWorkout);

  const startWorkoutSession = useAppStore((state) => state.startWorkoutSession);
  const setActiveWorkoutBodyweight = useAppStore(
    (state) => state.setActiveWorkoutBodyweight
  );
  const pauseActiveWorkoutSession = useAppStore(
    (state) => state.pauseActiveWorkoutSession
  );
  const resumeActiveWorkoutSession = useAppStore(
    (state) => state.resumeActiveWorkoutSession
  );
  const decrementOrCompleteSessionSet = useAppStore(
    (state) => state.decrementOrCompleteSessionSet
  );
  const setSessionSetCustomValues = useAppStore(
    (state) => state.setSessionSetCustomValues
  );
  const finishActiveWorkoutSession = useAppStore(
    (state) => state.finishActiveWorkoutSession
  );
  const discardActiveWorkoutSession = useAppStore(
    (state) => state.discardActiveWorkoutSession
  );

  const builder = useWorkoutBuilderController({
    weightUnit: settings.weightUnit,
    clearStoreError: clearError,
    addWorkout,
    editWorkout,
  });

  const sessionUi = useWorkoutSessionUiController({
    activeSession,
    weightUnit: settings.weightUnit,
    clearStoreError: clearError,
    startWorkoutSession,
    setActiveWorkoutBodyweight,
    pauseActiveWorkoutSession,
    resumeActiveWorkoutSession,
  });

  const sessionSetActions = useWorkoutSessionSetActionsController({
    activeSession,
    weightUnit: settings.weightUnit,
    now: sessionUi.now,
    setSessionActionError: sessionUi.setSessionActionError,
    closeSessionScreen: sessionUi.closeSessionScreen,
    decrementOrCompleteSessionSet,
    setSessionSetCustomValues,
    finishActiveWorkoutSession,
    discardActiveWorkoutSession,
  });

  const spotify = useWorkoutSpotifyController({
    activeSession,
    isSessionScreenOpen: sessionUi.isSessionScreenOpen,
    now: sessionUi.now,
  });
  const { now: _sessionNow, ...sessionUiPublic } = sessionUi;

  const sessionDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    []
  );

  const compactHero = workouts.length > 0 && !builder.isComposerOpen;
  const moveTrackerCardToBottom = workouts.length > 1;

  async function beginWorkout(workoutId: string) {
    builder.clearFormError();
    await sessionUi.beginWorkout(workoutId);
  }

  return {
    theme,
    workouts,
    settings,
    mutating,
    error,
    activeSession,
    sessionDateFormatter,

    ...builder,

    ...sessionUiPublic,
    beginWorkout,

    ...sessionSetActions,

    ...spotify,

    compactHero,
    moveTrackerCardToBottom,

    applyWeeklyOverload,
    removeWorkout,
  };
}

export type WorkoutsScreenController = ReturnType<
  typeof useWorkoutsScreenController
>;
export type AnimatedViewStyle = ReturnType<typeof useAnimatedStyle>;
