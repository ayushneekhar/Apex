import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

import type { AppTheme } from '@/constants/app-themes';
import { designTokens } from '@/constants/design-system';

const { border, sizes, spacing, typography } = designTokens;

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export function createTabScreenOptions(theme: AppTheme, insets: EdgeInsets): BottomTabNavigationOptions {
  return {
    headerShown: false,
    tabBarActiveTintColor: theme.palette.accent,
    tabBarInactiveTintColor: theme.palette.textMuted,
    tabBarStyle: {
      backgroundColor: theme.palette.panel,
      borderTopColor: theme.palette.border,
      borderTopWidth: border.thin,
      height: sizes.tabBarBaseHeight + insets.bottom,
      paddingTop: spacing.xs,
      paddingBottom: Math.max(insets.bottom, spacing.xs),
    },
    tabBarLabelStyle: {
      fontFamily: 'Unbounded_500Medium',
      fontSize: typography.microSize,
      textTransform: 'uppercase',
      letterSpacing: typography.tabLabelLetterSpacing,
      marginBottom: spacing.xxxs,
    },
  };
}
