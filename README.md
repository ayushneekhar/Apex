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


## GitHub Actions environment variables (development vs production)

This repo uses **GitHub Environments** so CI builds can choose between development and production settings at runtime.

### 1) Create two GitHub Environments

In GitHub:

- Go to **Settings → Environments**
- Create:
  - `development`
  - `production`

### 2) Add environment values

Set these in each environment:

#### Secret (Environment secret)

- `EXPO_PUBLIC_SPOTIFY_CLIENT_ID`

> Set this under **Environment → Secrets and variables → Actions → Secrets**.

#### Variables (Environment variables)

- `EXPO_PUBLIC_NITRO_OTA_GITHUB_URL`
- `EXPO_PUBLIC_NITRO_OTA_VERSION_PATH`
- `EXPO_PUBLIC_NITRO_OTA_ANDROID_REF`
- `EXPO_PUBLIC_NITRO_OTA_IOS_REF`

> Set these under **Environment → Secrets and variables → Actions → Variables**.

Recommended values:

- `development`
  - `EXPO_PUBLIC_NITRO_OTA_ANDROID_REF=nitro-ota-android-development`
  - `EXPO_PUBLIC_NITRO_OTA_IOS_REF=nitro-ota-ios-development`
- `production`
  - `EXPO_PUBLIC_NITRO_OTA_ANDROID_REF=nitro-ota-android-production`
  - `EXPO_PUBLIC_NITRO_OTA_IOS_REF=nitro-ota-ios-production`

### 3) Choose build mode when running workflows

#### Android APK Release

Workflow now prompts for:

- `build_environment` (`development` or `production`)
- `build_type` (`development` or `production`)

Behavior:

- `build_type=development` builds debug APK (`assembleDebug`)
- `build_type=production` builds release APK (`assembleRelease`)
- `build_environment` selects which environment secrets/variables are injected

#### Publish Nitro OTA

Workflow now prompts for:

- `deployment_environment` (`development` or `production`)
- existing OTA inputs (`platform`, `ota_version`, etc.)

Behavior:

- If `ota_branch` is empty, it defaults to:
  - `nitro-ota-<platform>-development` for development
  - `nitro-ota-<platform>-production` for production
- `deployment_environment` selects which environment secrets/variables are injected

### 4) Why this fixes Spotify in CI

Spotify auth checks `process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID` at build/runtime. By storing this as an environment secret and selecting the matching GitHub Environment in workflow dispatch, CI gets the correct value for that build.
