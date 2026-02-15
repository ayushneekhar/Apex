import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { typography } = designTokens;

export const styles = StyleSheet.create({
  base: {
    fontFamily: 'Unbounded_400Regular',
  },
});

export const variantStyles = StyleSheet.create({
  display: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: typography.displaySize,
    lineHeight: typography.displayLineHeight,
    letterSpacing: typography.displayLetterSpacing,
  },
  title: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: typography.titleSize,
    lineHeight: typography.titleLineHeight,
    letterSpacing: typography.headingLetterSpacing,
  },
  heading: {
    fontFamily: 'Unbounded_500Medium',
    fontSize: typography.headingSize,
    lineHeight: typography.headingLineHeight,
    letterSpacing: typography.headingLetterSpacing,
  },
  body: {
    fontSize: typography.bodySize,
    lineHeight: typography.bodyLineHeight,
  },
  label: {
    fontFamily: 'Unbounded_500Medium',
    fontSize: typography.labelSize,
    lineHeight: typography.labelLineHeight,
    textTransform: 'uppercase',
    letterSpacing: typography.labelLetterSpacing,
  },
  micro: {
    fontSize: typography.microSize,
    lineHeight: typography.microLineHeight,
    textTransform: 'uppercase',
    letterSpacing: typography.microLetterSpacing,
  },
});
