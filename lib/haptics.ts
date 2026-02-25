import { Platform } from 'react-native';
import { Haptics } from 'react-native-nitro-haptics';

export function triggerSelectionHaptic() {
  if (Platform.OS === 'android') {
    Haptics.performAndroidHaptics('segment-tick');
    return;
  }

  Haptics.selection();
}

export function triggerSuccessHaptic() {
  if (Platform.OS === 'android') {
    Haptics.performAndroidHaptics('confirm');
    return;
  }

  Haptics.notification('success');
}

export function triggerLightImpactHaptic() {
  if (Platform.OS === 'android') {
    Haptics.performAndroidHaptics('context-click');
    return;
  }

  Haptics.impact('light');
}
