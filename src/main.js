import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSoldier, createViewArms } from './visuals.js';
import { Match, TEAMS, ARENA_WALLS, MATCH_SECONDS, WEAPONS, canSee } from './combat.js';

const match = new Match();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x819fb0);
scene.fog = new THREE.Fog(0x819fb0, 32, 75);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 150);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.autoClear = false;
renderer.domElement.setAttribute('aria-label', 'Арена GameBlock');
document.body.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff, 0x59626a, 2.5));
const sunlight = new THREE.DirectionalLight(0xffffff, 2);
sunlight.position.set(-5, 14, 8); scene.add(sunlight);
const material = color => new THREE.MeshLambertMaterial({ color });
function box(w, h, d, color, x, y, z, parent = scene) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
  mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(48, 48), material(0x718079));
floor.rotation.x = -Math.PI / 2; scene.add(floor);
const grid = new THREE.GridHelper(48, 24, 0x344e55, 0x53665e);
grid.position.y = 0.012; scene.add(grid);
for (const w of ARENA_WALLS) box(w.w, w.h, w.d, 0x9ca6a1, w.x, w.h / 2, w.z);
for (const team of Object.values(TEAMS)) {
  const base = new THREE.Mesh(new THREE.PlaneGeometry(18, 5), new THREE.MeshBasicMaterial({ color: team.color, transparent: true, opacity: 0.18 }));
  base.rotation.x = -Math.PI / 2; base.position.set(0, 0.02, team.spawnZ); scene.add(base);
  const pole = box(0.1, 3, 0.1, 0xd7dedf, -9, 1.5, team.spawnZ);
  box(1.6, 0.8, 0.06, team.color, 0.8, 0.75, 0, pole);
}

