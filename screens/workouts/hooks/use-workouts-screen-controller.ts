import { useMemo } from "react";
import { useAnimatedStyle } from "react-native-reanimated";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAppStore } from "@/store/use-app-store";

import { useWorkoutBuilderController } from "./use-workout-builder-controller";
import { useWorkoutSessionSetActionsController } from "./use-workout-session-set-actions-controller";
import { useWorkoutSessionUiController } from "./use-workout-session-ui-controller";

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
  const updateActiveSessionExerciseTargets = useAppStore(
    (state) => state.updateActiveSessionExerciseTargets
  );
  const finishActiveWorkoutSession = useAppStore(
    (state) => state.finishActiveWorkoutSession
  );
  const discardActiveWorkoutSession = useAppStore(
    (state) => state.discardActiveWorkoutSession
  );

  const builder = useWorkoutBuilderController({
    weightUnit: settings.weightUnit,
    workoutCount: workouts.length,
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
    workouts,
    weightUnit: settings.weightUnit,
    now: sessionUi.now,
    setSessionActionError: sessionUi.setSessionActionError,
    closeSessionScreen: sessionUi.closeSessionScreen,
    decrementOrCompleteSessionSet,
    setSessionSetCustomValues,
    updateActiveSessionExerciseTargets,
    editWorkout,
    finishActiveWorkoutSession,
    discardActiveWorkoutSession,
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

  const lastCompletedWorkout = useMemo(() => {
    let latest: { workoutId: string; name: string; performedAt: number } | null = null;

    workouts.forEach((workout) => {
      workout.sessions.forEach((session) => {
        if (!latest || session.performedAt > latest.performedAt) {
          latest = { workoutId: workout.id, name: workout.name, performedAt: session.performedAt };
        }
      });
    });

    return latest as { workoutId: string; name: string; performedAt: number } | null;
  }, [workouts]);

  const nextScheduledWorkout = useMemo(() => {
    if (!lastCompletedWorkout || workouts.length < 2) {
      return null;
    }

    const lastWorkoutIndex = workouts.findIndex(
      (workout) => workout.id === lastCompletedWorkout.workoutId
    );

    if (lastWorkoutIndex < 0) {
      return null;
    }

    return workouts[(lastWorkoutIndex + 1) % workouts.length] ?? null;
  }, [lastCompletedWorkout, workouts]);

  const orderedWorkouts = useMemo(() => {
    const nextWorkoutId = nextScheduledWorkout?.id ?? null;
    const previousWorkoutId = lastCompletedWorkout?.workoutId ?? null;

    if (!nextWorkoutId || !previousWorkoutId || nextWorkoutId === previousWorkoutId) {
      return workouts;
    }

    const nextWorkout = workouts.find((workout) => workout.id === nextWorkoutId) ?? null;
    const previousWorkout = workouts.find((workout) => workout.id === previousWorkoutId) ?? null;

    if (!nextWorkout || !previousWorkout) {
      return workouts;
    }

    return [
      nextWorkout,
      ...workouts.filter(
        (workout) => workout.id !== nextWorkoutId && workout.id !== previousWorkoutId
      ),
      previousWorkout,
    ];
  }, [lastCompletedWorkout, nextScheduledWorkout, workouts]);

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
    compactHero,
    moveTrackerCardToBottom,
    orderedWorkouts,
    lastCompletedWorkout,
    nextScheduledWorkout,

    applyWeeklyOverload,
    removeWorkout,
  };
}

export type WorkoutsScreenController = ReturnType<
  typeof useWorkoutsScreenController
>;
export type AnimatedViewStyle = ReturnType<typeof useAnimatedStyle>;
