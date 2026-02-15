# Apex

Bare React Native app with Expo Modules.

## Why this setup

- Native `ios/` and `android/` projects are checked in.
- App runtime uses standard React Native CLI commands.
- Expo packages are still available through Expo Modules (`expo-sqlite`, `expo-image`, `expo-haptics`, etc.).

## Development

1. Install dependencies

```bash
yarn install
```

2. Start Metro

```bash
yarn start
```

3. Run on device/simulator

```bash
yarn ios
yarn android
```

## Native + Expo Modules sync

When you change Expo config plugins in `app.json`, regenerate native changes with:

```bash
yarn prebuild
```