// Render the hands with their own field of view and depth buffer. They stay in
// the lower-right foreground instead of clipping into arena walls.
const viewScene = new THREE.Scene();
const viewCamera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.01, 4);
viewScene.add(viewCamera);
viewScene.add(new THREE.HemisphereLight(0xffffff, 0x354655, 2.6));
const viewLight = new THREE.DirectionalLight(0xffffff, 1.7);
viewLight.position.set(-2, 3, 2); viewScene.add(viewLight);
const gun = new THREE.Group(), knife = new THREE.Group(), rifle = new THREE.Group();
viewCamera.add(gun, knife, rifle);
gun.scale.setScalar(0.75); knife.scale.setScalar(0.75); rifle.scale.setScalar(0.75);
function arm(parent, from, to, width, color) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const mesh = box(width, a.distanceTo(b), width, color, 0, 0, 0, parent);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return mesh;
}
const pistolFallback = new THREE.Group(); gun.add(pistolFallback);
box(0.145, 0.13, 0.48, 0x30373e, 0, 0.02, -0.13, pistolFallback); // slide
box(0.135, 0.065, 0.37, 0x171c22, 0, -0.067, -0.1, pistolFallback); // frame
const grip = box(0.105, 0.21, 0.13, 0x232a32, 0, -0.16, 0.075, pistolFallback);
grip.rotation.x = -0.22;
box(0.045, 0.047, 0.1, 0x11161a, 0, 0.002, -0.4, pistolFallback); // barrel
box(0.027, 0.025, 0.026, 0x9ea7ac, 0, 0.095, -0.34, pistolFallback); // front sight
for (const x of [-0.042, 0.042]) box(0.018, 0.03, 0.023, 0x15191d, x, 0.1, 0.04, pistolFallback);
box(0.12, 0.125, 0.15, 0xbfa17f, 0.025, -0.14, 0.105, pistolFallback);
box(0.09, 0.115, 0.14, 0xb29373, -0.065, -0.13, 0.08, pistolFallback);
arm(pistolFallback, [0.07, -0.2, 0.13], [0.19, -0.35, 0.5], 0.115, 0x344b58);
arm(pistolFallback, [-0.09, -0.18, 0.11], [-0.36, -0.34, 0.48], 0.115, 0x344b58);
const knifeFallback = new THREE.Group(); knife.add(knifeFallback);
box(0.085, 0.11, 0.24, 0x393b38, 0, -0.05, 0.04, knifeFallback);
const blade = box(0.032, 0.07, 0.5, 0xc3cdd0, 0, 0.01, -0.29, knifeFallback);
blade.rotation.z = -0.15;
box(0.15, 0.025, 0.055, 0x889293, 0, -0.01, -0.04, knifeFallback);
box(0.13, 0.13, 0.16, 0xbfa17f, 0.025, -0.085, 0.09, knifeFallback);
arm(knifeFallback, [0.06, -0.15, 0.14], [0.18, -0.32, 0.52], 0.12, 0x344b58);
const muzzle = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 5), new THREE.MeshBasicMaterial({ color: 0xffdc7a }));
muzzle.rotation.x = -Math.PI / 2; muzzle.position.set(0, 0.005, -0.49); gun.add(muzzle);
const rifleFallbackGroup = new THREE.Group(); rifle.add(rifleFallbackGroup);
const rifleFallback = box(0.13, 0.11, 0.8, 0x3a4140, 0, 0.02, -0.27, rifleFallbackGroup);
box(0.11, 0.18, 0.18, 0x8e6038, 0, -0.13, 0.03, rifleFallbackGroup);
const rifleMuzzle = muzzle.clone(); rifleMuzzle.position.z = -0.82; rifle.add(rifleMuzzle);
for (const [group, length] of [[rifleFallbackGroup, 0.47]]) {
  arm(group, [0.09, -0.19, 0.12], [0.25, -0.38, 0.47], 0.13, 0x344b58);
  arm(group, [-0.09, -0.12, -0.22], [-0.3, -0.36, 0.42], 0.13, 0x344b58);
  box(0.13, 0.12, 0.16, 0xbfa17f, 0.07, -0.15, length - 0.35, group);
}
const pistolArms = createViewArms(gun, 'pistol');
const rifleArms = createViewArms(rifle, 'rifle');
const knifeArms = createViewArms(knife, 'knife');
const loader = new GLTFLoader();
const assets = {};
// Unrigged character GLBs make enormous T-pose wings: use articulated operators instead.
const assetFiles = { pistol: 'g18', rifle: 'ak47', knife_ct: 'knife_ct', knife_t: 'knife_t' };
// Models have different native axes and scales. Mount them once in world units;
// cloned meshes share geometry/texture buffers between the ten fighters.
// Detect which end of a pistol contains its muzzle by looking for the end
// without the hanging grip. Align that end to camera forward (-Z).
function orientPistol(model) {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const dims = bounds.getSize(new THREE.Vector3());
  const axis = dims.x > dims.z ? 'x' : 'z';
  const min = bounds.min[axis], max = bounds.max[axis];
  const lower = min + (max - min) * 0.34, upper = max - (max - min) * 0.34;
  let lowY = 0, highY = 0, lowCount = 0, highCount = 0;
  const point = new THREE.Vector3();
  model.traverse(child => {
    if (!child.isMesh) return;
    const position = child.geometry?.attributes?.position;
    if (!position) return;
    const stride = Math.max(1, Math.ceil(position.count / 1400));
    for (let i = 0; i < position.count; i += stride) {
      point.fromBufferAttribute(position, i).applyMatrix4(child.matrixWorld);
      if (point[axis] < lower) { lowY += point.y; lowCount++; }
      if (point[axis] > upper) { highY += point.y; highCount++; }
    }
  });
  const positiveMuzzle = highCount && lowCount ? highY / highCount >= lowY / lowCount : true;
  model.rotation.y = axis === 'x'
    ? (positiveMuzzle ? Math.PI / 2 : -Math.PI / 2)
    : (positiveMuzzle ? Math.PI : 0);
}
function fittedModel(source, kind, size) {
  const holder = new THREE.Group();
  const model = source.clone(true); holder.add(model);
  if (kind === 'weapon') model.rotation.y = Math.PI / 2;
  if (kind === 'pistol') orientPistol(model);
  if (kind === 'knife') model.rotation.y = 0;
  if (kind === 't') model.rotation.x = Math.PI / 2;
  if (kind === 'character' || kind === 't') model.rotation.y = Math.PI;
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const dims = bounds.getSize(new THREE.Vector3());
  const scale = size / (kind === 'character' || kind === 't' ? dims.y : Math.max(dims.x, dims.y, dims.z));
  model.scale.multiplyScalar(scale); model.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(model);
  const center = fitted.getCenter(new THREE.Vector3());
  model.position.sub(center);
  if (kind === 'character' || kind === 't') model.position.y -= fitted.min.y - center.y;
  return holder;
}
function attachWeapon(group, asset, length, mount = {}, kind = 'weapon') {
  const loaded = fittedModel(asset, kind, length);
  loaded.position.set(mount.x || 0, mount.y || 0, mount.z || -0.18);
  group.add(loaded);
  return loaded;
}
function installAsset(key) {
  if (key === 'pistol') {
    pistolFallback.visible = false;
    attachWeapon(gun, assets.pistol, 0.57, { z: -0.20, y: 0.01 }, 'pistol');
  } else if (key === 'rifle') {
    rifleFallbackGroup.visible = false;
    attachWeapon(rifle, assets.rifle, 0.98, { z: -0.31 });
    for (const actor of match.actors) if (!actor.isPlayer) mountBotRifle(actor);
  } else if (key.startsWith('knife_')) {
    if (match.player?.team === key.slice(6)) mountKnife(key);
  }
}
let mountedKnife;
function mountKnife(key) {
  if (!assets[key]) return;
  if (mountedKnife) knife.remove(mountedKnife);
  knifeFallback.visible = false;
  mountedKnife = attachWeapon(knife, assets[key], 0.58, { x: 0.035, z: -0.20, y: 0.04 }, 'knife');
  mountedKnife.rotation.y = 0;
  mountedKnife.rotation.z = -0.15;
}
for (const [key, filename] of Object.entries(assetFiles)) {
  loader.load(`${import.meta.env.BASE_URL}models/${filename}.glb`, result => {
    assets[key] = result.scene; installAsset(key);
  }, undefined, error => console.warn(`Не удалось загрузить ${filename}.glb`, error));
}

