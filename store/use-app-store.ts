import { create } from 'zustand';

import type { ThemeId } from '@/constants/app-themes';
import {
  DEFAULT_SETTINGS,
  advanceWorkoutWeek,
  archiveWorkout as archiveWorkoutInDatabase,
  clearActiveWorkoutSession,
  createWorkout,
  createWorkoutSession,
  ensureQuickWorkout,
  exportDatabaseBackup,
  importDatabaseBackupBytes,
  importDatabaseBackup,
  initializeDatabase,
  listWorkouts,
  loadActiveWorkoutSession,
  loadSettings,
  restoreWorkout as restoreWorkoutInDatabase,
  saveActiveWorkoutSession,
  saveThemeSetting,
  saveWeightUnitSetting,
  updateWorkout,
  updateWorkoutSession,
} from '@/lib/database';
import { createId } from '@/lib/id';
import {
  DEFAULT_REST_SECONDS,
  QUICK_WORKOUT_ID,
  QUICK_WORKOUT_NAME,
  WARMUP_RAMP,
} from '@/constants/workout';
import {
  cancelScheduledNotification,
  createRestNotificationId,
  requestRestNotificationPermission,
  scheduleRestCompleteNotification,
  syncRestCompleteNotification,
} from '@/lib/rest-notifications';
import type { NitroOtaUpdateCheck } from '@/lib/nitro-ota';
import { convertKgToUnit, convertUnitToKg, type WeightUnit } from '@/lib/weight';
import type {
  ActiveRestTimer,
  ActiveWorkoutSession,
  ActiveWorkoutSet,
  AppSettings,
  NewWorkoutInput,
  NewWorkoutSessionInput,
  UpdateWorkoutInput,
  UpdateWorkoutSessionInput,
  Workout,
} from '@/types/workout';

type AppStoreState = {
  hydrated: boolean;
  bootstrapping: boolean;
  workoutsLoading: boolean;
  mutating: boolean;
  error: string | null;
  settings: AppSettings;
  workouts: Workout[];
  activeSession: ActiveWorkoutSession | null;
  nitroOtaUpdateCheck: NitroOtaUpdateCheck | null;
  bootstrap: () => Promise<void>;
  clearError: () => void;
  setNitroOtaUpdateCheck: (updateCheck: NitroOtaUpdateCheck | null) => void;
  refreshWorkouts: () => Promise<void>;
  exportBackup: () => Promise<string | null>;
  importBackup: () => Promise<boolean>;
  importBackupFromBytes: (bytes: Uint8Array) => Promise<void>;
  setTheme: (themeId: ThemeId) => Promise<void>;
  setWeightUnit: (unit: WeightUnit) => Promise<void>;
  addWorkout: (input: NewWorkoutInput) => Promise<void>;
  editWorkout: (input: UpdateWorkoutInput) => Promise<void>;
  addWorkoutSession: (input: NewWorkoutSessionInput) => Promise<void>;
  editWorkoutSession: (input: UpdateWorkoutSessionInput) => Promise<void>;
  applyWeeklyOverload: (workoutId: string) => Promise<void>;
  archiveWorkout: (workoutId: string) => Promise<void>;
  restoreWorkout: (workoutId: string) => Promise<void>;
  startWorkoutSession: (workoutId: string) => Promise<void>;
  startEmptyWorkoutSession: () => Promise<void>;
  addActiveSessionExercise: (input: {
    name: string;
    sets: number;
    reps: number;
    weightKg: number | null;
  }) => Promise<void>;
  addWarmupSet: (workoutExerciseId: string, unit: WeightUnit) => Promise<void>;
  removeWarmupSet: (setId: string) => Promise<void>;
  setActiveSessionExerciseNote: (workoutExerciseId: string, note: string) => Promise<void>;
  setActiveWorkoutBodyweight: (bodyweightKg: number | null) => Promise<void>;
  pauseActiveWorkoutSession: () => Promise<void>;
  resumeActiveWorkoutSession: () => Promise<void>;
  decrementOrCompleteSessionSet: (setId: string) => Promise<{
    shouldStartRest: boolean;
    restSet: ActiveWorkoutSet | null;
  }>;
  setSessionSetCustomValues: (
    setId: string,
    reps: number,
    weightKg: number,
    weightScope?: "current" | "remaining" | "all"
  ) => Promise<void>;
  updateActiveSessionExerciseTargets: (
    workoutExerciseId: string,
    sets: number,
    reps: number,
    exerciseName?: string
  ) => Promise<void>;
  /** Resolves with the saved session, or null when there was nothing to finish. */
  finishActiveWorkoutSession: () => Promise<{ workoutId: string; sessionId: string } | null>;
  discardActiveWorkoutSession: () => Promise<void>;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something unexpected happened.';
}

function getTargetWeightKg(workout: Workout, exercise: Workout['exercises'][number]): number {
  return exercise.startWeightKg + exercise.overloadIncrementKg * workout.weeksCompleted;
}

function getMostRecentWorkoutSession(workout: Workout): Workout['sessions'][number] | null {
  if (workout.sessions.length === 0) {
    return null;
  }

  return workout.sessions.reduce((latestSession, session) =>
    session.performedAt > latestSession.performedAt ? session : latestSession
  );
}

