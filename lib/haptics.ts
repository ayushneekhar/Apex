import { Platform } from "react-native";
import { Haptics } from "react-native-nitro-haptics";

import { CrispHaptics, type CrispHapticEffect } from "@/modules/crisp-haptics";

// Android plays crisp actuator effects via the local CrispHaptics module; the
// nitro-haptics Android waveforms feel like an old buzzy motor. nitro-haptics is
// the fallback and handles iOS.
//
// Note: Haptics.performAndroidHaptics is intentionally unused. Its native
// implementation calls performHapticFeedback on a detached View, which Android
// silently ignores.
function runHaptic(androidEffect: CrispHapticEffect, fallback: () => void) {
  if (Platform.OS === "android" && CrispHaptics?.play(androidEffect)) {
    return;
  }

  fallback();
}

export function triggerSelectionHaptic() {
  runHaptic("tick", () => Haptics.selection());
}

export function triggerSuccessHaptic() {
  runHaptic("double-click", () => Haptics.notification("success"));
}

export function triggerLightImpactHaptic() {
  runHaptic("click", () => Haptics.impact("rigid"));
}

export function triggerMediumImpactHaptic() {
  runHaptic("heavy-click", () => Haptics.impact("medium"));
}

export function triggerLongPressHaptic() {
  runHaptic("heavy-click", () => Haptics.impact("medium"));
}
