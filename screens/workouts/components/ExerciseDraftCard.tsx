import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { NeonInput } from '@/components/ui/neon-input';
import { designTokens } from '@/constants/design-system';
import { DEFAULT_REST_SECONDS, REST_TIMER_STEP_SECONDS } from '@/constants/workout';

import { WEIGHT_KEYBOARD_TYPE } from '../constants';
import type { WorkoutsScreenController } from '../hooks/use-workouts-screen-controller';
import type { ExerciseDraft } from '../types';
import { clampRestSeconds, formatDuration, parseRestSecondsInput } from '../utils';
import { styles } from './ExerciseDraftCard.styles';

const { layout, opacity } = designTokens;

type Props = {
  controller: WorkoutsScreenController;
  draft: ExerciseDraft;
};

export function ExerciseDraftCard({ controller, draft }: Props) {
  const { theme, settings, defaultOverload } = controller;
  const parsedRestSeconds = parseRestSecondsInput(draft.restSeconds);
  const restSeconds =
    parsedRestSeconds === null ? DEFAULT_REST_SECONDS : clampRestSeconds(parsedRestSeconds);

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: theme.palette.border,
          backgroundColor: theme.palette.panelSoft,
        },
      ]}
    >
      <View style={styles.header}>
        <AppText variant="heading">{draft.name}</AppText>
        <Pressable
          onPress={() => controller.removeExerciseDraft(draft.id)}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? opacity.pressedMedium : 1 })}
        >
          <Ionicons
            name="close"
            size={layout.screenTopInset}
            color={theme.palette.textMuted}
          />
        </Pressable>
      </View>

      <View style={styles.fieldsRow}>
        <View style={styles.fieldCell}>
          <NeonInput
            label="Sets"
            keyboardType="number-pad"
            value={draft.sets}
            onChangeText={(value) => {
              controller.clearFormError();
              controller.updateExerciseDraft(draft.id, { sets: value });
            }}
          />
        </View>
        <View style={styles.fieldCell}>
          <NeonInput
            label="Reps"
            keyboardType="number-pad"
            value={draft.reps}
            onChangeText={(value) => {
              controller.clearFormError();
              controller.updateExerciseDraft(draft.id, { reps: value });
            }}
          />
        </View>
      </View>

      <View style={styles.fieldsRow}>
        <View style={styles.fieldCell}>
          <NeonInput
            label="Start"
            helperText="Use a negative value for assisted movements."
            keyboardType={WEIGHT_KEYBOARD_TYPE}
            value={draft.startWeight}
            onChangeText={(value) => {
              controller.clearFormError();
              controller.updateExerciseDraft(draft.id, { startWeight: value });
            }}
            suffix={settings.weightUnit}
          />
        </View>
        <View style={styles.fieldCell}>
          <NeonInput
            label="Overload / week"
            helperText={`Default: ${defaultOverload}`}
            keyboardType="decimal-pad"
            value={draft.overload}
            onChangeText={(value) => {
              controller.clearFormError();
              controller.updateExerciseDraft(draft.id, { overload: value });
            }}
            suffix={settings.weightUnit}
          />
        </View>
      </View>

      <View
        style={[
          styles.restRow,
          {
            borderColor: theme.palette.border,
            backgroundColor: theme.palette.panel,
          },
        ]}
      >
        <AppText variant="micro" tone="muted">
          Rest Timer
        </AppText>
        <View style={styles.restControls}>
          <Pressable
            onPress={() => controller.adjustDraftRestSeconds(draft.id, -REST_TIMER_STEP_SECONDS)}
            style={({ pressed }) => [
              styles.restButton,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panelSoft,
                opacity: pressed ? opacity.pressedSoft : 1,
              },
            ]}
          >
            <Ionicons name="remove" size={layout.screenTopInset} color={theme.palette.textPrimary} />
          </Pressable>
          <View style={styles.restValue}>
            <AppText variant="label">{formatDuration(restSeconds * 1000)}</AppText>
          </View>
          <Pressable
            onPress={() => controller.adjustDraftRestSeconds(draft.id, REST_TIMER_STEP_SECONDS)}
            style={({ pressed }) => [
              styles.restButton,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panelSoft,
                opacity: pressed ? opacity.pressedSoft : 1,
              },
            ]}
          >
            <Ionicons name="add" size={layout.screenTopInset} color={theme.palette.textPrimary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
