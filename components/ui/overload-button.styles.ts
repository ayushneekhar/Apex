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
    minHeight: sizes.iconMedium,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
