import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, layout, radii, sizes, spacing } = designTokens;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenHorizontalInset,
    gap: spacing.xl,
  },
  hero: {
    borderWidth: border.thin,
    borderRadius: radii.hero,
    padding: layout.screenHorizontalInset,
    gap: spacing.sm,
  },
  card: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.xl,
    gap: spacing.md,
  },
  themeList: {
    gap: spacing.md,
  },
  themeCard: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
  themeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  themeSwatch: {
    width: sizes.iconMedium,
    height: sizes.iconMedium,
    borderRadius: radii.sm,
  },
  segmented: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    padding: spacing.xxs,
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    borderRadius: spacing.sm,
    minHeight: sizes.controlMinHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoList: {
    gap: spacing.sm,
  },
  backupActions: {
    gap: spacing.sm,
  },
  infoRow: {
    borderWidth: border.thin,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
});
