#!/usr/bin/env bash
# Validate the fully imported Game1 assets. Nothing is downloaded or replaced.
set -euo pipefail
cd "$(dirname "$0")/.."
for asset in \
  "ak-47_low_poly.glb" \
  "de_dust2_-_cs_map.glb" \
  "lowpoly__fps__tdm__game__map_by_resoforge.glb" \
  "glock.glb" \
  "knife_default_t__cs2.glb" \
  "low-poly_usp-s.glb" \
  "low-poly_desert_eagle.glb" \
  "low-poly_m16a4_acog.glb" \
  "low-poly_m249_saw.glb" \
  "low_poly_awp.glb" \
  "low-poly_mossberg_590.glb" \
  "low_poly_shotgun-m870.glb" \
  "low_poly_stylized_karambit_knife.glb" \
  "m4a4_low_poly.glb" \
  "sig_sauer_p250_low-poly.glb" \
  "m67_grenade_low-poly.glb" \
  "m18_smoke_grenade_low-poly.glb" \
  "m84_stun_grenade_low-poly.glb"
do
  test -s "public/game1/$asset" || { echo "Missing Game1: $asset" >&2; exit 1; }
  test "$(head -c 4 "public/game1/$asset")" = "glTF" || { echo "Invalid GLB: $asset" >&2; exit 1; }
done
for source in game.js hands.js index.html menu.html GLTFLoader.js bomb.html bomb.js bomb-rules.js
do
  test -s "public/game1/$source" || { echo "Missing Game1 source: $source" >&2; exit 1; }
done
echo "Complete Game1 game, Dust2, weapons, hands and bomb mode are present."
