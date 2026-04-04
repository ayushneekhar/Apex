import { Platform, type KeyboardTypeOptions } from 'react-native';

export const WEIGHT_KEYBOARD_TYPE: KeyboardTypeOptions =
  Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric';

export const SESSION_HEADER_COMPACT_AFTER_MS = 3000;
