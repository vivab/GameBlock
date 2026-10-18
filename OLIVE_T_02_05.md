# T-02 and T-05: olive/khaki bandit uniforms

This is the **actual playable, rigged .glb model edit** for GameBlock.
The previous black clothes seen on iPhone came from a strong
(0.29, 0.25, 0.24) PBR body tint over the photograph.

- T-02: **near-light olive field uniform**, black balaclava.
- T-05: **bright sandy-khaki bandit uniform**, black balaclava.
- Original dark uniforms are archived as
  `public/casting/masked/original/02.glb` and `05.glb`.
- New `public/casting/masked/02.glb` and `05.glb` contain **different embedded
  body photograph texture JPEGs**, recolored with light/dark cloth variation.
  Balaclava, visible eyes, skin, skeleton, UVs, mesh, skin weights and
  animations are not changed. Neither model is simply a generated picture.
- Both T characters retain 80 bone rigging and can be inspected on the
  walkable floor at [terrorists.html](https://vivab.github.io/GameBlock/terrorists.html).
  Existing saved T selections and CT №08 remain.
- `scripts/recolor_olive_terrorists.py` is fully repeatable and only ever
  reads the archived black models, preventing repeated recoloring artifacts.
  Github Actions `.github/workflows/recolor-olive-terrorists.yml` does the
  conversion, runs real GLB validators, and commits the edited models.

These are recolored editions of our existing two skinned character models.
They are NOT 3D conversions of a 2D generated concept illustration or new
independently authored soldier geometry. Gear silhouette still comes from
the underlying licensed source models.

Version 3 is significantly brighter than v2: real baked clothing pixel means must exceed 166/255 in red and green. The darkest folds are now colored olive/khaki, not almost black. The camera lighting cannot substitute for this texture edit.
