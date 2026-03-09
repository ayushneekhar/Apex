#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
APP_ID="com.neekhar.apex"
DERIVED_DATA_PATH="$ROOT_DIR/ios/build"
APP_PATH="$DERIVED_DATA_PATH/Build/Products/Debug-iphonesimulator/Apex.app"
DEVICE_NAME=""
EXPECT_DEVICE_VALUE=0

for arg in "$@"
do
  if [ "$EXPECT_DEVICE_VALUE" -eq 1 ]; then
    DEVICE_NAME="$arg"
    EXPECT_DEVICE_VALUE=0
    continue
  fi

  case "$arg" in
    --device)
      EXPECT_DEVICE_VALUE=1
      ;;
    --device=*)
      DEVICE_NAME=${arg#--device=}
      ;;
  esac
done

if [ -z "$DEVICE_NAME" ]; then
  DEVICE_NAME="iPhone 17 Pro"
fi

if [ ! -d "$APP_PATH" ]; then
  xcodebuild \
    -workspace "$ROOT_DIR/ios/Apex.xcworkspace" \
    -scheme Apex \
    -configuration Debug \
    -sdk iphonesimulator \
    -destination "platform=iOS Simulator,name=$DEVICE_NAME" \
    -derivedDataPath "$DERIVED_DATA_PATH" \
    CODE_SIGNING_ALLOWED=NO \
    build
fi

exec "$ROOT_DIR/scripts/agent-device.sh" reinstall "$APP_ID" "$APP_PATH" --platform ios "$@"
