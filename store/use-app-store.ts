import { create } from 'zustand';

import type { ThemeId } from '@/constants/app-themes';
import {
  DEFAULT_SETTINGS,
  advanceWorkoutWeek,
  clearActiveWorkoutSession,
  createWorkout,
  createWorkoutSession,
  deleteWorkout,
  exportDatabaseBackup,
  importDatabaseBackupBytes,
  importDatabaseBackup,
  initializeDatabase,
  listWorkouts,
  loadActiveWorkoutSession,
  loadSettings,
  saveActiveWorkoutSession,
  saveThemeSetting,
  saveWeightUnitSetting,
  updateWorkout,
  updateWorkoutSession,
} from '@/lib/database';
import { createId } from '@/lib/id';
import type { NitroOtaUpdateCheck } from '@/lib/nitro-ota';
import type { WeightUnit } from '@/lib/weight';
import type {
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
  removeWorkout: (workoutId: string) => Promise<void>;
  startWorkoutSession: (workoutId: string) => Promise<void>;
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
    reps: number
  ) => Promise<void>;
  finishActiveWorkoutSession: () => Promise<void>;
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

function getExerciseCompletionCount(session: ActiveWorkoutSession, workoutExerciseId: string): number {
  return session.sets.filter(
    (setEntry) =>
      setEntry.workoutExerciseId === workoutExerciseId && setEntry.actualReps > 0
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
        setEntry.workoutExerciseId === exerciseId && setEntry.actualReps === 0
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
        setEntry.workoutExerciseId === workoutExerciseId && setEntry.actualReps === 0
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
        setEntry.actualReps === 0
    );

    if (supersetHasPendingSet && completedCount > supersetCompletedCount) {
      return supersetExerciseId;
    }
  }

  // Stay on the exercise the user just interacted with if it still has pending sets
  const exerciseStillPending = session.sets.some(
    (setEntry) =>
      setEntry.workoutExerciseId === completedSet.workoutExerciseId &&
      setEntry.actualReps === 0
  );

  if (exerciseStillPending) {
    return completedSet.workoutExerciseId;
  }

  return getFirstPendingExerciseId(session);
}

function buildSessionSets(workout: Workout): ActiveWorkoutSet[] {
  const mostRecentSession = getMostRecentWorkoutSession(workout);
  const lastSessionWeightByExerciseSet = new Map<string, number>();
  const lastSessionWeightByExerciseNameSet = new Map<string, number>();

  mostRecentSession?.sets.forEach((setEntry) => {
    if (!Number.isFinite(setEntry.weightKg)) {
      return;
    }

    lastSessionWeightByExerciseSet.set(
      getSessionSetIdLookupKey(setEntry.workoutExerciseId, setEntry.setNumber),
      setEntry.weightKg
    );
    lastSessionWeightByExerciseNameSet.set(
      getSessionSetNameLookupKey(setEntry.exerciseName, setEntry.setNumber),
      setEntry.weightKg
    );
  });

  return workout.exercises.flatMap((exercise) => {
    const targetWeightKg = getTargetWeightKg(workout, exercise);

    return Array.from({ length: exercise.sets }, (_, index) => {
      const setNumber = index + 1;
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
        targetWeightKg,
        actualWeightKg,
        restSeconds: exercise.restSeconds,
        actualReps: 0,
        supersetExerciseId: exercise.supersetExerciseId,
        completedAt: null,
      };
    });
  });
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
  removeWorkout: async (workoutId) => {
    set({ mutating: true, error: null });

    try {
      await deleteWorkout(workoutId);

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
  startWorkoutSession: async (workoutId) => {
    const existingSession = get().activeSession;

    if (existingSession && existingSession.workoutId !== workoutId) {
      throw new Error('Finish or discard the current active workout first.');
    }

    if (existingSession && existingSession.workoutId === workoutId) {
      return;
    }

    const workout = get().workouts.find((item) => item.id === workoutId);
    if (!workout) {
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
      sets: buildSessionSets(workout),
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
    const nextSets = session.sets.map((setEntry) => {
      if (setEntry.id !== setId) {
        return setEntry;
      }

      changed = true;

      if (setEntry.actualReps === 0) {
        completedSet = {
          ...setEntry,
          actualReps: setEntry.targetReps,
          completedAt: Date.now(),
        };
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

    await saveActiveWorkoutSession(nextSession);
    set({ activeSession: nextSession, error: null });

    const shouldSkipRestForSuperset =
      completedSupersetExerciseId !== null &&
      nextSession.currentExerciseId === completedSupersetExerciseId;

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
    const shouldApplyWeight = (setEntry: ActiveWorkoutSet) => {
      if (weightScope === "all") {
        return setEntry.workoutExerciseId === selectedSet.workoutExerciseId;
      }

      if (weightScope === "remaining") {
        return (
          setEntry.workoutExerciseId === selectedSet.workoutExerciseId &&
          setEntry.setNumber >= selectedSet.setNumber
        );
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
  updateActiveSessionExerciseTargets: async (workoutExerciseId, sets, reps) => {
    const session = get().activeSession;
    if (!session) {
      return;
    }

    const normalizedSets = Math.max(1, Math.floor(sets));
    const normalizedReps = Math.max(1, Math.floor(reps));
    const selectedSets = session.sets
      .filter((setEntry) => setEntry.workoutExerciseId === workoutExerciseId)
      .sort((a, b) => a.setNumber - b.setNumber);

    if (selectedSets.length === 0) {
      return;
    }

    const completedSetCount = selectedSets.filter((setEntry) => setEntry.actualReps > 0).length;

    if (normalizedSets < completedSetCount) {
      throw new Error(
        `Sets cannot be lower than ${completedSetCount} because completed sets would be lost.`
      );
    }

    let changed = selectedSets.length !== normalizedSets;
    const templateSet = selectedSets[selectedSets.length - 1] ?? selectedSets[0];
    const nextExerciseSets = Array.from({ length: normalizedSets }, (_, index) => {
      const existingSet = selectedSets[index];

      if (!existingSet) {
        changed = true;

        return {
          ...templateSet,
          id: createId('active_set'),
          setNumber: index + 1,
          targetReps: normalizedReps,
          actualWeightKg: templateSet.actualWeightKg,
          actualReps: 0,
          completedAt: null,
        };
      }

      if (existingSet.setNumber !== index + 1 || existingSet.targetReps !== normalizedReps) {
        changed = true;
      }

      return {
        ...existingSet,
        setNumber: index + 1,
        targetReps: normalizedReps,
      };
    });

    if (!changed) {
      return;
    }

    const nextSession = {
      ...session,
      sets: [
        ...session.sets.filter((setEntry) => setEntry.workoutExerciseId !== workoutExerciseId),
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
      return;
    }

    set({ mutating: true, error: null });

    try {
      const finishedAt = Date.now();

      await createWorkoutSession({
        workoutId: session.workoutId,
        performedAt: finishedAt,
        durationMs: getElapsedSessionMs(session, finishedAt),
        bodyweightKg: session.bodyweightKg,
        sets: session.sets
          .slice()
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
          })),
      });

      const workouts = await listWorkouts();
      await clearActiveWorkoutSession();

      set({
        workouts,
        activeSession: null,
        error: null,
      });
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
      await clearActiveWorkoutSession();
      set({ activeSession: null, error: null });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    }
  },
}));
