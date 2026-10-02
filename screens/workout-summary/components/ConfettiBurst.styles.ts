import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
  },
  piece: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 2,
  },
});
