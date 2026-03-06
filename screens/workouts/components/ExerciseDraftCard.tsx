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
  const draftIndex = controller.exerciseDrafts.findIndex((item) => item.id === draft.id);
  const nextDraft = draftIndex >= 0 ? controller.exerciseDrafts[draftIndex + 1] : null;
  const previousDraft = draftIndex > 0 ? controller.exerciseDrafts[draftIndex - 1] : null;
  const canStartSuperset = controller.canExerciseStartSuperset(draft.id);
  const isSupersetFollower = previousDraft?.supersetWithNext ?? false;
  const supersetPartnerName = draft.supersetWithNext
    ? nextDraft?.name ?? null
    : isSupersetFollower
      ? previousDraft?.name ?? null
      : null;

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
        <View style={styles.headerContent}>
          <AppText variant="heading">{draft.name}</AppText>
          {supersetPartnerName ? (
            <View
              style={[
                styles.supersetBadge,
                {
                  borderColor: `${theme.palette.accent}55`,
                  backgroundColor: `${theme.palette.accent}16`,
                },
              ]}
            >
              <Ionicons name="git-compare-outline" size={14} color={theme.palette.accent} />
              <AppText variant="micro" tone="accent">
                {draft.supersetWithNext ? `Superset with ${supersetPartnerName}` : `Paired with ${supersetPartnerName}`}
              </AppText>
            </View>
          ) : null}
        </View>
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

      <Pressable
        onPress={() => {
          controller.clearFormError();
          controller.toggleExerciseSuperset(draft.id);
        }}
        disabled={!canStartSuperset && !draft.supersetWithNext}
        style={({ pressed }) => [
          styles.supersetToggle,
          {
            borderColor: draft.supersetWithNext ? theme.palette.accent : theme.palette.border,
            backgroundColor: draft.supersetWithNext ? `${theme.palette.accent}18` : theme.palette.panel,
            opacity:
              !canStartSuperset && !draft.supersetWithNext
                ? opacity.disabled
                : pressed
                  ? opacity.pressedSoft
                  : 1,
          },
        ]}
      >
        <View style={styles.supersetToggleText}>
          <AppText variant="label">
            {draft.supersetWithNext ? 'Superset Enabled' : 'Superset With Next'}
          </AppText>
          <AppText variant="micro" tone="muted">
            {draft.supersetWithNext
              ? `Alternates with ${nextDraft?.name ?? 'the next exercise'} before rest.`
              : isSupersetFollower
                ? `This exercise already pairs with ${previousDraft?.name ?? 'the previous exercise'}.`
                : nextDraft
                  ? `Pair ${draft.name} with ${nextDraft.name} for alternating sets.`
                  : 'Add another exercise below to create a superset.'}
          </AppText>
        </View>
        <Ionicons
          name="git-compare-outline"
          size={layout.screenTopInset}
          color={
            draft.supersetWithNext
              ? theme.palette.accent
              : !canStartSuperset && !draft.supersetWithNext
                ? theme.palette.textMuted
                : theme.palette.textPrimary
          }
        />
      </Pressable>

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
