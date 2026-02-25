import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, layout, radii, spacing } = designTokens;

export const styles = StyleSheet.create({
  resumeBanner: {
    borderWidth: border.thin,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  resumeBannerTextWrap: {
    gap: spacing.xxs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  emptyCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: layout.screenHorizontalInset,
    gap: spacing.sm,
  },
  list: {
    gap: spacing.xl,
  },
});
