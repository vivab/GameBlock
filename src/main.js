import * as THREE from 'three';
import { Match, TEAMS, ARENA_WALLS, MATCH_SECONDS, canSee } from './combat.js';

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
const gun = new THREE.Group(), knife = new THREE.Group();
viewCamera.add(gun, knife);
gun.scale.setScalar(0.75); knife.scale.setScalar(0.75);
function arm(parent, from, to, width, color) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const mesh = box(width, a.distanceTo(b), width, color, 0, 0, 0, parent);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return mesh;
}
box(0.145, 0.13, 0.48, 0x30373e, 0, 0.02, -0.13, gun); // slide
box(0.135, 0.065, 0.37, 0x171c22, 0, -0.067, -0.1, gun); // frame
const grip = box(0.105, 0.21, 0.13, 0x232a32, 0, -0.16, 0.075, gun);
grip.rotation.x = -0.22;
box(0.045, 0.047, 0.1, 0x11161a, 0, 0.002, -0.4, gun); // barrel
box(0.027, 0.025, 0.026, 0x9ea7ac, 0, 0.095, -0.34, gun); // front sight
for (const x of [-0.042, 0.042]) box(0.018, 0.03, 0.023, 0x15191d, x, 0.1, 0.04, gun);
box(0.12, 0.125, 0.15, 0xbfa17f, 0.025, -0.14, 0.105, gun);
box(0.09, 0.115, 0.14, 0xb29373, -0.065, -0.13, 0.08, gun);
arm(gun, [0.07, -0.2, 0.13], [0.19, -0.35, 0.5], 0.115, 0x344b58);
arm(gun, [-0.09, -0.18, 0.11], [-0.36, -0.34, 0.48], 0.115, 0x344b58);
box(0.085, 0.11, 0.24, 0x393b38, 0, -0.05, 0.04, knife);
const blade = box(0.032, 0.07, 0.5, 0xc3cdd0, 0, 0.01, -0.29, knife);
blade.rotation.z = -0.15;
box(0.15, 0.025, 0.055, 0x889293, 0, -0.01, -0.04, knife);
box(0.13, 0.13, 0.16, 0xbfa17f, 0.025, -0.085, 0.09, knife);
arm(knife, [0.06, -0.15, 0.14], [0.18, -0.32, 0.52], 0.12, 0x344b58);
const muzzle = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 5), new THREE.MeshBasicMaterial({ color: 0xffdc7a }));
muzzle.rotation.x = -Math.PI / 2; muzzle.position.set(0, 0.005, -0.49); gun.add(muzzle);

const fighters = new Map();
function createFighter(actor) {
  const root = new THREE.Group(); scene.add(root);
  const color = TEAMS[actor.team].color, skin = actor.team === 'ct' ? 0xc0a589 : 0xc5a27b;
  box(0.43, 0.43, 0.4, skin, 0, 1.62, 0, root);
  box(0.46, 0.14, 0.43, actor.team === 'ct' ? 0x243e52 : 0x6c6047, 0, 1.8, 0, root);
  box(0.25, 0.08, 0.025, 0x20262a, 0, 1.65, -0.21, root);
  box(0.65, 0.62, 0.4, color, 0, 1.05, 0, root);
  box(0.5, 0.38, 0.13, 0x293b40, 0, 1.07, -0.235, root);
  box(0.58, 0.25, 0.37, 0x344752, 0, 0.64, 0, root);
  const legs = [-1, 1].map(sign => box(0.24, 0.55, 0.29, 0x263d49, sign * 0.19, 0.28, 0, root));
  arm(root, [0.37, 1.25, 0], [0.26, 1.08, -0.48], 0.18, color);
  arm(root, [-0.37, 1.25, 0], [0.1, 1.1, -0.48], 0.18, color);
  box(0.15, 0.12, 0.55, 0x20272c, 0.2, 1.15, -0.55, root);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffd67d }));
  flash.position.set(0.2, 1.15, -0.88); root.add(flash);
  const shield = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.025, 4, 20), new THREE.MeshBasicMaterial({ color }));
  shield.rotation.x = Math.PI / 2; shield.position.y = 0.03; root.add(shield);
  const health = box(0.65, 0.055, 0.04, color, 0, 2.02, 0, root);
  fighters.set(actor.id, { root, legs, flash, shield, health, previousX: actor.x, previousZ: actor.z, stride: 0 });
}

