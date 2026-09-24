import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, radii, spacing } = designTokens;

export const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderWidth: border.thin,
    borderRadius: radii.pill,
    padding: spacing.xxxs,
  },
  indicator: {
    position: 'absolute',
    top: spacing.xxxs,
    bottom: spacing.xxxs,
    left: 0,
    borderRadius: radii.pill,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
});
