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
  header: {
    gap: spacing.lg,
  },
  summaryRow: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryCell: {
    flex: 1,
    gap: spacing.xxs,
  },
  summaryDivider: {
    width: border.thin,
  },
  emptyCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
