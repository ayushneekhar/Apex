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
  bootstrap: () => Promise<void>;
  clearError: () => void;
  refreshWorkouts: () => Promise<void>;
  exportBackup: () => Promise<string | null>;
  importBackup: () => Promise<boolean>;
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
  decrementOrCompleteSessionSet: (setId: string) => Promise<void>;
  setSessionSetCustomReps: (setId: string, reps: number) => Promise<void>;
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

function buildSessionSets(workout: Workout): ActiveWorkoutSet[] {
  return workout.exercises.flatMap((exercise) => {
    const targetWeightKg = getTargetWeightKg(workout, exercise);

    return Array.from({ length: exercise.sets }, (_, index) => ({
      id: createId('active_set'),
      workoutExerciseId: exercise.id,
      exerciseName: exercise.name,
      setNumber: index + 1,
      targetReps: exercise.reps,
      targetWeightKg,
      restSeconds: exercise.restSeconds,
      actualReps: 0,
    }));
  });
}

function elapsedPauseMs(session: ActiveWorkoutSession, now: number): number {
  if (!session.isPaused || session.pauseStartedAt === null) {
    return 0;
  }

  return Math.max(0, now - session.pauseStartedAt);
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
      bodyweightKg: null,
      totalPausedMs: 0,
      pauseStartedAt: null,
      isPaused: false,
      restoredFromAppClose: false,
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
      return;
    }

    let changed = false;
    const nextSets = session.sets.map((setEntry) => {
      if (setEntry.id !== setId) {
        return setEntry;
      }

      changed = true;

      if (setEntry.actualReps === 0) {
        return {
          ...setEntry,
          actualReps: setEntry.targetReps,
        };
      }

      return {
        ...setEntry,
        actualReps: Math.max(0, setEntry.actualReps - 1),
      };
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
  setSessionSetCustomReps: async (setId, reps) => {
    const session = get().activeSession;
    if (!session) {
      return;
    }

    const normalizedReps = Math.max(0, Math.floor(reps));

    let changed = false;
    const nextSets = session.sets.map((setEntry) => {
      if (setEntry.id !== setId) {
        return setEntry;
      }

      changed = true;
      return {
        ...setEntry,
        actualReps: normalizedReps,
      };
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
  finishActiveWorkoutSession: async () => {
    const session = get().activeSession;

    if (!session) {
      return;
    }

    set({ mutating: true, error: null });

    try {
      await createWorkoutSession({
        workoutId: session.workoutId,
        performedAt: Date.now(),
        bodyweightKg: session.bodyweightKg,
        sets: session.sets.map((setEntry) => ({
          workoutExerciseId: setEntry.workoutExerciseId,
          exerciseName: setEntry.exerciseName,
          setNumber: setEntry.setNumber,
          reps: setEntry.actualReps,
          weightKg: setEntry.targetWeightKg,
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