function getSessionSetIdLookupKey(workoutExerciseId: string, setNumber: number): string {
  return `${workoutExerciseId}:${setNumber}`;
}

function getSessionSetNameLookupKey(exerciseName: string, setNumber: number): string {
  return `${exerciseName.trim().toLowerCase()}:${setNumber}`;
}

/** Warm-ups never hold an exercise open: only working sets count as pending. */
function isPendingWorkingSet(setEntry: ActiveWorkoutSet): boolean {
  return !setEntry.isWarmup && setEntry.actualReps === 0;
}

function getExerciseCompletionCount(session: ActiveWorkoutSession, workoutExerciseId: string): number {
  return session.sets.filter(
    (setEntry) =>
      setEntry.workoutExerciseId === workoutExerciseId &&
      !setEntry.isWarmup &&
      setEntry.actualReps > 0
  ).length;
}

function getFirstPendingExerciseId(session: ActiveWorkoutSession): string | null {
  const orderedExerciseIds = Array.from(
    new Map(
      session.sets
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((setEntry) => [setEntry.workoutExerciseId, setEntry.sortOrder])
    ).keys()
  );

  for (const exerciseId of orderedExerciseIds) {
    const hasPendingSet = session.sets.some(
      (setEntry) =>
        setEntry.workoutExerciseId === exerciseId && isPendingWorkingSet(setEntry)
    );

    if (hasPendingSet) {
      return exerciseId;
    }
  }

  return null;
}

function getPreferredCurrentExerciseId(
  session: ActiveWorkoutSession,
  preferredExerciseId: string | null,
  fallbackExerciseId: string | null
): string | null {
  const hasPendingSets = (workoutExerciseId: string | null) =>
    workoutExerciseId !== null &&
    session.sets.some(
      (setEntry) =>
        setEntry.workoutExerciseId === workoutExerciseId && isPendingWorkingSet(setEntry)
    );

  if (hasPendingSets(preferredExerciseId)) {
    return preferredExerciseId;
  }

  if (hasPendingSets(fallbackExerciseId)) {
    return fallbackExerciseId;
  }

  return getFirstPendingExerciseId(session);
}

function getNextCurrentExerciseIdAfterCompletion(
  session: ActiveWorkoutSession,
  completedSet: ActiveWorkoutSet
): string | null {
  const supersetExerciseId = completedSet.supersetExerciseId;

  if (supersetExerciseId) {
    const completedCount = getExerciseCompletionCount(
      session,
      completedSet.workoutExerciseId
    );
    const supersetCompletedCount = getExerciseCompletionCount(
      session,
      supersetExerciseId
    );
    const supersetHasPendingSet = session.sets.some(
      (setEntry) =>
        setEntry.workoutExerciseId === supersetExerciseId &&
        isPendingWorkingSet(setEntry)
    );

    if (supersetHasPendingSet && completedCount > supersetCompletedCount) {
      return supersetExerciseId;
    }
  }

  // Stay on the exercise the user just interacted with if it still has pending sets
  const exerciseStillPending = session.sets.some(
    (setEntry) =>
      setEntry.workoutExerciseId === completedSet.workoutExerciseId &&
      isPendingWorkingSet(setEntry)
  );

  if (exerciseStillPending) {
    return completedSet.workoutExerciseId;
  }

  return getFirstPendingExerciseId(session);
}

function getExerciseNameForWorkoutExerciseId(
  session: ActiveWorkoutSession,
  workoutExerciseId: string | null
): string | null {
  if (!workoutExerciseId) {
    return null;
  }

  const setEntry = session.sets.find(
    (candidate) => candidate.workoutExerciseId === workoutExerciseId
  );

  return setEntry?.exerciseName ?? null;
}

function getRestTimerExerciseName(
  session: ActiveWorkoutSession,
  completedSet: ActiveWorkoutSet
): string {
  const exerciseStillPending = session.sets.some(
    (setEntry) =>
      setEntry.workoutExerciseId === completedSet.workoutExerciseId &&
      isPendingWorkingSet(setEntry)
  );

  if (exerciseStillPending) {
    return completedSet.exerciseName;
  }

  const nextExerciseName = getExerciseNameForWorkoutExerciseId(
    session,
    session.currentExerciseId
  );

  return nextExerciseName ?? completedSet.exerciseName;
}

function buildActiveRestTimer(
  session: ActiveWorkoutSession,
  completedSet: ActiveWorkoutSet,
  startedAt: number
): ActiveRestTimer {
  const durationMs = Math.max(1, Math.floor(completedSet.restSeconds)) * 1000;
  const endsAt = startedAt + durationMs;

  return {
    setId: completedSet.id,
    exerciseName: getRestTimerExerciseName(session, completedSet),
    startedAt,
    endsAt,
    durationMs,
    notificationId: createRestNotificationId(completedSet.id, endsAt),
  };
}

