import { View } from 'react-native';

import { NeonButton } from '@/components/ui/neon-button';
import { NeonInput } from '@/components/ui/neon-input';

import { WEIGHT_KEYBOARD_TYPE } from '../constants';
import type { WorkoutsScreenController } from '../hooks/use-workouts-screen-controller';
import { ErrorNotice } from './common/ErrorNotice';
import { styles } from './SessionFooterActions.styles';

export function SessionFooterActions({
  controller,
}: {
  controller: WorkoutsScreenController;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bodyweightRow}>
        <View style={styles.bodyweightInputCell}>
          <NeonInput
            label="Bodyweight"
            keyboardType={WEIGHT_KEYBOARD_TYPE}
            value={controller.bodyweightInput}
            onChangeText={(value) => {
              controller.setBodyweightInput(value);
              controller.clearBodyweightError();
            }}
            suffix={controller.settings.weightUnit}
          />
        </View>
        <View style={styles.bodyweightButtonCell}>
          <NeonButton
            title="Save"
            variant="ghost"
            onPress={() => void controller.saveSessionBodyweight()}
          />
        </View>
      </View>

      {controller.bodyweightError ? <ErrorNotice message={controller.bodyweightError} /> : null}

      <View style={styles.row}>
        <View style={styles.primaryCell}>
          <NeonButton
            title="Finish & Save"
            onPress={() => void controller.handleFinishSession()}
            disabled={controller.mutating}
          />
        </View>
        <View style={styles.dangerCell}>
          <NeonButton
            title="Delete"
            variant="danger"
            onPress={controller.openDiscardSessionModal}
            disabled={controller.mutating}
          />
        </View>
      </View>
    </View>
  );
}
