# GameBlock Alpha 0.2 — Team Deathmatch

## Match

- Choose Counter-Terrorists (blue) or Terrorists (sand).
- Five fighters per side: the human plus four friendly bots versus five enemy bots.
- A match lasts 120 seconds. Each enemy kill scores exactly one team point.
- Respawn on the same team's base after three seconds, with 1.25 seconds of spawn protection.
- Friendly fire is disabled. A teammate still blocks a bullet or knife strike.
- The score freezes when time expires. Show win/loss/draw and personal kills/deaths; replay or choose the other side.

## Bots

This is a local bot match, not network multiplayer. Bots have limited field of view and range, and every arena wall blocks vision and shots. They remember the last visible location briefly and share recent sightings with teammates; they do not track hidden opponents. Enemies appear on the player's radar only when visible.

Bots use a small navigation grid, avoid cover and other fighters, react with a delay, fire with modest accuracy, strafe and reload. Team plans rotate between center pressure, left/right squad flanks, split routes and holding positions. A trailing team prefers attacking plans. This is a simple rule-based tactical system, not a trained learning model.

## Controls and view model

Phone: left joystick moves; other touches drag the view, including while holding fire/jump/crouch. Crouch toggles, jump can be held, and the circular weapon menu selects pistol or knife. Desktop: WASD, mouse drag/left click, Space, Ctrl, R and 1/2. Death, restart and loss of focus clear held controls.

The pistol sits in the lower-right foreground with a two-handed grip, sleeves, sights, recoil and a reload motion. The knife has a separate grip and strike motion. A separate view-model camera keeps hands clear of wall clipping. Character meshes remain procedural block placeholders.

## Development and deployment

`npm ci`, `npm test`, `npm run build`. Vite serves the game under `/GameBlock/`. GitHub Pages deploys on a push to `main` only after tests and the build pass.
