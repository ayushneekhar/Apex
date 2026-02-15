import type { ReactNode } from 'react';
import type { StyleProp, TextProps, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

type AppTextVariant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'micro';

type AppTextTone = 'primary' | 'muted' | 'accent' | 'danger' | 'success' | 'inverse';

type AppTextProps = TextProps & {
  children: ReactNode;
  tone?: AppTextTone;
  variant?: AppTextVariant;
  style?: StyleProp<TextStyle>;
};

export function AppText({
  children,
  tone = 'primary',
  variant = 'body',
  style,
  ...rest
}: AppTextProps) {
  const theme = useAppTheme();

  const toneColor: Record<AppTextTone, string> = {
    primary: theme.palette.textPrimary,
    muted: theme.palette.textMuted,
    accent: theme.palette.accent,
    danger: theme.palette.danger,
    success: theme.palette.success,
    inverse: theme.palette.accentContrast,
  };

  return (
    <Text
      {...rest}
      style={[
        styles.base,
        variantStyles[variant],
        {
          color: toneColor[tone],
        },
        style,
      ]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: 'Unbounded_400Regular',
  },
});

const variantStyles = StyleSheet.create({
  display: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 0.4,
  },
  title: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: 0.2,
  },
  heading: {
    fontFamily: 'Unbounded_500Medium',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 14,
    lineHeight: 19,
  },
  label: {
    fontFamily: 'Unbounded_500Medium',
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  micro: {
    fontSize: 10,
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
});
