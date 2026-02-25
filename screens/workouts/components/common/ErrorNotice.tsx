import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';

import { useAppTheme } from '@/hooks/use-app-theme';
import { styles } from './ErrorNotice.styles';

export function ErrorNotice({
  message,
  tone = 'danger',
  borderColor,
  backgroundColor,
}: {
  message: string;
  tone?: 'danger' | 'accent';
  borderColor?: string;
  backgroundColor?: string;
}) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.box,
        {
          borderColor: borderColor ?? (tone === 'danger' ? theme.palette.danger : theme.palette.accent),
          ...(backgroundColor ? { backgroundColor } : null),
        },
      ]}
    >
      <AppText tone={tone}>{message}</AppText>
    </View>
  );
}
