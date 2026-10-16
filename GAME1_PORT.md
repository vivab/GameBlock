# Game1 → GameBlock: gameplay and UI source copy

Game1 source: `vivab/Game1` at commit
`0ca998c64b0c3638152d8bd49f9e3dc0bd8879f1`. 
Original Game1 is not edited; all writes target `vivab/GameBlock`.

## Ported and playable

- Complete Game1 menu system (inventory, market, profile, statistics, friends,
  cases and rewards UI) copied to `public/game1/menu.html`.
- Game1 combat engine and gameplay UI, 5v5 bots, controls, aiming and shooting
  from `game.js`/Game1 `index.html`.
- Game1 FPS glove/hand geometry and inspect/reload weapon animations from
  `hands.js`; `GLTFLoader.js` dependency copied.
- Game1 permitted weapon model library in `public/game1/`:
  AWP, Glock, USP-S, Desert Eagle, M16, M249, Mossberg, M870, P250,
  M4A4, karambit, knife T.
- Access via GameBlock main menu button **ИГРОВОЙ РЕЖИМ GAME1**.
- Main GameBlock game + SWAT V8 and its weapon calibration unchanged.

## Explicit exclusions

- **No Game1 map**, neither the Resoforge map GLB nor the procedural
  layout. Game1 mode uses `ARENA_WALLS` from `GameBlock/src/combat.js`,
  compiled with `scripts/build-game1-map.mjs`.
- **No Game1 AK**. Every imported rifle path points to the existing
  `GameBlock/public/models/ak47.glb`.
- **No writes to Game1 repository**.

## Build details

`scripts/sync-game1-assets.sh` fetches only allowlisted large GLBs
from the pinned Game1 commit, and copies the already-present identical knife
from GameBlock. It runs during Pages build, not in local `npm test`.
`scripts/build-game1-map.mjs` generates `gameblock-arena-data.js`
from existing GameBlock collision data so the map cannot silently diverge.

To run locally:
```bash
npm ci
bash scripts/sync-game1-assets.sh
node scripts/build-game1-map.mjs
npm run dev
```

The alternate mode remains browser-side/offline vs bots (no real matchmaking).
Game1 UI/demo economies are local examples, not real-money transactions.
