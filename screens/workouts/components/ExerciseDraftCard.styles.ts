import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, radii, sizes, spacing } = designTokens;

export const styles = StyleSheet.create({
  card: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerContent: {
    flex: 1,
    gap: spacing.sm,
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  fieldCell: {
    flex: 1,
  },
  restRow: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  supersetBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderWidth: border.thin,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxxs,
  },
  supersetToggle: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  supersetToggleText: {
    flex: 1,
    gap: spacing.xxxs,
  },
  restControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  restButton: {
    width: sizes.iconButton,
    height: sizes.iconButton,
    borderWidth: border.thin,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restValue: {
    flex: 1,
    alignItems: 'center',
  },
});
