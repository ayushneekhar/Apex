import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonGridBackground } from "@/components/ui/neon-grid-background";
import { NeonInput } from "@/components/ui/neon-input";
import { OverloadButton } from "@/components/ui/overload-button";
import { designTokens } from "@/constants/design-system";
import { EXERCISE_LIBRARY } from "@/constants/exercise-library";
import {
  DEFAULT_REST_SECONDS,
  MAX_REST_SECONDS,
  MIN_REST_SECONDS,
  REST_TIMER_STEP_SECONDS,
} from "@/constants/workout";
import { useAppTheme } from "@/hooks/use-app-theme";
import { triggerSelectionHaptic, triggerSuccessHaptic } from "@/lib/haptics";
import { createId } from "@/lib/id";
import {
  cancelScheduledNotification,
  scheduleRestCompleteNotification,
} from "@/lib/rest-notifications";
import {
  getSpotifyNowPlaying,
  isSpotifyConfigured,
  isSpotifyConnected,
  SpotifyRateLimitError,
  type SpotifyNowPlaying,
} from "@/lib/spotify";
import {
  formatWeightFromKg,
  formatWeightInputFromKg,
  getDefaultWeeklyIncrementKg,
  isAssistedWeightKg,
  parseWeightInputToKg,
} from "@/lib/weight";
import { useAppStore } from "@/store/use-app-store";
import type {
  ActiveWorkoutSession,
  ActiveWorkoutSet,
  NewWorkoutExerciseInput,
  Workout,
} from "@/types/workout";
import { styles } from "./WorkoutsScreen.styles";

type ExerciseDraft = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  restSeconds: string;
  startWeight: string;
  overload: string;
};

type ActiveSetGroup = {
  exerciseName: string;
  targetWeightKg: number;
  restSeconds: number;
  sets: ActiveWorkoutSet[];
};

type ActiveRestTimer = {
  setId: string;
  exerciseName: string;
  startedAt: number;
  endsAt: number;
  durationMs: number;
};

type CustomSetEditMode = "reps" | "weight";

