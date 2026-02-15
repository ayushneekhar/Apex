import type { TextStyle } from 'react-native';

import { designTokens } from '@/constants/design-system';

type HelloWaveStyle = TextStyle & {
  animationName: {
    '50%': {
      transform: {
        rotate: string;
      }[];
    };
  };
  animationIterationCount: number;
  animationDuration: string;
};

const { sizes, spacing } = designTokens;

export const helloWaveStyle: HelloWaveStyle = {
  fontSize: sizes.iconLarge,
  lineHeight: spacing.giant,
  marginTop: -spacing.xs,
  animationName: {
    '50%': { transform: [{ rotate: '25deg' }] },
  },
  animationIterationCount: spacing.xxs,
  animationDuration: '300ms',
};