const fighters = new Map();
function createFighter(actor) {
  const root = new THREE.Group(); scene.add(root);
  const soldier = createSoldier(actor.team);
  root.add(soldier.root);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5),
    new THREE.MeshBasicMaterial({ color: 0xffd67d }));
  flash.position.set(0.04, 1.20, -0.89); root.add(flash);
  const shield = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.024, 4, 22),
    new THREE.MeshBasicMaterial({ color: TEAMS[actor.team].color }));
  shield.rotation.x = Math.PI / 2; shield.position.y = 0.025; root.add(shield);
  const health = box(0.62, 0.05, 0.04, TEAMS[actor.team].color, 0, 2.07, 0, root);
  fighters.set(actor.id, { root, legs: soldier.legs, arms: soldier.arms,
    flash, shield, health, body: soldier.root, botRifle: null,
    previousX: actor.x, previousZ: actor.z, stride: 0 });
  mountBotRifle(actor);
}
function mountBotRifle(actor) {
  const entry = fighters.get(actor.id);
  if (!entry || !assets.rifle || entry.botRifle || actor.isPlayer) return;
  entry.botRifle = attachWeapon(entry.root, assets.rifle, 0.62, { x: 0.08, y: 1.16, z: -0.53 });
}

const $ = id => document.getElementById(id);
const stats = $('stats'), hitmarker = $('hitmarker'), radar = $('radar'), ctx = radar.getContext('2d');
const move = { x: 0, y: 0 }, keys = new Set(), lookPointers = new Map();
let weapon = 'pistol', firing = false, jumpHeld = false, joyId = null;
let recoil = 0, shots = 0, lastPlayerShot = -10, hitTimer = 0, finishShown = false, inspectAt = -10, swingAt = -10;
let wheelPointer = null, wheelChoice = null, wheelWasOpen = false;
const direction = new THREE.Vector3();
const marks = [], tracers = [];
const markGeometry = new THREE.CircleGeometry(0.055, 10);
const markMaterial = new THREE.MeshBasicMaterial({ color: 0x242424, side: THREE.DoubleSide, depthWrite: false });
function resetInputs() {
  move.x = move.y = 0; keys.clear(); lookPointers.clear(); firing = jumpHeld = false; joyId = null;
  if (match.player) match.player.keyboardCrouch = false;
  $('knob').style.transform = ''; $('weaponWheel').classList.remove('open'); wheelPointer = null; wheelChoice = null;
}
function selectWeapon(name) {
  if (!['pistol', 'rifle', 'knife'].includes(name)) return;
  if (match.player) match.equip(match.player, name);
  weapon = name; recoil = 0; firing = false; inspectAt = -10;
  $('weaponLabel').textContent = { pistol: 'Glock 18', rifle: 'AK-47', knife: 'Нож' }[name];
  $('weaponWheel').classList.remove('open');
}
function inspect() { if (canControl()) { firing = false; inspectAt = match.time; $('weaponWheel').classList.remove('open'); } }
function start(team) {
  resetInputs();
  recoil = 0; shots = 0; lastPlayerShot = -10; finishShown = false;
  for (const tracer of tracers) { scene.remove(tracer.mesh); tracer.mesh.geometry.dispose(); tracer.mesh.material.dispose(); }
  tracers.length = 0;
  for (const mark of marks) scene.remove(mark.mesh);
  marks.length = 0;
  match.start(team);
  selectWeapon('pistol'); mountKnife(`knife_${team}`);
  const sleeveColor = team === 'ct' ? 0x314b60 : 0x5d6246;
  for (const rig of [pistolArms, rifleArms, knifeArms])
    for (const mesh of rig.sleeves) mesh.material.color.setHex(sleeveColor);
  // Models are reused across rounds; the player model is simply hidden.
  for (const actor of match.actors) if (!fighters.has(actor.id)) createFighter(actor);
  $('teamMenu').hidden = true; $('resultMenu').hidden = true; $('deathNotice').hidden = true;
  $('teamBadge').textContent = TEAMS[team].name;
  $('teamBadge').dataset.team = team;
  document.body.dataset.phase = 'playing';
}
$('chooseCT').addEventListener('click', () => start('ct'));
$('chooseT').addEventListener('click', () => start('t'));
$('playAgain').addEventListener('click', () => start(match.playerTeam));
$('changeTeam').addEventListener('click', () => {
  resetInputs(); match.phase = 'selection';
  $('resultMenu').hidden = true; $('teamMenu').hidden = false;
  document.body.dataset.phase = 'selection';
});
function canControl() { return match.phase === 'playing' && match.player?.alive; }
function jump() {
  if (!canControl()) return;
  const player = match.player;
  if (!player.ground || match.time - player.lastJump < 0.24) return;
  player.jumps = match.time - player.lastJump < 1.15 ? Math.min(player.jumps + 1, 6) : 0;
  player.lastJump = match.time; player.vy = 5.8; player.ground = false;
}
function reload() { if (canControl() && weapon !== 'knife') match.reload(match.player); }
function bind(id, down, up) {
  const button = $(id);
  button.addEventListener('pointerdown', event => {
    event.preventDefault(); if (!canControl()) return;
    button.setPointerCapture(event.pointerId); down();
  });
  button.addEventListener('pointerup', () => up?.());
  button.addEventListener('pointercancel', () => up?.());
}
bind('fire', () => { firing = true; shoot(); }, () => firing = false);
bind('jump', () => { jumpHeld = true; jump(); }, () => jumpHeld = false);
bind('crouch', () => match.player.crouch = !match.player.crouch);
bind('reload', reload);
const toggle = $('weaponToggle'), wheel = $('weaponWheel');
function wheelTarget(event) {
  const bounds = toggle.getBoundingClientRect();
  const x = event.clientX - bounds.left - bounds.width / 2;
  const y = event.clientY - bounds.top - bounds.height / 2;
  if (Math.hypot(x, y) < 32) return null;
  if (Math.abs(x) > Math.abs(y)) return x < 0 ? 'pistol' : 'knife';
  return y > 0 ? 'rifle' : null; // Top is deliberately reserved for a future bomb.
}
toggle.addEventListener('pointerdown', event => {
  event.preventDefault(); if (!canControl()) return;
  wheelPointer = event.pointerId; wheelChoice = null; wheelWasOpen = wheel.classList.contains('open'); toggle.setPointerCapture(wheelPointer);
  wheel.classList.add('open');
});
toggle.addEventListener('pointermove', event => {
  if (event.pointerId !== wheelPointer) return;
  wheelChoice = wheelTarget(event);
  for (const [id, name] of [['choosePistol', 'pistol'], ['chooseKnife', 'knife'], ['chooseRifle', 'rifle']])
    $(id).classList.toggle('hovered', wheelChoice === name);
});
toggle.addEventListener('pointerup', event => {
  if (event.pointerId !== wheelPointer) return;
  wheelPointer = null;
  if (wheelChoice) selectWeapon(wheelChoice);
  else if (wheelTarget(event)) selectWeapon(wheelTarget(event));
  else wheel.classList.toggle('open', !wheelWasOpen); // A short tap opens or closes the wheel.
  wheelChoice = null;
});
toggle.addEventListener('pointercancel', () => { wheelPointer = null; wheelChoice = null; wheel.classList.remove('open'); });
for (const [id, name] of [['choosePistol', 'pistol'], ['chooseKnife', 'knife'], ['chooseRifle', 'rifle']])
  $(id).addEventListener('pointerdown', event => { event.stopPropagation(); event.preventDefault(); selectWeapon(name); });
