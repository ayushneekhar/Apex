import { Modal, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonInput } from "@/components/ui/neon-input";

import type { WorkoutsScreenController } from "../hooks/use-workouts-screen-controller";
import { ErrorNotice } from "./common/ErrorNotice";
import { styles } from "./SessionModal.styles";

export function EditExerciseModal({
  controller,
}: {
  controller: WorkoutsScreenController;
}) {
  const { theme } = controller;
  const exerciseName = controller.exerciseEditorSets[0]?.exerciseName ?? "Exercise";

  return (
    <Modal
      visible={controller.exerciseEditorExerciseId !== null}
      transparent
      animationType="fade"
      onRequestClose={controller.closeExerciseEditor}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}
        >
          <AppText variant="heading">Edit {exerciseName}</AppText>
          <AppText tone="muted">
            Update sets and target reps for this session, or push the same change into the template for future workouts.
          </AppText>

          <View style={styles.fieldRow}>
            <View style={styles.fieldCell}>
              <NeonInput
                label="Sets"
                keyboardType="number-pad"
                value={controller.exerciseEditorSetsInput}
                onChangeText={(value) => {
                  controller.setExerciseEditorSetsInput(value);
                  controller.clearExerciseEditorError();
                }}
              />
            </View>

            <View style={styles.fieldCell}>
              <NeonInput
                label="Reps"
                keyboardType="number-pad"
                value={controller.exerciseEditorRepsInput}
                onChangeText={(value) => {
                  controller.setExerciseEditorRepsInput(value);
                  controller.clearExerciseEditorError();
                }}
              />
            </View>
          </View>

          {controller.exerciseEditorError ? (
            <ErrorNotice message={controller.exerciseEditorError} />
          ) : null}

          <View style={styles.actionStack}>
            <NeonButton
              title="Just This Workout"
              onPress={() => void controller.saveExerciseEditorValues("session")}
            />
            <NeonButton
              title="Update Template Too"
              variant="ghost"
              onPress={() => void controller.saveExerciseEditorValues("template")}
            />
            <NeonButton
              title="Cancel"
              variant="ghost"
              onPress={controller.closeExerciseEditor}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
