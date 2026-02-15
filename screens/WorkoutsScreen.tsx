import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonGridBackground } from '@/components/ui/neon-grid-background';
import { NeonInput } from '@/components/ui/neon-input';
import { OverloadButton } from '@/components/ui/overload-button';
import {
  DEFAULT_REST_SECONDS,
  MAX_REST_SECONDS,
  MIN_REST_SECONDS,
  REST_TIMER_STEP_SECONDS,
} from '@/constants/workout';
import { EXERCISE_LIBRARY } from '@/constants/exercise-library';
import { useAppTheme } from '@/hooks/use-app-theme';
import { createId } from '@/lib/id';
import { cancelScheduledNotification, scheduleRestCompleteNotification } from '@/lib/rest-notifications';
import {
  formatWeightFromKg,
  formatWeightInputFromKg,
  getDefaultWeeklyIncrementKg,
  isAssistedWeightKg,
  parseWeightInputToKg,
} from '@/lib/weight';
import { useAppStore } from '@/store/use-app-store';
import type { ActiveWorkoutSession, ActiveWorkoutSet, NewWorkoutExerciseInput, Workout } from '@/types/workout';

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

function createExerciseDraft(name: string): ExerciseDraft {
  return {
    id: createId('draft'),
    name,
    sets: '3',
    reps: '10',
    restSeconds: String(DEFAULT_REST_SECONDS),
    startWeight: '0',
    overload: '',
  };
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getElapsedMs(session: ActiveWorkoutSession, now: number): number {
  const pausedDelta = session.isPaused && session.pauseStartedAt !== null ? now - session.pauseStartedAt : 0;
  return Math.max(0, now - session.startedAt - session.totalPausedMs - pausedDelta);
}

function estimateWorkoutMinutes(workout: Workout): number {
  const setCount = workout.exercises.reduce((total, exercise) => total + exercise.sets, 0);
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
  return Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, Math.floor(seconds)));
}

