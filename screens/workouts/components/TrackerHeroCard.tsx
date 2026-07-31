import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { NeonButton } from '@/components/ui/neon-button';
import type { RootStackParamList } from '@/types/navigation';

import type { WorkoutsScreenController } from '../hooks/use-workouts-screen-controller';
import { styles } from './TrackerHeroCard.styles';

export function TrackerHeroCard({
  controller,
}: {
  controller: WorkoutsScreenController;
}) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { compactHero, defaultOverload, theme } = controller;

  return (
    <View
      style={[
        compactHero ? styles.heroCompact : styles.heroCard,
        {
          borderColor: theme.palette.border,
          backgroundColor: theme.palette.panel,
        },
      ]}
    >
      {compactHero ? (
        <>
          <View style={styles.compactHeroTextWrap}>
            <AppText variant="label" tone="accent">
              WORKOUT TRACKER
            </AppText>
            <AppText variant="heading">Workouts ready</AppText>
          </View>
          <NeonButton
            title="Add workout"
            variant="ghost"
            onPress={() => navigation.navigate('WorkoutTemplateCreator')}
          />
        </>
      ) : (
        <>
          <AppText variant="micro" tone="accent">
            WORKOUT TRACKER
          </AppText>
          <AppText variant="display">Plan. Lift. Progress.</AppText>
          <AppText tone="muted">
            Create workouts, then start a focused session with live timer and set tracking. Default overload is{' '}
            {defaultOverload}.
          </AppText>
          <NeonButton
            title="Add workout"
            variant="primary"
            onPress={() => navigation.navigate('WorkoutTemplateCreator')}
          />
        </>
      )}
    </View>
  );
}
