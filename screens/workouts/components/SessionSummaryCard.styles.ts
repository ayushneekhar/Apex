import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, radii, sizes, spacing } = designTokens;

export const styles = StyleSheet.create({
  timerCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  timerValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  timerControlButton: {
    width: sizes.iconButton,
    height: sizes.iconButton,
    borderWidth: border.thin,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotifyCard: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  spotifyCardStack: {
    position: 'relative',
    minHeight: sizes.iconLarge * 2,
    justifyContent: 'center',
  },
  spotifyCardPreviewLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  spotifyCardPreviewContent: {
    flex: 1,
    justifyContent: 'center',
  },
  spotifyCardContentLayer: {
    position: 'relative',
  },
  spotifyArtworkWrap: {
    overflow: 'hidden',
  },
  spotifyTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  spotifyArtwork: {
    width: sizes.iconLarge * 2,
    height: sizes.iconLarge * 2,
    borderRadius: radii.md,
  },
  spotifyArtworkFallback: {
    width: sizes.iconLarge * 2,
    height: sizes.iconLarge * 2,
    borderWidth: border.thin,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotifyTrackText: {
    flex: 1,
    gap: spacing.xxxs,
  },
  spotifyPreviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  restTimerCard: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  restTimerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  restProgressRow: {
    width: '100%',
  },
  restProgressTrack: {
    width: '100%',
    height: spacing.sm,
    borderWidth: border.thin,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  restProgressFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  restProgressOvertimeFill: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: '100%',
  },
  sessionStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sessionStatCell: {
    flex: 1,
    gap: spacing.xxs,
    alignItems: 'center',
  },
  sessionStatLabel: {
    minHeight: sizes.setBoxMinLabelHeight,
    textAlign: 'center',
  },
  recoveryCard: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    padding: spacing.md,
  },
});
