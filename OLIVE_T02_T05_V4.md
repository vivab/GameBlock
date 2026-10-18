# T-02 / T-05 — VERY LIGHT OLIVE V4 (live web/mobile models)

These are actual `public/casting/masked/02.glb` and `05.glb` game meshes,
not 2D preview art. Rebuilt in GameBlock from the unchanged rigged originals
by `scripts/recolor_olive_terrorists.py`.

- T-02: very light olive, photo-garment average RGB `223.7, 228, 178.5`.
- T-05: light khaki olive, photo-garment average RGB `226.4, 221.5, 179.2`.
- The body material has neutral white PBR base color and a small olive
  emissive fill so nearly-black areas no longer look black on dim
  mobile displays.
- Masks are separately materialed dark/black (NOT recolored), face/eyes and
  full 80-bone skeleton are unchanged.
- The original Rocketbox licensed skinned bodies and untouched masks are
  preserved under `public/casting/masked/original/` for rollback.
- All other T models and the chosen CT #08 are unchanged.

Published page: https://vivab.github.io/GameBlock/terrorists.html?v=20261018-very-light-olive-v4

On each change the publishing workflow verifies NPM tests and builds the
live GameBlock page. The public smoke test also checks downloaded GLB
material settings, masked face and skeleton from GitHub Pages.
