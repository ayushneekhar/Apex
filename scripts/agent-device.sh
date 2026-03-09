#!/bin/sh

set -eu

NODE_VERSION="22.22.1"
NODE_BIN="$HOME/.nvm/versions/node/v$NODE_VERSION/bin"

if [ ! -x "$NODE_BIN/node" ]; then
  echo "Node v$NODE_VERSION is not installed. Run: nvm install $NODE_VERSION" >&2
  exit 1
fi

if [ ! -x "$NODE_BIN/agent-device" ]; then
  echo "agent-device is not installed for Node v$NODE_VERSION. Run: nvm exec $NODE_VERSION npm install -g agent-device" >&2
  exit 1
fi

export PATH="$NODE_BIN:$PATH"

exec "$NODE_BIN/agent-device" "$@"
