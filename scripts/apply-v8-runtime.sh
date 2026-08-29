#!/usr/bin/env bash
set -euo pipefail

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

cat scripts/v8-runtime.part.* | base64 -d > "$tmp/v8-runtime.tgz"
tar -xzf "$tmp/v8-runtime.tgz" -C .

for patch in scripts/v8-code/*.patch; do
  [ -s "$patch" ] || continue
  git apply "$patch"
done

node scripts/apply-v8-data.mjs

echo "V8 runtime patch applied successfully."
