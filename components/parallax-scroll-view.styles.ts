import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { spacing } = designTokens;

export const HEADER_HEIGHT = 250;

export const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: spacing.giant,
    gap: spacing.xxl,
    overflow: 'hidden',
  },
});