function buildSessionSets(workout: Workout): ActiveWorkoutSet[] {
  const mostRecentSession = getMostRecentWorkoutSession(workout);
  const lastSessionWeightByExerciseSet = new Map<string, number>();
  const lastSessionWeightByExerciseNameSet = new Map<string, number>();
  const lastSessionRepsByExerciseSet = new Map<string, number>();
  const lastSessionRepsByExerciseNameSet = new Map<string, number>();

  mostRecentSession?.sets.forEach((setEntry) => {
    if (setEntry.isWarmup) {
      return;
    }

    if (Number.isFinite(setEntry.weightKg)) {
      lastSessionWeightByExerciseSet.set(
        getSessionSetIdLookupKey(setEntry.workoutExerciseId, setEntry.setNumber),
        setEntry.weightKg
      );
      lastSessionWeightByExerciseNameSet.set(
        getSessionSetNameLookupKey(setEntry.exerciseName, setEntry.setNumber),
        setEntry.weightKg
      );
    }

    if (!Number.isFinite(setEntry.reps) || setEntry.reps < 0) {
      return;
    }

    lastSessionRepsByExerciseSet.set(
      getSessionSetIdLookupKey(setEntry.workoutExerciseId, setEntry.setNumber),
      Math.floor(setEntry.reps)
    );
    lastSessionRepsByExerciseNameSet.set(
      getSessionSetNameLookupKey(setEntry.exerciseName, setEntry.setNumber),
      Math.floor(setEntry.reps)
    );
  });

  return workout.exercises.flatMap((exercise) => {
    const targetWeightKg = getTargetWeightKg(workout, exercise);

    return Array.from({ length: exercise.sets }, (_, index) => {
      const setNumber = index + 1;
      const previousReps =
        lastSessionRepsByExerciseSet.get(getSessionSetIdLookupKey(exercise.id, setNumber)) ??
        lastSessionRepsByExerciseNameSet.get(getSessionSetNameLookupKey(exercise.name, setNumber)) ??
        null;
      const actualWeightKg =
        lastSessionWeightByExerciseSet.get(getSessionSetIdLookupKey(exercise.id, setNumber)) ??
        lastSessionWeightByExerciseNameSet.get(getSessionSetNameLookupKey(exercise.name, setNumber)) ??
        targetWeightKg;

      return {
        id: createId('active_set'),
        workoutExerciseId: exercise.id,
        exerciseName: exercise.name,
        sortOrder: exercise.sortOrder,
        setNumber,
        targetReps: exercise.reps,
        previousReps,
        targetWeightKg,
        actualWeightKg,
        restSeconds: exercise.restSeconds,
        actualReps: 0,
        supersetExerciseId: exercise.supersetExerciseId,
        completedAt: null,
        isWarmup: false,
      };
    });
  });
}

/** Most recent working set logged for an exercise name in any workout. */
function getLastLoggedSetForExercise(
  workouts: Workout[],
  exerciseName: string
): { weightKg: number; reps: number } | null {
  const key = exerciseName.trim().toLowerCase();
  let latest: { weightKg: number; reps: number; performedAt: number } | null = null;

  workouts.forEach((workout) => {
    workout.sessions.forEach((session) => {
      if (latest && session.performedAt <= latest.performedAt) {
        return;
      }

      const match = session.sets
        .filter(
          (setEntry) =>
            !setEntry.isWarmup &&
            setEntry.reps > 0 &&
            setEntry.exerciseName.trim().toLowerCase() === key
        )
        .sort((a, b) => b.weightKg - a.weightKg)[0];

      if (match) {
        latest = { weightKg: match.weightKg, reps: match.reps, performedAt: session.performedAt };
      }
    });
  });

  return latest;
}

/** Rounds to the smallest plate jump people actually load: 2.5 kg or 5 lb. */
function roundToPlateIncrementKg(weightKg: number, unit: WeightUnit): number {
  const step = unit === 'kg' ? 2.5 : 5;
  return convertUnitToKg(Math.round(convertKgToUnit(weightKg, unit) / step) * step, unit);
}

function getMostRecentBodyweightKg(workouts: Workout[]): number | null {
  let latestBodyweight: number | null = null;
  let latestPerformedAt = -1;

  workouts.forEach((workout) => {
    workout.sessions.forEach((session) => {
      if (
        typeof session.bodyweightKg === 'number' &&
        Number.isFinite(session.bodyweightKg) &&
        session.bodyweightKg > 0 &&
        session.performedAt > latestPerformedAt
      ) {
        latestBodyweight = session.bodyweightKg;
        latestPerformedAt = session.performedAt;
      }
    });
  });

  return latestBodyweight;
}

function elapsedPauseMs(session: ActiveWorkoutSession, now: number): number {
  if (!session.isPaused || session.pauseStartedAt === null) {
    return 0;
  }

  return Math.max(0, now - session.pauseStartedAt);
}

function getElapsedSessionMs(session: ActiveWorkoutSession, now: number): number {
  return Math.max(0, now - session.startedAt - session.totalPausedMs - elapsedPauseMs(session, now));
}

function pauseSession(session: ActiveWorkoutSession, now: number): ActiveWorkoutSession {
  if (session.isPaused) {
    return session;
  }

  return {
    ...session,
    isPaused: true,
    pauseStartedAt: now,
  };
}

function resumeSession(session: ActiveWorkoutSession, now: number): ActiveWorkoutSession {
  if (!session.isPaused) {
    return {
      ...session,
      restoredFromAppClose: false,
    };
  }

  return {
    ...session,
    totalPausedMs: session.totalPausedMs + elapsedPauseMs(session, now),
    isPaused: false,
    pauseStartedAt: null,
    restoredFromAppClose: false,
  };
}

