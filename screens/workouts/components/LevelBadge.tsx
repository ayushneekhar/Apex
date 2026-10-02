import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import type { AppTheme } from '@/constants/app-themes';
import { designTokens } from '@/constants/design-system';
import type { LevelProgress } from '@/screens/workout-summary/summary-data';

import { styles } from './LevelBadge.styles';

/** Compact level pill with a sliver of XP progress toward the next level. */
export function LevelBadge({ theme, level }: { theme: AppTheme; level: LevelProgress }) {
  const progress = level.xpIntoLevel / level.xpForLevel;

  return (
    <View
      accessible
      accessibilityLabel={`Level ${level.level}, ${level.xpIntoLevel} of ${level.xpForLevel} XP`}
      style={[
        styles.badge,
        { borderColor: theme.palette.accent, backgroundColor: theme.palette.panel },
      ]}
    >
      <View style={styles.row}>
        <Ionicons name="flash" size={designTokens.sizes.iconTiny} color={theme.palette.accent} />
        <AppText variant="micro" tone="muted">
          Lv
        </AppText>
        <AppText variant="heading" tone="accent">
          {level.level}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.palette.panelSoft }]}>
        <View
          style={[
            styles.fill,
            { width: `${progress * 100}%`, backgroundColor: theme.palette.accent },
          ]}
        />
      </View>
    </View>
  );
}
