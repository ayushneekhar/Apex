import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { radii, spacing } = designTokens;

const TRACK_WIDTH = 36;
const TRACK_HEIGHT = 3;

export const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxs,
    // Sit closer to the first card than the screen's normal section gap.
    marginBottom: -spacing.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    marginLeft: spacing.xxs,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
});
