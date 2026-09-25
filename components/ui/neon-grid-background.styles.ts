import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { grid, opacity } = designTokens;

export const NEON_GRID_DEFAULT_LINE_GAP = grid.defaultLineGap;
export const NEON_GRID_PARALLAX_GRID_SHIFT = grid.parallaxGridShift;
export const NEON_GRID_WASH_OPACITY = opacity.neonWash;

export const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFill,
  },
});
