import { Haptics } from 'react-native-nitro-haptics';

export function triggerSelectionHaptic() {
  Haptics.selection();
}

export function triggerSuccessHaptic() {
  Haptics.notification('success');
}

export function triggerLightImpactHaptic() {
  Haptics.impact('light');
}