type PersistedState = Pick<AppStoreState, 'settings' | 'workouts' | 'activeSession'>;

async function loadPersistedState(): Promise<PersistedState> {
  const [settings, workouts, storedSession] = await Promise.all([
    loadSettings(),
    listWorkouts(),
    loadActiveWorkoutSession(),
  ]);

  let activeSession = storedSession;

  if (activeSession && !workouts.some((workout) => workout.id === activeSession?.workoutId)) {
    activeSession = null;
    await clearActiveWorkoutSession();
  }

  if (activeSession && !activeSession.isPaused) {
    activeSession = {
      ...pauseSession(activeSession, Date.now()),
      restoredFromAppClose: true,
      currentExerciseId:
        activeSession.currentExerciseId ?? getFirstPendingExerciseId(activeSession),
    };
    await saveActiveWorkoutSession(activeSession);
  }

  if (activeSession && activeSession.currentExerciseId === null) {
    activeSession = {
      ...activeSession,
      currentExerciseId: getFirstPendingExerciseId(activeSession),
    };
    await saveActiveWorkoutSession(activeSession);
  }

  if (activeSession?.restTimer) {
    try {
      if (activeSession.restTimer.endsAt <= Date.now()) {
        await cancelScheduledNotification(activeSession.restTimer.notificationId);
      } else {
        await syncRestCompleteNotification(activeSession.restTimer);
      }
    } catch {
      // Notification recovery must never prevent the rest of the app from loading.
    }
  }

  return {
    settings,
    workouts,
    activeSession,
  };
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  hydrated: false,
  bootstrapping: false,
  workoutsLoading: false,
  mutating: false,
  error: null,
  settings: DEFAULT_SETTINGS,
  workouts: [],
  activeSession: null,
  nitroOtaUpdateCheck: null,
  bootstrap: async () => {
    if (get().hydrated || get().bootstrapping) {
      return;
    }

    set({ bootstrapping: true, error: null });

    try {
      await initializeDatabase();
      const persistedState = await loadPersistedState();

      set({
        ...persistedState,
        hydrated: true,
        error: null,
      });
    } catch (error) {
      set({
        error: errorMessage(error),
      });
    } finally {
      set({ bootstrapping: false });
    }
  },
  clearError: () => set({ error: null }),
  setNitroOtaUpdateCheck: (nitroOtaUpdateCheck) => set({ nitroOtaUpdateCheck }),
  refreshWorkouts: async () => {
    set({ workoutsLoading: true, error: null });

    try {
      const workouts = await listWorkouts();
      const activeSession = get().activeSession;

      if (activeSession && !workouts.some((workout) => workout.id === activeSession.workoutId)) {
        await clearActiveWorkoutSession();
        set({ workouts, activeSession: null, error: null });
      } else {
        set({ workouts, error: null });
      }
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ workoutsLoading: false });
    }
  },
  exportBackup: async () => {
    set({ mutating: true, error: null });

    try {
      const backupUri = await exportDatabaseBackup();
      set({ error: null });
      return backupUri;
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    } finally {
      set({ mutating: false });
    }
  },
  importBackup: async () => {
    set({ mutating: true, error: null });

    try {
      const imported = await importDatabaseBackup();

      if (!imported) {
        set({ error: null });
        return false;
      }

      await initializeDatabase();
      const persistedState = await loadPersistedState();

      set({
        ...persistedState,
        error: null,
      });

      return true;
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    } finally {
      set({ mutating: false });
    }
  },
  importBackupFromBytes: async (bytes) => {
    set({ mutating: true, error: null });

    try {
      await importDatabaseBackupBytes(bytes);
      await initializeDatabase();
      const persistedState = await loadPersistedState();

      set({
        ...persistedState,
        error: null,
      });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    } finally {
      set({ mutating: false });
    }
  },
  setTheme: async (themeId) => {
    set((state) => ({
      settings: {
        ...state.settings,
        themeId,
      },
    }));

    try {
      await saveThemeSetting(themeId);
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },
  setWeightUnit: async (weightUnit) => {
    set((state) => ({
      settings: {
        ...state.settings,
        weightUnit,
      },
    }));

    try {
      await saveWeightUnitSetting(weightUnit);
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },
  addWorkout: async (input) => {
    set({ mutating: true, error: null });

    try {
      await createWorkout(input);
      const workouts = await listWorkouts();
      set({ workouts, error: null });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    } finally {
      set({ mutating: false });
    }
  },
  editWorkout: async (input) => {
    set({ mutating: true, error: null });

    try {
      await updateWorkout(input);
      const workouts = await listWorkouts();
      set({ workouts, error: null });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    } finally {
      set({ mutating: false });
    }
  },
  addWorkoutSession: async (input) => {
    set({ mutating: true, error: null });

    try {
      await createWorkoutSession(input);
      const workouts = await listWorkouts();
      set({ workouts, error: null });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    } finally {
      set({ mutating: false });
    }
  },
  editWorkoutSession: async (input) => {
    set({ mutating: true, error: null });

    try {
      await updateWorkoutSession(input);
      const workouts = await listWorkouts();
      set({ workouts, error: null });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    } finally {
      set({ mutating: false });
    }
  },
  applyWeeklyOverload: async (workoutId) => {
    set({ mutating: true, error: null });

    try {
      await advanceWorkoutWeek(workoutId);
      const workouts = await listWorkouts();
      set({ workouts, error: null });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    } finally {
      set({ mutating: false });
    }
  },
  archiveWorkout: async (workoutId) => {
    set({ mutating: true, error: null });

    try {
      await archiveWorkoutInDatabase(workoutId);

      const activeSession = get().activeSession;
      if (activeSession?.workoutId === workoutId) {
        await clearActiveWorkoutSession();
      }

      const workouts = await listWorkouts();
      set({
        workouts,
        activeSession: activeSession?.workoutId === workoutId ? null : activeSession,
        error: null,
      });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    } finally {
      set({ mutating: false });
    }
  },
  restoreWorkout: async (workoutId) => {
    set({ mutating: true, error: null });

    try {
      await restoreWorkoutInDatabase(workoutId);
      const workouts = await listWorkouts();
      set({ workouts, error: null });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    } finally {
      set({ mutating: false });
    }
  },
  startWorkoutSession: async (workoutId) => {
    const existingSession = get().activeSession;

    if (existingSession && existingSession.workoutId !== workoutId) {
      throw new Error('Finish or discard the current active workout first.');
    }

    if (existingSession && existingSession.workoutId === workoutId) {
      return;
    }

    const workout = get().workouts.find((item) => item.id === workoutId);
    if (!workout || workout.archivedAt !== null) {
      throw new Error('Workout not found.');
    }

    const nextSession: ActiveWorkoutSession = {
      workoutId: workout.id,
      workoutName: workout.name,
      startedAt: Date.now(),
      bodyweightKg: getMostRecentBodyweightKg(get().workouts),
      totalPausedMs: 0,
      pauseStartedAt: null,
      isPaused: false,
      restoredFromAppClose: false,
      currentExerciseId: workout.exercises[0]?.id ?? null,
      restTimer: null,
      sets: buildSessionSets(workout),
      exerciseNotes: {},
    };

    void requestRestNotificationPermission().catch(() => false);
    await saveActiveWorkoutSession(nextSession);
    set({ activeSession: nextSession, error: null });
  },
  startEmptyWorkoutSession: async () => {
    if (get().activeSession) {
      throw new Error('Finish or discard the current active workout first.');
    }

    await ensureQuickWorkout();
    const workouts = await listWorkouts();

    const nextSession: ActiveWorkoutSession = {
      workoutId: QUICK_WORKOUT_ID,
      workoutName: QUICK_WORKOUT_NAME,
      startedAt: Date.now(),
      bodyweightKg: getMostRecentBodyweightKg(workouts),
      totalPausedMs: 0,
      pauseStartedAt: null,
      isPaused: false,
      restoredFromAppClose: false,
      currentExerciseId: null,
      restTimer: null,
      sets: [],
      exerciseNotes: {},
    };

    void requestRestNotificationPermission().catch(() => false);
    await saveActiveWorkoutSession(nextSession);
    set({ workouts, activeSession: nextSession, error: null });
  },
  addActiveSessionExercise: async ({ name, sets, reps, weightKg }) => {
    const session = get().activeSession;
    if (!session) {
      return;
    }

    const exerciseName = name.trim();
    if (!exerciseName) {
      throw new Error('Exercise name is required.');
    }

    const lastSet = getLastLoggedSetForExercise(get().workouts, exerciseName);
    const startWeightKg = weightKg ?? lastSet?.weightKg ?? 0;
    const workoutExerciseId = createId('exercise');
    const sortOrder =
      session.sets.reduce((highest, setEntry) => Math.max(highest, setEntry.sortOrder), -1) + 1;

    const newSets: ActiveWorkoutSet[] = Array.from(
      { length: Math.max(1, Math.floor(sets)) },
      (_, index) => ({
        id: createId('active_set'),
        workoutExerciseId,
        exerciseName,
        sortOrder,
        setNumber: index + 1,
        targetReps: Math.max(1, Math.floor(reps)),
        previousReps: lastSet?.reps ?? null,
        targetWeightKg: startWeightKg,
        actualWeightKg: startWeightKg,
        restSeconds: DEFAULT_REST_SECONDS,
        actualReps: 0,
        supersetExerciseId: null,
        completedAt: null,
        isWarmup: false,
      })
    );

    const updatedSession = { ...session, sets: [...session.sets, ...newSets] };
    const nextSession = {
      ...updatedSession,
      currentExerciseId: getPreferredCurrentExerciseId(
        updatedSession,
        session.currentExerciseId,
        workoutExerciseId
      ),
    };

    await saveActiveWorkoutSession(nextSession);
    set({ activeSession: nextSession, error: null });
  },
  addWarmupSet: async (workoutExerciseId, unit) => {
    const session = get().activeSession;
    if (!session) {
      return;
    }

    const exerciseSets = session.sets.filter(
      (setEntry) => setEntry.workoutExerciseId === workoutExerciseId
    );
    const workingSet = exerciseSets
      .filter((setEntry) => !setEntry.isWarmup)
      .sort((a, b) => a.setNumber - b.setNumber)[0];

    if (!workingSet) {
      return;
    }

    const warmupCount = exerciseSets.filter((setEntry) => setEntry.isWarmup).length;
    const step = WARMUP_RAMP[Math.min(warmupCount, WARMUP_RAMP.length - 1)];
    // Bodyweight and assisted lifts have no load to ramp, so keep their weight.
    const weightKg =
      workingSet.actualWeightKg > 0
        ? roundToPlateIncrementKg(workingSet.actualWeightKg * step.share, unit)
        : workingSet.actualWeightKg;

    const warmupSet: ActiveWorkoutSet = {
      ...workingSet,
      id: createId('active_set'),
      setNumber: warmupCount + 1,
      targetReps: step.reps,
      previousReps: null,
      targetWeightKg: weightKg,
      actualWeightKg: weightKg,
      actualReps: 0,
      completedAt: null,
      isWarmup: true,
    };

    const nextSession = { ...session, sets: [...session.sets, warmupSet] };

    await saveActiveWorkoutSession(nextSession);
    set({ activeSession: nextSession, error: null });
  },
  removeWarmupSet: async (setId) => {
    const session = get().activeSession;
    const removed = session?.sets.find((setEntry) => setEntry.id === setId);

    if (!session || !removed?.isWarmup) {
      return;
    }

    // Renumber the remaining warm-ups so they stay W1, W2, ...
    const warmupNumbers = new Map(
      session.sets
        .filter(
          (setEntry) =>
            setEntry.isWarmup &&
            setEntry.id !== setId &&
            setEntry.workoutExerciseId === removed.workoutExerciseId
        )
        .sort((a, b) => a.setNumber - b.setNumber)
        .map((setEntry, index) => [setEntry.id, index + 1])
    );
    const remainingSets = session.sets
      .filter((setEntry) => setEntry.id !== setId)
      .map((setEntry) => {
        const setNumber = warmupNumbers.get(setEntry.id);
        return setNumber === undefined || setNumber === setEntry.setNumber
          ? setEntry
          : { ...setEntry, setNumber };
      });

    const nextSession = { ...session, sets: remainingSets };

    await saveActiveWorkoutSession(nextSession);
    set({ activeSession: nextSession, error: null });
  },
  setActiveSessionExerciseNote: async (workoutExerciseId, note) => {
    const session = get().activeSession;
    if (!session) {
      return;
    }

    const trimmed = note.trim();
    const { [workoutExerciseId]: _previous, ...otherNotes } = session.exerciseNotes;
    const nextSession = {
      ...session,
      exerciseNotes: trimmed ? { ...otherNotes, [workoutExerciseId]: trimmed } : otherNotes,
    };

    await saveActiveWorkoutSession(nextSession);
    set({ activeSession: nextSession, error: null });
  },
  setActiveWorkoutBodyweight: async (bodyweightKg) => {
    const session = get().activeSession;
    if (!session) {
      return;
    }

    const normalizedBodyweight =
      bodyweightKg === null ? null : Number.isFinite(bodyweightKg) ? Math.max(0, bodyweightKg) : null;

    if (session.bodyweightKg === normalizedBodyweight) {
      return;
    }

    const nextSession = {
      ...session,
      bodyweightKg: normalizedBodyweight,
    };

    await saveActiveWorkoutSession(nextSession);
    set({ activeSession: nextSession, error: null });
  },
  pauseActiveWorkoutSession: async () => {
    const session = get().activeSession;
    if (!session || session.isPaused) {
      return;
    }

    const nextSession = {
      ...pauseSession(session, Date.now()),
      restoredFromAppClose: false,
    };

    await saveActiveWorkoutSession(nextSession);
    set({ activeSession: nextSession, error: null });
  },
  resumeActiveWorkoutSession: async () => {
    const session = get().activeSession;
    if (!session || !session.isPaused) {
      return;
    }

    const nextSession = resumeSession(session, Date.now());

    await saveActiveWorkoutSession(nextSession);
    set({ activeSession: nextSession, error: null });
  },
  decrementOrCompleteSessionSet: async (setId) => {
    const session = get().activeSession;
    if (!session) {
      return {
        shouldStartRest: false,
        restSet: null,
      };
    }

    let changed = false;
    let completedSet: ActiveWorkoutSet | null = null;
    let completedSupersetExerciseId: string | null = null;
    let decrementedExerciseId: string | null = null;
    let shouldStartRest = false;
    const completedAt = Date.now();
    const nextSets = session.sets.map((setEntry) => {
      if (setEntry.id !== setId) {
        return setEntry;
      }

      changed = true;

      if (setEntry.actualReps === 0) {
        const nextSet = {
          ...setEntry,
          actualReps: setEntry.targetReps,
          completedAt,
        };

        // Warm-ups lead straight into the next set: no rest, focus stays put.
        if (setEntry.isWarmup) {
          decrementedExerciseId = setEntry.workoutExerciseId;
          return nextSet;
        }

        completedSet = nextSet;
        completedSupersetExerciseId = setEntry.supersetExerciseId;
        shouldStartRest = true;
        return completedSet;
      }

      decrementedExerciseId = setEntry.workoutExerciseId;

      const nextReps = Math.max(0, setEntry.actualReps - 1);
      return {
        ...setEntry,
        actualReps: nextReps,
        completedAt: nextReps === 0 ? null : setEntry.completedAt,
      };
    });

    if (!changed) {
      return {
        shouldStartRest: false,
        restSet: null,
      };
    }

    const updatedSession = {
      ...session,
      sets: nextSets,
    };
    const nextSession = {
      ...updatedSession,
      currentExerciseId:
        completedSet && shouldStartRest
          ? getNextCurrentExerciseIdAfterCompletion(updatedSession, completedSet)
          : decrementedExerciseId ??
            updatedSession.currentExerciseId ??
            getFirstPendingExerciseId(updatedSession),
    };

    const shouldSkipRestForSuperset =
      completedSupersetExerciseId !== null &&
      nextSession.currentExerciseId === completedSupersetExerciseId;
    const nextRestTimer =
      completedSet && shouldStartRest && !shouldSkipRestForSuperset
        ? buildActiveRestTimer(nextSession, completedSet, completedAt)
        : nextSession.restTimer;
    const nextSessionWithRestTimer = {
      ...nextSession,
      restTimer: nextRestTimer,
    };
    const previousRestTimer = session.restTimer;

    set({ activeSession: nextSessionWithRestTimer, error: null });

    const notificationUpdate = (async () => {
      if (
        previousRestTimer?.notificationId &&
        previousRestTimer.notificationId !== nextRestTimer?.notificationId
      ) {
        await cancelScheduledNotification(previousRestTimer.notificationId);
      }

      if (
        nextRestTimer &&
        nextRestTimer.notificationId !== previousRestTimer?.notificationId
      ) {
        await scheduleRestCompleteNotification(nextRestTimer);
      }
    })().catch(() => undefined);

    try {
      await saveActiveWorkoutSession(nextSessionWithRestTimer);
      await notificationUpdate;
    } catch (error) {
      await notificationUpdate;

      if (
        nextRestTimer?.notificationId &&
        nextRestTimer.notificationId !== previousRestTimer?.notificationId
      ) {
        await cancelScheduledNotification(nextRestTimer.notificationId).catch(() => undefined);
      }

      set({ activeSession: session, error: errorMessage(error) });
      throw error;
    }

    return {
      shouldStartRest: shouldStartRest && !shouldSkipRestForSuperset,
      restSet: completedSet,
    };
  },
  setSessionSetCustomValues: async (setId, reps, weightKg, weightScope = "current") => {
    const session = get().activeSession;
    if (!session) {
      return;
    }

    const normalizedReps = Math.max(0, Math.floor(reps));
    const normalizedWeightKg = Number.isFinite(weightKg) ? weightKg : 0;

    const selectedSet = session.sets.find((setEntry) => setEntry.id === setId);

    if (!selectedSet) {
      return;
    }

    let changed = false;
    // Warm-ups and working sets ramp separately, so a scope never crosses between them.
    const isSameKind = (setEntry: ActiveWorkoutSet) =>
      setEntry.workoutExerciseId === selectedSet.workoutExerciseId &&
      setEntry.isWarmup === selectedSet.isWarmup;
    const shouldApplyWeight = (setEntry: ActiveWorkoutSet) => {
      if (weightScope === "all") {
        return isSameKind(setEntry);
      }

      if (weightScope === "remaining") {
        return isSameKind(setEntry) && setEntry.setNumber >= selectedSet.setNumber;
      }

      return setEntry.id === setId;
    };

    const nextSets = session.sets.map((setEntry) => {
      const isSelectedSet = setEntry.id === setId;
      const applyWeight = shouldApplyWeight(setEntry);

      if (!isSelectedSet && !applyWeight) {
        return setEntry;
      }

      const nextReps = isSelectedSet ? normalizedReps : setEntry.actualReps;
      const wasCompleted = setEntry.actualReps > 0;
      const nowCompleted = nextReps > 0;
      const nextSet = {
        ...setEntry,
        actualReps: nextReps,
        actualWeightKg: applyWeight ? normalizedWeightKg : setEntry.actualWeightKg,
        completedAt: isSelectedSet
          ? (nowCompleted ? (wasCompleted ? setEntry.completedAt : Date.now()) : null)
          : setEntry.completedAt,
      };

      if (
        nextSet.actualReps !== setEntry.actualReps ||
        nextSet.actualWeightKg !== setEntry.actualWeightKg
      ) {
        changed = true;
      }

      return nextSet;
    });

    if (!changed) {
      return;
    }

    const nextSession = {
      ...session,
      sets: nextSets,
    };

    await saveActiveWorkoutSession(nextSession);
    set({ activeSession: nextSession, error: null });
  },
  updateActiveSessionExerciseTargets: async (workoutExerciseId, sets, reps, exerciseName) => {
    const session = get().activeSession;
    if (!session) {
      return;
    }

    const normalizedSets = Math.max(1, Math.floor(sets));
    const normalizedReps = Math.max(1, Math.floor(reps));
    const selectedSets = session.sets
      .filter(
        (setEntry) => setEntry.workoutExerciseId === workoutExerciseId && !setEntry.isWarmup
      )
      .sort((a, b) => a.setNumber - b.setNumber);

    if (selectedSets.length === 0) {
      return;
    }

    const currentExerciseName = selectedSets[0]?.exerciseName ?? "";
    const normalizedExerciseName = exerciseName?.trim() || currentExerciseName;

    if (!normalizedExerciseName) {
      throw new Error("Exercise name is required.");
    }

    const completedSetCount = selectedSets.filter((setEntry) => setEntry.actualReps > 0).length;

    if (normalizedSets < completedSetCount) {
      throw new Error(
        `Sets cannot be lower than ${completedSetCount} because completed sets would be lost.`
      );
    }

    let changed = selectedSets.length !== normalizedSets;
    if (normalizedExerciseName !== currentExerciseName) {
      changed = true;
    }
    const templateSet = selectedSets[selectedSets.length - 1] ?? selectedSets[0];
    const nextExerciseSets = Array.from({ length: normalizedSets }, (_, index) => {
      const existingSet = selectedSets[index];

      if (!existingSet) {
        changed = true;

        return {
          ...templateSet,
          id: createId('active_set'),
          setNumber: index + 1,
          exerciseName: normalizedExerciseName,
          targetReps: normalizedReps,
          previousReps: null,
          actualWeightKg: templateSet.actualWeightKg,
          actualReps: 0,
          completedAt: null,
        };
      }

      if (
        existingSet.setNumber !== index + 1 ||
        existingSet.targetReps !== normalizedReps ||
        existingSet.exerciseName !== normalizedExerciseName
      ) {
        changed = true;
      }

      return {
        ...existingSet,
        setNumber: index + 1,
        exerciseName: normalizedExerciseName,
        targetReps: normalizedReps,
      };
    });

    if (!changed) {
      return;
    }

    const nextSession = {
      ...session,
      sets: [
        ...session.sets
          .filter(
            (setEntry) => setEntry.workoutExerciseId !== workoutExerciseId || setEntry.isWarmup
          )
          .map((setEntry) =>
            setEntry.workoutExerciseId === workoutExerciseId
              ? { ...setEntry, exerciseName: normalizedExerciseName }
              : setEntry
          ),
        ...nextExerciseSets,
      ],
    };
    const nextSessionWithCurrentExercise = {
      ...nextSession,
      currentExerciseId: getPreferredCurrentExerciseId(
        nextSession,
        workoutExerciseId,
        session.currentExerciseId
      ),
    };

    await saveActiveWorkoutSession(nextSessionWithCurrentExercise);
    set({ activeSession: nextSessionWithCurrentExercise, error: null });
  },
  finishActiveWorkoutSession: async () => {
    const session = get().activeSession;

    if (!session) {
      return null;
    }

    set({ mutating: true, error: null });

    try {
      const finishedAt = Date.now();

      if (session.restTimer?.notificationId) {
        await cancelScheduledNotification(session.restTimer.notificationId).catch(() => undefined);
      }

      const sessionId = await createWorkoutSession({
        workoutId: session.workoutId,
        performedAt: finishedAt,
        durationMs: getElapsedSessionMs(session, finishedAt),
        bodyweightKg: session.bodyweightKg,
        sets: session.sets
          // An untouched warm-up is just a suggestion; only keep the ones done.
          .filter((setEntry) => !setEntry.isWarmup || setEntry.actualReps > 0)
          .sort((a, b) => {
            // Completed sets first, ordered by completion time
            if (a.completedAt !== null && b.completedAt !== null) {
              return a.completedAt - b.completedAt;
            }
            if (a.completedAt !== null) return -1;
            if (b.completedAt !== null) return 1;
            // Incomplete sets keep template order
            return a.sortOrder - b.sortOrder || a.setNumber - b.setNumber;
          })
          .map((setEntry) => ({
            workoutExerciseId: setEntry.workoutExerciseId,
            exerciseName: setEntry.exerciseName,
            setNumber: setEntry.setNumber,
            reps: setEntry.actualReps,
            weightKg: setEntry.actualWeightKg,
            isWarmup: setEntry.isWarmup,
          })),
        exerciseNotes: Object.entries(session.exerciseNotes).flatMap(
          ([workoutExerciseId, note]) => {
            const exerciseName = session.sets.find(
              (setEntry) => setEntry.workoutExerciseId === workoutExerciseId
            )?.exerciseName;
            const trimmed = note.trim();

            return exerciseName && trimmed
              ? [{ workoutExerciseId, exerciseName, note: trimmed }]
              : [];
          }
        ),
      });

      const workouts = await listWorkouts();
      await clearActiveWorkoutSession();

      set({
        workouts,
        activeSession: null,
        error: null,
      });

      return { workoutId: session.workoutId, sessionId };
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    } finally {
      set({ mutating: false });
    }
  },
  discardActiveWorkoutSession: async () => {
    const session = get().activeSession;

    if (!session) {
      return;
    }

    try {
      if (session.restTimer?.notificationId) {
        await cancelScheduledNotification(session.restTimer.notificationId).catch(() => undefined);
      }

      await clearActiveWorkoutSession();
      set({ activeSession: null, error: null });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    }
  },
}));
