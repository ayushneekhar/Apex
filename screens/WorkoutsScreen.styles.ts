import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, layout, overlay, radii, sizes, spacing } = designTokens;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  sessionScreenOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 40,
    elevation: 40,
  },
  keyboardRoot: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenHorizontalInset,
    gap: spacing.xl,
  },
  heroCard: {
    borderWidth: border.thin,
    borderRadius: radii.hero,
    padding: layout.screenHorizontalInset,
    gap: spacing.xl,
    overflow: 'hidden',
  },
  heroCompact: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.lg,
    gap: spacing.md,
  },
  compactHeroTextWrap: {
    gap: spacing.xxs,
  },
  panel: {
    borderWidth: border.thin,
    borderRadius: radii.card,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  exerciseChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  exerciseChip: {
    borderWidth: border.thin,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  customExerciseRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-end',
  },
  customExerciseInput: {
    flex: 1,
  },
  exerciseDraftContainer: {
    gap: spacing.lg,
  },
  exerciseDraftCard: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  exerciseDraftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  exerciseFieldsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  fieldCell: {
    flex: 1,
  },
  restDraftRow: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  restDraftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  restDraftButton: {
    width: sizes.iconButton,
    height: sizes.iconButton,
    borderWidth: border.thin,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restDraftValue: {
    flex: 1,
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  errorBox: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resumeBanner: {
    borderWidth: border.thin,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  resumeBannerTextWrap: {
    gap: spacing.xxs,
  },
  emptyCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: layout.screenHorizontalInset,
    gap: spacing.sm,
  },
  workoutCard: {
    borderWidth: border.thin,
    borderRadius: radii.card,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  workoutCardHeaderText: {
    flex: 1,
    gap: spacing.xxs,
  },
  workoutCardHeaderActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  deleteIconButton: {
    width: sizes.iconButton,
    height: sizes.iconButton,
    borderWidth: border.thin,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaChip: {
    borderWidth: border.thin,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  workoutActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButtonCell: {
    flex: 1,
  },
  sessionHeader: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sessionHeaderDetails: {
    overflow: 'hidden',
    gap: spacing.xs,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
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
    gap: spacing.sm,
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
  restProgressTrack: {
    height: spacing.sm,
    borderWidth: border.thin,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  restProgressFill: {
    height: '100%',
    borderRadius: radii.pill,
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
  bodyweightRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-end',
  },
  bodyweightInputCell: {
    flex: 1,
  },
  bodyweightButtonCell: {
    width: sizes.bodyweightButtonWidth,
  },
  recoveryCard: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    padding: spacing.md,
  },
  sessionFinishWrap: {
    paddingTop: spacing.sm,
  },
  sessionFinishRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sessionFinishPrimaryCell: {
    flex: 2,
  },
  sessionFinishDangerCell: {
    flex: 1,
  },
  exerciseSessionCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sessionExerciseHeader: {
    gap: spacing.xxs,
  },
  sessionExerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  setBoxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  setBox: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    width: '31%',
    minWidth: sizes.setBoxMinWidth,
    minHeight: sizes.setBoxMinHeight,
    overflow: 'hidden',
  },
  setBoxMain: {
    flex: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: spacing.xxxs,
  },
  setBoxWeightBar: {
    flex: 1,
    borderTopWidth: border.thin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: overlay.modalBackdrop,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  modalCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalActionCell: {
    flex: 1,
  },
});
