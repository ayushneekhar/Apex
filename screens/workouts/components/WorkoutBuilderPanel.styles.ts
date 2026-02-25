import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, radii, spacing } = designTokens;

export const styles = StyleSheet.create({
  panel: {
    borderWidth: border.thin,
    borderRadius: radii.card,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  exerciseChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  exerciseChip: {
    borderWidth: border.thin,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  customExerciseRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-end',
  },
  customExerciseInput: {
    flex: 1,
  },
  exerciseDraftContainer: {
    gap: spacing.lg,
  },
});
