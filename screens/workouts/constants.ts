import { Platform, type KeyboardTypeOptions } from 'react-native';

export const WEIGHT_KEYBOARD_TYPE: KeyboardTypeOptions =
  Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric';

export const SPOTIFY_POLL_INTERVAL_MS = 8000;
export const SPOTIFY_RETRY_INTERVAL_MS = 15000;
export const SPOTIFY_SWIPE_CAPTURE_PX = 10;
export const SPOTIFY_SWIPE_TRIGGER_PX = 110;
export const SPOTIFY_SWIPE_PREVIEW_PX = 108;
export const SESSION_HEADER_COMPACT_AFTER_MS = 3000;