function createExerciseDraft(name: string): ExerciseDraft {
  return {
    id: createId("draft"),
    name,
    sets: "3",
    reps: "10",
    restSeconds: String(DEFAULT_REST_SECONDS),
    startWeight: "0",
    overload: "",
  };
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function getElapsedMs(session: ActiveWorkoutSession, now: number): number {
  const pausedDelta =
    session.isPaused && session.pauseStartedAt !== null
      ? now - session.pauseStartedAt
      : 0;
  return Math.max(
    0,
    now - session.startedAt - session.totalPausedMs - pausedDelta
  );
}

function estimateWorkoutMinutes(workout: Workout): number {
  const setCount = workout.exercises.reduce(
    (total, exercise) => total + exercise.sets,
    0
  );
  return Math.max(20, Math.round(setCount * 2.3));
}

function groupActiveSetsByExercise(sets: ActiveWorkoutSet[]): ActiveSetGroup[] {
  const groups = new Map<string, ActiveSetGroup>();
  const order: string[] = [];

  sets.forEach((setEntry) => {
    const existing = groups.get(setEntry.exerciseName);

    if (existing) {
      existing.sets.push(setEntry);
      return;
    }

    groups.set(setEntry.exerciseName, {
      exerciseName: setEntry.exerciseName,
      targetWeightKg: setEntry.targetWeightKg,
      restSeconds: setEntry.restSeconds,
      sets: [setEntry],
    });
    order.push(setEntry.exerciseName);
  });

  return order.map((exerciseName) => {
    const group = groups.get(exerciseName);

    return {
      exerciseName,
      targetWeightKg: group?.targetWeightKg ?? 0,
      restSeconds: group?.restSeconds ?? DEFAULT_REST_SECONDS,
      sets: [...(group?.sets ?? [])].sort((a, b) => a.setNumber - b.setNumber),
    };
  });
}

function clampRestSeconds(seconds: number): number {
  return Math.min(
    MAX_REST_SECONDS,
    Math.max(MIN_REST_SECONDS, Math.floor(seconds))
  );
}

function parseRestSecondsInput(value: string): number | null {
  const parsed = Number.parseInt(value.trim(), 10);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

const WEIGHT_KEYBOARD_TYPE: KeyboardTypeOptions =
  Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric";
const SPOTIFY_POLL_INTERVAL_MS = 8000;
const SPOTIFY_RETRY_INTERVAL_MS = 15000;
const SESSION_HEADER_COMPACT_AFTER_MS = 3000;

export default function WorkoutsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { layout, opacity, sizes, spacing } = designTokens;

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

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [workoutName, setWorkoutName] = useState("");
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [exerciseDrafts, setExerciseDrafts] = useState<ExerciseDraft[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [sessionActionError, setSessionActionError] = useState<string | null>(
    null
  );
  const [bodyweightInput, setBodyweightInput] = useState("");
  const [bodyweightError, setBodyweightError] = useState<string | null>(null);

  const [isSessionScreenOpen, setIsSessionScreenOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [activeRestTimer, setActiveRestTimer] =
    useState<ActiveRestTimer | null>(null);
  const [restNotificationId, setRestNotificationId] = useState<string | null>(
    null
  );
  const restScheduleTokenRef = useRef(0);
  const didLongPressSetBoxRef = useRef(false);

  const [customSetId, setCustomSetId] = useState<string | null>(null);
  const [customSetEditMode, setCustomSetEditMode] =
    useState<CustomSetEditMode>("reps");
  const [customSetRepsInput, setCustomSetRepsInput] = useState("");
  const [customSetWeightInput, setCustomSetWeightInput] = useState("");
  const [customSetError, setCustomSetError] = useState<string | null>(null);
  const [isDiscardSessionModalOpen, setIsDiscardSessionModalOpen] =
    useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyNowPlaying, setSpotifyNowPlaying] =
    useState<SpotifyNowPlaying | null>(null);
  const [spotifyProgressSyncedAtMs, setSpotifyProgressSyncedAtMs] = useState<
    number | null
  >(null);
  const activeWorkoutId = activeSession?.workoutId ?? null;
  const activeBodyweightKg = activeSession?.bodyweightKg ?? null;
  const spotifyConfigured = isSpotifyConfigured();
  const sessionHeaderCompactProgress = useSharedValue(0);

  const selectedExercises = useMemo(() => {
    return new Set(exerciseDrafts.map((draft) => draft.name.toLowerCase()));
  }, [exerciseDrafts]);

  const sessionDateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const groupedActiveSets = useMemo(
    () => groupActiveSetsByExercise(activeSession?.sets ?? []),
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
  const customSetEntry = useMemo(
    () =>
      activeSession?.sets.find((setEntry) => setEntry.id === customSetId) ??
      null,
    [activeSession?.sets, customSetId]
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
      transform: [
        {
          translateY: -8 * compactProgress,
        },
      ],
    };
  });

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
      closeCustomRepsModal();
      setIsDiscardSessionModalOpen(false);
    }
  }, [activeSession]);

  useEffect(() => {
    if (activeSession) {
      return;
    }

    setActiveRestTimer(null);

    if (restNotificationId) {
      void cancelScheduledNotification(restNotificationId);
      setRestNotificationId(null);
    }
  }, [activeSession, restNotificationId]);

  useEffect(() => {
    if (!isSessionScreenOpen || !activeWorkoutId) {
      setSpotifyConnected(false);
      setSpotifyNowPlaying(null);
      setSpotifyProgressSyncedAtMs(null);
      return;
    }

    if (!spotifyConfigured) {
      setSpotifyConnected(false);
      setSpotifyNowPlaying(null);
      setSpotifyProgressSyncedAtMs(null);
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextPoll = (delayMs: number) => {
      timeoutId = setTimeout(() => {
        void pollSpotify();
      }, delayMs);
    };

    const pollSpotify = async () => {
      try {
        const connected = await isSpotifyConnected();

        if (cancelled) {
          return;
        }

        setSpotifyConnected(connected);

        if (!connected) {
          setSpotifyNowPlaying(null);
          setSpotifyProgressSyncedAtMs(null);
          scheduleNextPoll(SPOTIFY_RETRY_INTERVAL_MS);
          return;
        }

        const playback = await getSpotifyNowPlaying();

        if (cancelled) {
          return;
        }

        setSpotifyNowPlaying(playback);
        setSpotifyProgressSyncedAtMs(playback ? Date.now() : null);
        scheduleNextPoll(SPOTIFY_POLL_INTERVAL_MS);
      } catch (spotifyError) {
        if (cancelled) {
          return;
        }

        if (spotifyError instanceof SpotifyRateLimitError) {
          setSpotifyNowPlaying(null);
          setSpotifyProgressSyncedAtMs(null);
          scheduleNextPoll(
            Math.max(spotifyError.retryAfterMs, SPOTIFY_RETRY_INTERVAL_MS)
          );
          return;
        }

        setSpotifyNowPlaying(null);
        setSpotifyProgressSyncedAtMs(null);
        scheduleNextPoll(SPOTIFY_RETRY_INTERVAL_MS);
      }
    };

    void pollSpotify();

    return () => {
      cancelled = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [activeWorkoutId, isSessionScreenOpen, spotifyConfigured]);

  useEffect(() => {
    if (!activeRestTimer || restRemainingMs > 0 || !restNotificationId) {
      return;
    }

    void cancelScheduledNotification(restNotificationId);
    setRestNotificationId(null);
  }, [activeRestTimer, restRemainingMs, restNotificationId]);

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

    setBodyweightInput(
      formatWeightInputFromKg(activeBodyweightKg, settings.weightUnit)
    );
  }, [activeBodyweightKg, activeWorkoutId, settings.weightUnit]);

  const openComposer = () => {
    setIsComposerOpen(true);
    setWorkoutName("");
    setEditingWorkoutId(null);
    setCustomExerciseName("");
    setExerciseDrafts([]);
    setFormError(null);
    clearError();
  };

  const openComposerForEdit = (workout: Workout) => {
    setWorkoutName(workout.name);
    setEditingWorkoutId(workout.id);
    setExerciseDrafts(
      [...workout.exercises]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((exercise) => ({
          id: createId("draft"),
          name: exercise.name,
          sets: String(exercise.sets),
          reps: String(exercise.reps),
          restSeconds: String(exercise.restSeconds),
          startWeight: formatWeightInputFromKg(
            exercise.startWeightKg,
            settings.weightUnit
          ),
          overload: formatWeightInputFromKg(
            exercise.overloadIncrementKg,
            settings.weightUnit
          ),
        }))
    );
    setCustomExerciseName("");
    setIsComposerOpen(true);
    setFormError(null);
    clearError();
  };

  const closeComposer = () => {
    setIsComposerOpen(false);
    setWorkoutName("");
    setEditingWorkoutId(null);
    setCustomExerciseName("");
    setExerciseDrafts([]);
    setFormError(null);
  };

  const addExerciseToDraft = (name: string) => {
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
  };

  const addCustomExercise = () => {
    addExerciseToDraft(customExerciseName);
    setCustomExerciseName("");
  };

  const removeExerciseDraft = (id: string) => {
    setExerciseDrafts((current) => current.filter((item) => item.id !== id));
  };

  const updateExerciseDraft = (id: string, patch: Partial<ExerciseDraft>) => {
    setExerciseDrafts((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }

        return {
          ...item,
          ...patch,
        };
      })
    );
  };

  const adjustDraftRestSeconds = (id: string, delta: number) => {
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
  };

  const submitWorkout = async () => {
    const trimmedWorkoutName = workoutName.trim();

    if (!trimmedWorkoutName) {
      setFormError("Give this workout a name before saving.");
      return;
    }

    if (exerciseDrafts.length === 0) {
      setFormError("Add at least one exercise.");
      return;
    }

    const parsedExercises: NewWorkoutExerciseInput[] = [];

    for (const draft of exerciseDrafts) {
      const sets = Number.parseInt(draft.sets, 10);
      const reps = Number.parseInt(draft.reps, 10);
      const restSecondsInput = parseRestSecondsInput(draft.restSeconds);
      const startWeightKg = parseWeightInputToKg(
        draft.startWeight,
        settings.weightUnit
      );

      if (!Number.isFinite(sets) || sets < 1) {
        setFormError(`Sets for ${draft.name} must be 1 or greater.`);
        return;
      }

      if (!Number.isFinite(reps) || reps < 1) {
        setFormError(`Reps for ${draft.name} must be 1 or greater.`);
        return;
      }

      if (
        restSecondsInput === null ||
        restSecondsInput < MIN_REST_SECONDS ||
        restSecondsInput > MAX_REST_SECONDS
      ) {
        setFormError(
          `Rest timer for ${draft.name} must be between ${MIN_REST_SECONDS} and ${MAX_REST_SECONDS} seconds.`
        );
        return;
      }

      if (startWeightKg === null) {
        setFormError(`Starting weight for ${draft.name} is invalid.`);
        return;
      }

      const overloadValue = draft.overload.trim();
      const overloadKg = overloadValue
        ? parseWeightInputToKg(overloadValue, settings.weightUnit)
        : getDefaultWeeklyIncrementKg(settings.weightUnit);

      if (overloadKg === null || overloadKg <= 0) {
        setFormError(
          `Progressive overload for ${draft.name} must be above zero.`
        );
        return;
      }

      parsedExercises.push({
        name: draft.name,
        sets,
        reps,
        restSeconds: restSecondsInput,
        startWeightKg,
        overloadIncrementKg: overloadKg,
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
    } catch {
      setFormError("Could not save this workout template. Try again.");
    }
  };

  const saveSessionBodyweight = async () => {
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

    const parsed = parseWeightInputToKg(trimmed, settings.weightUnit);
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
  };

  const openSpotifyTrack = async (trackUrl: string) => {
    try {
      await Linking.openURL(trackUrl);
    } catch {}
  };

  const beginWorkout = async (workoutId: string) => {
    setSessionActionError(null);
    setFormError(null);
    clearError();

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
  };

  const openCustomSetModal = (
    setEntry: ActiveWorkoutSet,
    mode: CustomSetEditMode
  ) => {
    setCustomSetId(setEntry.id);
    setCustomSetEditMode(mode);
    setCustomSetRepsInput(String(setEntry.actualReps));
    setCustomSetWeightInput(
      formatWeightInputFromKg(setEntry.actualWeightKg, settings.weightUnit)
    );
    setCustomSetError(null);
  };

  function closeCustomRepsModal() {
    setCustomSetId(null);
    setCustomSetEditMode("reps");
    setCustomSetRepsInput("");
    setCustomSetWeightInput("");
    setCustomSetError(null);
  }

  const saveCustomSetValues = async () => {
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
        settings.weightUnit
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
      closeCustomRepsModal();
    } catch {
      setCustomSetError("Could not save set values. Try again.");
    }
  };

  const clearRestTimer = async () => {
    restScheduleTokenRef.current += 1;

    const notificationToCancel = restNotificationId;
    setActiveRestTimer(null);
    setRestNotificationId(null);

    if (notificationToCancel) {
      await cancelScheduledNotification(notificationToCancel);
    }
  };

  const startRestTimer = async (setEntry: ActiveWorkoutSet) => {
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
  };

  const handleSetPress = async (setEntry: ActiveWorkoutSet) => {
    const shouldStartRest = setEntry.actualReps === 0;

    try {
      await decrementOrCompleteSessionSet(setEntry.id);
      setSessionActionError(null);
      if (shouldStartRest) {
        triggerSuccessHaptic();
      } else {
        triggerSelectionHaptic();
      }

      if (shouldStartRest) {
        await startRestTimer(setEntry);
        return;
      }

      if (activeRestTimer?.setId === setEntry.id) {
        await clearRestTimer();
      }
    } catch {
      setSessionActionError("Could not update this set right now.");
    }
  };

  const handleSetWeightPress = (setEntry: ActiveWorkoutSet) => {
    triggerSelectionHaptic();
    openCustomSetModal(setEntry, "weight");
  };

  const handleSetLongPress = (setEntry: ActiveWorkoutSet) => {
    triggerSelectionHaptic();
    openCustomSetModal(setEntry, "reps");
  };

  const openDiscardSessionModal = () => {
    setSessionActionError(null);
    setIsDiscardSessionModalOpen(true);
  };

  const closeDiscardSessionModal = () => {
    setIsDiscardSessionModalOpen(false);
  };

  const handleDiscardSession = async () => {
    try {
      await clearRestTimer();
      await discardActiveWorkoutSession();
      setIsSessionScreenOpen(false);
      setIsDiscardSessionModalOpen(false);
    } catch {
      setSessionActionError("Could not discard the current session.");
    }
  };

  const handleFinishSession = async () => {
    try {
      await clearRestTimer();
      await finishActiveWorkoutSession();
      setIsSessionScreenOpen(false);
    } catch {
      setSessionActionError("Could not save this workout session.");
    }
  };

  const compactHero = workouts.length > 0 && !isComposerOpen;
  const moveTrackerCardToBottom = workouts.length > 1;
  const defaultOverload = formatWeightFromKg(
    getDefaultWeeklyIncrementKg(settings.weightUnit),
    settings.weightUnit
  );
  const spotifyLiveProgressMs = useMemo(() => {
    if (!spotifyNowPlaying) {
      return 0;
    }

    const baseProgressMs = Math.max(0, spotifyNowPlaying.progressMs);

    if (!spotifyNowPlaying.isPlaying || spotifyProgressSyncedAtMs === null) {
      if (spotifyNowPlaying.durationMs > 0) {
        return Math.min(baseProgressMs, spotifyNowPlaying.durationMs);
      }

      return baseProgressMs;
    }

    const elapsedSinceSyncMs = Math.max(0, now - spotifyProgressSyncedAtMs);
    const progressedMs = baseProgressMs + elapsedSinceSyncMs;

    if (spotifyNowPlaying.durationMs > 0) {
      return Math.min(progressedMs, spotifyNowPlaying.durationMs);
    }

    return progressedMs;
  }, [now, spotifyNowPlaying, spotifyProgressSyncedAtMs]);

  const spotifyProgressLabel =
    spotifyNowPlaying && spotifyNowPlaying.durationMs > 0
      ? `${formatDuration(spotifyLiveProgressMs)} / ${formatDuration(
          spotifyNowPlaying.durationMs
        )}`
      : null;
  const showSpotifyCard = spotifyConnected && spotifyNowPlaying !== null;
  const renderTrackerCard = () => (
    <View
      style={[
        compactHero ? styles.heroCompact : styles.heroCard,
        {
          borderColor: theme.palette.border,
          backgroundColor: theme.palette.panel,
        },
      ]}
    >
      {compactHero ? (
        <>
          <View style={styles.compactHeroTextWrap}>
            <AppText variant="label" tone="accent">
              WORKOUT TRACKER
            </AppText>
            <AppText variant="heading">Workouts ready</AppText>
          </View>
          {!isComposerOpen ? (
            <NeonButton
              title="Add workout"
              variant="ghost"
              onPress={openComposer}
            />
          ) : (
            <NeonButton
              title="Close builder"
              variant="ghost"
              onPress={closeComposer}
            />
          )}
        </>
      ) : (
        <>
          <AppText variant="micro" tone="accent">
            WORKOUT TRACKER
          </AppText>
          <AppText variant="display">Plan. Lift. Progress.</AppText>
          <AppText tone="muted">
            Create workouts, then start a focused session with live timer and
            set tracking. Default overload is {defaultOverload}.
          </AppText>

          {!isComposerOpen ? (
            <NeonButton title="Add workout" onPress={openComposer} />
          ) : (
            <NeonButton
              title="Close builder"
              variant="ghost"
              onPress={closeComposer}
            />
          )}
        </>
      )}
    </View>
  );

  const sessionScreen =
    isSessionScreenOpen && activeSession ? (
      <Animated.View
        entering={SlideInRight.duration(280).easing(Easing.out(Easing.cubic))}
        exiting={SlideOutRight.duration(220).easing(Easing.in(Easing.cubic))}
        style={[
          styles.sessionScreenOverlay,
          {
            backgroundColor: theme.palette.background,
          },
        ]}
      >
        <NeonGridBackground />

        <ScrollView
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + layout.screenTopInset,
              paddingBottom: insets.bottom + layout.screenBottomInset,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.sessionHeader,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
              sessionHeaderAnimatedStyle,
            ]}
          >
            <Pressable
              onPress={() => {
                setIsSessionScreenOpen(false);
              }}
              style={({ pressed }) => [
                styles.backButton,
                { opacity: pressed ? opacity.pressedSoft : 1 },
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={sizes.iconSmall}
                color={theme.palette.textPrimary}
              />
              <AppText variant="label">Workouts</AppText>
            </Pressable>
            <Animated.View
              pointerEvents={shouldCompactSessionHeader ? "none" : "auto"}
              style={[
                styles.sessionHeaderDetails,
                sessionHeaderDetailsAnimatedStyle,
              ]}
            >
              <AppText variant="heading">{activeSession.workoutName}</AppText>
              <AppText tone="muted">
                Tap top of a set to mark complete or decrement reps. Press and
                hold the set to edit reps. Tap bottom strip to edit weight.
              </AppText>
            </Animated.View>
          </Animated.View>

          <View
            style={[
              styles.timerCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="micro" tone="muted">
              Session Time
            </AppText>
            <View style={styles.timerValueRow}>
              <AppText variant="display">{formatDuration(sessionElapsed)}</AppText>
              <Pressable
                onPress={() => {
                  if (activeSession.isPaused) {
                    void resumeActiveWorkoutSession();
                    return;
                  }

                  void pauseActiveWorkoutSession();
                }}
                style={({ pressed }) => [
                  styles.timerControlButton,
                  {
                    borderColor: activeSession.isPaused
                      ? theme.palette.accent
                      : theme.palette.border,
                    backgroundColor: activeSession.isPaused
                      ? `${theme.palette.accent}24`
                      : theme.palette.panelSoft,
                    opacity: pressed ? opacity.pressedSoft : 1,
                  },
                ]}
              >
                <Ionicons
                  name={activeSession.isPaused ? "play" : "pause"}
                  size={sizes.iconLarge}
                  color={
                    activeSession.isPaused
                      ? theme.palette.accent
                      : theme.palette.textPrimary
                  }
                />
              </Pressable>
            </View>

            {showSpotifyCard ? (
              <Animated.View
                entering={FadeIn.duration(220).easing(Easing.linear)}
                exiting={FadeOut.duration(160).easing(Easing.linear)}
              >
                <Pressable
                  onPress={() => {
                    const trackUrl = spotifyNowPlaying?.trackUrl;

                    if (!trackUrl) {
                      return;
                    }

                    void openSpotifyTrack(trackUrl);
                  }}
                  style={({ pressed }) => [
                    styles.spotifyCard,
                    {
                      borderColor: theme.palette.accent,
                      backgroundColor: theme.palette.panelSoft,
                      opacity: pressed ? opacity.pressedSoft : 1,
                    },
                  ]}
                >
                  <View style={styles.spotifyTrackRow}>
                    {spotifyNowPlaying.albumArtUrl ? (
                      <Image
                        source={{ uri: spotifyNowPlaying.albumArtUrl }}
                        contentFit="cover"
                        style={styles.spotifyArtwork}
                      />
                    ) : (
                      <View
                        style={[
                          styles.spotifyArtworkFallback,
                          {
                            borderColor: theme.palette.border,
                            backgroundColor: theme.palette.background,
                          },
                        ]}
                      >
                        <Ionicons
                          name="musical-notes"
                          size={sizes.iconSmall}
                          color={theme.palette.textMuted}
                        />
                      </View>
                    )}
                    <View style={styles.spotifyTrackText}>
                      <AppText variant="label">{spotifyNowPlaying.songName}</AppText>
                      <AppText variant="micro" tone="muted">
                        {spotifyNowPlaying.artistNames}
                      </AppText>
                      <AppText variant="micro" tone="muted">
                        {spotifyNowPlaying.albumName}
                      </AppText>
                      {spotifyProgressLabel ? (
                        <AppText
                          variant="micro"
                          tone={spotifyNowPlaying.isPlaying ? "accent" : "muted"}
                        >
                          {spotifyNowPlaying.isPlaying ? "Playing" : "Paused"} •{" "}
                          {spotifyProgressLabel}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            ) : null}

            {activeRestTimer ? (
              <View
                style={[
                  styles.restTimerCard,
                  {
                    borderColor: restIsComplete
                      ? theme.palette.success
                      : theme.palette.accent,
                    backgroundColor: theme.palette.panelSoft,
                  },
                ]}
              >
                <View style={styles.restTimerHeaderRow}>
                  <AppText variant="micro" tone="muted">
                    Rest Timer
                  </AppText>
                  <AppText
                    variant="label"
                    tone={restIsComplete ? "success" : "accent"}
                  >
                    {restIsComplete ? "Ready" : formatDuration(restRemainingMs)}
                  </AppText>
                </View>
                <AppText tone="muted">
                  {restIsComplete
                    ? `${activeRestTimer.exerciseName}: go crush the next set.`
                    : `${activeRestTimer.exerciseName}: recover now.`}
                </AppText>
                <View
                  style={[
                    styles.restProgressTrack,
                    {
                      borderColor: theme.palette.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.restProgressFill,
                      {
                        backgroundColor: restIsComplete
                          ? theme.palette.success
                          : theme.palette.accent,
                        width: `${Math.round(restProgress * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.sessionStatsRow}>
              <View style={styles.sessionStatCell}>
                <AppText
                  variant="micro"
                  tone="muted"
                  style={styles.sessionStatLabel}
                >
                  Completed
                </AppText>
                <AppText variant="heading">{completedSetCount}</AppText>
              </View>
              <View style={styles.sessionStatCell}>
                <AppText
                  variant="micro"
                  tone="muted"
                  style={styles.sessionStatLabel}
                >
                  Total Lifted
                </AppText>
                <AppText variant="heading">
                  {formatWeightFromKg(totalSessionVolumeKg, settings.weightUnit)}
                </AppText>
              </View>
              <View style={styles.sessionStatCell}>
                <AppText
                  variant="micro"
                  tone="muted"
                  style={styles.sessionStatLabel}
                >
                  Remaining
                </AppText>
                <AppText variant="heading">
                  {Math.max(0, activeSession.sets.length - completedSetCount)}
                </AppText>
              </View>
            </View>

            <View style={styles.bodyweightRow}>
              <View style={styles.bodyweightInputCell}>
                <NeonInput
                  label="Bodyweight"
                  keyboardType={WEIGHT_KEYBOARD_TYPE}
                  value={bodyweightInput}
                  onChangeText={(value) => {
                    setBodyweightInput(value);
                    if (bodyweightError) {
                      setBodyweightError(null);
                    }
                  }}
                  suffix={settings.weightUnit}
                />
              </View>
              <View style={styles.bodyweightButtonCell}>
                <NeonButton
                  title="Save"
                  variant="ghost"
                  onPress={() => void saveSessionBodyweight()}
                />
              </View>
            </View>

            {bodyweightError ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    borderColor: theme.palette.danger,
                  },
                ]}
              >
                <AppText tone="danger">{bodyweightError}</AppText>
              </View>
            ) : null}

            {activeSession.restoredFromAppClose && activeSession.isPaused ? (
              <View
                style={[
                  styles.recoveryCard,
                  {
                    borderColor: theme.palette.accent,
                  },
                ]}
              >
                <AppText tone="accent">
                  Session was paused after app relaunch. Tap Resume to continue
                  the timer.
                </AppText>
              </View>
            ) : null}
          </View>

          {groupedActiveSets.map((group) => {
            const groupIsAssisted = isAssistedWeightKg(group.targetWeightKg);

            return (
              <View
                key={group.exerciseName}
                style={[
                  styles.exerciseSessionCard,
                  {
                    borderColor: theme.palette.border,
                    backgroundColor: theme.palette.panel,
                  },
                ]}
              >
                <View style={styles.sessionExerciseHeader}>
                  <View style={styles.sessionExerciseNameRow}>
                    <AppText variant="heading">{group.exerciseName}</AppText>
                    {groupIsAssisted ? (
                      <Ionicons
                        name="arrow-down-circle"
                        size={16}
                        color={theme.palette.accentSecondary}
                      />
                    ) : null}
                  </View>
                  <AppText variant="micro" tone="muted">
                    Target{" "}
                    {formatWeightFromKg(
                      Math.abs(group.targetWeightKg),
                      settings.weightUnit
                    )}
                    {groupIsAssisted ? " assisted" : ""}
                    {" • "}
                    Rest {formatDuration(group.restSeconds * 1000)}
                  </AppText>
                </View>

                <View style={styles.setBoxGrid}>
                  {group.sets.map((setEntry) => {
                    const completed = setEntry.actualReps > 0;
                    const setWeight = formatWeightFromKg(
                      Math.abs(setEntry.actualWeightKg),
                      settings.weightUnit
                    );
                    const setIsAssisted = isAssistedWeightKg(
                      setEntry.actualWeightKg
                    );

                    return (
                      <View
                        key={setEntry.id}
                        style={[
                          styles.setBox,
                          {
                            borderColor: completed
                              ? theme.palette.accent
                              : theme.palette.border,
                            backgroundColor: completed
                              ? `${theme.palette.accent}22`
                              : theme.palette.panelSoft,
                          },
                        ]}
                      >
                        <Pressable
                          delayLongPress={260}
                          onPressIn={() => {
                            didLongPressSetBoxRef.current = false;
                          }}
                          onLongPress={() => {
                            didLongPressSetBoxRef.current = true;
                            handleSetLongPress(setEntry);
                          }}
                          onPress={() => {
                            if (didLongPressSetBoxRef.current) {
                              didLongPressSetBoxRef.current = false;
                              return;
                            }

                            void handleSetPress(setEntry);
                          }}
                          style={({ pressed }) => [
                            styles.setBoxMain,
                            { opacity: pressed ? opacity.pressedSoft : 1 },
                          ]}
                        >
                          <AppText variant="micro" tone="muted">
                            Set {setEntry.setNumber}
                          </AppText>
                          <AppText
                            variant="heading"
                            tone={completed ? "accent" : "primary"}
                          >
                            {completed ? setEntry.actualReps : "--"}
                          </AppText>
                          <AppText variant="micro" tone="muted">
                            / {setEntry.targetReps}
                          </AppText>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            handleSetWeightPress(setEntry);
                          }}
                          style={({ pressed }) => [
                            styles.setBoxWeightBar,
                            {
                              borderTopColor: completed
                                ? `${theme.palette.accentContrast}33`
                                : theme.palette.border,
                              backgroundColor: completed
                                ? theme.palette.accent
                                : `${theme.palette.background}4a`,
                              opacity: pressed ? opacity.pressedSoft : 1,
                            },
                          ]}
                        >
                          <AppText
                            variant="micro"
                            tone={completed ? "inverse" : "muted"}
                          >
                            {setWeight}
                            {setIsAssisted ? " assisted" : ""}
                          </AppText>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {(sessionActionError || error) && !formError ? (
            <View
              style={[
                styles.errorBox,
                {
                  borderColor: theme.palette.danger,
                },
              ]}
            >
              <AppText tone="danger">{sessionActionError ?? error}</AppText>
            </View>
          ) : null}

          <View style={styles.sessionFinishWrap}>
            <View style={styles.sessionFinishRow}>
              <View style={styles.sessionFinishPrimaryCell}>
                <NeonButton
                  title="Finish & Save"
                  onPress={() => void handleFinishSession()}
                  disabled={mutating}
                />
              </View>
              <View style={styles.sessionFinishDangerCell}>
                <NeonButton
                  title="Delete"
                  variant="danger"
                  onPress={openDiscardSessionModal}
                  disabled={mutating}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <Modal
          visible={customSetId !== null}
          transparent
          animationType="fade"
          onRequestClose={closeCustomRepsModal}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.modalCard,
                {
                  borderColor: theme.palette.border,
                  backgroundColor: theme.palette.panel,
                },
              ]}
            >
              <AppText variant="heading">
                {customSetEditMode === "reps" ? "Edit Reps" : "Edit Weight"}
              </AppText>
              <AppText tone="muted">
                {customSetEditMode === "reps"
                  ? "Set a custom rep count for this set."
                  : "Adjust the working weight for this set."}
              </AppText>

              {customSetEditMode === "reps" ? (
                <NeonInput
                  label="Reps"
                  keyboardType="number-pad"
                  value={customSetRepsInput}
                  onChangeText={setCustomSetRepsInput}
                />
              ) : (
                <NeonInput
                  label="Weight"
                  keyboardType={WEIGHT_KEYBOARD_TYPE}
                  value={customSetWeightInput}
                  onChangeText={setCustomSetWeightInput}
                  suffix={settings.weightUnit}
                />
              )}

              {customSetError ? (
                <View
                  style={[
                    styles.errorBox,
                    {
                      borderColor: theme.palette.danger,
                    },
                  ]}
                >
                  <AppText tone="danger">{customSetError}</AppText>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <View style={styles.modalActionCell}>
                  <NeonButton
                    title="Cancel"
                    variant="ghost"
                    onPress={closeCustomRepsModal}
                  />
                </View>
                <View style={styles.modalActionCell}>
                  <NeonButton
                    title="Save"
                    onPress={() => void saveCustomSetValues()}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
        <Modal
          visible={isDiscardSessionModalOpen}
          transparent
          animationType="fade"
          onRequestClose={closeDiscardSessionModal}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.modalCard,
                {
                  borderColor: theme.palette.border,
                  backgroundColor: theme.palette.panel,
                },
              ]}
            >
              <AppText variant="heading">Discard Workout Session?</AppText>
              <AppText tone="muted">
                This active workout will be removed permanently. This action
                cannot be undone.
              </AppText>
              <View
                style={[
                  styles.errorBox,
                  {
                    borderColor: `${theme.palette.danger}99`,
                    backgroundColor: `${theme.palette.danger}1a`,
                  },
                ]}
              >
                <AppText tone="danger">
                  Discarding clears all sets logged in this active session.
                </AppText>
              </View>
              <View style={styles.modalActions}>
                <View style={styles.modalActionCell}>
                  <NeonButton
                    title="Keep Session"
                    variant="ghost"
                    onPress={closeDiscardSessionModal}
                    disabled={mutating}
                  />
                </View>
                <View style={styles.modalActionCell}>
                  <NeonButton
                    title="Discard"
                    variant="danger"
                    onPress={() => void handleDiscardSession()}
                    disabled={mutating}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </Animated.View>
    ) : null;

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.palette.background,
        },
      ]}
    >
      <NeonGridBackground />

      <KeyboardAwareScrollView
        bottomOffset={layout.screenTopInset}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + layout.screenTopInset,
            paddingBottom: insets.bottom + layout.screenBottomInset,
          },
        ]}
        showsVerticalScrollIndicator={false}
        style={styles.keyboardRoot}
      >
        {!moveTrackerCardToBottom ? renderTrackerCard() : null}

        {isComposerOpen ? (
          <View
            style={[
              styles.panel,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="heading">
              {editingWorkoutId ? "Edit Workout Template" : "Workout Builder"}
            </AppText>

            <NeonInput
              label="Workout Name"
              placeholder="Push / Pull / Legs"
              value={workoutName}
              onChangeText={setWorkoutName}
            />

            <AppText variant="label" tone="muted">
              Pick Exercises
            </AppText>

            <View style={styles.exerciseChipContainer}>
              {EXERCISE_LIBRARY.map((exerciseName) => {
                const selected = selectedExercises.has(
                  exerciseName.toLowerCase()
                );

                return (
                  <Pressable
                    key={exerciseName}
                    onPress={() => addExerciseToDraft(exerciseName)}
                    style={({ pressed }) => [
                      styles.exerciseChip,
                      {
                        borderColor: selected
                          ? theme.palette.accent
                          : theme.palette.border,
                        backgroundColor: selected
                          ? `${theme.palette.accent}2b`
                          : theme.palette.panelSoft,
                        opacity: pressed ? opacity.pressedSoft : 1,
                      },
                    ]}
                  >
                    <AppText
                      variant="micro"
                      tone={selected ? "accent" : "muted"}
                    >
                      {exerciseName}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.customExerciseRow}>
              <View style={styles.customExerciseInput}>
                <NeonInput
                  label="Custom Exercise"
                  placeholder="Cable Crunch"
                  value={customExerciseName}
                  onChangeText={setCustomExerciseName}
                />
              </View>
              <NeonButton
                title="Add"
                variant="ghost"
                onPress={addCustomExercise}
              />
            </View>

            <View style={styles.exerciseDraftContainer}>
              {exerciseDrafts.map((draft) => {
                const parsedRestSeconds = parseRestSecondsInput(
                  draft.restSeconds
                );
                const restSeconds =
                  parsedRestSeconds === null
                    ? DEFAULT_REST_SECONDS
                    : clampRestSeconds(parsedRestSeconds);

                return (
                  <View
                    key={draft.id}
                    style={[
                      styles.exerciseDraftCard,
                      {
                        borderColor: theme.palette.border,
                        backgroundColor: theme.palette.panelSoft,
                      },
                    ]}
                  >
                    <View style={styles.exerciseDraftHeader}>
                      <AppText variant="heading">{draft.name}</AppText>
                      <Pressable
                        onPress={() => removeExerciseDraft(draft.id)}
                        hitSlop={8}
                        style={({ pressed }) => ({
                          opacity: pressed ? opacity.pressedMedium : 1,
                        })}
                      >
                        <Ionicons
                          name="close"
                          size={sizes.iconSmall}
                          color={theme.palette.textMuted}
                        />
                      </Pressable>
                    </View>

                    <View style={styles.exerciseFieldsRow}>
                      <View style={styles.fieldCell}>
                        <NeonInput
                          label="Sets"
                          keyboardType="number-pad"
                          value={draft.sets}
                          onChangeText={(value) =>
                            updateExerciseDraft(draft.id, { sets: value })
                          }
                        />
                      </View>
                      <View style={styles.fieldCell}>
                        <NeonInput
                          label="Reps"
                          keyboardType="number-pad"
                          value={draft.reps}
                          onChangeText={(value) =>
                            updateExerciseDraft(draft.id, { reps: value })
                          }
                        />
                      </View>
                    </View>

                    <View style={styles.exerciseFieldsRow}>
                      <View style={styles.fieldCell}>
                        <NeonInput
                          label="Start"
                          helperText="Use a negative value for assisted movements."
                          keyboardType={WEIGHT_KEYBOARD_TYPE}
                          value={draft.startWeight}
                          onChangeText={(value) =>
                            updateExerciseDraft(draft.id, {
                              startWeight: value,
                            })
                          }
                          suffix={settings.weightUnit}
                        />
                      </View>
                      <View style={styles.fieldCell}>
                        <NeonInput
                          label="Overload / week"
                          helperText={`Default: ${defaultOverload}`}
                          keyboardType="decimal-pad"
                          value={draft.overload}
                          onChangeText={(value) =>
                            updateExerciseDraft(draft.id, { overload: value })
                          }
                          suffix={settings.weightUnit}
                        />
                      </View>
                    </View>

                    <View
                      style={[
                        styles.restDraftRow,
                        {
                          borderColor: theme.palette.border,
                          backgroundColor: theme.palette.panel,
                        },
                      ]}
                    >
                      <AppText variant="micro" tone="muted">
                        Rest Timer
                      </AppText>
                      <View style={styles.restDraftControls}>
                        <Pressable
                          onPress={() =>
                            adjustDraftRestSeconds(
                              draft.id,
                              -REST_TIMER_STEP_SECONDS
                            )
                          }
                          style={({ pressed }) => [
                            styles.restDraftButton,
                            {
                              borderColor: theme.palette.border,
                              backgroundColor: theme.palette.panelSoft,
                              opacity: pressed ? opacity.pressedSoft : 1,
                            },
                          ]}
                        >
                          <Ionicons
                            name="remove"
                            size={layout.screenTopInset}
                            color={theme.palette.textPrimary}
                          />
                        </Pressable>
                        <View style={styles.restDraftValue}>
                          <AppText variant="label">
                            {formatDuration(restSeconds * 1000)}
                          </AppText>
                        </View>
                        <Pressable
                          onPress={() =>
                            adjustDraftRestSeconds(
                              draft.id,
                              REST_TIMER_STEP_SECONDS
                            )
                          }
                          style={({ pressed }) => [
                            styles.restDraftButton,
                            {
                              borderColor: theme.palette.border,
                              backgroundColor: theme.palette.panelSoft,
                              opacity: pressed ? opacity.pressedSoft : 1,
                            },
                          ]}
                        >
                          <Ionicons
                            name="add"
                            size={layout.screenTopInset}
                            color={theme.palette.textPrimary}
                          />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {formError ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    borderColor: theme.palette.danger,
                  },
                ]}
              >
                <AppText tone="danger">{formError}</AppText>
              </View>
            ) : null}

            <NeonButton
              title={editingWorkoutId ? "Save Template" : "Save Workout"}
              onPress={() => void submitWorkout()}
              disabled={mutating}
            />
          </View>
        ) : null}

        {activeSession ? (
          <View
            style={[
              styles.resumeBanner,
              {
                borderColor: theme.palette.accent,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <View style={styles.resumeBannerTextWrap}>
              <AppText variant="label" tone="accent">
                Active Session
              </AppText>
              <AppText variant="heading">{activeSession.workoutName}</AppText>
            </View>
            <NeonButton
              title="Open"
              onPress={() => {
                setIsSessionScreenOpen(true);
              }}
            />
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <AppText variant="heading">Saved Workouts</AppText>
          <AppText variant="micro" tone="muted">
            {workouts.length} total
          </AppText>
        </View>

        {error ? (
          <View
            style={[
              styles.errorBox,
              {
                borderColor: theme.palette.danger,
              },
            ]}
          >
            <AppText tone="danger">{error}</AppText>
          </View>
        ) : null}

        {sessionActionError ? (
          <View
            style={[
              styles.errorBox,
              {
                borderColor: theme.palette.danger,
              },
            ]}
          >
            <AppText tone="danger">{sessionActionError}</AppText>
          </View>
        ) : null}

        {workouts.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="heading">No workouts yet</AppText>
            <AppText tone="muted">
              Add your first workout to unlock quick starts, live timer
              tracking, and set-by-set session logs.
            </AppText>
          </View>
        ) : null}

        {workouts.map((workout) => {
          const totalSets = workout.exercises.reduce(
            (sum, exercise) => sum + exercise.sets,
            0
          );
          const lastSession = workout.sessions[0];
          const sessionBlocked =
            activeSession !== null && activeSession.workoutId !== workout.id;
          const startButtonTitle =
            activeSession?.workoutId === workout.id ? "Continue" : "Start";

          return (
            <View
              key={workout.id}
              style={[
                styles.workoutCard,
                {
                  borderColor: theme.palette.border,
                  backgroundColor: theme.palette.panel,
                },
              ]}
            >
              <Pressable
                onPress={() => {
                  void beginWorkout(workout.id);
                }}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? opacity.pressedStrong : 1,
                    gap: spacing.lg,
                  },
                ]}
              >
                <View style={styles.workoutCardHeader}>
                  <View style={styles.workoutCardHeaderText}>
                    <AppText variant="heading">{workout.name}</AppText>
                    <AppText variant="micro" tone="muted">
                      Week {workout.weeksCompleted + 1} target
                    </AppText>
                  </View>

                  <View style={styles.workoutCardHeaderActions}>
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        openComposerForEdit(workout);
                      }}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.deleteIconButton,
                        {
                          borderColor: theme.palette.border,
                          backgroundColor: theme.palette.panelSoft,
                          opacity: pressed ? opacity.pressedSoft : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name="create-outline"
                        size={layout.screenTopInset}
                        color={theme.palette.accent}
                      />
                    </Pressable>
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        void removeWorkout(workout.id);
                      }}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.deleteIconButton,
                        {
                          borderColor: theme.palette.border,
                          backgroundColor: theme.palette.panelSoft,
                          opacity: pressed ? opacity.pressedSoft : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={layout.screenTopInset}
                        color={theme.palette.danger}
                      />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View
                    style={[
                      styles.metaChip,
                      {
                        borderColor: theme.palette.border,
                        backgroundColor: theme.palette.panelSoft,
                      },
                    ]}
                  >
                    <AppText variant="micro" tone="muted">
                      {workout.exercises.length} exercises
                    </AppText>
                  </View>
                  <View
                    style={[
                      styles.metaChip,
                      {
                        borderColor: theme.palette.border,
                        backgroundColor: theme.palette.panelSoft,
                      },
                    ]}
                  >
                    <AppText variant="micro" tone="muted">
                      {totalSets} sets
                    </AppText>
                  </View>
                  <View
                    style={[
                      styles.metaChip,
                      {
                        borderColor: theme.palette.border,
                        backgroundColor: theme.palette.panelSoft,
                      },
                    ]}
                  >
                    <AppText variant="micro" tone="muted">
                      ~{estimateWorkoutMinutes(workout)} min
                    </AppText>
                  </View>
                </View>

                <AppText tone="muted">
                  {lastSession
                    ? `Last completed on ${sessionDateFormatter.format(
                        new Date(lastSession.performedAt)
                      )}`
                    : "No completed sessions yet."}
                </AppText>
              </Pressable>

              <View style={styles.workoutActionRow}>
                <View style={styles.actionButtonCell}>
                  <NeonButton
                    title={startButtonTitle}
                    onPress={() => {
                      void beginWorkout(workout.id);
                    }}
                    disabled={sessionBlocked || mutating}
                  />
                </View>
                <View style={styles.actionButtonCell}>
                  <OverloadButton
                    onPress={() => {
                      void applyWeeklyOverload(workout.id);
                    }}
                    disabled={mutating}
                  />
                </View>
              </View>
            </View>
          );
        })}

        {moveTrackerCardToBottom ? renderTrackerCard() : null}
      </KeyboardAwareScrollView>
      {sessionScreen}
    </View>
  );
}
