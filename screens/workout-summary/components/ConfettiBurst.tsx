import { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { styles } from './ConfettiBurst.styles';

const PARTICLE_COUNT = 36;
const DURATION_MS = 1900;
/** Downward pull in px over the full burst. */
const GRAVITY = 900;

type Particle = {
  angle: number;
  speed: number;
  spin: number;
  width: number;
  height: number;
  color: string;
};

function ConfettiPiece({
  particle,
  progress,
  originX,
  originY,
}: {
  particle: Particle;
  progress: SharedValue<number>;
  originX: number;
  originY: number;
}) {
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    // Air drag: fast launch that slows, then gravity takes over.
    const travel = particle.speed * (1 - (1 - t) ** 2);

    return {
      opacity: t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25,
      transform: [
        { translateX: originX + Math.cos(particle.angle) * travel },
        { translateY: originY + Math.sin(particle.angle) * travel + GRAVITY * t * t },
        { rotate: `${particle.spin * t}deg` },
        { rotateX: `${particle.spin * 1.7 * t}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        { width: particle.width, height: particle.height, backgroundColor: particle.color },
        style,
      ]}
    />
  );
}

/** One-shot burst from a point near the top of the screen. */
export function ConfettiBurst({ colors, originY }: { colors: string[]; originY: number }) {
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);

  // Randomized once per mount; useState's initializer keeps it stable across renders.
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
      // Mostly upward fan so pieces arc up and rain down.
      angle: -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3,
      speed: 160 + Math.random() * 260,
      spin: (Math.random() - 0.5) * 900,
      width: 5 + Math.random() * 5,
      height: 9 + Math.random() * 8,
      color: colors[index % colors.length],
    }))
  );

  useEffect(() => {
    progress.value = withTiming(1, { duration: DURATION_MS, easing: Easing.linear });
  }, [progress]);

  if (reduceMotion) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.layer}>
      {particles.map((particle, index) => (
        <ConfettiPiece
          key={index}
          particle={particle}
          progress={progress}
          originX={width / 2}
          originY={originY}
        />
      ))}
    </View>
  );
}
