import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonGridBackground } from '@/components/ui/neon-grid-background';
import { NeonInput } from '@/components/ui/neon-input';
import { designTokens } from '@/constants/design-system';
import { useAppTheme } from '@/hooks/use-app-theme';
import {
  getWorkoutSessionVolumeKg,
  groupWorkoutSessionSets,
} from '@/lib/workout-session';
import {
  formatWeightFromKg,
  formatWeightInputFromKg,
  parseWeightInputToKg,
} from '@/lib/weight';
import { useAppStore } from '@/store/use-app-store';
import type { RootStackParamList } from '@/types/navigation';
import type { WorkoutSession } from '@/types/workout';

import { ErrorNotice } from './workouts/components/common/ErrorNotice';
import { WEIGHT_KEYBOARD_TYPE } from './workouts/constants';
import { formatDuration } from './workouts/utils';
import { styles } from './SessionDetailScreen.styles';

type SessionDetailsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SessionDetails'
>;
type SessionDetailsRouteProp = RouteProp<RootStackParamList, 'SessionDetails'>;

type SessionSetDraft = {
  id: string;
  workoutExerciseId: string;
  exerciseName: string;
  setNumber: number;
  repsInput: string;
  weightInput: string;
};

function createSessionSetDrafts(
  session: WorkoutSession,
  weightUnit: 'kg' | 'lb'
): SessionSetDraft[] {
  return [...session.sets]
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
      weightInput: formatWeightInputFromKg(setEntry.weightKg, weightUnit),
    }));
}

