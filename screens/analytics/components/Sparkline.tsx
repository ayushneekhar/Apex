import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { SPARKLINE_HEIGHT, SPARKLINE_WIDTH, styles } from './Sparkline.styles';

const INSET = 3;

/** Static trend glyph for list rows; the interactive chart lives in the hero card. */
export function Sparkline({ values, color, id }: { values: number[]; color: string; id: string }) {
  if (values.length < 2) {
    return <View style={styles.box} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const coords = values.map((value, index) => ({
    x: INSET + (index / (values.length - 1)) * (SPARKLINE_WIDTH - INSET * 2),
    y:
      max === min
        ? SPARKLINE_HEIGHT / 2
        : INSET + (1 - (value - min) / spread) * (SPARKLINE_HEIGHT - INSET * 2),
  }));
  const line = coords.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');
  const area = `${line} L${coords[coords.length - 1].x},${SPARKLINE_HEIGHT} L${coords[0].x},${SPARKLINE_HEIGHT} Z`;
  const last = coords[coords.length - 1];
  const gradientId = `spark-${id.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <View style={styles.box}>
      <Svg width={SPARKLINE_WIDTH} height={SPARKLINE_HEIGHT}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.28} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill={`url(#${gradientId})`} />
        <Path d={line} stroke={color} strokeWidth={1.75} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={last.x} cy={last.y} r={2.75} fill={color} />
      </Svg>
    </View>
  );
}
