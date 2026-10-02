import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, layout, radii, spacing } = designTokens;

export const RING_SIZE = 210;
const WEEK_PIP_HEIGHT = 10;
const XP_BAR_HEIGHT = 10;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  missing: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
    paddingHorizontal: layout.screenHorizontalInset,
  },
  content: {
    paddingHorizontal: layout.screenHorizontalInset,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  ringWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  ringNumber: {
    maxWidth: RING_SIZE - spacing.giant * 2,
    textAlign: 'center',
    fontSize: 54,
    lineHeight: 62,
  },
  card: {
    borderWidth: border.thin,
    borderRadius: radii.hero,
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  streakCard: {
    gap: spacing.xl,
  },
  streakMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  streakNumber: {
    fontSize: 44,
    lineHeight: 50,
  },
  pill: {
    marginLeft: 'auto',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  weekPips: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  weekPip: {
    flex: 1,
    height: WEEK_PIP_HEIGHT,
    borderRadius: radii.pill,
    borderWidth: border.thin,
  },
  tileRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  tile: {
    flex: 1,
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xxs,
  },
  tileUnit: {
    flexShrink: 0,
  },
  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  prName: {
    flex: 1,
  },
  xpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  xpTrack: {
    height: XP_BAR_HEIGHT,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: radii.pill,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  actionPrimary: {
    flex: 2,
  },
  actionSecondary: {
    flex: 1,
  },
});
