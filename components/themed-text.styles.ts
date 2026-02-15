import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { spacing, typography } = designTokens;

export const styles = StyleSheet.create({
  default: {
    fontSize: typography.labelLineHeight,
    lineHeight: spacing.huge,
  },
  defaultSemiBold: {
    fontSize: typography.labelLineHeight,
    lineHeight: spacing.huge,
    fontWeight: '600',
  },
  title: {
    fontSize: spacing.giant,
    fontWeight: 'bold',
    lineHeight: spacing.giant,
  },
  subtitle: {
    fontSize: spacing.jumbo,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: typography.titleLineHeight,
    fontSize: typography.labelLineHeight,
    color: '#0a7ea4',
  },
});
