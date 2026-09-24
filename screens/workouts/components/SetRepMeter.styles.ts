import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { spacing } = designTokens;

export const styles = StyleSheet.create({
  meter: {
    flex: 1,
    overflow: 'hidden',
  },
  labels: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: spacing.xxxs,
  },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  inverseLabels: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flex: 0,
  },
  inverseMuted: {
    opacity: 0.72,
  },
});
