import { useCallback, useState, type ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { NeonButton } from '@/components/ui/neon-button';
import { OverloadButton } from '@/components/ui/overload-button';
import { designTokens } from '@/constants/design-system';
import type { RootStackParamList } from '@/types/navigation';
import type { Workout } from '@/types/workout';

import type { WorkoutsScreenController } from '../hooks/use-workouts-screen-controller';
import { estimateWorkoutMinutes } from '../utils';
import { styles } from './SavedWorkoutCard.styles';

const { layout, opacity, spacing } = designTokens;

type Props = {
  controller: WorkoutsScreenController;
  workout: Workout;
};

export function SavedWorkoutCard({ controller, workout }: Props) {
  const { theme, activeSession } = controller;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isApplyingOverload, setIsApplyingOverload] = useState(false);
  const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  const supersetPairCount =
    workout.exercises.filter((exercise) => {
      if (!exercise.supersetExerciseId) {
        return false;
      }

      const partner = workout.exercises.find(
        (candidate) => candidate.id === exercise.supersetExerciseId
      );

      return partner !== undefined && exercise.sortOrder < partner.sortOrder;
    }).length;
  const lastSession = workout.sessions[0];
  const sessionBlocked = activeSession !== null && activeSession.workoutId !== workout.id;
  const startButtonTitle = activeSession?.workoutId === workout.id ? 'Continue' : 'Start';
  const handleBeginWorkout = useCallback(() => {
    if (isApplyingOverload) {
      return;
    }

    void controller.beginWorkout(workout.id);
  }, [controller, isApplyingOverload, workout.id]);

  const handleApplyOverload = useCallback(async () => {
    if (isApplyingOverload) {
      return;
    }

    setIsApplyingOverload(true);

    try {
      await controller.applyWeeklyOverload(workout.id);
    } finally {
      setIsApplyingOverload(false);
    }
  }, [controller, isApplyingOverload, workout.id]);

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: theme.palette.border,
          backgroundColor: theme.palette.panel,
        },
      ]}
    >
      <Pressable
        onPress={() => {
          navigation.navigate('WorkoutTemplateEditor', {
            workoutId: workout.id,
          });
        }}
        style={({ pressed }) => [{ opacity: pressed ? opacity.pressedStrong : 1, gap: spacing.lg }]}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="heading">{workout.name}</AppText>
            <AppText variant="micro" tone="muted">
              Week {workout.weeksCompleted + 1} target
            </AppText>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                void controller.removeWorkout(workout.id);
              }}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconButton,
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
          <MetaChip controller={controller} label={`${workout.exercises.length} exercises`} />
          <MetaChip controller={controller} label={`${totalSets} sets`} />
          <MetaChip controller={controller} label={`~${estimateWorkoutMinutes(workout)} min`} />
          {supersetPairCount > 0 ? (
            <MetaChip
              controller={controller}
              icon="git-compare"
              label={`${supersetPairCount} superset${supersetPairCount === 1 ? '' : 's'}`}
            />
          ) : null}
        </View>

        <AppText tone="muted">
          {lastSession
            ? `Last completed on ${controller.sessionDateFormatter.format(new Date(lastSession.performedAt))}`
            : 'No completed sessions yet.'}
        </AppText>

        <View style={styles.editorLinkRow}>
          <AppText variant="label" tone="accent">
            Open template editor
          </AppText>
          <Ionicons
            name="arrow-forward"
            size={16}
            color={theme.palette.accent}
          />
        </View>
      </Pressable>

      <View style={styles.actionRow}>
        <View style={styles.actionButtonCell}>
          <NeonButton
            title={startButtonTitle}
            onPress={handleBeginWorkout}
            disabled={sessionBlocked}
          />
        </View>
        <View style={styles.actionButtonCell}>
          <OverloadButton
            onPress={() => {
              void handleApplyOverload();
            }}
            disabled={isApplyingOverload}
          />
        </View>
      </View>
    </View>
  );
}

function MetaChip({
  controller,
  label,
  icon,
}: {
  controller: WorkoutsScreenController;
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
}) {
  const { theme } = controller;

  return (
    <View
      style={[
        styles.metaChip,
        {
          borderColor: theme.palette.border,
          backgroundColor: theme.palette.panelSoft,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={12} color={theme.palette.textMuted} /> : null}
      <AppText variant="micro" tone="muted">
        {label}
      </AppText>
    </View>
  );
}
