import Animated from 'react-native-reanimated';

import { helloWaveStyle } from './hello-wave.styles';

export function HelloWave() {
  return (
    <Animated.Text style={helloWaveStyle}>
      👋
    </Animated.Text>
  );
}
