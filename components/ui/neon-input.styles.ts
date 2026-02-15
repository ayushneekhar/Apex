import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, radii, sizes, spacing, typography } = designTokens;

export const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  inputShell: {
    minHeight: sizes.inputMinHeight,
    borderWidth: border.thin,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: 'Unbounded_400Regular',
    fontSize: typography.inputBodySize,
    lineHeight: typography.inputBodyLineHeight,
    paddingVertical: spacing.md,
  },
  suffix: {
    flexShrink: 0,
  },
});
