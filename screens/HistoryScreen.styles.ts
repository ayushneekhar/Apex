import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, layout, radii, sizes, spacing } = designTokens;
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
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  sessionTopRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  sessionDateBadge: {
    width: 70,
    borderWidth: border.thin,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  sessionCardBody: {
    flex: 1,
    gap: spacing.md,
  },
  sessionHeadlineRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  sessionHeaderText: {
    flex: 1,
    gap: spacing.xxs,
  },
  volumeBadge: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xxs,
    minWidth: 110,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    minHeight: 78,
    borderWidth: border.thin,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xxs,
  },
  sessionFooterRow: {
    gap: spacing.sm,
  },
  sessionFooterText: {
    gap: spacing.xxs,
  },
  bodyweightBadge: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xxs,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
