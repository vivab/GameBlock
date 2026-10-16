# GAMEBLOCK RETRO

Browser tactical FPS inspired by the atmosphere of late-1990s / early-2000s team shooters, built for touch screens and desktop browsers.

[**Play GameBlock**](https://vivab.github.io/GameBlock/)

## What's in the game

- **Sandstone Crossing** — an original desert map with three routes, masonry cover, towers, market stalls and team bases. Geometry lines up with the AI's collision, bullet and vision blockers.
- **5 vs 5 model inspection** — bots are temporarily frozen at their spawn points and do not move or shoot. Their AI still exists, but is disabled in the game's preview configuration.
- **Operators** — **Counter Flame SWAT V8.0 Urban**: the selected city-special-forces operator retains V7's anatomically tapered shoulders but replaces its head, helmet and rounded pouches with a fully rebuilt polygonal tactical mesh. Eye sockets, eyelids, irises, pupils, frowning eyebrows, exposed skin, a nose bridge in the balaclava, helmet rails, NVG mount, lenses, straps, armor seams and pouches are independently modeled. The GLB remains original, hard-edged and static with empty hands. **19 other tactical styles** stay selectable in the 3D gallery.
- **Original FPS gloves** — procedural palms, 3-joint fingers and sleeves with independent right/left grip calibration.
- **Weapons** — Glock 18, AK-47 and two default knives. Existing weapon GLBs are retained, with procedural fallback models when loading fails.
- **Animations** — weapon equip, inspection, recoil, reload poses, knife swing, running/idle and third-person bot shooting.
- **Retro lobby** — an animated 3D character preview, team picker, arsenal, profile, saved nickname and offline statistics.
- **Procedural audio** — synthesized UI feedback, shooting, hits and result cues (no external audio clips).

The original detailed SWAT V2 mesh is generated at GitHub Pages build time from `scripts/build_counter_flame_swat_v2.py` (the 200+ separate anatomy and gear pieces are batched for mobile rendering). Next, `scripts/build_counter_flame_swat_v5.py` reshapes and recolors that mesh into `public/models/counter_flame_swat_v5.glb`: more natural shoulders and a slimmer torso with separate body/equipment color regions, keeping **38,412 triangles** and the tactical gear. The right hand retains an empty trigger-grip; the left hand stays out front as if supporting an invisible rifle. **No rifle or other weapon is attached to this CT character.** The old 13-MB `swat_ct.glb` is unused. Dragomir T still uses its separate 25-MB GLB. NPCs remain frozen for inspection.

The V8 face details are actual mesh geometry, not generated images. The eyes have separate sockets, lids, iris and pupil geometry, but the prototype still lacks skinning, facial expressions and authored high-resolution normal maps. They are future polishing tasks.

No online multiplayer, paid market or friends backend is implemented. Those menu panels clearly say that they are unavailable. The arena, procedural sounds and default CT/T fallback characters remain original GameBlock work. Both tactical operators were previously provided by the user. Those GLBs may contain third-party copyrighted game assets, and their distribution or commercial licensing has **not** been independently verified; obtain appropriate permissions before public redistribution or shipping a commercial game.

## SWAT V8.0 Urban and 20-style character gallery

From the **main lobby**, tap **SWAT V8 / 20 БОЙЦОВ**, or from **team selection** tap **SWAT V8.0 / СРАВНИТЬ 20 БОЙЦОВ**. All variants can be selected from one horizontal numbered strip. The view presents **2 operators side by side on narrow phones**, 3 on medium screens or 5 on desktop, with paging controls to view all 20. These are genuine 3D models shown in the game's shared Three.js scene, not concept images or generated screenshots. Choosing one saves its index locally and applies the same variant to the main lobby and CT NPCs next match.

The styles are generated **at runtime**, using `src/swatV6.js` and **one shared** `public/models/counter_flame_swat_v8.glb` as the anatomical mesh. V8-01 is the upgraded **Городской спецназ** option and the default for new players; existing saved selections are preserved. We deliberately avoid downloading 20 nearly identical multi-megabyte base GLBs. The 20 variants differ in equipment construction, face protection, pouch count, front armor, helmet trim, shoulder shapes, packs, equipment details and color schemes. They are original approximations inspired by the gritty look of classic tactical FPS games, **not direct copies** of copyrighted game characters. They currently use flat-shaded polygon geometry and procedural vertex colors, **not** photorealistic scanned PBR textures or skeletal animation.

## Play and controls

On phones: left joystick moves, swipe the right side to look, red button fires, arrow jumps, crouch icon crouches, and ↻ reloads or inspects. Hold/tap the weapon wheel ◉ to change weapons.

On desktop: WASD moves, mouse looks, left click fires, Space jumps, Ctrl crouches, R reloads/inspects, and 1/2/3 equip weapons.

**Reload/inspect:** if the magazine is full, the action inspects the weapon; otherwise it reloads. The knife always inspects.

Tap **⚙** in a match to adjust original weapon and glove grip transforms. Calibration is saved in this browser. Main-menu nickname and statistics are also local to this browser.

## Development

```sh
npm ci
npm run dev
npm test
npm run build
```

Uses Vite + Three.js. Tests run on Node; GitHub Actions checks the unit tests and production build on every PR. GitHub Pages uses the repository's configured deployment workflow.

### Key modules

| File | Description |
| --- | --- |
| `src/counterFlameSwat.js` | Shared original 3D operator scene placement and mobile-friendly clones |
| `src/swatV6.js` | V7 Urban lead option + 19 original SWAT loadouts, hard-edge equipment, palette and saved selection |
| `src/swatV6Gallery.js` | Responsive 20-style horizontal picker and side-by-side live 3D lineup |
| `scripts/build_counter_flame_swat_v7.py` | Rebuilds the anatomical shoulder geometry from modular V2 parts |
| `scripts/build_counter_flame_swat_v8.py` | Generates the V8 detailed face, helmet and rugged tactical GLB |
| `scripts/swat_v8_details.py` | Original V8 polygons for eyes, brows, balaclava, helmet rail, pouches and fabric seams |
| `scripts/build_counter_flame_swat_v2.py` | Generates detailed original anatomy/equipment before slimming |
| `scripts/build_counter_flame_swat_v3.py` | Older V3 slim variant, kept for reference |
| `scripts/build_counter_flame_swat_v4.py` | Previous gritty SWAT V4 variant kept for reference |
| `scripts/build_counter_flame_swat_v5.py` | Slimmer shoulders and multi-color equipment palette for SWAT V5 |
| `src/retroOperators.js` | Articulated original CT/T fallback meshes and animation |
| `src/dragomirOperator.js` | Shared realistic SAS/SWAT and Dragomir GLB rig, 2-bone arm IK, locomotion and recoil |
| `scripts/inspect-glb.mjs` | GLB metadata and clip-duration inspector |
| `src/retroHands.js` | Original FPS glove and finger mesh generator |
| `src/arena.js` | Sandstone Crossing arena visualization |
| `src/combat.js` | Deterministic gameplay rules, AI pathfinding and combat |
| `src/menu.js` | Touch-friendly retro lobby and local profile |
| `src/audio.js` | Procedural sounds |
| `src/viewmodels.js` | First-person weapon mounting and motion |
| `src/main.js` | Scene setup, inputs, game loop, UI and effects |

Visual positioning and touch behavior must still be checked on real phones — passing unit tests cannot guarantee the appearance of every FPS pose on every display.

### Base SWAT V8 anatomical and facial GLB

The shared CT geometry is not a scanned/photo-identical copy of the provided character art. It is an original medium-poly approximation intended for browser performance and iteration. For local development, generate the asset before running Vite:

```sh
python -m pip install 'numpy>=1.26,<3' 'trimesh>=4,<5'
python scripts/build_counter_flame_swat_v2.py
python scripts/build_counter_flame_swat_v5.py
python scripts/build_counter_flame_swat_v7.py
python scripts/build_counter_flame_swat_v8.py
npm ci
npm run dev
```

V8 uses original geometric facial components and region-specific urban vertex colors, not a photorealistic scanned PBR texture set; physically scanned materials, UVs and skeletal skinning are not yet implemented. The soldier is static in this build; adding a skeletal armature and proper walk/fire/reload animations is a future step. GitHub Pages generates the GLB automatically on every deployment.
