# GAMEBLOCK RETRO

Browser tactical FPS inspired by the atmosphere of late-1990s / early-2000s team shooters, built for touch screens and desktop browsers.

[**Play GameBlock**](https://vivab.github.io/GameBlock/)

## What's in the game

- **Sandstone Crossing** — an original desert map with three routes, masonry cover, towers, market stalls and team bases. Geometry lines up with the AI's collision, bullet and vision blockers.
- **5 vs 5 bots** — a local single-player match with teams, line of sight, limited bot reaction times, pathfinding, cover routing, strafing, ammunition, respawn and kill feed.
- **Operators** — self-made low-poly Sentinel (CT) and fallback Nomad (T), plus the user-supplied skinned Dragomir GLB for terrorist bots. All animation follows controlled arm and leg bones.
- **Original FPS gloves** — procedural palms, 3-joint fingers and sleeves with independent right/left grip calibration.
- **Weapons** — Glock 18, AK-47 and two default knives. Existing weapon GLBs are retained, with procedural fallback models when loading fails.
- **Animations** — weapon equip, inspection, recoil, reload poses, knife swing, running/idle and third-person bot shooting.
- **Retro lobby** — an animated 3D character preview, team picker, arsenal, profile, saved nickname and offline statistics.
- **Procedural audio** — synthesized UI feedback, shooting, hits and result cues (no external audio clips).

The supplied Dragomir model contains **120 zero-duration, single-keyframe preview clips**, not 120 walk/shoot/reload sequences. Its real armature is driven procedurally to hold an AK, walk and recoil. The 25-MB file is loaded from `public/models/dragomir_t.glb`, with an original low-poly fallback if it cannot be loaded. The large download can take some time on mobile data.

No online multiplayer, paid market or friends backend is implemented. Those menu panels clearly say that they are unavailable. The arena, procedural sounds and default CT/T fallback characters remain original GameBlock work. The user explicitly supplied the Dragomir agent file. Avoid uploading or redistributing third-party game artwork without appropriate permission.

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
| `src/retroOperators.js` | Articulated original CT/T fallback meshes and animation |
| `src/dragomirOperator.js` | Dragomir GLB bone IK, locomotion and recoil animation |
| `scripts/inspect-glb.mjs` | GLB metadata and clip-duration inspector |
| `src/retroHands.js` | Original FPS glove and finger mesh generator |
| `src/arena.js` | Sandstone Crossing arena visualization |
| `src/combat.js` | Deterministic gameplay rules, AI pathfinding and combat |
| `src/menu.js` | Touch-friendly retro lobby and local profile |
| `src/audio.js` | Procedural sounds |
| `src/viewmodels.js` | First-person weapon mounting and motion |
| `src/main.js` | Scene setup, inputs, game loop, UI and effects |

Visual positioning and touch behavior must still be checked on real phones — passing unit tests cannot guarantee the appearance of every FPS pose on every display.