export default function SessionDetailScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SessionDetailsNavigationProp>();
  const route = useRoute<SessionDetailsRouteProp>();
  const { layout, opacity } = designTokens;

  const { workoutId, sessionId } = route.params;
  const workouts = useAppStore((state) => state.workouts);
  const settings = useAppStore((state) => state.settings);
  const mutating = useAppStore((state) => state.mutating);
  const editWorkoutSession = useAppStore((state) => state.editWorkoutSession);

  const workout = useMemo(
    () => workouts.find((candidate) => candidate.id === workoutId) ?? null,
    [workoutId, workouts]
  );
  const session = useMemo(
    () => workout?.sessions.find((candidate) => candidate.id === sessionId) ?? null,
    [sessionId, workout]
  );

  const [draftBodyweight, setDraftBodyweight] = useState('');
  const [draftSets, setDraftSets] = useState<SessionSetDraft[]>([]);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    setDraftBodyweight(
      session.bodyweightKg === null
        ? ''
        : formatWeightInputFromKg(session.bodyweightKg, settings.weightUnit)
    );
    setDraftSets(createSessionSetDrafts(session, settings.weightUnit));
    setEditError(null);
  }, [session, settings.weightUnit]);

  const sessionDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    []
  );

  const groupedSessionSets = useMemo(() => {
    const draftSetLookup = new Map(draftSets.map((setEntry) => [setEntry.id, setEntry]));

    return groupWorkoutSessionSets(session?.sets ?? []).map((group) => ({
      ...group,
      sets: group.sets.map((setEntry) => ({
        ...setEntry,
        draft: draftSetLookup.get(setEntry.id) ?? null,
      })),
    }));
  }, [draftSets, session?.sets]);

  const totalReps = session?.sets.reduce((sum, setEntry) => sum + setEntry.reps, 0) ?? 0;
  const totalVolumeKg = session ? getWorkoutSessionVolumeKg(session) : 0;
  const durationLabel =
    session?.durationMs === null || session?.durationMs === undefined
      ? 'Unknown'
      : formatDuration(session.durationMs);

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
    if (!workout || !session) {
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

    const trimmedBodyweight = draftBodyweight.trim();
    const parsedBodyweight =
      trimmedBodyweight.length === 0
        ? null
        : parseWeightInputToKg(trimmedBodyweight, settings.weightUnit);

    if (
      trimmedBodyweight.length > 0 &&
      (parsedBodyweight === null || parsedBodyweight <= 0)
    ) {
      setEditError('Bodyweight must be above zero when provided.');
      return;
    }

    try {
      setEditError(null);
      await editWorkoutSession({
        sessionId: session.id,
        workoutId: workout.id,
        performedAt: session.performedAt,
        durationMs: session.durationMs,
        bodyweightKg: parsedBodyweight,
        sets: parsedSets,
      });
      navigation.goBack();
    } catch {
      setEditError('Could not save session edits right now.');
    }
  };

  if (!workout || !session) {
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
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backButton,
              {
                opacity: pressed ? opacity.pressedSoft : 1,
              },
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={designTokens.sizes.iconSmall}
              color={theme.palette.textPrimary}
            />
            <AppText variant="label">History</AppText>
          </Pressable>

          <View
            style={[
              styles.missingCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="heading">Session not found</AppText>
            <AppText tone="muted">
              This workout log may have been deleted while you were viewing it.
            </AppText>
          </View>
        </ScrollView>
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
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            {
              opacity: pressed ? opacity.pressedSoft : 1,
            },
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={designTokens.sizes.iconSmall}
            color={theme.palette.textPrimary}
          />
          <AppText variant="label">History</AppText>
        </Pressable>

        <View
          style={[
            styles.hero,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}
        >
          <AppText variant="micro" tone="accent">
            SESSION LOG
          </AppText>
          <AppText variant="title">{workout.name}</AppText>
          <AppText tone="muted">
            {sessionDateFormatter.format(new Date(session.performedAt))}
          </AppText>
        </View>

        <View style={styles.summaryGrid}>
          <View
            style={[
              styles.summaryCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="micro" tone="muted">
              Exercises
            </AppText>
            <AppText variant="heading">{groupedSessionSets.length}</AppText>
          </View>
          <View
            style={[
              styles.summaryCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="micro" tone="muted">
              Total Sets
            </AppText>
            <AppText variant="heading">{session.sets.length}</AppText>
          </View>
          <View
            style={[
              styles.summaryCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="micro" tone="muted">
              Reps
            </AppText>
            <AppText variant="heading">{totalReps}</AppText>
          </View>
          <View
            style={[
              styles.summaryCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="micro" tone="muted">
              Volume
            </AppText>
            <AppText variant="heading" tone="accent">
              {formatWeightFromKg(totalVolumeKg, settings.weightUnit)}
            </AppText>
          </View>
        </View>

        <View style={styles.utilityRow}>
          <View
            style={[
              styles.utilityCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <View style={styles.utilityHint}>
              <AppText variant="micro" tone="muted">
                Workout Duration
              </AppText>
              <AppText variant="heading">{durationLabel}</AppText>
            </View>
            <AppText tone="muted">
              Locked after the session is finished so the recorded time stays accurate.
            </AppText>
          </View>

          <View
            style={[
              styles.utilityCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <NeonInput
              label="Bodyweight"
              helperText="Optional"
              keyboardType={WEIGHT_KEYBOARD_TYPE}
              value={draftBodyweight}
              onChangeText={setDraftBodyweight}
              suffix={settings.weightUnit}
            />
          </View>
        </View>

        {groupedSessionSets.map((group) => (
          <View
            key={group.workoutExerciseId}
            style={[
              styles.exerciseSection,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <View style={styles.exerciseHeader}>
              <AppText variant="heading">{group.exerciseName}</AppText>
              <AppText tone="muted">
                {group.sets.length} set{group.sets.length === 1 ? '' : 's'} logged
              </AppText>
            </View>

            {group.sets.map((setEntry) => {
              const draft = setEntry.draft;

              if (!draft) {
                return null;
              }

              return (
                <View
                  key={setEntry.id}
                  style={[
                    styles.setCard,
                    {
                      borderColor: theme.palette.border,
                      backgroundColor: theme.palette.panelSoft,
                    },
                  ]}
                >
                  <View style={styles.setHeader}>
                    <View
                      style={[
                        styles.setHeaderBadge,
                        {
                          borderColor: theme.palette.border,
                          backgroundColor: theme.palette.panel,
                        },
                      ]}
                    >
                      <AppText variant="label">Set {setEntry.setNumber}</AppText>
                    </View>
                    <AppText tone="muted">
                      Recorded volume{' '}
                      {formatWeightFromKg(
                        Math.abs(setEntry.weightKg) * setEntry.reps,
                        settings.weightUnit
                      )}
                    </AppText>
                  </View>

                  <View style={styles.setInputsRow}>
                    <View style={styles.setInputCell}>
                      <NeonInput
                        label="Reps"
                        keyboardType="number-pad"
                        value={draft.repsInput}
                        onChangeText={(value) =>
                          updateDraftSet(draft.id, { repsInput: value })
                        }
                      />
                    </View>
                    <View style={styles.setInputCell}>
                      <NeonInput
                        label="Weight"
                        keyboardType={WEIGHT_KEYBOARD_TYPE}
                        value={draft.weightInput}
                        onChangeText={(value) =>
                          updateDraftSet(draft.id, { weightInput: value })
                        }
                        suffix={settings.weightUnit}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        {editError ? <ErrorNotice message={editError} /> : null}

        <NeonButton
          title="Save Session Changes"
          onPress={() => {
            void saveSessionEdits();
          }}
          disabled={mutating}
        />
      </ScrollView>
    </View>
  );
}
