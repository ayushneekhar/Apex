#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
APP_ID="com.neekhar.apex"

for candidate in \
  "$ROOT_DIR/android/app/build/outputs/apk/debug/app-debug.apk" \
  "$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"
do
  if [ -f "$candidate" ]; then
    exec "$ROOT_DIR/scripts/agent-device.sh" reinstall "$APP_ID" "$candidate" --platform android "$@"
  fi
done

echo "No Android APK found. Build one with: yarn android:apk:debug" >&2
exit 1
