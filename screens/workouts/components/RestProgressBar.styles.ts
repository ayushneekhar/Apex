import { StyleSheet } from "react-native";

import { designTokens } from "@/constants/design-system";

const { spacing } = designTokens;

export const REST_BAR_HEIGHT = spacing.sm;
/** Canvas bleed around the bar so the glow isn't clipped. */
export const REST_BAR_GLOW_PAD = spacing.md;

export const styles = StyleSheet.create({
  container: {
    height: REST_BAR_HEIGHT + REST_BAR_GLOW_PAD * 2,
    marginHorizontal: -REST_BAR_GLOW_PAD,
    marginVertical: -REST_BAR_GLOW_PAD,
  },
  canvas: {
    flex: 1,
  },
});
