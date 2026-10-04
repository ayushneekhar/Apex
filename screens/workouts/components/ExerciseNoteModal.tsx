import { Modal, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonInput } from "@/components/ui/neon-input";

import type { WorkoutsScreenController } from "../hooks/use-workouts-screen-controller";
import { styles } from "./SessionModal.styles";

const NOTE_MAX_LENGTH = 280;

export function ExerciseNoteModal({
  controller,
}: {
  controller: WorkoutsScreenController;
}) {
  const { theme } = controller;
  const previousNote = controller.noteEditorExerciseName
    ? controller.getPreviousExerciseNote(controller.noteEditorExerciseName)
    : null;

  return (
    <Modal
      visible={controller.noteEditorExerciseId !== null}
      transparent
      animationType="fade"
      onRequestClose={controller.closeNoteEditor}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            { borderColor: theme.palette.border, backgroundColor: theme.palette.panel },
          ]}
        >
          <AppText variant="micro" tone="muted">
            Note
          </AppText>
          <AppText variant="heading">{controller.noteEditorExerciseName}</AppText>

          {previousNote ? (
            <AppText tone="muted">Last time: {previousNote}</AppText>
          ) : null}

          <NeonInput
            autoFocus
            multiline
            maxLength={NOTE_MAX_LENGTH}
            placeholder="Seat height 4, narrow grip…"
            value={controller.noteInput}
            onChangeText={controller.setNoteInput}
            style={styles.noteInput}
          />

          <View style={styles.actions}>
            <View style={styles.actionCell}>
              <NeonButton title="Cancel" variant="ghost" onPress={controller.closeNoteEditor} />
            </View>
            <View style={styles.actionCell}>
              <NeonButton title="Save" onPress={() => void controller.saveNote()} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
