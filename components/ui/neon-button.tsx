import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Pressable, View } from 'react-native';

import { designTokens } from '@/constants/design-system';
import { useAppTheme } from '@/hooks/use-app-theme';

import { AppText } from './app-text';
import { styles } from './neon-button.styles';

type NeonButtonVariant = 'primary' | 'ghost' | 'danger';

type NeonButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: NeonButtonVariant;
  style?: StyleProp<ViewStyle>;
};

export function NeonButton({ title, variant = 'primary', disabled, style, ...rest }: NeonButtonProps) {
  const theme = useAppTheme();
  const { opacity } = designTokens;

  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  const backgroundColor = isPrimary
    ? theme.palette.accent
    : isDanger
      ? 'transparent'
      : theme.palette.panelSoft;

  const borderColor = isPrimary
    ? theme.palette.accentStrong
    : isDanger
      ? theme.palette.danger
      : theme.palette.border;

  const textTone = isPrimary ? 'inverse' : isDanger ? ('danger' as const) : ('primary' as const);

  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor,
          opacity: disabled ? opacity.disabled : pressed ? opacity.pressedStrong : 1,
        },
        style,
      ]}
      {...rest}>
      <View style={styles.content}>
        <AppText variant="label" tone={textTone}>
          {title}
        </AppText>
      </View>
    </Pressable>
  );
}
