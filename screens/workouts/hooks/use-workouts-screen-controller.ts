import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { useAnimatedStyle } from "react-native-reanimated";

import { useAppTheme } from "@/hooks/use-app-theme";
import {
  formatWeightFromKg,
  getDefaultWeeklyIncrementKg,
} from "@/lib/weight";
import {
  getActiveWeekStreak,
  getWeekRuns,
  getWeekStartTimestamp,
} from "@/lib/streaks";
import { QUICK_WORKOUT_ID } from "@/constants/workout";
import { getCurrentLevel } from "@/screens/workout-summary/summary-data";
import { useAppStore } from "@/store/use-app-store";
import type { RootStackParamList } from "@/types/navigation";

import { useSessionExerciseExtrasController } from "./use-session-exercise-extras-controller";
import { useWorkoutSessionSetActionsController } from "./use-workout-session-set-actions-controller";
import { useWorkoutSessionUiController } from "./use-workout-session-ui-controller";

export function useWorkoutsScreenController() {
  const theme = useAppTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const workouts = useAppStore((state) => state.workouts);
  const settings = useAppStore((state) => state.settings);
  const mutating = useAppStore((state) => state.mutating);
  const error = useAppStore((state) => state.error);
  const activeSession = useAppStore((state) => state.activeSession);

  const clearError = useAppStore((state) => state.clearError);
  const applyWeeklyOverload = useAppStore((state) => state.applyWeeklyOverload);
  const archiveWorkout = useAppStore((state) => state.archiveWorkout);

  const startWorkoutSession = useAppStore((state) => state.startWorkoutSession);
  const startEmptyWorkoutSession = useAppStore((state) => state.startEmptyWorkoutSession);
  const addActiveSessionExercise = useAppStore((state) => state.addActiveSessionExercise);
  const addWarmupSet = useAppStore((state) => state.addWarmupSet);
  const removeWarmupSet = useAppStore((state) => state.removeWarmupSet);
  const setActiveSessionExerciseNote = useAppStore(
    (state) => state.setActiveSessionExerciseNote
  );
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
  const editWorkout = useAppStore((state) => state.editWorkout);

  const activeWorkouts = useMemo(
    () =>
      workouts.filter(
        (workout) => workout.archivedAt === null && workout.id !== QUICK_WORKOUT_ID
      ),
    [workouts]
  );

  const defaultOverload = useMemo(
    () =>
      formatWeightFromKg(
        getDefaultWeeklyIncrementKg(settings.weightUnit),
        settings.weightUnit
      ),
    [settings.weightUnit]
  );

  const sessionUi = useWorkoutSessionUiController({
    activeSession,
    weightUnit: settings.weightUnit,
    clearStoreError: clearError,
    startWorkoutSession,
    startEmptyWorkoutSession,
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
    onSessionFinished: (result) => navigation.navigate("WorkoutSummary", result),
    decrementOrCompleteSessionSet,
    setSessionSetCustomValues,
    updateActiveSessionExerciseTargets,
    editWorkout,
    finishActiveWorkoutSession,
    discardActiveWorkoutSession,
  });

  const sessionExerciseExtras = useSessionExerciseExtrasController({
    activeSession,
    workouts,
    weightUnit: settings.weightUnit,
    setSessionActionError: sessionUi.setSessionActionError,
    addActiveSessionExercise,
    addWarmupSet,
    removeWarmupSet,
    setActiveSessionExerciseNote,
  });

  const isQuickSession = activeSession?.workoutId === QUICK_WORKOUT_ID;

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

  // All workouts, archived included: retiring a template shouldn't cost XP.
  const level = useMemo(() => getCurrentLevel(workouts), [workouts]);
  // Keyed on the week, not the ticking clock, so it only recomputes when a week rolls over.
  const currentWeekStart = getWeekStartTimestamp(sessionUi.now);
  const weekStreak = useMemo(
    () =>
      getActiveWeekStreak(
        getWeekRuns(
          workouts.flatMap((workout) => workout.sessions.map((session) => session.performedAt)),
          currentWeekStart
        )
      ),
    [currentWeekStart, workouts]
  );

  const compactHero = activeWorkouts.length > 0;
  const moveTrackerCardToBottom = activeWorkouts.length > 1;

  const lastCompletedWorkout = useMemo(() => {
    let latest: { workoutId: string; name: string; performedAt: number } | null = null;

    activeWorkouts.forEach((workout) => {
      workout.sessions.forEach((session) => {
        if (!latest || session.performedAt > latest.performedAt) {
          latest = { workoutId: workout.id, name: workout.name, performedAt: session.performedAt };
        }
      });
    });

    return latest as { workoutId: string; name: string; performedAt: number } | null;
  }, [activeWorkouts]);

  const nextScheduledWorkout = useMemo(() => {
    if (!lastCompletedWorkout || activeWorkouts.length < 2) {
      return null;
    }

    const lastWorkoutIndex = activeWorkouts.findIndex(
      (workout) => workout.id === lastCompletedWorkout.workoutId
    );

    if (lastWorkoutIndex < 0) {
      return null;
    }

    return activeWorkouts[(lastWorkoutIndex + 1) % activeWorkouts.length] ?? null;
  }, [activeWorkouts, lastCompletedWorkout]);

  const orderedWorkouts = useMemo(() => {
    const nextWorkoutId = nextScheduledWorkout?.id ?? null;
    const previousWorkoutId = lastCompletedWorkout?.workoutId ?? null;

    if (!nextWorkoutId || !previousWorkoutId || nextWorkoutId === previousWorkoutId) {
      return activeWorkouts;
    }

    const nextWorkout = activeWorkouts.find((workout) => workout.id === nextWorkoutId) ?? null;
    const previousWorkout =
      activeWorkouts.find((workout) => workout.id === previousWorkoutId) ?? null;

    if (!nextWorkout || !previousWorkout) {
      return activeWorkouts;
    }

    return [
      nextWorkout,
      ...activeWorkouts.filter(
        (workout) => workout.id !== nextWorkoutId && workout.id !== previousWorkoutId
      ),
      previousWorkout,
    ];
  }, [activeWorkouts, lastCompletedWorkout, nextScheduledWorkout]);

  async function beginWorkout(workoutId: string) {
    await sessionUi.beginWorkout(workoutId);
  }

  return {
    theme,
    workouts: activeWorkouts,
    settings,
    mutating,
    error,
    activeSession,
    sessionDateFormatter,
    defaultOverload,
    level,
    weekStreak,

    ...sessionUiPublic,
    beginWorkout,

    ...sessionSetActions,
    ...sessionExerciseExtras,
    isQuickSession,
    compactHero,
    moveTrackerCardToBottom,
    orderedWorkouts,
    lastCompletedWorkout,
    nextScheduledWorkout,

    applyWeeklyOverload,
    archiveWorkout,
  };
}

export type WorkoutsScreenController = ReturnType<
  typeof useWorkoutsScreenController
>;
export type AnimatedViewStyle = ReturnType<typeof useAnimatedStyle>;
