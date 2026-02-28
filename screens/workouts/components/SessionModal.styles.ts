import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, overlay, radii, spacing } = designTokens;

export const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: overlay.modalBackdrop,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  card: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionCell: {
    flex: 1,
  },
  scopeTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  scopeTab: {
    flex: 1,
    borderWidth: border.thin,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeHint: {
    marginTop: -spacing.xxs,
  },
});
