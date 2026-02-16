import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, layout, overlay, radii, sizes, spacing } = designTokens;
const CALENDAR_COLUMN_WIDTH = '14.285714%';

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
    padding: spacing.lg,
    gap: spacing.xxs,
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
  calendarCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.lg,
    gap: spacing.md,
  },
  calendarHeader: {
    gap: spacing.sm,
  },
  calendarTitleWrap: {
    gap: spacing.xxs,
  },
  calendarMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  calendarMonthLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Unbounded_500Medium',
    fontSize: 13,
    lineHeight: 16,
  },
  calendarNavButton: {
    width: sizes.iconButton,
    height: sizes.iconButton,
    borderWidth: border.thin,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarWeekRow: {
    flexDirection: 'row',
  },
  calendarWeekCell: {
    width: CALENDAR_COLUMN_WIDTH,
    paddingHorizontal: spacing.xxxs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarWeekLabel: {
    width: '100%',
    textAlign: 'center',
  },
  calendarGrid: {
    gap: spacing.xxs,
  },
  calendarGridWeekRow: {
    flexDirection: 'row',
  },
  calendarDayCellSlot: {
    width: CALENDAR_COLUMN_WIDTH,
    paddingHorizontal: spacing.xxxs,
  },
  calendarDayCell: {
    width: '100%',
    aspectRatio: 1,
    borderWidth: border.thin,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayLabel: {
    textAlign: 'center',
    fontFamily: 'Unbounded_500Medium',
    fontSize: 12,
    lineHeight: 14,
    includeFontPadding: false,
  },
  calendarDayLabelWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
