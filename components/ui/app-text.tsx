import type { ReactNode } from 'react';
import type { StyleProp, TextProps, TextStyle } from 'react-native';
import { Text } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

import { styles, variantStyles } from './app-text.styles';

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
