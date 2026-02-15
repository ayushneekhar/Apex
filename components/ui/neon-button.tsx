import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

import { AppText } from './app-text';

type NeonButtonVariant = 'primary' | 'ghost' | 'danger';

type NeonButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: NeonButtonVariant;
  style?: StyleProp<ViewStyle>;
};

export function NeonButton({ title, variant = 'primary', disabled, style, ...rest }: NeonButtonProps) {
  const theme = useAppTheme();

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
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
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

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
