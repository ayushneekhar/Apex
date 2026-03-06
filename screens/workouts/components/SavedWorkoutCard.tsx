import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { NeonButton } from '@/components/ui/neon-button';
import { OverloadButton } from '@/components/ui/overload-button';
import { designTokens } from '@/constants/design-system';
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
  const [isApplyingOverload, setIsApplyingOverload] = useState(false);
  const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  const supersetCount = workout.exercises.filter((exercise) => exercise.supersetWithNext).length;
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
          void controller.beginWorkout(workout.id);
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
                controller.openComposerForEdit(workout);
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
              <Ionicons name="create-outline" size={layout.screenTopInset} color={theme.palette.accent} />
            </Pressable>
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
          {supersetCount > 0 ? (
            <MetaChip controller={controller} label={`${supersetCount} superset${supersetCount === 1 ? '' : 's'}`} />
          ) : null}
        </View>

        <AppText tone="muted">
          {lastSession
            ? `Last completed on ${controller.sessionDateFormatter.format(new Date(lastSession.performedAt))}`
            : 'No completed sessions yet.'}
        </AppText>
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

function MetaChip({ controller, label }: { controller: WorkoutsScreenController; label: string }) {
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
      <AppText variant="micro" tone="muted">
        {label}
      </AppText>
    </View>
  );
}
