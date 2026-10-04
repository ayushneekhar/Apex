import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import type { AppTheme } from '@/constants/app-themes';
import { designTokens } from '@/constants/design-system';
import type { LevelProgress } from '@/screens/workout-summary/summary-data';

import { styles } from './ProgressStrip.styles';

/** Borderless stat line above the cards: week streak on the left, level on the right. */
export function ProgressStrip({
  theme,
  weekStreak,
  level,
}: {
  theme: AppTheme;
  weekStreak: number;
  level: LevelProgress;
}) {
  const { iconSmall } = designTokens.sizes;
  const onStreak = weekStreak > 0;

  return (
    <View style={styles.strip}>
      <View
        accessible
        accessibilityLabel={`${weekStreak} week streak`}
        style={styles.stat}
      >
        <Ionicons
          name="flame"
          size={iconSmall}
          color={onStreak ? theme.palette.accent : theme.palette.textMuted}
        />
        <AppText variant="label" tone={onStreak ? 'primary' : 'muted'}>
          {weekStreak}
        </AppText>
        <AppText variant="micro" tone="muted">
          wk
        </AppText>
      </View>

      <View
        accessible
        accessibilityLabel={`Level ${level.level}, ${level.xpIntoLevel} of ${level.xpForLevel} XP`}
        style={styles.stat}
      >
        <Ionicons name="flash" size={iconSmall} color={theme.palette.accent} />
        <AppText variant="micro" tone="muted">
          Lv
        </AppText>
        <AppText variant="label">{level.level}</AppText>
        <View style={[styles.track, { backgroundColor: theme.palette.border }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${(level.xpIntoLevel / level.xpForLevel) * 100}%`,
                backgroundColor: theme.palette.accent,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}
