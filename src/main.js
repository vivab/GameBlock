import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createWeaponView } from './viewmodels.js';
import { buildClassicOperator, animateClassicOperator } from './classicOperators.js';
import { setupWeaponCalibration } from './calibration.js';
import { ACCURACY, weaponSpread, recoverBurst } from './accuracy.js';
import { JUMP_IMPULSE, GRAVITY } from './jumpPhysics.js';
import { rotateAim } from './aim.js';
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

// Independent near-camera viewmodel: meshes never collide with the arena or
// drift apart during animation. Enemy characters are temporarily represented
// only by simple hitbox indicators, NOT by imported CT/T character models.
const viewScene = new THREE.Scene();
const viewCamera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.01, 4);
viewScene.add(viewCamera);
viewScene.add(new THREE.HemisphereLight(0xffffff, 0x4a5762, 2.4));
const viewLight = new THREE.DirectionalLight(0xffffff, 2.0);
viewLight.position.set(-2, 3, 2); viewScene.add(viewLight);
const views = {
  pistol: createWeaponView('pistol'),
  rifle: createWeaponView('rifle'),
  knife: createWeaponView('knife'),
};
for (const view of Object.values(views)) viewCamera.add(view.root);
const loader = new GLTFLoader();
const assets = {};
const assetFiles = { pistol: 'g18', rifle: 'ak47', knife_ct: 'knife_ct', knife_t: 'knife_t', ct: 'ct', t: 't' };
function mountKnife(key) {
  if (assets[key]) views.knife.setModel(assets[key]);
  else views.knife.setModel(null);
}
for (const [key, filename] of Object.entries(assetFiles)) {
  loader.load(import.meta.env.BASE_URL + 'models/' + filename + '.glb', result => {
    assets[key] = (key === 'ct' || key === 't') ? result : result.scene;
    if (key === 'pistol' || key === 'rifle') views[key].setModel(result.scene);
    else if (key === 'ct' || key === 't') {
      for (const actor of match.actors) if (!actor.isPlayer && actor.team === key) mountClassicFighter(actor);
    } else if (match.player?.team === key.slice(6)) mountKnife(key);
  }, undefined, error => console.warn('Не удалось загрузить ' + filename + '.glb', error));
}

// The owner's detailed original GIGN/Leet GLBs, not the cartoon replacements.
const fighters = new Map();
function createFighter(actor) {
  if (actor.isPlayer) return;
  const root = new THREE.Group(); scene.add(root);
  const color = TEAMS[actor.team].color;
  // Only displayed until the correct GLB finishes loading.
  const fallback = new THREE.Group(); root.add(fallback);
  const geometry = new THREE.BoxGeometry(0.56, 1.83, 0.48);
  const fill = new THREE.Mesh(geometry,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.13, depthWrite: false }));
  fill.position.y = 0.915; fallback.add(fill);
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.65 }));
  outline.position.y = 0.915; fallback.add(outline);
  const marker = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.048, 0.085),
    new THREE.MeshBasicMaterial({ color }));
  marker.position.y = 2.12; root.add(marker);
  fighters.set(actor.id, {
    root, fallback, marker, animated: null, lastX: actor.x, lastZ: actor.z,
  });
  mountClassicFighter(actor);
}
function mountClassicFighter(actor) {
  const entry = fighters.get(actor.id);
  if (!entry || entry.animated || !assets[actor.team]) return;
  try {
    const model = buildClassicOperator(assets[actor.team], actor.team);
    entry.animated = model;
    entry.fallback.visible = false;
    entry.root.add(model.root);
  } catch (error) {
    // Fail safely: never hide an invisible enemy if a malformed GLB is provided.
    console.warn('Cannot rig ' + actor.team + ' fighter', error);
  }
}

