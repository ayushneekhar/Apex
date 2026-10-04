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
  exerciseHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  exerciseEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxxs,
    borderWidth: border.thin,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxxs,
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
  warmupSetBox: {
    width: '23%',
    minWidth: 72,
  },
  warmupRemoveButton: {
    position: 'absolute',
    top: spacing.xxs,
    right: spacing.xxs,
    width: 18,
    height: 18,
    borderRadius: radii.pill,
    borderWidth: border.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addWarmupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxxs,
    borderWidth: border.thin,
    borderStyle: 'dashed',
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    minHeight: sizes.controlMinHeight,
    alignSelf: 'center',
  },
  noteLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  noteText: {
    flex: 1,
  },
  emptySessionCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: border.thin,
    borderStyle: 'dashed',
    borderRadius: radii.panel,
    minHeight: sizes.inputMinHeight,
  },
  setBoxMain: {
    flex: 4,
  },
  setBoxWeightBar: {
    flex: 1,
    borderTopWidth: border.thin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
});
