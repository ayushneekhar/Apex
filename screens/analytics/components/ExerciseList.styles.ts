import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, radii, spacing } = designTokens;

export const styles = StyleSheet.create({
  card: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingRight: spacing.lg,
    paddingLeft: spacing.lg,
  },
  selectedBar: {
    position: 'absolute',
    left: 0,
    top: spacing.sm,
    bottom: spacing.sm,
    width: 3,
    borderTopRightRadius: radii.sm,
    borderBottomRightRadius: radii.sm,
  },
  rowName: {
    flex: 1,
    gap: spacing.xxxs,
  },
  rowValue: {
    width: 84,
    alignItems: 'flex-end',
    gap: spacing.xxxs,
  },
});