const $ = id => document.getElementById(id);
setupWeaponCalibration({ views, getWeapon: () => weapon, setWeapon: name => selectWeapon(name) });
const stats = $('stats'), hitmarker = $('hitmarker'), radar = $('radar'), ctx = radar.getContext('2d');
const move = { x: 0, y: 0 }, keys = new Set(), lookPointers = new Map();
let weapon = 'pistol', firing = false, jumpHeld = false, joyId = null;
let firePointer = null, fireLastX = 0, fireLastY = 0;
let recoil = 0, shots = 0, lastPlayerShot = -10, hitTimer = 0, finishShown = false, inspectAt = -10, swingAt = -10;
let game1Burst = 0;
// Four explicit accuracy states live in accuracy.js; burst recovers every frame.
let wheelPointer = null, wheelChoice = null, wheelWasOpen = false;
const direction = new THREE.Vector3();
const marks = [], tracers = [];
const markGeometry = new THREE.CircleGeometry(0.055, 10);
const markMaterial = new THREE.MeshBasicMaterial({ color: 0x242424, side: THREE.DoubleSide, depthWrite: false });
function resetInputs() {
  move.x = move.y = 0; keys.clear(); lookPointers.clear(); firing = jumpHeld = false; joyId = null;
  firePointer = null;
  if (match.player) match.player.keyboardCrouch = false;
  $('knob').style.transform = ''; $('weaponWheel').classList.remove('open'); wheelPointer = null; wheelChoice = null;
}
function selectWeapon(name) {
  if (!['pistol', 'rifle', 'knife'].includes(name)) return;
  if (match.player) match.equip(match.player, name);
  weapon = name; recoil = 0; firing = false; inspectAt = -10;
  views[name].draw(performance.now() / 1000); // Game1 draw animation on every switch
  $('weaponLabel').textContent = { pistol: 'Glock 18', rifle: 'AK-47', knife: 'Нож' }[name];
  $('weaponWheel').classList.remove('open');
}
function inspect() { if (canControl()) { firing = false; inspectAt = match.time; $('weaponWheel').classList.remove('open'); } }
function start(team) {
  resetInputs();
  recoil = 0; shots = 0; game1Burst = 0; lastPlayerShot = -10; finishShown = false;
  for (const tracer of tracers) { scene.remove(tracer.mesh); tracer.mesh.geometry.dispose(); tracer.mesh.material.dispose(); }
  tracers.length = 0;
  for (const mark of marks) scene.remove(mark.mesh);
  marks.length = 0;
  match.start(team);
  selectWeapon('pistol'); mountKnife(`knife_${team}`);
  for (const view of Object.values(views)) view.setTeam(team);
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
  player.lastJump = match.time; player.vy = JUMP_IMPULSE; player.ground = false;
}
function reload() { if (canControl() && weapon !== 'knife') match.reload(match.player); }
function bind(id, down, up) {
  const button = $(id);
  button.addEventListener('pointerdown', event => {
    event.preventDefault(); if (!canControl()) return;
    button.setPointerCapture(event.pointerId); down(event);
  });
  button.addEventListener('pointerup', event => up?.(event));
  button.addEventListener('pointercancel', event => up?.(event));
}
// The firing finger itself can swipe to counter recoil while holding the
// button. A second finger in the normal look area works at the same time.
bind('fire', event => {
  firing = true; firePointer = event.pointerId;
  fireLastX = event.clientX; fireLastY = event.clientY;
  shoot();
}, event => {
  if (event.pointerId === firePointer) { firing = false; firePointer = null; }
});
$('fire').addEventListener('pointermove', event => {
  if (event.pointerId !== firePointer || !canControl()) return;
  applyLookDelta(event.clientX - fireLastX, event.clientY - fireLastY);
  fireLastX = event.clientX; fireLastY = event.clientY;
});
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
  if (!canControl() || event.target.closest('#controls, .menu, #calibrationUI')) return;
  lookPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (event.pointerType === 'mouse' && event.target === renderer.domElement && event.button === 0) { firing = true; if (weapon !== 'rifle') shoot(); }
}, { capture: true });
function applyLookDelta(dx, dy) {
  if (!canControl()) return;
  const next = rotateAim(match.player.yaw, match.player.pitch, dx, dy);
  match.player.yaw = next.yaw;
  match.player.pitch = next.pitch;
  // Keep the raycast camera in sync when a finger moves between render frames.
  camera.rotation.set(match.player.pitch, match.player.yaw, 0, 'YXZ');
}
document.addEventListener('pointermove', event => {
  const point = lookPointers.get(event.pointerId);
  if (!point || !canControl()) return;
  const dx = event.clientX - point.x, dy = event.clientY - point.y;
  point.x = event.clientX; point.y = event.clientY;
  applyLookDelta(dx, dy);
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
  // Recoil can still be compensated by dragging the fire button or screen.
  // Accuracy depends on crouching / standing / running / jumping.
  const spread = weaponSpread({
    ground: player.ground, crouched, moving, weapon, burst: game1Burst,
  });
  direction.set((Math.random() - 0.5) * spread * 2, (Math.random() - 0.5) * spread * 2, -1);
  if (weapon === 'knife') direction.set(0, 0, -1);
  direction.normalize().applyQuaternion(camera.quaternion);
  const hit = match.fire(player, direction, weapon === 'knife');
  if (!hit) return;
  views[weapon].fire(); // Game1 weapon kick and animated muzzle flash
  if (weapon !== 'knife') game1Burst = Math.min(ACCURACY.maxBurst, game1Burst + ACCURACY.perShot);
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
    if (!model) continue;
    model.root.visible = match.phase === 'playing' && actor.alive;
    if (!model.root.visible) continue;
    model.root.position.set(actor.x, actor.y, actor.z);
    model.root.rotation.y = actor.yaw;
    model.root.scale.y = actor.crouch ? 0.73 : 1;
    const dist = Math.hypot(actor.x - model.lastX, actor.z - model.lastZ);
    model.lastX = actor.x; model.lastZ = actor.z;
    if (model.animated) animateClassicOperator(model.animated, actor,
      match.time, dt, dist / Math.max(0.01, dt));
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
  $('reload').classList.toggle('reloading', !!player.reloadingUntil && weapon !== 'knife');
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
  player.vy -= GRAVITY * dt; player.y += player.vy * dt;
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
  game1Burst = recoverBurst(game1Burst, dt);
  const visible = canControl();
  const player = match.player;
  const current = views[weapon];
  const moving = Math.hypot(move.x, move.y) > 0.1 ||
    ['KeyW', 'KeyA', 'KeyS', 'KeyD'].some(key => keys.has(key));
  const reloadProgress = visible && player?.reloadingUntil && weapon !== 'knife'
    ? Math.max(0, Math.min(1,
      1 - (player.reloadingUntil - match.time) / WEAPONS[weapon].reload)) : -1;
  for (const view of Object.values(views)) view.root.visible = visible && current === view;
  if (visible) current.animate({
    time: now, aspect: camera.aspect, moving, recoil,
    inspectTime: match.time - inspectAt,
    reloadProgress, slashTime: match.time - swingAt,
    firing: weapon !== 'knife' && match.time - player.lastShotAt < 0.045,
  });
  renderer.clear(); renderer.render(scene, camera); renderer.clearDepth(); renderer.render(viewScene, viewCamera);
}
requestAnimationFrame(frame);
