import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonInput } from '@/components/ui/neon-input';
import { designTokens } from '@/constants/design-system';

import type { WorkoutBuilderViewController } from '../types';
import { ErrorNotice } from './common/ErrorNotice';
import { ExerciseDraftCard } from './ExerciseDraftCard';
import { styles } from './WorkoutBuilderPanel.styles';

const { opacity } = designTokens;

export function WorkoutBuilderPanel({
  controller,
}: {
  controller: WorkoutBuilderViewController;
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

      <NeonInput
        label="Workout Order"
        placeholder="1"
        keyboardType="number-pad"
        helperText="Lower numbers come first when picking the next workout."
        value={controller.workoutOrder}
        onChangeText={(value) => {
          controller.clearFormError();
          controller.setWorkoutOrder(value);
        }}
      />

      <AppText variant="label" tone="muted">
        Pick Exercises
      </AppText>

      <View style={styles.exerciseChipContainer}>
        {controller.filteredExerciseLibrary.length === 0 ? (
          <AppText tone="muted">No matching exercises in the library.</AppText>
        ) : null}
        {controller.filteredExerciseLibrary.map((exerciseName) => {
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
