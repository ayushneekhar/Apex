import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, radii, spacing } = designTokens;

const TRACK_HEIGHT = 3;

export const styles = StyleSheet.create({
  badge: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
});
