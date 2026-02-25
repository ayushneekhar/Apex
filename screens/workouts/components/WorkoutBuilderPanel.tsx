import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonInput } from '@/components/ui/neon-input';
import { designTokens } from '@/constants/design-system';
import { EXERCISE_LIBRARY } from '@/constants/exercise-library';

import type { WorkoutsScreenController } from '../hooks/use-workouts-screen-controller';
import { ErrorNotice } from './common/ErrorNotice';
import { ExerciseDraftCard } from './ExerciseDraftCard';
import { styles } from './WorkoutBuilderPanel.styles';

const { opacity } = designTokens;

export function WorkoutBuilderPanel({
  controller,
}: {
  controller: WorkoutsScreenController;
}) {
  const { theme } = controller;

  return (
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
        {controller.editingWorkoutId ? 'Edit Workout Template' : 'Workout Builder'}
      </AppText>

      <NeonInput
        label="Workout Name"
        placeholder="Push / Pull / Legs"
        value={controller.workoutName}
        onChangeText={(value) => {
          controller.clearFormError();
          controller.setWorkoutName(value);
        }}
      />

      <AppText variant="label" tone="muted">
        Pick Exercises
      </AppText>

      <View style={styles.exerciseChipContainer}>
        {EXERCISE_LIBRARY.map((exerciseName) => {
          const selected = controller.selectedExercises.has(exerciseName.toLowerCase());

          return (
            <Pressable
              key={exerciseName}
              onPress={() => {
                controller.clearFormError();
                controller.addExerciseToDraft(exerciseName);
              }}
              style={({ pressed }) => [
                styles.exerciseChip,
                {
                  borderColor: selected ? theme.palette.accent : theme.palette.border,
                  backgroundColor: selected ? `${theme.palette.accent}2b` : theme.palette.panelSoft,
                  opacity: pressed ? opacity.pressedSoft : 1,
                },
              ]}
            >
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
            value={controller.customExerciseName}
            onChangeText={(value) => {
              controller.clearFormError();
              controller.setCustomExerciseName(value);
            }}
          />
        </View>
        <NeonButton
          title="Add"
          variant="ghost"
          onPress={() => {
            controller.clearFormError();
            controller.addCustomExercise();
          }}
        />
      </View>

      <View style={styles.exerciseDraftContainer}>
        {controller.exerciseDrafts.map((draft) => (
          <ExerciseDraftCard key={draft.id} controller={controller} draft={draft} />
        ))}
      </View>

      {controller.formError ? <ErrorNotice tone="danger" message={controller.formError} /> : null}

      <NeonButton
        title={controller.editingWorkoutId ? 'Save Template' : 'Save Workout'}
        onPress={() => void controller.submitWorkout()}
        disabled={controller.mutating}
      />
    </View>
  );
}
