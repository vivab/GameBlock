# GAMEBLOCK RETRO

Browser tactical FPS inspired by the atmosphere of late-1990s / early-2000s team shooters, built for touch screens and desktop browsers.

[**Play GameBlock**](https://vivab.github.io/GameBlock/)

## What's in the game

- **Sandstone Crossing** — an original desert map with three routes, masonry cover, towers, market stalls and team bases. Geometry lines up with the AI's collision, bullet and vision blockers.
- **5 vs 5 model inspection** — bots are temporarily frozen at their spawn points and do not move or shoot. Their AI still exists, but is disabled in the game's preview configuration.
- **Operators** — our original **Counter Flame SWAT V2** (CT): olive tactical uniform, helmet and goggles, face mask, realistic proportions, MOLLE vest, pouches, kneepads, boots, and empty hands posed to hold a future rifle. Dragomir remains T. V2 is a static prototype and has no bone rig yet.
- **Original FPS gloves** — procedural palms, 3-joint fingers and sleeves with independent right/left grip calibration.
- **Weapons** — Glock 18, AK-47 and two default knives. Existing weapon GLBs are retained, with procedural fallback models when loading fails.
- **Animations** — weapon equip, inspection, recoil, reload poses, knife swing, running/idle and third-person bot shooting.
- **Retro lobby** — an animated 3D character preview, team picker, arsenal, profile, saved nickname and offline statistics.
- **Procedural audio** — synthesized UI feedback, shooting, hits and result cues (no external audio clips).

The detailed, original SWAT V2 is generated at GitHub Pages build time using `scripts/build_counter_flame_swat_v2.py` as `public/models/counter_flame_swat_v2.glb`. The generator creates 200+ named anatomy/equipment pieces and merges them into **one optimized render mesh** for mobile performance, around 38k triangles and under 1 MB. The right hand makes an empty trigger-grip; the left hand reaches toward an imaginary foregrip. **No rifle or other weapon is attached to this CT character.** The previous V1 source is preserved, and the old 13-MB `swat_ct.glb` is not loaded. Dragomir T still uses the separate 25-MB GLB. NPCs remain frozen for inspection.

No online multiplayer, paid market or friends backend is implemented. Those menu panels clearly say that they are unavailable. The arena, procedural sounds and default CT/T fallback characters remain original GameBlock work. Both tactical operators were previously provided by the user. Those GLBs may contain third-party copyrighted game assets, and their distribution or commercial licensing has **not** been independently verified; obtain appropriate permissions before public redistribution or shipping a commercial game.

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
| `src/counterFlameSwat.js` | SWAT V2 static model placement and mobile-friendly clones |
| `scripts/build_counter_flame_swat_v2.py` | Generates SWAT V2 geometry, empty rifle-holding hands and optimized GLB |
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

### SWAT V2 asset

The CT prototype is not a scanned/photo-identical copy of the provided character art. It is an original medium-poly approximation intended for browser performance and iteration. For local development, generate the asset before running Vite:

```sh
python -m pip install 'numpy>=1.26,<3' 'trimesh>=4,<5'
python scripts/build_counter_flame_swat_v2.py
npm ci
npm run dev
```

The soldier is static in this build; adding a skeletal armature and proper walk/fire/reload animations is a future step. GitHub Pages generates the GLB automatically on every deployment.
