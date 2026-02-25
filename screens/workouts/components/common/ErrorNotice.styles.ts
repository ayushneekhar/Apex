import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, radii, spacing } = designTokens;

export const styles = StyleSheet.create({
  box: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