function parseRestSecondsInput(value: string): number | null {
  const parsed = Number.parseInt(value.trim(), 10);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

const WEIGHT_KEYBOARD_TYPE: KeyboardTypeOptions =
  Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric';

export default function WorkoutsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

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
  const setActiveWorkoutBodyweight = useAppStore((state) => state.setActiveWorkoutBodyweight);
  const pauseActiveWorkoutSession = useAppStore((state) => state.pauseActiveWorkoutSession);
  const resumeActiveWorkoutSession = useAppStore((state) => state.resumeActiveWorkoutSession);
  const decrementOrCompleteSessionSet = useAppStore((state) => state.decrementOrCompleteSessionSet);
  const setSessionSetCustomReps = useAppStore((state) => state.setSessionSetCustomReps);
  const finishActiveWorkoutSession = useAppStore((state) => state.finishActiveWorkoutSession);
  const discardActiveWorkoutSession = useAppStore((state) => state.discardActiveWorkoutSession);

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [exerciseDrafts, setExerciseDrafts] = useState<ExerciseDraft[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [sessionActionError, setSessionActionError] = useState<string | null>(null);
  const [bodyweightInput, setBodyweightInput] = useState('');
  const [bodyweightError, setBodyweightError] = useState<string | null>(null);

  const [isSessionScreenOpen, setIsSessionScreenOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [activeRestTimer, setActiveRestTimer] = useState<ActiveRestTimer | null>(null);
  const [restNotificationId, setRestNotificationId] = useState<string | null>(null);
  const restScheduleTokenRef = useRef(0);

  const [customSetId, setCustomSetId] = useState<string | null>(null);
  const [customSetRepsInput, setCustomSetRepsInput] = useState('');
  const [customSetError, setCustomSetError] = useState<string | null>(null);
  const activeWorkoutId = activeSession?.workoutId ?? null;
  const activeBodyweightKg = activeSession?.bodyweightKg ?? null;

  const selectedExercises = useMemo(() => {
    return new Set(exerciseDrafts.map((draft) => draft.name.toLowerCase()));
  }, [exerciseDrafts]);

  const sessionDateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const groupedActiveSets = useMemo(
    () => groupActiveSetsByExercise(activeSession?.sets ?? []),
    [activeSession?.sets]
  );

  const completedSetCount = useMemo(
    () => activeSession?.sets.filter((setEntry) => setEntry.actualReps > 0).length ?? 0,
    [activeSession?.sets]
  );

  const totalSessionReps = useMemo(
    () => activeSession?.sets.reduce((total, setEntry) => total + setEntry.actualReps, 0) ?? 0,
    [activeSession?.sets]
  );

  const totalSessionVolumeKg = useMemo(
    () =>
      activeSession?.sets.reduce(
        (total, setEntry) => total + Math.abs(setEntry.targetWeightKg) * setEntry.actualReps,
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

    return Math.min(1, Math.max(0, (activeRestTimer.durationMs - restRemainingMs) / activeRestTimer.durationMs));
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
    if (!activeRestTimer || restRemainingMs > 0 || !restNotificationId) {
      return;
    }

    void cancelScheduledNotification(restNotificationId);
    setRestNotificationId(null);
  }, [activeRestTimer, restRemainingMs, restNotificationId]);

  useEffect(() => {
    if (!activeWorkoutId) {
      setBodyweightInput('');
      setBodyweightError(null);
      return;
    }

    if (activeBodyweightKg === null) {
      setBodyweightInput('');
      return;
    }

    setBodyweightInput(formatWeightInputFromKg(activeBodyweightKg, settings.weightUnit));
  }, [activeBodyweightKg, activeWorkoutId, settings.weightUnit]);

  const openComposer = () => {
    setIsComposerOpen(true);
    setWorkoutName('');
    setEditingWorkoutId(null);
    setCustomExerciseName('');
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
          id: createId('draft'),
          name: exercise.name,
          sets: String(exercise.sets),
          reps: String(exercise.reps),
          restSeconds: String(exercise.restSeconds),
          startWeight: formatWeightInputFromKg(exercise.startWeightKg, settings.weightUnit),
          overload: formatWeightInputFromKg(exercise.overloadIncrementKg, settings.weightUnit),
        }))
    );
    setCustomExerciseName('');
    setIsComposerOpen(true);
    setFormError(null);
    clearError();
  };

  const closeComposer = () => {
    setIsComposerOpen(false);
    setWorkoutName('');
    setEditingWorkoutId(null);
    setCustomExerciseName('');
    setExerciseDrafts([]);
    setFormError(null);
  };

  const addExerciseToDraft = (name: string) => {
    const normalized = name.trim();
    if (!normalized) {
      return;
    }

    setExerciseDrafts((current) => {
      if (current.some((item) => item.name.toLowerCase() === normalized.toLowerCase())) {
        return current;
      }

      return [...current, createExerciseDraft(normalized)];
    });
  };

  const addCustomExercise = () => {
    addExerciseToDraft(customExerciseName);
    setCustomExerciseName('');
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
        const baseline = parsed === null ? DEFAULT_REST_SECONDS : clampRestSeconds(parsed);
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
      setFormError('Give this workout a name before saving.');
      return;
    }

    if (exerciseDrafts.length === 0) {
      setFormError('Add at least one exercise.');
      return;
    }

    const parsedExercises: NewWorkoutExerciseInput[] = [];

    for (const draft of exerciseDrafts) {
      const sets = Number.parseInt(draft.sets, 10);
      const reps = Number.parseInt(draft.reps, 10);
      const restSecondsInput = parseRestSecondsInput(draft.restSeconds);
      const startWeightKg = parseWeightInputToKg(draft.startWeight, settings.weightUnit);

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
        setFormError(`Progressive overload for ${draft.name} must be above zero.`);
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
      setFormError('Could not save this workout template. Try again.');
    }
  };

  const saveSessionBodyweight = async () => {
    const trimmed = bodyweightInput.trim();
    if (!trimmed) {
      try {
        await setActiveWorkoutBodyweight(null);
        setBodyweightError(null);
      } catch {
        setBodyweightError('Could not clear bodyweight right now.');
      }
      return;
    }

    const parsed = parseWeightInputToKg(trimmed, settings.weightUnit);
    if (parsed === null || parsed <= 0) {
      setBodyweightError('Enter a valid bodyweight above zero.');
      return;
    }

    try {
      await setActiveWorkoutBodyweight(parsed);
      setBodyweightError(null);
    } catch {
      setBodyweightError('Could not save bodyweight right now.');
    }
  };

  const beginWorkout = async (workoutId: string) => {
    setSessionActionError(null);
    setFormError(null);
    clearError();

    if (activeSession && activeSession.workoutId !== workoutId) {
      setSessionActionError('Finish or discard your active workout session before starting another.');
      return;
    }

    try {
      if (!activeSession) {
        await startWorkoutSession(workoutId);
      }

      setIsSessionScreenOpen(true);
    } catch {
      setSessionActionError('Could not start this workout right now. Try again.');
    }
  };

  const openCustomRepsModal = (setEntry: ActiveWorkoutSet) => {
    setCustomSetId(setEntry.id);
    setCustomSetRepsInput(String(setEntry.actualReps));
    setCustomSetError(null);
  };

  function closeCustomRepsModal() {
    setCustomSetId(null);
    setCustomSetRepsInput('');
    setCustomSetError(null);
  }

  const saveCustomReps = async () => {
    if (!customSetId) {
      return;
    }

    const parsed = Number.parseInt(customSetRepsInput.trim(), 10);

    if (!Number.isFinite(parsed) || parsed < 0) {
      setCustomSetError('Reps must be zero or above.');
      return;
    }

    try {
      await setSessionSetCustomReps(customSetId, parsed);
      closeCustomRepsModal();
    } catch {
      setCustomSetError('Could not save reps. Try again.');
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

    const nextNotificationId = await scheduleRestCompleteNotification(restSeconds, setEntry.exerciseName);

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
        await startRestTimer(setEntry);
        return;
      }

      if (activeRestTimer?.setId === setEntry.id) {
        await clearRestTimer();
      }
    } catch {
      setSessionActionError('Could not update this set right now.');
    }
  };

  const handleDiscardSession = () => {
    Alert.alert('Discard workout?', 'This active session will be removed and cannot be recovered.', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await clearRestTimer();
              await discardActiveWorkoutSession();
              setIsSessionScreenOpen(false);
            } catch {
              setSessionActionError('Could not discard the current session.');
            }
          })();
        },
      },
    ]);
  };

  const handleFinishSession = async () => {
    try {
      await clearRestTimer();
      await finishActiveWorkoutSession();
      setIsSessionScreenOpen(false);
    } catch {
      setSessionActionError('Could not save this workout session.');
    }
  };

  const compactHero = workouts.length > 0 && !isComposerOpen;
  const defaultOverload = formatWeightFromKg(
    getDefaultWeeklyIncrementKg(settings.weightUnit),
    settings.weightUnit
  );

  if (isSessionScreenOpen && activeSession) {
    return (
      <View
        style={[
          styles.screen,
          {
            backgroundColor: theme.palette.background,
          },
        ]}>
        <NeonGridBackground />

        <ScrollView
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 28,
            },
          ]}
          showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.sessionHeader,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}>
            <Pressable
              onPress={() => {
                setIsSessionScreenOpen(false);
              }}
              style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.75 : 1 }]}>
              <Ionicons name="chevron-back" size={18} color={theme.palette.textPrimary} />
              <AppText variant="label">Workouts</AppText>
            </Pressable>

            <AppText variant="heading">{activeSession.workoutName}</AppText>
            <AppText tone="muted">Tap a set to mark complete. Tap again to decrement reps.</AppText>
          </View>

          <View
            style={[
              styles.timerCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}>
            <AppText variant="micro" tone="muted">
              Session Time
            </AppText>
            <AppText variant="display">{formatDuration(sessionElapsed)}</AppText>

            {activeRestTimer ? (
              <View
                style={[
                  styles.restTimerCard,
                  {
                    borderColor: restIsComplete ? theme.palette.success : theme.palette.accent,
                    backgroundColor: theme.palette.panelSoft,
                  },
                ]}>
                <View style={styles.restTimerHeaderRow}>
                  <AppText variant="micro" tone="muted">
                    Rest Timer
                  </AppText>
                  <AppText variant="label" tone={restIsComplete ? 'success' : 'accent'}>
                    {restIsComplete ? 'Ready' : formatDuration(restRemainingMs)}
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
                  ]}>
                  <View
                    style={[
                      styles.restProgressFill,
                      {
                        backgroundColor: restIsComplete ? theme.palette.success : theme.palette.accent,
                        width: `${Math.round(restProgress * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.sessionStatsRow}>
              <View style={styles.sessionStatCell}>
                <AppText variant="micro" tone="muted" style={styles.sessionStatLabel}>
                  Completed
                </AppText>
                <AppText variant="heading">{completedSetCount}</AppText>
              </View>
              <View style={styles.sessionStatCell}>
                <AppText variant="micro" tone="muted" style={styles.sessionStatLabel}>
                  Total Reps
                </AppText>
                <AppText variant="heading">{totalSessionReps}</AppText>
              </View>
              <View style={styles.sessionStatCell}>
                <AppText variant="micro" tone="muted" style={styles.sessionStatLabel}>
                  Remaining
                </AppText>
                <AppText variant="heading">{Math.max(0, activeSession.sets.length - completedSetCount)}</AppText>
              </View>
            </View>

            <View
              style={[
                styles.sessionVolumeRow,
                {
                  borderColor: theme.palette.border,
                  backgroundColor: theme.palette.panelSoft,
                },
              ]}>
              <AppText variant="micro" tone="muted">
                Total Lifted
              </AppText>
              <AppText variant="heading" tone="accent">
                {formatWeightFromKg(totalSessionVolumeKg, settings.weightUnit)}
              </AppText>
            </View>

            <View style={styles.bodyweightRow}>
              <View style={styles.bodyweightInputCell}>
                <NeonInput
                  label="Bodyweight"
                  helperText="Optional. Saved with this workout."
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
                <NeonButton title="Save" variant="ghost" onPress={() => void saveSessionBodyweight()} />
              </View>
            </View>

            {bodyweightError ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    borderColor: theme.palette.danger,
                  },
                ]}>
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
                ]}>
                <AppText tone="accent">
                  Session was paused after app relaunch. Tap Resume to continue the timer.
                </AppText>
              </View>
            ) : null}
          </View>

          <View style={styles.sessionActionRow}>
            <View style={styles.sessionActionCell}>
              {activeSession.isPaused ? (
                <NeonButton
                  title="Resume"
                  onPress={() => {
                    void resumeActiveWorkoutSession();
                  }}
                />
              ) : (
                <NeonButton
                  title="Pause"
                  variant="ghost"
                  onPress={() => {
                    void pauseActiveWorkoutSession();
                  }}
                />
              )}
            </View>
            <View style={styles.sessionActionCell}>
              <NeonButton title="Finish & Save" onPress={() => void handleFinishSession()} disabled={mutating} />
            </View>
          </View>

          <View>
            <NeonButton title="Discard Session" variant="danger" onPress={handleDiscardSession} disabled={mutating} />
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
                ]}>
                <View style={styles.sessionExerciseHeader}>
                  <View style={styles.sessionExerciseNameRow}>
                    <AppText variant="heading">{group.exerciseName}</AppText>
                    {groupIsAssisted ? (
                      <Ionicons name="arrow-down-circle" size={16} color={theme.palette.accentSecondary} />
                    ) : null}
                  </View>
                  <AppText variant="micro" tone="muted">
                    Target {formatWeightFromKg(Math.abs(group.targetWeightKg), settings.weightUnit)}
                    {groupIsAssisted ? ' assisted' : ''}
                    {' • '}
                    Rest {formatDuration(group.restSeconds * 1000)}
                  </AppText>
                </View>

                <View style={styles.setBoxGrid}>
                  {group.sets.map((setEntry) => {
                    const completed = setEntry.actualReps > 0;

                    return (
                      <Pressable
                        key={setEntry.id}
                        onPress={() => {
                          void handleSetPress(setEntry);
                        }}
                        onLongPress={() => {
                          openCustomRepsModal(setEntry);
                        }}
                        delayLongPress={240}
                        style={({ pressed }) => [
                          styles.setBox,
                          {
                            borderColor: completed ? theme.palette.accent : theme.palette.border,
                            backgroundColor: completed
                              ? `${theme.palette.accent}22`
                              : theme.palette.panelSoft,
                            opacity: pressed ? 0.82 : 1,
                          },
                        ]}>
                        <AppText variant="micro" tone="muted">
                          Set {setEntry.setNumber}
                        </AppText>
                        <AppText variant="heading" tone={completed ? 'accent' : 'primary'}>
                          {completed ? setEntry.actualReps : '--'}
                        </AppText>
                        <AppText variant="micro" tone="muted">
                          / {setEntry.targetReps}
                        </AppText>
                      </Pressable>
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
              ]}>
              <AppText tone="danger">{sessionActionError ?? error}</AppText>
            </View>
          ) : null}
        </ScrollView>

        <Modal visible={customSetId !== null} transparent animationType="fade" onRequestClose={closeCustomRepsModal}>
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.modalCard,
                {
                  borderColor: theme.palette.border,
                  backgroundColor: theme.palette.panel,
                },
              ]}>
              <AppText variant="heading">Custom Reps</AppText>
              <AppText tone="muted">Update reps for this set.</AppText>

              <NeonInput
                label="Reps"
                keyboardType="number-pad"
                value={customSetRepsInput}
                onChangeText={setCustomSetRepsInput}
              />

              {customSetError ? (
                <View
                  style={[
                    styles.errorBox,
                    {
                      borderColor: theme.palette.danger,
                    },
                  ]}>
                  <AppText tone="danger">{customSetError}</AppText>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <View style={styles.modalActionCell}>
                  <NeonButton title="Cancel" variant="ghost" onPress={closeCustomRepsModal} />
                </View>
                <View style={styles.modalActionCell}>
                  <NeonButton title="Save" onPress={() => void saveCustomReps()} />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.palette.background,
        },
      ]}>
      <NeonGridBackground />

      <KeyboardAwareScrollView
        bottomOffset={12}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 96,
          },
        ]}
        showsVerticalScrollIndicator={false}
        style={styles.keyboardRoot}>
        <View
          style={[
            compactHero ? styles.heroCompact : styles.heroCard,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}>
          {compactHero ? (
            <>
              <View style={styles.compactHeroTextWrap}>
                <AppText variant="label" tone="accent">
                  WORKOUT TRACKER
                </AppText>
                <AppText variant="heading">Workouts ready</AppText>
              </View>
              {!isComposerOpen ? (
                <NeonButton title="Add workout" variant="ghost" onPress={openComposer} />
              ) : (
                <NeonButton title="Close builder" variant="ghost" onPress={closeComposer} />
              )}
            </>
          ) : (
            <>
              <AppText variant="micro" tone="accent">
                WORKOUT TRACKER
              </AppText>
              <AppText variant="display">Plan. Lift. Progress.</AppText>
              <AppText tone="muted">
                Create workouts, then start a focused session with live timer and set tracking.
                Default overload is {defaultOverload}.
              </AppText>

              {!isComposerOpen ? (
                <NeonButton title="Add workout" onPress={openComposer} />
              ) : (
                <NeonButton title="Close builder" variant="ghost" onPress={closeComposer} />
              )}
            </>
          )}
        </View>

        {isComposerOpen ? (
          <View
            style={[
              styles.panel,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}>
            <AppText variant="heading">
              {editingWorkoutId ? 'Edit Workout Template' : 'Workout Builder'}
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
                const selected = selectedExercises.has(exerciseName.toLowerCase());

                return (
                  <Pressable
                    key={exerciseName}
                    onPress={() => addExerciseToDraft(exerciseName)}
                    style={({ pressed }) => [
                      styles.exerciseChip,
                      {
                        borderColor: selected ? theme.palette.accent : theme.palette.border,
                        backgroundColor: selected ? `${theme.palette.accent}2b` : theme.palette.panelSoft,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}>
                    <AppText variant="micro" tone={selected ? 'accent' : 'muted'}>
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
              <NeonButton title="Add" variant="ghost" onPress={addCustomExercise} />
            </View>

            <View style={styles.exerciseDraftContainer}>
              {exerciseDrafts.map((draft) => {
                const parsedRestSeconds = parseRestSecondsInput(draft.restSeconds);
                const restSeconds =
                  parsedRestSeconds === null ? DEFAULT_REST_SECONDS : clampRestSeconds(parsedRestSeconds);

                return (
                  <View
                    key={draft.id}
                    style={[
                      styles.exerciseDraftCard,
                      {
                        borderColor: theme.palette.border,
                        backgroundColor: theme.palette.panelSoft,
                      },
                    ]}>
                    <View style={styles.exerciseDraftHeader}>
                      <AppText variant="heading">{draft.name}</AppText>
                      <Pressable
                        onPress={() => removeExerciseDraft(draft.id)}
                        hitSlop={8}
                        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                        <Ionicons name="close" size={18} color={theme.palette.textMuted} />
                      </Pressable>
                    </View>

                    <View style={styles.exerciseFieldsRow}>
                      <View style={styles.fieldCell}>
                        <NeonInput
                          label="Sets"
                          keyboardType="number-pad"
                          value={draft.sets}
                          onChangeText={(value) => updateExerciseDraft(draft.id, { sets: value })}
                        />
                      </View>
                      <View style={styles.fieldCell}>
                        <NeonInput
                          label="Reps"
                          keyboardType="number-pad"
                          value={draft.reps}
                          onChangeText={(value) => updateExerciseDraft(draft.id, { reps: value })}
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
                          onChangeText={(value) => updateExerciseDraft(draft.id, { startWeight: value })}
                          suffix={settings.weightUnit}
                        />
                      </View>
                      <View style={styles.fieldCell}>
                        <NeonInput
                          label="Overload / week"
                          helperText={`Default: ${defaultOverload}`}
                          keyboardType="decimal-pad"
                          value={draft.overload}
                          onChangeText={(value) => updateExerciseDraft(draft.id, { overload: value })}
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
                      ]}>
                      <AppText variant="micro" tone="muted">
                        Rest Timer
                      </AppText>
                      <View style={styles.restDraftControls}>
                        <Pressable
                          onPress={() => adjustDraftRestSeconds(draft.id, -REST_TIMER_STEP_SECONDS)}
                          style={({ pressed }) => [
                            styles.restDraftButton,
                            {
                              borderColor: theme.palette.border,
                              backgroundColor: theme.palette.panelSoft,
                              opacity: pressed ? 0.78 : 1,
                            },
                          ]}>
                          <Ionicons name="remove" size={16} color={theme.palette.textPrimary} />
                        </Pressable>
                        <View style={styles.restDraftValue}>
                          <AppText variant="label">{formatDuration(restSeconds * 1000)}</AppText>
                        </View>
                        <Pressable
                          onPress={() => adjustDraftRestSeconds(draft.id, REST_TIMER_STEP_SECONDS)}
                          style={({ pressed }) => [
                            styles.restDraftButton,
                            {
                              borderColor: theme.palette.border,
                              backgroundColor: theme.palette.panelSoft,
                              opacity: pressed ? 0.78 : 1,
                            },
                          ]}>
                          <Ionicons name="add" size={16} color={theme.palette.textPrimary} />
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
                ]}>
                <AppText tone="danger">{formError}</AppText>
              </View>
            ) : null}

            <NeonButton
              title={editingWorkoutId ? 'Save Template' : 'Save Workout'}
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
            ]}>
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
            ]}>
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
            ]}>
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
            ]}>
            <AppText variant="heading">No workouts yet</AppText>
            <AppText tone="muted">
              Add your first workout to unlock quick starts, live timer tracking, and set-by-set session logs.
            </AppText>
          </View>
        ) : null}

        {workouts.map((workout) => {
          const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
          const lastSession = workout.sessions[0];
          const sessionBlocked = activeSession !== null && activeSession.workoutId !== workout.id;
          const startButtonTitle = activeSession?.workoutId === workout.id ? 'Continue' : 'Start';

          return (
            <View
              key={workout.id}
              style={[
                styles.workoutCard,
                {
                  borderColor: theme.palette.border,
                  backgroundColor: theme.palette.panel,
                },
              ]}>
              <Pressable
                onPress={() => {
                  void beginWorkout(workout.id);
                }}
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, gap: 12 }]}>
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
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}>
                      <Ionicons name="create-outline" size={16} color={theme.palette.accent} />
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
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}>
                      <Ionicons name="trash-outline" size={16} color={theme.palette.danger} />
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
                    ]}>
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
                    ]}>
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
                    ]}>
                    <AppText variant="micro" tone="muted">
                      ~{estimateWorkoutMinutes(workout)} min
                    </AppText>
                  </View>
                </View>

                <AppText tone="muted">
                  {lastSession
                    ? `Last completed on ${sessionDateFormatter.format(new Date(lastSession.performedAt))}`
                    : 'No completed sessions yet.'}
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
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  keyboardRoot: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 14,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    overflow: 'hidden',
  },
  heroCompact: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  compactHeroTextWrap: {
    gap: 4,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 14,
  },
  exerciseChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exerciseChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  customExerciseRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  customExerciseInput: {
    flex: 1,
  },
  exerciseDraftContainer: {
    gap: 12,
  },
  exerciseDraftCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  exerciseDraftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  exerciseFieldsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldCell: {
    flex: 1,
  },
  restDraftRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  restDraftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  restDraftButton: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restDraftValue: {
    flex: 1,
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resumeBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  resumeBannerTextWrap: {
    gap: 4,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  workoutCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  workoutCardHeaderText: {
    flex: 1,
    gap: 4,
  },
  workoutCardHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteIconButton: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  workoutActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButtonCell: {
    flex: 1,
  },
  sessionHeader: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  timerCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  restTimerCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
  },
  restTimerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  restProgressTrack: {
    height: 8,
    borderWidth: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  restProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  sessionStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sessionStatCell: {
    flex: 1,
    gap: 4,
    alignItems: 'center',
  },
  sessionStatLabel: {
    minHeight: 14,
    textAlign: 'center',
  },
  sessionVolumeRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  bodyweightRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  bodyweightInputCell: {
    flex: 1,
  },
  bodyweightButtonCell: {
    width: 90,
  },
  recoveryCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  sessionActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sessionActionCell: {
    flex: 1,
  },
  exerciseSessionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  sessionExerciseHeader: {
    gap: 4,
  },
  sessionExerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setBoxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  setBox: {
    borderWidth: 1,
    borderRadius: 12,
    width: '31%',
    minWidth: 96,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modalActionCell: {
    flex: 1,
  },
});
