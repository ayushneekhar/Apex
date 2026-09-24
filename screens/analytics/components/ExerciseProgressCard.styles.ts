import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, radii, sizes, spacing } = designTokens;

export const styles = StyleSheet.create({
  card: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xxxs,
  },
  stepButton: {
    width: sizes.iconButton,
    height: sizes.iconButton,
    borderRadius: radii.pill,
    borderWidth: border.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    height: 196,
    borderWidth: border.thin,
    borderStyle: 'dashed',
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  stats: {
    flexDirection: 'row',
    borderTopWidth: border.thin,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  stat: {
    flex: 1,
    gap: spacing.xxs,
  },
});