const $ = id => document.getElementById(id);
const stats = $('stats'), hitmarker = $('hitmarker'), radar = $('radar'), ctx = radar.getContext('2d');
const move = { x: 0, y: 0 }, keys = new Set(), lookPointers = new Map();
let weapon = 'pistol', firing = false, jumpHeld = false, joyId = null;
let recoil = 0, shots = 0, lastPlayerShot = -10, hitTimer = 0, finishShown = false;
const direction = new THREE.Vector3();
const marks = [], tracers = [];
const markGeometry = new THREE.CircleGeometry(0.055, 10);
const markMaterial = new THREE.MeshBasicMaterial({ color: 0x242424, side: THREE.DoubleSide, depthWrite: false });
function resetInputs() {
  move.x = move.y = 0; keys.clear(); lookPointers.clear(); firing = jumpHeld = false; joyId = null;
  if (match.player) match.player.keyboardCrouch = false;
  $('knob').style.transform = ''; $('weaponWheel').classList.remove('open');
}
function selectWeapon(name) {
  weapon = name; recoil = 0;
  $('weaponLabel').textContent = name === 'pistol' ? 'Пистолет' : 'Нож';
  $('weaponWheel').classList.remove('open');
}
function start(team) {
  resetInputs(); selectWeapon('pistol');
  recoil = 0; shots = 0; lastPlayerShot = -10; finishShown = false;
  for (const tracer of tracers) { scene.remove(tracer.mesh); tracer.mesh.geometry.dispose(); tracer.mesh.material.dispose(); }
  tracers.length = 0;
  for (const mark of marks) scene.remove(mark.mesh);
  marks.length = 0;
  match.start(team);
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
function reload() { if (canControl() && weapon === 'pistol') match.reload(match.player); }
function bind(id, down, up) {
  const button = $(id);
  button.addEventListener('pointerdown', event => {
    event.preventDefault(); if (!canControl()) return;
    button.setPointerCapture(event.pointerId); down();
  });
  button.addEventListener('pointerup', () => up?.());
  button.addEventListener('pointercancel', () => up?.());
}
bind('fire', () => firing = true, () => firing = false);
bind('jump', () => { jumpHeld = true; jump(); }, () => jumpHeld = false);
bind('crouch', () => match.player.crouch = !match.player.crouch);
bind('reload', reload);
bind('weaponToggle', () => $('weaponWheel').classList.toggle('open'));
bind('choosePistol', () => selectWeapon('pistol'));
bind('chooseKnife', () => selectWeapon('knife'));
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
  if (event.pointerType === 'mouse' && event.target === renderer.domElement && event.button === 0) firing = true;
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
  const spread = !player.ground ? 0.042 : moving ? 0.024 : crouched ? 0.0035 : 0.009;
  direction.set((Math.random() - 0.5) * spread * 2, (Math.random() - 0.5) * spread * 2, -1);
  if (weapon === 'knife') direction.set(0, 0, -1);
  direction.normalize().applyQuaternion(camera.quaternion);
  const hit = match.fire(player, direction, weapon === 'knife');
  if (!hit) return;
  if (weapon === 'knife') recoil = 0.14;
  else {
    if (match.time - lastPlayerShot > 0.36) shots = 0;
    shots++; lastPlayerShot = match.time;
    const phase = Math.min(shots, 26);
    player.pitch = Math.min(1.2, player.pitch + 0.009 + Math.min(phase, 12) * 0.0011);
    player.yaw += Math.sin(phase * 0.63) * 0.0035 + Math.sin(phase * 0.27) * 0.0025;
    recoil = Math.min(0.09, recoil + 0.022);
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
    model.root.scale.y = actor.crouch ? 0.67 : 1;
    model.legs.forEach((leg, i) => leg.rotation.x = travelled > 0.001 ? Math.sin(model.stride + i * Math.PI) * 0.4 : 0);
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
  stats.textContent = `♥ ${player.health}  ${weapon === 'pistol' ? `▣ ${player.ammo} / ${player.reserve}${player.reloadingUntil ? '  ↻' : ''}` : '🔪 Нож'}`;
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
    if (canControl()) { movePlayer(dt); if (firing) shoot(); }
  }
  if (match.phase === 'selection') {
    camera.position.set(0, 23, 28); camera.lookAt(0, 0, 0);
    for (const model of fighters.values()) model.root.visible = false;
  }
  effects(now); updateModels(dt); updateHUD(); drawRadar();
  recoil = Math.max(0, recoil - dt * 0.25);
  const visible = canControl(); gun.visible = visible && weapon === 'pistol'; knife.visible = visible && weapon === 'knife';
  const player = match.player;
  const bob = visible && (Math.hypot(move.x, move.y) > 0.1 || ['KeyW', 'KeyA', 'KeyS', 'KeyD'].some(key => keys.has(key))) ? Math.sin(now * 0.008) * 0.006 : 0;
  const reloadPose = player?.reloadingUntil ? Math.sin(Math.PI * Math.min(1, (player.reloadingUntil - match.time) / 1.7)) : 0;
  const right = camera.aspect < 1 ? 0.11 : 0.27;
  gun.position.set(right + bob, -0.17 - Math.abs(bob) - reloadPose * 0.18, -0.72 + recoil * 0.45);
  gun.rotation.set(recoil * 0.6 - reloadPose * 0.5, 0.09, -reloadPose * 0.35);
  knife.position.set(right + bob, -0.2 - Math.abs(bob), -0.7 - recoil * 0.9);
  knife.rotation.set(0, recoil * 1.5, -recoil * 2);
  muzzle.visible = !!player && match.time - player.lastShotAt < 0.045;
  renderer.clear(); renderer.render(scene, camera); renderer.clearDepth(); renderer.render(viewScene, viewCamera);
}
requestAnimationFrame(frame);
