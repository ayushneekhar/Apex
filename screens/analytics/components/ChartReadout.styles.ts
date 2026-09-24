import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { radii, spacing } = designTokens;

export const styles = StyleSheet.create({
  readout: {
    gap: spacing.xxs,
    minHeight: 74,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  prBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxxs,
  },
});
