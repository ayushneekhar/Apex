import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import {
  NEON_GRID_DEFAULT_LINE_GAP,
  NEON_GRID_MAX_HORIZONTAL_LINES,
  NEON_GRID_MAX_VERTICAL_LINES,
  styles,
} from '@/components/ui/neon-grid-background.styles';
import { designTokens } from '@/constants/design-system';

type NeonGridBackgroundProps = {
  lineGap?: number;
};

export function NeonGridBackground({ lineGap = NEON_GRID_DEFAULT_LINE_GAP }: NeonGridBackgroundProps) {
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions();
  const { border } = designTokens;

  const verticalLines = useMemo(() => {
    const count = Math.min(Math.ceil(width / lineGap) + 1, NEON_GRID_MAX_VERTICAL_LINES);
    return Array.from({ length: count }, (_, index) => index);
  }, [lineGap, width]);

  const horizontalLines = useMemo(() => {
    const count = Math.min(Math.ceil(height / lineGap) + 1, NEON_GRID_MAX_HORIZONTAL_LINES);
    return Array.from({ length: count }, (_, index) => index);
  }, [height, lineGap]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[
          theme.palette.background,
          theme.palette.background,
          theme.palette.backgroundAlt,
          theme.palette.background,
        ]}
        locations={[0, 0.45, 0.82, 1]}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={[`${theme.palette.accent}22`, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.neonWash}
      />

      {verticalLines.map((line) => (
        <View
          key={`v_${line}`}
          style={[
            styles.verticalLine,
            {
              left: line * lineGap,
              width: border.thin,
              backgroundColor: theme.palette.gridLine,
            },
          ]}
        />
      ))}

      {horizontalLines.map((line) => (
        <View
          key={`h_${line}`}
          style={[
            styles.horizontalLine,
            {
              top: line * lineGap,
              height: border.thin,
              backgroundColor: theme.palette.gridLine,
            },
          ]}
        />
      ))}
    </View>
  );
}
