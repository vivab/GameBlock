# 30-operator walkable inspection ground

Open `/showroom.html` or choose **30 СПЕЦНАЗОВЦЕВ · ОСМОТР** from the GameBlock main menu.

This is a separate, deliberately minimal inspection scene. It does not change the
main FPS match, arena, terrorists, SWAT V8, or any of the user's existing weapon
models. There is only a flat floor, a first-person camera, and thirty numbered
static operators in three rows of ten. Walk using WASD or the left touchscreen
joystick, and drag on the right to look around. Characters stand still.

**Asset honesty:** The thirty visible operators are **thirty tactical outfit
variations from ONE genuinely rigged base character**, not thirty independent
downloads or unique skeletons. Each character has its own clone of the source
skeleton and can be animated independently using Three.js `AnimationMixer`.
The current display uses the original Idle animation. The source includes
Idle/Walk/Run clips; jump and proper rifle-ready poses need additional work.
The gear is procedural proof-of-concept geometry, not finished realistic SWAT
costumes. Do not represent these as thirty independently sourced models.

Source: `Soldier.glb`, Three.js examples,
https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Soldier.glb
(MIT licensed examples). GitHub Pages downloads this file during its build.
The file is not sourced from Game1, and no game files are written there.

Candidate independent SWAT models for a future true 30-source selection:
- https://sketchfab.com/3d-models/free-military-soldier-rigged-e9c56308a67d4a3db62e914fafa4d198
- https://sketchfab.com/3d-models/swat-operator-cop-game-ready-animated-1b30188ed90449fea1777bb17637f54c
- https://poly.pizza/m/Btfn3G5Xv4

Downloading from Sketchfab typically requires the authorized download
workflow and license/attribution compliance. Do not bypass login, DRM,
or download restrictions.
