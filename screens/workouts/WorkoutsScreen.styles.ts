import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { layout, spacing } = designTokens;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  keyboardRoot: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenHorizontalInset,
    gap: spacing.xl,
  },
});
