#!/usr/bin/env bash
set -euo pipefail

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

cat \
  scripts/v8-runtime.part.00 \
  scripts/v8-runtime.part.01 \
  scripts/v8-runtime.part.02a \
  scripts/v8-runtime.part.02b \
  scripts/v8-runtime.part.02c \
  scripts/v8-runtime.part.02d \
  scripts/v8-runtime.part.03 \
  | base64 -d > "$tmp/v8-runtime.tgz"

tar -xzf "$tmp/v8-runtime.tgz" -C .

for patch in scripts/v8-code/*.patch; do
  [ -s "$patch" ] || continue
  git apply "$patch"
done

node scripts/apply-v8-data.mjs

# TypeScript compatibility fixes after the V8 source patches are applied.
# The Lucide Map icon otherwise shadows the built-in Map collection.
sed -i 's/^  Map,$/  Map as MapIcon,/' src/App.tsx
sed -i 's/{ id: "map", label: "Mapa", icon: Map }/{ id: "map", label: "Mapa", icon: MapIcon }/' src/App.tsx
# @types/leaflet exposes Control as constructable in this build.
sed -i 's/const legend = L\.control({ position: "bottomleft" });/const legend = new L.Control({ position: "bottomleft" });/' src/components/MapView.tsx

echo "V8 runtime patch applied successfully."