$('inspectWeapon').addEventListener('pointerdown', event => { event.stopPropagation(); event.preventDefault(); inspect(); });
function updateJoy(event) {
  const r = $('joy').getBoundingClientRect();
  const dx = event.clientX - r.left - r.width / 2, dy = event.clientY - r.top - r.height / 2;
  const length = Math.max(1, Math.hypot(dx, dy)), scale = Math.min(1, length / 48);
  move.x = dx / length * scale; move.y = dy / length * scale;
  $('knob').style.transform = `translate(${move.x * 38}px,${move.y * 38}px)`;
}
$('joy').addEventListener('pointerdown', event => {
  event.preventDefault(); if (!canControl()) return;
  joyId = event.pointerId; $('joy').setPointerCapture(joyId); updateJoy(event);
});
$('joy').addEventListener('pointermove', event => { if (event.pointerId === joyId) updateJoy(event); });
function endJoy(event) {
  if (event.pointerId !== joyId) return;
  joyId = null; move.x = move.y = 0; $('knob').style.transform = '';
}
$('joy').addEventListener('pointerup', endJoy); $('joy').addEventListener('pointercancel', endJoy);
// Multi-touch aiming still works while a finger is on fire/jump/crouch.
document.addEventListener('pointerdown', event => {
  if (!canControl() || event.target.closest('#joy, .menu, #weaponWheel, #weaponToggle')) return;
  lookPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (event.pointerType === 'mouse' && event.target === renderer.domElement && event.button === 0) { firing = true; if (weapon !== 'rifle') shoot(); }
}, { capture: true });
document.addEventListener('pointermove', event => {
  const point = lookPointers.get(event.pointerId);
  if (!point || !canControl()) return;
  const dx = event.clientX - point.x, dy = event.clientY - point.y;
  point.x = event.clientX; point.y = event.clientY;
  match.player.yaw -= dx * 0.004;
  match.player.pitch = Math.max(-1.2, Math.min(1.2, match.player.pitch - dy * 0.004));
}, { capture: true });
function endLook(event) {
  lookPointers.delete(event.pointerId);
  if (event.pointerType === 'mouse') firing = false;
}
document.addEventListener('pointerup', endLook, { capture: true });
document.addEventListener('pointercancel', endLook, { capture: true });
addEventListener('keydown', event => {
  if (!canControl()) return;
  keys.add(event.code);
  if (event.code === 'ControlLeft') match.player.keyboardCrouch = true;
  if (['Space', 'ControlLeft', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) event.preventDefault();
  if (event.code === 'Space' && !event.repeat) jump();
  if (event.code === 'KeyR') reload();
  if (event.code === 'Digit1') selectWeapon('pistol');
  if (event.code === 'Digit2') selectWeapon('knife');
  if (event.code === 'Digit3') selectWeapon('rifle');
  if (event.code === 'KeyF' && !event.repeat) inspect();
});
addEventListener('keyup', event => {
  keys.delete(event.code);
  if (event.code === 'ControlLeft' && match.player) match.player.keyboardCrouch = false;
});
addEventListener('blur', resetInputs);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetInputs(); });
addEventListener('resize', () => {
  camera.aspect = viewCamera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix(); viewCamera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
});

