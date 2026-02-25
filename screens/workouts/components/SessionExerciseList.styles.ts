import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, radii, sizes, spacing } = designTokens;

export const styles = StyleSheet.create({
  exerciseCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.lg,
    gap: spacing.md,
  },
  exerciseHeader: {
    gap: spacing.xxs,
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderWidth: border.thin,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxxs,
  },
  setBoxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  setBox: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    width: '31%',
    minWidth: sizes.setBoxMinWidth,
    minHeight: sizes.setBoxMinHeight,
    overflow: 'hidden',
  },
  setBoxMain: {
    flex: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: spacing.xxxs,
  },
  setBoxWeightBar: {
    flex: 1,
    borderTopWidth: border.thin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
});
