import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, layout, overlay, radii, sizes, spacing } = designTokens;

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
  summaryRow: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  summaryCell: {
    flex: 1,
    gap: spacing.xs,
  },
  emptyCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: layout.screenHorizontalInset,
    gap: spacing.sm,
  },
  sessionCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sessionHeaderText: {
    flex: 1,
    gap: spacing.xxs,
  },
  statChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statChip: {
    borderWidth: border.thin,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minWidth: sizes.chipMinWidth,
    gap: spacing.xxs,
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: overlay.modalBackdrop,
    justifyContent: 'center',
    paddingHorizontal: layout.screenHorizontalInset,
  },
  modalCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.xl,
    gap: spacing.lg,
    maxHeight: '84%',
  },
  modalSetList: {
    maxHeight: sizes.modalSetListMaxHeight,
  },
  modalSetListContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xxs,
  },
  modalSetCard: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalSetInputsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalSetInputCell: {
    flex: 1,
  },
  errorBox: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalActionCell: {
    flex: 1,
  },
});
