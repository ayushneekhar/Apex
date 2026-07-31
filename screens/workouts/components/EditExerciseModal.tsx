import { Modal, Pressable, ScrollView, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonInput } from "@/components/ui/neon-input";
import { designTokens } from "@/constants/design-system";

import type { WorkoutsScreenController } from "../hooks/use-workouts-screen-controller";
import { ErrorNotice } from "./common/ErrorNotice";
import { styles } from "./SessionModal.styles";

const { opacity } = designTokens;

export function EditExerciseModal({
  controller,
}: {
  controller: WorkoutsScreenController;
}) {
  const { theme } = controller;
  const selectedExerciseName = controller.exerciseEditorNameInput.trim().toLowerCase();

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
              maxHeight: "85%",
            },
          ]}
        >
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            <AppText variant="heading">Edit Exercise</AppText>
            <AppText tone="muted">
              Change the exercise, sets, and target reps for this session, or push the same change into the template for future workouts.
            </AppText>

            <NeonInput
              label="Exercise"
              placeholder="Bench Press"
              value={controller.exerciseEditorNameInput}
              onChangeText={(value) => {
                controller.setExerciseEditorNameInput(value);
                controller.clearExerciseEditorError();
              }}
            />

            <View style={styles.exerciseChipContainer}>
              {controller.exerciseEditorFilteredLibrary.length === 0 ? (
                <AppText tone="muted">No matching exercises in the library.</AppText>
              ) : null}
              {controller.exerciseEditorFilteredLibrary.map((exerciseName) => {
                const selected = selectedExerciseName === exerciseName.toLowerCase();

                return (
                  <Pressable
                    key={exerciseName}
                    onPress={() => {
                      controller.setExerciseEditorNameInput(exerciseName);
                      controller.clearExerciseEditorError();
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
