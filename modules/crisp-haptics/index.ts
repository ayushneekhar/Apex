import { requireOptionalNativeModule } from "expo";

export type CrispHapticEffect = "tick" | "click" | "heavy-click" | "double-click" | "error";

type CrispHapticsNativeModule = {
  /** Returns false when the device can't play crisp haptics. */
  play(effect: CrispHapticEffect): boolean;
};

// Optional so JS running on a binary built before this module existed
// degrades to the caller's fallback instead of crashing.
export const CrispHaptics =
  requireOptionalNativeModule<CrispHapticsNativeModule>("CrispHaptics");
