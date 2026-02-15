import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, radii, sizes, spacing } = designTokens;

export const styles = StyleSheet.create({
  base: {
    borderWidth: border.thin,
    borderRadius: radii.xxl,
    minHeight: sizes.inputMinHeight,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
