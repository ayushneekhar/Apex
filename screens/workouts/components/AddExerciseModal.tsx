import { Modal, Pressable, ScrollView, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonInput } from "@/components/ui/neon-input";
import { designTokens } from "@/constants/design-system";

import { WEIGHT_KEYBOARD_TYPE } from "../constants";
import type { WorkoutsScreenController } from "../hooks/use-workouts-screen-controller";
import { ErrorNotice } from "./common/ErrorNotice";
import { styles } from "./SessionModal.styles";

const { opacity } = designTokens;

export function AddExerciseModal({
  controller,
}: {
  controller: WorkoutsScreenController;
}) {
  const { theme } = controller;
  const selectedExerciseName = controller.addExerciseNameInput.trim().toLowerCase();

  return (
    <Modal
      visible={controller.isAddExerciseOpen}
      transparent
      animationType="fade"
      onRequestClose={controller.closeAddExercise}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
              maxHeight: "85%",
            },
          ]}
        >
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            <AppText variant="heading">Add Exercise</AppText>

            <NeonInput
              label="Exercise"
              placeholder="Bench Press"
              value={controller.addExerciseNameInput}
              onChangeText={(value) => {
                controller.setAddExerciseNameInput(value);
                controller.clearAddExerciseError();
              }}
            />

            <View style={styles.exerciseChipContainer}>
              {controller.addExerciseFilteredLibrary.map((exerciseName) => {
                const selected = selectedExerciseName === exerciseName.toLowerCase();

                return (
                  <Pressable
                    key={exerciseName}
                    onPress={() => {
                      controller.setAddExerciseNameInput(exerciseName);
                      controller.clearAddExerciseError();
                    }}
                    style={({ pressed }) => [
                      styles.exerciseChip,
                      {
                        borderColor: selected ? theme.palette.accent : theme.palette.border,
                        backgroundColor: selected
                          ? `${theme.palette.accent}2b`
                          : theme.palette.panelSoft,
                        opacity: pressed ? opacity.pressedSoft : 1,
                      },
                    ]}
                  >
                    <AppText variant="micro" tone={selected ? "accent" : "muted"}>
                      {exerciseName}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldCell}>
                <NeonInput
                  label="Sets"
                  keyboardType="number-pad"
                  value={controller.addExerciseSetsInput}
                  onChangeText={(value) => {
                    controller.setAddExerciseSetsInput(value);
                    controller.clearAddExerciseError();
                  }}
                />
              </View>
              <View style={styles.fieldCell}>
                <NeonInput
                  label="Reps"
                  keyboardType="number-pad"
                  value={controller.addExerciseRepsInput}
                  onChangeText={(value) => {
                    controller.setAddExerciseRepsInput(value);
                    controller.clearAddExerciseError();
                  }}
                />
              </View>
              <View style={styles.fieldCell}>
                <NeonInput
                  label="Weight"
                  keyboardType={WEIGHT_KEYBOARD_TYPE}
                  placeholder="Last"
                  suffix={controller.settings.weightUnit}
                  value={controller.addExerciseWeightInput}
                  onChangeText={(value) => {
                    controller.setAddExerciseWeightInput(value);
                    controller.clearAddExerciseError();
                  }}
                />
              </View>
            </View>

            {controller.addExerciseError ? (
              <ErrorNotice message={controller.addExerciseError} />
            ) : null}

            <View style={styles.actions}>
              <View style={styles.actionCell}>
                <NeonButton title="Cancel" variant="ghost" onPress={controller.closeAddExercise} />
              </View>
              <View style={styles.actionCell}>
                <NeonButton title="Add" onPress={() => void controller.saveAddExercise()} />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
