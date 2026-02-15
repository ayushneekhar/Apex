const { getDefaultConfig: getExpoDefaultConfig } = require('expo/metro-config');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const expoConfig = getExpoDefaultConfig(__dirname);
const reactNativeConfig = getDefaultConfig(__dirname);

module.exports = mergeConfig(reactNativeConfig, expoConfig);
