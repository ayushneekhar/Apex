import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { grid, opacity } = designTokens;

export const NEON_GRID_DEFAULT_LINE_GAP = grid.defaultLineGap;
export const NEON_GRID_MAX_VERTICAL_LINES = grid.maxVerticalLines;
export const NEON_GRID_MAX_HORIZONTAL_LINES = grid.maxHorizontalLines;

export const styles = StyleSheet.create({
  neonWash: {
    ...StyleSheet.absoluteFillObject,
    opacity: opacity.neonWash,
  },
  verticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  horizontalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
