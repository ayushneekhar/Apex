import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { sizes, spacing } = designTokens;

export const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  bodyweightRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-end',
  },
  bodyweightInputCell: {
    flex: 1,
  },
  bodyweightButtonCell: {
    width: sizes.bodyweightButtonWidth,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  primaryCell: {
    flex: 2,
  },
  dangerCell: {
    flex: 1,
  },
});
