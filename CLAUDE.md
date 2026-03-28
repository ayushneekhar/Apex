# CLAUDE.md

Project-level instructions for Claude Code and other AI agents working in this repo.

## Project overview

Apex is a React Native (bare workflow + Expo Modules) fitness/workout tracker app.

- **Platforms:** Android, iOS
- **Stack:** React Native 0.81, Expo 54, TypeScript, Zustand, SQLite, React Navigation
- **Package manager:** Yarn (corepack-managed)

## Key directories

| Path | Contents |
|---|---|
| `screens/` | All app screens (workouts, history, analytics, settings, etc.) |
| `lib/` | Core utilities (database, backups, haptics, Spotify, etc.) |
| `store/` | Zustand state management |
| `types/` | TypeScript type definitions |
| `android/` | Native Android project |
| `ios/` | Native iOS project |
| `assets/` | Images, fonts, icons |
| `.github/workflows/` | CI/CD (APK release + Nitro OTA) |

## Commit message conventions

### Native changes → include `[build]`

When a commit touches **native-relevant files**, include `[build]` in the commit message to trigger a native APK release via CI. Native-relevant files include:

- `android/` or `ios/` directories
- `package.json` or `yarn.lock`
- `app.json` or `app.config.*`

Example:
```
Add push notification permissions [build]
```

The CI also auto-detects native changes, but `[build]` is an explicit guarantee.

### JS-only changes → no tag needed

For changes that only touch `.ts`, `.tsx`, `.js`, or asset files, do **not** add `[build]`. These are deployed automatically via Nitro OTA — no native rebuild required.

Example:
```
Fix analytics chart rendering for empty datasets
```

## CI/CD overview

A single **CI router** (`ci.yml`) triggers on every push to `main` and decides the build path:

| Change type | Route | What happens |
|---|---|---|
| Native files (`android/`, `ios/`, `package.json`, etc.) | `native` | APK build → GitHub Release with tag + auto-generated notes |
| JS/TS-only files | `ota` | Nitro OTA bundle publish to both platforms |
| Workflow files only | `skip` | Nothing — no build triggered |
| Commit contains `[build]` | `native` | Forces APK build regardless of files changed |
| Commit contains `[skip ci]` | `skip` | Skips all CI |

Both downstream workflows can also be triggered manually via `workflow_dispatch`.

## Common commands

```bash
yarn install          # Install dependencies
yarn start            # Start Metro bundler
yarn android          # Run on Android device/emulator
yarn ios              # Run on iOS simulator
yarn android:apk:debug    # Build debug APK
yarn android:apk:release  # Build release APK
yarn prebuild         # Regenerate native projects from app.json config plugins
```

## Coding conventions

- Use TypeScript for all new files
- Follow existing patterns in `screens/` and `lib/` for new features
- Use Zustand store (`store/use-app-store.ts`) for shared state
- Use `expo-sqlite` via `lib/database.ts` for persistence
- Use `expo-secure-store` for auth tokens and sensitive data
- Prefer existing components and utilities before creating new ones
