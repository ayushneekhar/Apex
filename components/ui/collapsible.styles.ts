import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { spacing } = designTokens;

export const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  content: {
    marginTop: spacing.xs,
    marginLeft: spacing.huge,
  },
});

export function getChevronStyle(isOpen: boolean) {
  return {
    transform: [{ rotate: isOpen ? '90deg' : '0deg' }],
  } as const;
}