function showHitmarker(killed) {
  hitmarker.style.color = killed ? '#ff3c45' : '#fff';
  hitmarker.classList.remove('show'); void hitmarker.offsetWidth; hitmarker.classList.add('show');
  clearTimeout(hitTimer); hitTimer = setTimeout(() => hitmarker.classList.remove('show'), killed ? 240 : 130);
}
function shoot() {
  if (!canControl()) return;
  const player = match.player;
  const moving = Math.hypot(move.x, move.y) > 0.15 || ['KeyW', 'KeyA', 'KeyS', 'KeyD'].some(key => keys.has(key));
  const crouched = player.crouch || keys.has('ControlLeft');
  const spread = (!player.ground ? 0.042 : moving ? 0.024 : crouched ? 0.0035 : 0.009) * (weapon === 'rifle' ? 1.2 : 0.72);
  direction.set((Math.random() - 0.5) * spread * 2, (Math.random() - 0.5) * spread * 2, -1);
  if (weapon === 'knife') direction.set(0, 0, -1);
  direction.normalize().applyQuaternion(camera.quaternion);
  const hit = match.fire(player, direction, weapon === 'knife');
  if (!hit) return;
  inspectAt = -10;
  if (weapon === 'knife') { recoil = 0.14; swingAt = match.time; }
  else {
    if (match.time - lastPlayerShot > 0.36) shots = 0;
    shots++; lastPlayerShot = match.time;
    const phase = Math.min(shots, 26);
    player.pitch = Math.min(1.2, player.pitch + (weapon === 'rifle' ? 0.012 + Math.min(phase, 12) * 0.0014 : 0.019));
    player.yaw += weapon === 'rifle' ? Math.sin(phase * 0.63) * 0.0035 + Math.sin(phase * 0.27) * 0.0025 : (Math.random() - 0.5) * 0.003;
    recoil = Math.min(0.15, recoil + (weapon === 'rifle' ? 0.035 : 0.09));
  }
  if (hit.damaged) showHitmarker(!hit.actor.alive);
}
function effects(now) {
  for (const event of match.takeEvents()) {
    if (event.type === 'death' && event.actor.isPlayer) { resetInputs(); document.body.classList.add('dead'); }
    if (event.type === 'spawn') { resetInputs(); document.body.classList.remove('dead'); selectWeapon('pistol'); recoil = 0; }
    if (event.type !== 'shot' || event.knife) continue;
    const { hit, shooter } = event;
    if (hit.wall) {
      const mark = new THREE.Mesh(markGeometry, markMaterial);
      const normal = new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z);
      mark.position.set(hit.point.x, hit.point.y, hit.point.z).addScaledVector(normal, 0.018);
      mark.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      scene.add(mark); marks.push({ mesh: mark, expires: now + 3000 });
    }
    const origin = new THREE.Vector3(shooter.x - Math.sin(shooter.yaw) * 0.65,
      shooter.y + (shooter.crouch ? 0.85 : 1.25), shooter.z - Math.cos(shooter.yaw) * 0.65);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin, new THREE.Vector3(hit.point.x, hit.point.y, hit.point.z)]),
      new THREE.LineBasicMaterial({ color: TEAMS[shooter.team].color, transparent: true, opacity: 0.7 }));
    scene.add(line); tracers.push({ mesh: line, expires: now + 85 });
  }
  for (let i = marks.length - 1; i >= 0; i--) if (now >= marks[i].expires) { scene.remove(marks[i].mesh); marks.splice(i, 1); }
  for (let i = tracers.length - 1; i >= 0; i--) if (now >= tracers[i].expires) {
    const line = tracers[i].mesh; scene.remove(line); line.geometry.dispose(); line.material.dispose(); tracers.splice(i, 1);
  }
}
function updateModels(dt) {
  for (const actor of match.actors) {
    const model = fighters.get(actor.id);
    model.root.visible = match.phase !== 'selection' && actor.alive && !actor.isPlayer;
    if (!model.root.visible) continue;
    const travelled = Math.hypot(actor.x - model.previousX, actor.z - model.previousZ);
    model.stride += Math.min(travelled, dt * 4) * 9;
    model.previousX = actor.x; model.previousZ = actor.z;
    model.root.position.set(actor.x, actor.y, actor.z); model.root.rotation.y = actor.yaw;
    if (model.body) {
      const stride = Math.min(1, travelled / Math.max(0.001, dt * 2.7));
      model.body.position.y = Math.abs(Math.sin(model.stride)) * 0.025 * stride;
      model.body.rotation.z = Math.sin(model.stride * 0.5) * 0.018 * stride;
    }
    model.root.scale.y = actor.crouch ? 0.67 : 1;
    model.legs.forEach((leg, i) => leg.rotation.x = travelled > 0.001 ? Math.sin(model.stride + i * Math.PI) * 0.42 : 0);
    model.arms.forEach((arm, i) => arm.rotation.x = travelled > 0.001 ? Math.sin(model.stride + i * Math.PI) * 0.07 : 0);
    model.flash.visible = match.time - actor.lastShotAt < 0.065;
    model.shield.visible = match.time < actor.protectedUntil;
    model.health.scale.x = actor.health / 100;
  }
}
function drawRadar() {
  const player = match.player;
  ctx.clearRect(0, 0, 150, 150); if (!player) return;
  ctx.save(); ctx.translate(75, 75); ctx.beginPath(); ctx.arc(0, 0, 73, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#182b32'; ctx.fillRect(-75, -75, 150, 150); ctx.rotate(player.yaw);
  const scale = 2.3; ctx.fillStyle = '#80918e';
  for (const wall of ARENA_WALLS) ctx.fillRect((wall.x - player.x) * scale - wall.w * scale / 2,
    (wall.z - player.z) * scale - wall.d * scale / 2, wall.w * scale, wall.d * scale);
  for (const actor of match.actors) {
    if (!actor.alive || actor.isPlayer || Math.hypot(actor.x - player.x, actor.z - player.z) > 30) continue;
    // Enemies are revealed on radar only while the player can actually see them.
    if (actor.team !== player.team && !canSee(player, actor)) continue;
    ctx.fillStyle = actor.team === player.team ? '#77cfff' : '#ff836c';
    ctx.beginPath(); ctx.arc((actor.x - player.x) * scale, (actor.z - player.z) * scale, 3.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore(); ctx.fillStyle = '#e9f8ff'; ctx.beginPath(); ctx.moveTo(75, 65); ctx.lineTo(69, 82); ctx.lineTo(81, 82); ctx.fill();
}
let lastFeed = '';
function updateHUD() {
  const player = match.player; if (!player) return;
  $('ctScore').textContent = match.score.ct; $('tScore').textContent = match.score.t;
  const seconds = Math.max(0, Math.ceil(MATCH_SECONDS - match.time));
  $('timer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  $('timer').classList.toggle('urgent', seconds <= 15);
  stats.textContent = `♥ ${player.health}  ${weapon !== 'knife' ? `▣ ${player.ammo} / ${player.reserve}${player.reloadingUntil ? '  ↻' : ''}` : '🔪 Нож'}`;
  $('personalScore').textContent = `${player.kills} убийств · ${player.deaths} смертей`;
  $('crouch').classList.toggle('active', player.crouch || keys.has('ControlLeft'));
  $('deathNotice').hidden = player.alive || match.phase !== 'playing';
  if (!player.alive) $('respawnTimer').textContent = Math.max(1, Math.ceil(player.respawnAt - match.time));
  const feed = match.killfeed.map(item => `${item.killer} → ${item.victim}`).join('|');
  if (feed !== lastFeed) {
    lastFeed = feed; $('killfeed').replaceChildren(...match.killfeed.map(item => {
      const line = document.createElement('div'); line.textContent = `${item.killer}  →  ${item.victim}`;
      line.dataset.team = item.team; return line;
    }));
  }
  if (match.phase === 'finished' && !finishShown) {
    finishShown = true; resetInputs(); document.body.dataset.phase = 'finished';
    document.body.classList.remove('dead'); $('deathNotice').hidden = true;
    const winner = match.score.ct === match.score.t ? null : match.score.ct > match.score.t ? 'ct' : 't';
    $('resultTitle').textContent = winner ? winner === player.team ? 'Победа!' : 'Поражение' : 'Ничья';
    $('resultScore').textContent = `Спецназ ${match.score.ct} : ${match.score.t} Террористы`;
    $('resultDetails').textContent = `Твой результат: ${player.kills} убийств · ${player.deaths} смертей`;
    $('resultMenu').hidden = false;
  }
}
function movePlayer(dt) {
  const player = match.player;
  const mx = move.x + (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  const mz = move.y + (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0);
  const length = Math.max(1, Math.hypot(mx, mz));
  const crouched = player.crouch || keys.has('ControlLeft');
  const speed = (crouched ? 2 : 4.2) * (player.jumps > 1 ? Math.max(0.72, 1 - player.jumps * 0.055) : 1);
  match.move(player, (mx * Math.cos(player.yaw) + mz * Math.sin(player.yaw)) / length * speed * dt,
    (-mx * Math.sin(player.yaw) + mz * Math.cos(player.yaw)) / length * speed * dt);
  player.vy -= 14 * dt; player.y += player.vy * dt;
  if (player.y <= 0) { player.y = 0; player.vy = 0; player.ground = true; }
  if (player.ground && (jumpHeld || keys.has('Space'))) jump();
  camera.position.set(player.x, player.y + (crouched ? 1.05 : 1.65), player.z);
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  // Hitbox and vision height also reflect a held keyboard crouch.
  player.keyboardCrouch = keys.has('ControlLeft');
}
let previous = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.max(0, (now - previous) / 1000), dt = Math.min(elapsed, 0.04); previous = now;
  if (match.phase === 'playing') {
    match.step(elapsed);
    if (canControl()) { movePlayer(dt); if (firing && weapon !== 'knife') shoot(); }
  }
  if (match.phase === 'selection') {
    camera.position.set(0, 23, 28); camera.lookAt(0, 0, 0);
    for (const model of fighters.values()) model.root.visible = false;
  }
  effects(now); updateModels(dt); updateHUD(); drawRadar();
  recoil = Math.max(0, recoil - dt * (weapon === 'rifle' ? 0.45 : 0.8));
  const visible = canControl(); gun.visible = visible && weapon === 'pistol'; knife.visible = visible && weapon === 'knife'; rifle.visible = visible && weapon === 'rifle';
  const player = match.player;
  const bob = visible && (Math.hypot(move.x, move.y) > 0.1 || ['KeyW', 'KeyA', 'KeyS', 'KeyD'].some(key => keys.has(key))) ? Math.sin(now * 0.008) * 0.006 : 0;
  const reloadProgress = player?.reloadingUntil && weapon !== 'knife' ? Math.max(0, Math.min(1, 1 - (player.reloadingUntil - match.time) / WEAPONS[weapon].reload)) : -1;
  const reloadPose = reloadProgress >= 0 ? Math.sin(Math.PI * reloadProgress) : 0;
  if (pistolArms.support) { pistolArms.support.position.y = -reloadPose * 0.14; pistolArms.support.rotation.x = reloadPose * 0.4; }
  if (rifleArms.support) { rifleArms.support.position.y = -reloadPose * 0.23; rifleArms.support.position.z = reloadPose * 0.16; rifleArms.support.rotation.z = -reloadPose * 0.23; }
  const reloadTilt = reloadProgress >= 0 ? Math.sin(Math.PI * Math.min(1, reloadProgress * 1.8)) : 0;
  const inspectT = visible ? match.time - inspectAt : 10;
  const inspectPose = inspectT >= 0 && inspectT < 1.9 ? Math.sin(Math.PI * inspectT / 1.9) : 0;
  const right = camera.aspect < 1 ? 0.11 : 0.27;
  gun.position.set(right + bob - inspectPose * 0.13, -0.17 - Math.abs(bob) - reloadPose * 0.18 + inspectPose * 0.11, -0.72 + recoil * 0.65);
  gun.rotation.set(recoil * 1.1 - reloadPose * 0.5 + inspectPose * 0.24, 0.09 + inspectPose * 1.1, -reloadPose * 0.35 - reloadTilt * 0.32 + inspectPose * 0.3);
  rifle.position.set(right + bob - inspectPose * 0.16, -0.2 - Math.abs(bob) - reloadPose * 0.22 + inspectPose * 0.08, -0.78 + recoil * 0.75);
  rifle.rotation.set(recoil * 1.1 - reloadPose * 0.55 + inspectPose * 0.25, 0.08 + inspectPose * 1.25, -reloadPose * 0.3 - reloadTilt * 0.24 + inspectPose * 0.33);
  knife.position.set(right + bob, -0.2 - Math.abs(bob), -0.7 - recoil * 0.9);
  const slashT = match.time - swingAt;
  knife.rotation.set(inspectPose * 0.6, (slashT >= 0 && slashT < 0.35 ? Math.sin(slashT / 0.35 * Math.PI) * 1.25 : 0) + inspectPose * 1.8,
    -recoil * 2 + inspectPose * 0.6);
  knife.position.y += inspectPose * 0.12;
  muzzle.visible = !!player && weapon === 'pistol' && match.time - player.lastShotAt < 0.045;
  rifleMuzzle.visible = !!player && weapon === 'rifle' && match.time - player.lastShotAt < 0.045;
  renderer.clear(); renderer.render(scene, camera); renderer.clearDepth(); renderer.render(viewScene, viewCamera);
}
requestAnimationFrame(frame);
