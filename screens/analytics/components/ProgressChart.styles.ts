import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { spacing } = designTokens;

export const styles = StyleSheet.create({
  canvas: {
    width: '100%',
  },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: spacing.huge,
    paddingTop: spacing.xxs,
  },
});
