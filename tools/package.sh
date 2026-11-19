#!/bin/sh
# Builds the zip to upload to the Chrome Web Store: dist/gta6-blackout-<version>.zip
# Usage: npm run package
set -eu
cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./extension/manifest.json').version")
PKG_VERSION=$(node -p "require('./package.json').version")
if [ "$VERSION" != "$PKG_VERSION" ]; then
  echo "Version mismatch: extension/manifest.json is $VERSION, package.json is $PKG_VERSION" >&2
  exit 1
fi

node tests/patterns.test.js

# Chrome writes this when the folder is loaded unpacked; it must not ship.
rm -rf extension/_metadata

OUT="dist/gta6-blackout-$VERSION.zip"
mkdir -p dist
rm -f "$OUT"
(cd extension && zip -qr -X "../$OUT" . -x ".*" -x "*/.*")

echo "Built $OUT"
unzip -l "$OUT" | tail -n +4 | sed '$d' | sed '$d' | awk '{print "  " $4}'
du -h "$OUT" | awk '{print "Size: " $1}'
