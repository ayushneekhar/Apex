import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

type NeonGridBackgroundProps = {
  lineGap?: number;
};

export function NeonGridBackground({ lineGap = 48 }: NeonGridBackgroundProps) {
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions();

  const verticalLines = useMemo(() => {
    const count = Math.min(Math.ceil(width / lineGap) + 1, 36);
    return Array.from({ length: count }, (_, index) => index);
  }, [lineGap, width]);

  const horizontalLines = useMemo(() => {
    const count = Math.min(Math.ceil(height / lineGap) + 1, 64);
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
              width: 1,
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
              height: 1,
              backgroundColor: theme.palette.gridLine,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  neonWash: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.22,
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
