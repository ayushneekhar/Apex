import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, layout, radii, spacing } = designTokens;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenHorizontalInset,
    gap: spacing.xl,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  hero: {
    borderWidth: border.thin,
    borderRadius: radii.hero,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryCard: {
    width: '48%',
    borderWidth: border.thin,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  utilityRow: {
    gap: spacing.sm,
  },
  utilityCard: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  utilityHint: {
    gap: spacing.xxs,
  },
  exerciseSection: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.lg,
    gap: spacing.md,
  },
  exerciseHeader: {
    gap: spacing.xxs,
  },
  setCard: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  setHeaderBadge: {
    borderWidth: border.thin,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  setInputsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  setInputCell: {
    flex: 1,
  },
  missingCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.xl,
    gap: spacing.sm,
  },
});
