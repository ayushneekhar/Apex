import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonGridBackground } from '@/components/ui/neon-grid-background';
import type { AppTheme } from '@/constants/app-themes';
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

function getBodyweightInput(session: WorkoutSession | null, weightUnit: 'kg' | 'lb'): string {
  return session?.bodyweightKg == null
    ? ''
    : formatWeightInputFromKg(session.bodyweightKg, weightUnit);
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

  const [draftBodyweight, setDraftBodyweight] = useState(() =>
    getBodyweightInput(session, settings.weightUnit)
  );
  const [draftSets, setDraftSets] = useState<SessionSetDraft[]>(() =>
    session ? createSessionSetDrafts(session, settings.weightUnit) : []
  );
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    setDraftBodyweight(getBodyweightInput(session, settings.weightUnit));
    setDraftSets(createSessionSetDrafts(session, settings.weightUnit));
    setEditError(null);
  }, [session, settings.weightUnit]);

  const sessionDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
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

  const hasUnsavedChanges = useMemo(() => {
    if (!session) {
      return false;
    }

    if (draftBodyweight.trim() !== getBodyweightInput(session, settings.weightUnit)) {
      return true;
    }

    const originalDrafts = new Map(
      createSessionSetDrafts(session, settings.weightUnit).map((draft) => [draft.id, draft])
    );

    return draftSets.some((draft) => {
      const original = originalDrafts.get(draft.id);
      return (
        !original ||
        original.repsInput !== draft.repsInput.trim() ||
        original.weightInput !== draft.weightInput.trim()
      );
    });
  }, [draftBodyweight, draftSets, session, settings.weightUnit]);

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
      // Defer navigation to let the store update settle before unmounting
      requestAnimationFrame(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      });
    } catch {
      setEditError('Could not save session edits right now.');
    }
  };

  const renderBackButton = () => (
    <Pressable
      onPress={() => navigation.goBack()}
      hitSlop={8}
      style={({ pressed }) => [
        styles.backButton,
        {
          borderColor: theme.palette.border,
          backgroundColor: theme.palette.panel,
          opacity: pressed ? opacity.pressedSoft : 1,
        },
      ]}
    >
      <Ionicons
        name="chevron-back"
        size={designTokens.sizes.iconSmall}
        color={theme.palette.textPrimary}
      />
    </Pressable>
  );

  if (!workout || !session) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.palette.background }]}>
        <NeonGridBackground />

        <View
          style={[
            styles.content,
            {
              paddingTop: insets.top + layout.screenTopInset,
            },
          ]}
        >
          {renderBackButton()}

          <View
            style={[
              styles.missingCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="label">Session not found</AppText>
            <AppText tone="muted">
              This workout log may have been deleted while you were viewing it.
            </AppText>
          </View>
        </View>
      </View>
    );
  }

  const summaryStats = [
    { label: 'Duration', value: durationLabel },
    { label: 'Sets', value: String(session.sets.length) },
    { label: 'Reps', value: String(totalReps) },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.palette.background }]}>
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
      >
        <View style={styles.topBar}>
          {renderBackButton()}
          <AppText variant="micro" tone="muted">
            Session log
          </AppText>
        </View>

        <View style={styles.titleBlock}>
          <AppText variant="micro" tone="accent">
            {sessionDateFormatter.format(new Date(session.performedAt))}
          </AppText>
          <AppText variant="title">{workout.name}</AppText>
        </View>

        <View
          style={[
            styles.volumeCard,
            {
              borderColor: `${theme.palette.accent}55`,
              backgroundColor: `${theme.palette.accent}12`,
            },
          ]}
        >
          <View style={styles.volumeHeadline}>
            <AppText variant="micro" tone="muted">
              Total volume
            </AppText>
            <AppText variant="display" tone="accent" numberOfLines={1} adjustsFontSizeToFit>
              {formatWeightFromKg(totalVolumeKg, settings.weightUnit)}
            </AppText>
          </View>

          <View style={[styles.volumeDivider, { backgroundColor: `${theme.palette.accent}33` }]} />

          <View style={styles.statRow}>
            {summaryStats.map((stat) => (
              <View key={stat.label} style={styles.statCell}>
                <AppText variant="label">{stat.value}</AppText>
                <AppText variant="micro" tone="muted">
                  {stat.label}
                </AppText>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.bodyweightRow,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}
        >
          <Ionicons name="body-outline" size={18} color={theme.palette.textMuted} />
          <View style={styles.bodyweightText}>
            <AppText variant="label">Bodyweight</AppText>
            <AppText variant="micro" tone="muted">
              Optional
            </AppText>
          </View>
          <CompactInput
            theme={theme}
            keyboardType={WEIGHT_KEYBOARD_TYPE}
            value={draftBodyweight}
            onChangeText={setDraftBodyweight}
            placeholder="--"
            suffix={settings.weightUnit}
            style={styles.bodyweightInput}
          />
        </View>

        {groupedSessionSets.map((group) => {
          const groupVolumeKg = group.sets.reduce(
            (total, setEntry) => total + Math.abs(setEntry.weightKg) * setEntry.reps,
            0
          );

          return (
            <View
              key={group.workoutExerciseId}
              style={[
                styles.exerciseCard,
                {
                  borderColor: theme.palette.border,
                  backgroundColor: theme.palette.panel,
                },
              ]}
            >
              <View style={styles.exerciseHeader}>
                <AppText variant="label" style={styles.exerciseName} numberOfLines={2}>
                  {group.exerciseName}
                </AppText>
                <AppText variant="micro" tone="muted">
                  {formatWeightFromKg(groupVolumeKg, settings.weightUnit)}
                </AppText>
              </View>

              <View style={[styles.setTableHeader, { borderBottomColor: theme.palette.border }]}>
                <AppText variant="micro" tone="muted" style={styles.setNumberColumn}>
                  Set
                </AppText>
                <AppText variant="micro" tone="muted" style={styles.setInputColumn}>
                  Reps
                </AppText>
                <AppText variant="micro" tone="muted" style={styles.setInputColumn}>
                  Weight ({settings.weightUnit})
                </AppText>
              </View>

              {group.sets.map((setEntry) => {
                const draft = setEntry.draft;

                if (!draft) {
                  return null;
                }

                return (
                  <View key={setEntry.id} style={styles.setRow}>
                    <View style={styles.setNumberColumn}>
                      <View
                        style={[
                          styles.setNumberBadge,
                          {
                            backgroundColor: setEntry.reps > 0
                              ? theme.palette.accent
                              : theme.palette.panelSoft,
                          },
                        ]}
                      >
                        <AppText
                          variant="micro"
                          tone={setEntry.reps > 0 ? 'inverse' : 'muted'}
                          style={styles.setNumberText}
                        >
                          {setEntry.setNumber}
                        </AppText>
                      </View>
                    </View>
                    <CompactInput
                      theme={theme}
                      keyboardType="number-pad"
                      value={draft.repsInput}
                      onChangeText={(value) => updateDraftSet(draft.id, { repsInput: value })}
                      style={styles.setInputColumn}
                    />
                    <CompactInput
                      theme={theme}
                      keyboardType={WEIGHT_KEYBOARD_TYPE}
                      value={draft.weightInput}
                      onChangeText={(value) => updateDraftSet(draft.id, { weightInput: value })}
                      style={styles.setInputColumn}
                    />
                  </View>
                );
              })}
            </View>
          );
        })}

        {editError ? <ErrorNotice message={editError} /> : null}

        <NeonButton
          title={hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
          variant={hasUnsavedChanges ? 'primary' : 'ghost'}
          onPress={() => {
            void saveSessionEdits();
          }}
          disabled={mutating || !hasUnsavedChanges}
        />
      </KeyboardAwareScrollView>
    </View>
  );
}

function CompactInput({
  theme,
  suffix,
  style,
  ...rest
}: TextInputProps & {
  theme: AppTheme;
  suffix?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.compactInput,
        {
          borderColor: theme.palette.border,
          backgroundColor: theme.palette.panelSoft,
        },
        style,
      ]}
    >
      <TextInput
        {...rest}
        selectTextOnFocus
        placeholderTextColor={theme.palette.textMuted}
        style={[styles.compactInputText, { color: theme.palette.textPrimary }]}
      />
      {suffix ? (
        <AppText variant="micro" tone="muted">
          {suffix}
        </AppText>
      ) : null}
    </View>
  );
}
