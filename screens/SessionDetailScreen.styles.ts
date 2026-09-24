import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, layout, radii, sizes, spacing, typography } = designTokens;
const SET_NUMBER_COLUMN_WIDTH = 44;
const SET_NUMBER_BADGE_SIZE = 26;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenHorizontalInset,
    gap: spacing.xxl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    width: sizes.controlMinHeight,
    height: sizes.controlMinHeight,
    borderWidth: border.thin,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    gap: spacing.xs,
  },
  volumeCard: {
    borderWidth: border.thin,
    borderRadius: radii.hero,
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  volumeHeadline: {
    gap: spacing.xxs,
  },
  volumeDivider: {
    height: border.thin,
  },
  statRow: {
    flexDirection: 'row',
  },
  statCell: {
    flex: 1,
    gap: spacing.xxs,
  },
  bodyweightRow: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bodyweightText: {
    flex: 1,
    gap: spacing.xxxs,
  },
  bodyweightInput: {
    width: 110,
  },
  exerciseCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxs,
  },
  exerciseName: {
    flex: 1,
  },
  setTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: border.thin,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  setNumberColumn: {
    width: SET_NUMBER_COLUMN_WIDTH,
  },
  setNumberBadge: {
    width: SET_NUMBER_BADGE_SIZE,
    height: SET_NUMBER_BADGE_SIZE,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumberText: {
    fontFamily: 'Unbounded_500Medium',
    letterSpacing: 0,
  },
  setInputColumn: {
    flex: 1,
  },
  compactInput: {
    minHeight: sizes.controlMinHeight,
    borderWidth: border.thin,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  compactInputText: {
    flex: 1,
    fontFamily: 'Unbounded_500Medium',
    fontSize: typography.inputBodySize,
    lineHeight: typography.inputBodyLineHeight,
    paddingVertical: spacing.sm,
  },
  missingCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.xl,
    gap: spacing.sm,
  },
});
