import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

/** Eases from 0 to `target` after `delayMs`, re-rendering each frame. */
export function useCountUp(target: number, delayMs = 0, durationMs = 900): number {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    let frame = 0;
    let startedAt: number | null = null;

    const step = (time: number) => {
      startedAt ??= time;
      const progress = reduceMotion
        ? 1
        : Math.min(1, Math.max(0, (time - startedAt - delayMs) / durationMs));
      const eased = 1 - (1 - progress) ** 3;
      setValue(target * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [delayMs, durationMs, reduceMotion, target]);

  return value;
}
