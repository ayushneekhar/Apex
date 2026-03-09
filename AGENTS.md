# AGENTS.md

## Purpose

Use `agent-device` for UI validation when a change affects navigation, gestures, forms, onboarding, settings, auth, media selection, or any other user-visible flow in Apex.

## Apex identifiers

- App name: `Apex`
- iOS bundle id: `com.neekhar.apex`
- Android package: `com.neekhar.apex`
- Deep link scheme: `apex://`

## Use the repo wrappers

Do not assume the globally installed `agent-device` binary is on the right Node version by itself. Prefer the repo wrappers because they pin the CLI to Node `22.22.1`.

- `yarn ad:devices`
- `yarn ad:ios:boot --device "iPhone 17 Pro"`
- `yarn ad:ios:open --device "iPhone 17 Pro"`
- `yarn ad:ios:reinstall --device "iPhone 17 Pro"`
- `yarn ad:android:boot --serial <serial>`
- `yarn ad:android:open --serial <serial>`
- `yarn ad:android:reinstall --serial <serial>`
- `./scripts/agent-device.sh <command> ...` for commands that are not wrapped in `package.json`

Wrapper behavior:

- `scripts/agent-device.sh` runs `agent-device` with the repo-pinned Node runtime.
- `scripts/agent-device-ios-reinstall.sh` builds `ios/build/Build/Products/Debug-iphonesimulator/Apex.app` for the requested simulator, then runs `agent-device reinstall`.
- `scripts/agent-device-android-reinstall.sh` prefers `android/app/build/outputs/apk/debug/app-debug.apk` and falls back to `android/app/build/outputs/apk/release/app-release.apk`.

## What agent-device can do here

- Device and session control: `devices`, `boot`, `open`, `close`, `apps`, `appstate`, `home`, `back`, `app-switcher`
- UI inspection: `snapshot`, `diff snapshot`, `find`, `get`, `wait`, `is`
- Interaction: `press`, `long-press`, `focus`, `type`, `fill`, `swipe`, `scroll`, `scrollintoview`, `pinch`
- Artifacts and debugging: `screenshot`, `trace start`, `trace stop`, `logs path`, `logs start`, `logs stop`, `logs clear`, `logs doctor`, `logs mark`, `network dump`, `perf`
- Device helpers: `clipboard read`, `clipboard write`, Android `keyboard status|get|dismiss`, `settings appearance`, `settings permission`, `push`

## Testing guidance for agents

- Prefer `press` as the canonical tap command. `click` is only an alias.
- Start with `snapshot -i` for iterative work.
- Re-run `snapshot` after every UI mutation. Snapshot refs such as `@e7` become stale after the screen changes.
- Scope snapshots when possible with `-s "<label>"` to reduce noise.
- Use `find ... click` or `find ... fill` when refs are likely to drift.
- Use `batch` only for one screen-local workflow at a time and keep it moderate, roughly `5-20` steps.
- Add a `wait` or `is exists` guard after mutating actions such as `open`, `press`, `fill`, or `swipe`.
- Keep logging off unless you are debugging a failure. Use `logs start` only when needed, then `logs stop`.
- Close the session when done so the simulator/device is not left in an ambiguous state.

## Apex-specific constraints

- For iOS automation, boot or target a specific simulator explicitly, for example `--device "iPhone 17 Pro"`.
- For Android automation, ensure an emulator or physical device is already attached before relying on `ad:android:*` commands.
- `trigger-app-event` should not be assumed to work in this repo. No app-side `agent-device` event hook is currently documented or wired in source.
- If `ad:ios:reinstall` fails, treat it as an app build problem first and inspect the Xcode build output before blaming `agent-device`.
- If the app is already installed on a simulator/device, `ad:ios:open` or `ad:android:open` is usually the fastest validation path.

## Recommended validation flows

For an installed iOS simulator build:

```bash
yarn ad:ios:boot --device "iPhone 17 Pro"
yarn ad:ios:open --device "iPhone 17 Pro"
./scripts/agent-device.sh snapshot --platform ios --device "iPhone 17 Pro"
```

For an installed Android build:

```bash
yarn ad:android:open --serial <serial>
./scripts/agent-device.sh snapshot --platform android --serial <serial>
```

For debugging a failing flow:

```bash
./scripts/agent-device.sh logs start --platform ios --device "iPhone 17 Pro"
./scripts/agent-device.sh logs mark "before repro" --platform ios --device "iPhone 17 Pro"
./scripts/agent-device.sh network dump 20 summary --platform ios --device "iPhone 17 Pro"
./scripts/agent-device.sh logs stop --platform ios --device "iPhone 17 Pro"
```
