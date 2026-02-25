import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, layout, radii, spacing } = designTokens;

export const styles = StyleSheet.create({
  heroCard: {
    borderWidth: border.thin,
    borderRadius: radii.hero,
    padding: layout.screenHorizontalInset,
    gap: spacing.xl,
    overflow: 'hidden',
  },
  heroCompact: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.lg,
    gap: spacing.md,
  },
  compactHeroTextWrap: {
    gap: spacing.xxs,
  },
});
