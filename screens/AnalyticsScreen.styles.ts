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
  hero: {
    borderWidth: border.thin,
    borderRadius: radii.hero,
    padding: layout.screenHorizontalInset,
    gap: spacing.sm,
  },
  summaryRow: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  summaryCell: {
    flex: 1,
    gap: spacing.xs,
  },
  card: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.lg,
    gap: spacing.md,
  },
  exercisePanelsWrap: {
    gap: spacing.md,
  },
  exercisePanel: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.md,
  },
  chartWrap: {
    paddingTop: spacing.xs,
  },
  chartAxisText: {
    fontFamily: 'Unbounded_400Regular',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.35,
  },
  chartEmpty: {
    borderRadius: radii.xl,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    borderWidth: border.thin,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
