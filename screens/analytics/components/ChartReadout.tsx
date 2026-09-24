import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import type { AppTheme } from '@/constants/app-themes';

import { styles } from './ChartReadout.styles';

export type ReadoutTrend = 'up' | 'down' | 'flat';

/**
 * Headline above a chart. At rest it shows the latest value and the change
 * over the range; while a session is selected it shows that session instead,
 * since the finger usually covers the chart itself.
 */
export function ChartReadout({
  theme,
  eyebrow,
  value,
  detail,
  trend,
  isPr,
}: {
  theme: AppTheme;
  eyebrow: string;
  value: string;
  detail: string;
  trend?: ReadoutTrend;
  isPr?: boolean;
}) {
  const detailTone = trend === 'up' ? 'success' : trend === 'down' ? 'danger' : 'muted';
  const arrow = trend === 'up' ? '▲ ' : trend === 'down' ? '▼ ' : '';

  return (
    <View style={styles.readout}>
      <AppText variant="micro" tone="muted" numberOfLines={1}>
        {eyebrow}
      </AppText>
      <View style={styles.valueRow}>
        <AppText variant="title">{value}</AppText>
        {isPr ? (
          <View style={[styles.prBadge, { backgroundColor: theme.palette.accent }]}>
            <AppText variant="micro" tone="inverse">
              ★ PR
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText variant="micro" tone={detailTone} numberOfLines={1}>
        {arrow}
        {detail}
      </AppText>
    </View>
  );
}
