import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, layout, radii, sizes, spacing } = designTokens;
const CALENDAR_COLUMN_WIDTH = '14.285714%';
export const CALENDAR_DAY_SIZE = 34;
export const CALENDAR_DAY_BORDER_WIDTH = 1.5;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenHorizontalInset,
    gap: spacing.xxl,
  },
  header: {
    gap: spacing.xxs,
    paddingTop: spacing.xs,
  },
  statStrip: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  statDivider: {
    width: border.thin,
    alignSelf: 'stretch',
  },
  calendarCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  calendarMonthLabel: {
    flex: 1,
  },
  calendarNavButton: {
    width: sizes.iconButton,
    height: sizes.iconButton,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarGrid: {
    gap: spacing.xs,
  },
  calendarRow: {
    flexDirection: 'row',
  },
  calendarCell: {
    width: CALENDAR_COLUMN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: CALENDAR_DAY_SIZE,
  },
  calendarDay: {
    width: CALENDAR_DAY_SIZE,
    height: CALENDAR_DAY_SIZE,
    borderRadius: radii.pill,
    borderWidth: CALENDAR_DAY_BORDER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  calendarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  calendarLegendSwatch: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
  },
  calendarDayLabel: {
    fontSize: 12,
    lineHeight: 14,
    textAlign: 'center',
    includeFontPadding: false,
  },
  calendarDayLabelStrong: {
    fontFamily: 'Unbounded_500Medium',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterLabel: {
    flex: 1,
  },
  filterClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderWidth: border.thin,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    paddingHorizontal: spacing.xxs,
  },
  sessionRow: {
    borderWidth: border.thin,
    borderRadius: radii.card,
    paddingVertical: spacing.lg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  sessionDate: {
    width: 40,
    alignItems: 'center',
    gap: spacing.xxxs,
  },
  sessionDivider: {
    width: border.thin,
    alignSelf: 'stretch',
  },
  sessionBody: {
    flex: 1,
    gap: spacing.xs,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sessionTitle: {
    flex: 1,
  },
  sessionPreview: {
    fontSize: 12,
    lineHeight: 16,
  },
  sessionMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.lg,
    rowGap: spacing.xxs,
  },
  sessionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  emptyCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    paddingVertical: spacing.giant,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
  },
});
