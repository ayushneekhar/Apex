import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';
import Animated, { Easing, LinearTransition } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { designTokens } from '@/constants/design-system';
import { formatWeightFromKg, isAssistedWeightKg } from '@/lib/weight';

import type { AppTheme } from '@/constants/app-themes';
import type { ActiveWorkoutSet } from '@/types/workout';

import type { WorkoutsScreenController } from '../hooks/use-workouts-screen-controller';
import { formatDuration } from '../utils';
import { SessionSetRepControl } from './SessionSetRepControl';
import { styles } from './SessionExerciseList.styles';

const { opacity } = designTokens;
const exerciseCardLayoutTransition = LinearTransition
  .duration(220)
  .easing(Easing.bezier(0.2, 0, 0, 1));

function SessionSetBox({
  controller,
  theme,
  setEntry,
}: {
  controller: WorkoutsScreenController;
  theme: AppTheme;
  setEntry: ActiveWorkoutSet;
}) {
  const completed = setEntry.actualReps > 0;
  const setWeight = formatWeightFromKg(
    Math.abs(setEntry.actualWeightKg),
    controller.settings.weightUnit
  );
  const setIsAssisted = isAssistedWeightKg(setEntry.actualWeightKg);
  // Warm-ups read as secondary: dimmer border, no accent until done.
  const idleBorder = setEntry.isWarmup ? `${theme.palette.border}aa` : theme.palette.border;

  return (
    <View
      style={[
        styles.setBox,
        setEntry.isWarmup ? styles.warmupSetBox : null,
        {
          borderColor: completed ? theme.palette.accent : idleBorder,
          backgroundColor: setEntry.isWarmup ? theme.palette.panel : theme.palette.panelSoft,
        },
      ]}
    >
      <SessionSetRepControl controller={controller} theme={theme} setEntry={setEntry} />

      <Pressable
        onPress={() => {
          controller.handleSetWeightPress(setEntry);
        }}
        style={({ pressed }) => [
          styles.setBoxWeightBar,
          {
            borderTopColor: completed ? theme.palette.accent : idleBorder,
            backgroundColor: completed
              ? `${theme.palette.accent}1f`
              : `${theme.palette.background}4a`,
            opacity: pressed ? opacity.pressedSoft : 1,
          },
        ]}
      >
        <AppText variant="micro" tone={completed ? 'accent' : 'muted'} numberOfLines={1}>
          {setWeight}
          {setIsAssisted ? ' assisted' : ''}
        </AppText>
      </Pressable>

      {setEntry.isWarmup ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove warm-up ${setEntry.setNumber}`}
          hitSlop={8}
          onPress={() => void controller.handleRemoveWarmup(setEntry)}
          style={({ pressed }) => [
            styles.warmupRemoveButton,
            {
              backgroundColor: theme.palette.panelSoft,
              borderColor: theme.palette.border,
              opacity: pressed ? opacity.pressedSoft : 1,
            },
          ]}
        >
          <Ionicons name="close" size={10} color={theme.palette.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function AddExerciseButton({
  controller,
  theme,
}: {
  controller: WorkoutsScreenController;
  theme: AppTheme;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={controller.openAddExercise}
      style={({ pressed }) => [
        styles.addExerciseButton,
        {
          borderColor: theme.palette.border,
          opacity: pressed ? opacity.pressedSoft : 1,
        },
      ]}
    >
      <Ionicons name="add" size={18} color={theme.palette.accent} />
      <AppText variant="label" tone="accent">
        Add exercise
      </AppText>
    </Pressable>
  );
}

export function SessionExerciseList({
  controller,
}: {
  controller: WorkoutsScreenController;
}) {
  const { activeSession, theme, settings } = controller;

  if (!activeSession) {
    return null;
  }

  return (
    <>
      {controller.groupedActiveSets.length === 0 ? (
        <View
          style={[
            styles.emptySessionCard,
            { borderColor: theme.palette.border, backgroundColor: theme.palette.panel },
          ]}
        >
          <Ionicons name="barbell-outline" size={28} color={theme.palette.textMuted} />
          <AppText tone="muted">Add your first exercise to get going.</AppText>
        </View>
      ) : null}

      {controller.groupedActiveSets.map((group) => {
        const note = controller.getExerciseNote(group.workoutExerciseId);
        const previousNote = note ? null : controller.getPreviousExerciseNote(group.exerciseName);
        const groupIsAssisted = isAssistedWeightKg(group.targetWeightKg);
        const completedSetCount = group.sets.filter((setEntry) => setEntry.actualReps > 0).length;
        const groupCompleted = group.sets.length > 0 && completedSetCount === group.sets.length;
        const isCurrentGroup =
          !groupCompleted &&
          group.workoutExerciseId === activeSession.currentExerciseId;

        return (
          <Animated.View
            key={group.workoutExerciseId}
            layout={exerciseCardLayoutTransition}
            style={[
              styles.exerciseCard,
              {
                borderColor: groupCompleted
                  ? theme.palette.success
                  : isCurrentGroup
                    ? theme.palette.accent
                    : theme.palette.border,
                backgroundColor: theme.palette.panel,
                opacity: groupCompleted ? 0.82 : 1,
              },
            ]}
          >
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseTitleRow}>
                <View style={styles.exerciseNameRow}>
                  <AppText variant="heading">{group.exerciseName}</AppText>
                  {groupIsAssisted ? (
                    <Ionicons
                      name="arrow-down-circle"
                      size={16}
                      color={theme.palette.accentSecondary}
                    />
                  ) : null}
                  {group.supersetExerciseId ? (
                    <Ionicons
                      name="git-compare"
                      size={16}
                      color={theme.palette.accent}
                    />
                  ) : null}
                </View>

                <View style={styles.exerciseHeaderActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={note ? 'Edit note' : 'Add note'}
                    onPress={() => {
                      controller.openNoteEditor(group.workoutExerciseId);
                    }}
                    style={({ pressed }) => [
                      styles.exerciseEditButton,
                      {
                        borderColor: note ? `${theme.palette.accent}66` : theme.palette.border,
                        backgroundColor: theme.palette.panelSoft,
                        opacity: pressed ? opacity.pressedSoft : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name={note ? 'document-text' : 'document-text-outline'}
                      size={13}
                      color={note ? theme.palette.accent : theme.palette.textMuted}
                    />
                    <AppText variant="micro" tone={note ? 'accent' : 'muted'}>
                      Note
                    </AppText>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      controller.openExerciseEditor(group.workoutExerciseId);
                    }}
                    style={({ pressed }) => [
                      styles.exerciseEditButton,
                      {
                        borderColor: theme.palette.border,
                        backgroundColor: theme.palette.panelSoft,
                        opacity: pressed ? opacity.pressedSoft : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name="create-outline"
                      size={13}
                      color={theme.palette.textMuted}
                    />
                    <AppText variant="micro" tone="muted">
                      Edit
                    </AppText>
                  </Pressable>

                  {groupCompleted ? (
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          borderColor: `${theme.palette.success}66`,
                          backgroundColor: `${theme.palette.success}1a`,
                        },
                      ]}
                    >
                      <Ionicons name="checkmark-circle" size={14} color={theme.palette.success} />
                      <AppText variant="micro" tone="success">
                        Completed
                      </AppText>
                    </View>
                  ) : isCurrentGroup ? (
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          borderColor: `${theme.palette.accent}66`,
                          backgroundColor: `${theme.palette.accent}18`,
                        },
                      ]}
                    >
                      <Ionicons name="play" size={12} color={theme.palette.accent} />
                      <AppText variant="micro" tone="accent">
                        Current
                      </AppText>
                    </View>
                  ) : null}
                </View>
              </View>
              <AppText variant="micro" tone="muted">
                Target {formatWeightFromKg(Math.abs(group.targetWeightKg), settings.weightUnit)}
                {groupIsAssisted ? ' assisted' : ''}
                {group.supersetExerciseName ? ` • Superset with ${group.supersetExerciseName}` : ''}
                {' • '}Rest {formatDuration(group.restSeconds * 1000)}
              </AppText>
              {note || previousNote ? (
                <Pressable
                  onPress={() => controller.openNoteEditor(group.workoutExerciseId)}
                  style={styles.noteLine}
                >
                  <Ionicons
                    name={note ? 'document-text' : 'time-outline'}
                    size={12}
                    color={note ? theme.palette.accent : theme.palette.textMuted}
                  />
                  <AppText tone={note ? 'primary' : 'muted'} style={styles.noteText} numberOfLines={3}>
                    {note ?? `Last time: ${previousNote}`}
                  </AppText>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.setBoxGrid}>
              {group.warmupSets.map((setEntry) => (
                <SessionSetBox
                  key={setEntry.id}
                  controller={controller}
                  theme={theme}
                  setEntry={setEntry}
                />
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add warm-up set"
                onPress={() => void controller.handleAddWarmup(group.workoutExerciseId)}
                style={({ pressed }) => [
                  styles.addWarmupButton,
                  {
                    borderColor: theme.palette.border,
                    opacity: pressed ? opacity.pressedSoft : 1,
                  },
                ]}
              >
                <Ionicons name="add" size={16} color={theme.palette.textMuted} />
                <AppText variant="micro" tone="muted">
                  W
                </AppText>
              </Pressable>
            </View>

            <View style={styles.setBoxGrid}>
              {group.sets.map((setEntry) => (
                <SessionSetBox
                  key={setEntry.id}
                  controller={controller}
                  theme={theme}
                  setEntry={setEntry}
                />
              ))}
            </View>
          </Animated.View>
        );
      })}

      <AddExerciseButton controller={controller} theme={theme} />
    </>
  );
}
