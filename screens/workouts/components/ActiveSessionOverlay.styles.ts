import { StyleSheet } from 'react-native';

import { designTokens } from '@/constants/design-system';

const { border, radii, spacing } = designTokens;

export const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 40,
    elevation: 40,
  },
  content: {
    paddingHorizontal: designTokens.layout.screenHorizontalInset,
    gap: spacing.xl,
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
});
