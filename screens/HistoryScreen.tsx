import { useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, View, type KeyboardTypeOptions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonGridBackground } from '@/components/ui/neon-grid-background';
import { NeonInput } from '@/components/ui/neon-input';
import { designTokens } from '@/constants/design-system';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatWeightFromKg, formatWeightInputFromKg, parseWeightInputToKg } from '@/lib/weight';
import { useAppStore } from '@/store/use-app-store';
import type { WorkoutSession } from '@/types/workout';
import { styles } from './HistoryScreen.styles';

type SessionSetDraft = {
  id: string;
  workoutExerciseId: string;
  exerciseName: string;
  setNumber: number;
  repsInput: string;
  weightInput: string;
};

type SessionListItem = {
  workoutId: string;
  workoutName: string;
  session: WorkoutSession;
};

const WEIGHT_KEYBOARD_TYPE: KeyboardTypeOptions =
  Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric';

function getSessionVolumeKg(session: WorkoutSession): number {
  return session.sets.reduce((total, setEntry) => total + Math.abs(setEntry.weightKg) * setEntry.reps, 0);
}

export default function HistoryScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { layout } = designTokens;

  const workouts = useAppStore((state) => state.workouts);
  const settings = useAppStore((state) => state.settings);
  const mutating = useAppStore((state) => state.mutating);
  const editWorkoutSession = useAppStore((state) => state.editWorkoutSession);

  const [editingSession, setEditingSession] = useState<SessionListItem | null>(null);
  const [draftBodyweight, setDraftBodyweight] = useState('');
  const [draftSets, setDraftSets] = useState<SessionSetDraft[]>([]);
  const [editError, setEditError] = useState<string | null>(null);

  const sessionDateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, []);

  const sessions = useMemo(() => {
    const flattened: SessionListItem[] = [];

    workouts.forEach((workout) => {
      workout.sessions.forEach((session) => {
        flattened.push({
          workoutId: workout.id,
          workoutName: workout.name,
          session,
        });
      });
    });

    return flattened.sort((a, b) => b.session.performedAt - a.session.performedAt);
  }, [workouts]);

  const totalSessions = sessions.length;
  const lastSession = sessions[0] ?? null;

  const openEditModal = (item: SessionListItem) => {
    setEditingSession(item);
    setDraftBodyweight(
      item.session.bodyweightKg === null
        ? ''
        : formatWeightInputFromKg(item.session.bodyweightKg, settings.weightUnit)
    );
    setDraftSets(
      [...item.session.sets]
        .sort((a, b) => {
          if (a.exerciseName === b.exerciseName) {
            return a.setNumber - b.setNumber;
          }

          return a.exerciseName.localeCompare(b.exerciseName);
        })
        .map((setEntry) => ({
          id: setEntry.id,
          workoutExerciseId: setEntry.workoutExerciseId,
          exerciseName: setEntry.exerciseName,
          setNumber: setEntry.setNumber,
          repsInput: String(setEntry.reps),
          weightInput: formatWeightInputFromKg(setEntry.weightKg, settings.weightUnit),
        }))
    );
    setEditError(null);
  };

  const closeEditModal = () => {
    setEditingSession(null);
    setDraftBodyweight('');
    setDraftSets([]);
    setEditError(null);
  };

  const updateDraftSet = (id: string, patch: Partial<SessionSetDraft>) => {
    setDraftSets((current) =>
      current.map((setEntry) => {
        if (setEntry.id !== id) {
          return setEntry;
        }

        return {
          ...setEntry,
          ...patch,
        };
      })
    );
  };

  const saveSessionEdits = async () => {
    if (!editingSession) {
      return;
    }

    const parsedSets = [];

    for (const draft of draftSets) {
      const reps = Number.parseInt(draft.repsInput, 10);
      if (!Number.isFinite(reps) || reps < 0) {
        setEditError(`Reps for ${draft.exerciseName} set ${draft.setNumber} must be zero or above.`);
        return;
      }

      const parsedWeight = parseWeightInputToKg(draft.weightInput, settings.weightUnit);
      if (parsedWeight === null) {
        setEditError(`Weight for ${draft.exerciseName} set ${draft.setNumber} is invalid.`);
        return;
      }

      parsedSets.push({
        workoutExerciseId: draft.workoutExerciseId,
        exerciseName: draft.exerciseName,
        setNumber: draft.setNumber,
        reps,
        weightKg: parsedWeight,
      });
    }

    const bodyweightInput = draftBodyweight.trim();
    const parsedBodyweight =
      bodyweightInput.length === 0 ? null : parseWeightInputToKg(bodyweightInput, settings.weightUnit);

    if (bodyweightInput.length > 0 && (parsedBodyweight === null || parsedBodyweight <= 0)) {
      setEditError('Bodyweight must be above zero when provided.');
      return;
    }

    try {
      await editWorkoutSession({
        sessionId: editingSession.session.id,
        workoutId: editingSession.workoutId,
        performedAt: editingSession.session.performedAt,
        bodyweightKg: parsedBodyweight,
        sets: parsedSets,
      });
      closeEditModal();
    } catch {
      setEditError('Could not save session edits right now.');
    }
  };

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
            paddingTop: insets.top + layout.screenTopInset,
            paddingBottom: insets.bottom + layout.screenBottomInset,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.hero,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}>
          <AppText variant="display">Past Workouts</AppText>
          <AppText tone="muted">
            Review your completed training sessions and edit logged reps, weights, or bodyweight.
          </AppText>
        </View>

        <View
          style={[
            styles.summaryRow,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}>
          <View style={styles.summaryCell}>
            <AppText variant="micro" tone="muted">
              Total Sessions
            </AppText>
            <AppText variant="heading">{totalSessions}</AppText>
          </View>
          <View style={styles.summaryCell}>
            <AppText variant="micro" tone="muted">
              Last Workout
            </AppText>
            <AppText variant="heading">
              {lastSession ? sessionDateFormatter.format(new Date(lastSession.session.performedAt)) : 'None'}
            </AppText>
          </View>
        </View>

        {sessions.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}>
            <AppText variant="heading">No sessions logged yet</AppText>
            <AppText tone="muted">Finish a workout from the Workouts tab to populate your history.</AppText>
          </View>
        ) : null}

        {sessions.map((item) => {
          const totalReps = item.session.sets.reduce((total, setEntry) => total + setEntry.reps, 0);
          const totalSets = item.session.sets.length;
          const totalVolumeKg = getSessionVolumeKg(item.session);

          return (
            <View
              key={item.session.id}
              style={[
                styles.sessionCard,
                {
                  borderColor: theme.palette.border,
                  backgroundColor: theme.palette.panel,
                },
              ]}>
              <View style={styles.sessionHeader}>
                <View style={styles.sessionHeaderText}>
                  <AppText variant="heading">{item.workoutName}</AppText>
                  <AppText tone="muted">{sessionDateFormatter.format(new Date(item.session.performedAt))}</AppText>
                </View>
                <NeonButton title="Edit" variant="ghost" onPress={() => openEditModal(item)} />
              </View>

              <View style={styles.statChips}>
                <View
                  style={[
                    styles.statChip,
                    {
                      borderColor: theme.palette.border,
                      backgroundColor: theme.palette.panelSoft,
                    },
                  ]}>
                  <AppText variant="micro" tone="muted">
                    Sets
                  </AppText>
                  <AppText>{totalSets}</AppText>
                </View>
                <View
                  style={[
                    styles.statChip,
                    {
                      borderColor: theme.palette.border,
                      backgroundColor: theme.palette.panelSoft,
                    },
                  ]}>
                  <AppText variant="micro" tone="muted">
                    Reps
                  </AppText>
                  <AppText>{totalReps}</AppText>
                </View>
                <View
                  style={[
                    styles.statChip,
                    {
                      borderColor: theme.palette.border,
                      backgroundColor: theme.palette.panelSoft,
                    },
                  ]}>
                  <AppText variant="micro" tone="muted">
                    Volume
                  </AppText>
                  <AppText tone="accent">{formatWeightFromKg(totalVolumeKg, settings.weightUnit)}</AppText>
                </View>
              </View>

              <AppText tone="muted">
                Bodyweight:{' '}
                {item.session.bodyweightKg === null
                  ? 'not logged'
                  : formatWeightFromKg(item.session.bodyweightKg, settings.weightUnit)}
              </AppText>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={editingSession !== null} transparent animationType="fade" onRequestClose={closeEditModal}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}>
            <AppText variant="heading">
              {editingSession ? `${editingSession.workoutName} Session` : 'Session'}
            </AppText>

            <NeonInput
              label="Bodyweight"
              helperText="Optional"
              keyboardType={WEIGHT_KEYBOARD_TYPE}
              value={draftBodyweight}
              onChangeText={setDraftBodyweight}
              suffix={settings.weightUnit}
            />

            <ScrollView style={styles.modalSetList} showsVerticalScrollIndicator={false}>
              <View style={styles.modalSetListContent}>
                {draftSets.map((setEntry) => (
                  <View
                    key={setEntry.id}
                    style={[
                      styles.modalSetCard,
                      {
                        borderColor: theme.palette.border,
                        backgroundColor: theme.palette.panelSoft,
                      },
                    ]}>
                    <AppText variant="micro" tone="muted">
                      {setEntry.exerciseName} - Set {setEntry.setNumber}
                    </AppText>

                    <View style={styles.modalSetInputsRow}>
                      <View style={styles.modalSetInputCell}>
                        <NeonInput
                          label="Reps"
                          keyboardType="number-pad"
                          value={setEntry.repsInput}
                          onChangeText={(value) => updateDraftSet(setEntry.id, { repsInput: value })}
                        />
                      </View>
                      <View style={styles.modalSetInputCell}>
                        <NeonInput
                          label="Weight"
                          keyboardType={WEIGHT_KEYBOARD_TYPE}
                          value={setEntry.weightInput}
                          onChangeText={(value) => updateDraftSet(setEntry.id, { weightInput: value })}
                          suffix={settings.weightUnit}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            {editError ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    borderColor: theme.palette.danger,
                  },
                ]}>
                <AppText tone="danger">{editError}</AppText>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <View style={styles.modalActionCell}>
                <NeonButton title="Cancel" variant="ghost" onPress={closeEditModal} />
              </View>
              <View style={styles.modalActionCell}>
                <NeonButton title="Save" onPress={() => void saveSessionEdits()} disabled={mutating} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
