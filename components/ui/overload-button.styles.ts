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
    overflow: 'hidden',
  },
  content: {
    minHeight: sizes.iconMedium,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
