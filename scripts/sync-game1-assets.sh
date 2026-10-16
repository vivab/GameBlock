#!/usr/bin/env bash
# Copy allowed Game1 3D models into GameBlock Pages build (READ-ONLY origin).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/game1
commit="0ca998c64b0c3638152d8bd49f9e3dc0bd8879f1"
base="https://raw.githubusercontent.com/vivab/Game1/$commit"
# No map and no Game1 Kalashnikov are downloaded.
for name in "low-poly_m16a4_acog.glb" "low-poly_m249_saw.glb" "low_poly_stylized_karambit_knife.glb" "rifle__m4a4_weapon_model_cs2.glb"; do
  if test -f "public/game1/$name" && test "$(head -c 4 "public/game1/$name")" = "glTF"; then
    echo "GameBlock already contains $name; no network download needed."
  else
    echo "Read-only allowed Game1 fallback download: $name"
    curl --fail --location --retry 3 --connect-timeout 20 --max-time 240 --silent --show-error "$base/$name" --output "public/game1/$name"
  fi
  test "$(head -c 4 "public/game1/$name")" = "glTF" || { echo "Invalid GLB $name" >&2; exit 1; }
done
# Identical imported knife blob is already in GameBlock's public/models directory.
cp public/models/knife_t.glb public/game1/knife_default_t__cs2.glb
test "$(head -c 4 public/game1/knife_default_t__cs2.glb)" = "glTF"
test ! -e public/game1/ak-47_low_poly.glb
test ! -e public/game1/lowpoly__fps__tdm__game__map_by_resoforge.glb
echo "Allowed Game1 models copied; Game1 source and original GameBlock map/AK untouched."