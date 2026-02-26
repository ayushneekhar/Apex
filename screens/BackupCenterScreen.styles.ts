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
    gap: spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroBackButton: {
    minWidth: 112,
  },
  card: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.xl,
    gap: spacing.md,
  },
  actionStack: {
    gap: spacing.sm,
  },
  filesList: {
    gap: spacing.sm,
  },
  fileRow: {
    borderWidth: border.thin,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  fileRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  fileMeta: {
    gap: spacing.xxs,
    flexShrink: 1,
  },
  rowActionButton: {
    minWidth: 96,
  },
  fileName: {
    flexShrink: 1,
  },
  fileSubtext: {
    flexWrap: 'wrap',
  },
  helperBox: {
    borderWidth: border.thin,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  versionContainer: {
    alignItems: 'center',
    gap: spacing.xxs,
    paddingBottom: spacing.md,
  },
  iconBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconBulletDot: {
    width: sizes.iconSmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

