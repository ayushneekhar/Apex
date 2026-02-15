import type { TextInputProps } from 'react-native';
import { TextInput, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

import { AppText } from './app-text';
import { styles } from './neon-input.styles';

type NeonInputProps = TextInputProps & {
  label?: string;
  helperText?: string;
  suffix?: string;
};

export function NeonInput({ label, helperText, suffix, style, ...rest }: NeonInputProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="micro" tone="muted">
          {label}
        </AppText>
      ) : null}

      <View
        style={[
          styles.inputShell,
          {
            borderColor: theme.palette.border,
            backgroundColor: theme.palette.panelSoft,
          },
        ]}>
        <TextInput
          {...rest}
          style={[
            styles.input,
            {
              color: theme.palette.textPrimary,
            },
            style,
          ]}
          placeholderTextColor={theme.palette.textMuted}
        />

        {suffix ? (
          <AppText variant="micro" tone="muted" style={styles.suffix}>
            {suffix}
          </AppText>
        ) : null}
      </View>

      {helperText ? (
        <AppText variant="micro" tone="muted">
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}
