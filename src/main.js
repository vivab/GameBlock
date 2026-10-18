import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createWeaponView } from './viewmodels.js';
import { InspectTimeline } from './inspectTimeline.js';
import { decideWeaponButtonAction } from './weaponButton.js';
import { buildRetroOperator, animateRetroOperator } from './retroOperators.js';
import { createTacticalOperator, animateTacticalOperator } from './dragomirOperator.js';
import {SWAT_V6_VARIANTS, loadSwatSelection, saveSwatSelection, createSwatV6Operator} from './swatV6.js';
import {installSwatV6Gallery} from './swatV6Gallery.js';
import { buildSandstoneArena } from './arena.js';
import { installRetroMenu } from './menu.js';
import {createRocketboxOperator} from './rocketboxOperator.js';
import {CHOSEN_CT,readTChoice,terroristAssetPath} from './operatorChoices.js';
import { createGameAudio } from './audio.js';
import { setupWeaponCalibration } from './calibration.js';
import { ACCURACY, weaponSpread, recoverBurst } from './accuracy.js';
import { JUMP_IMPULSE, GRAVITY } from './jumpPhysics.js';
import { rotateAim } from './aim.js';
import { Match, TEAMS, ARENA_WALLS, MATCH_SECONDS, WEAPONS, canSee } from './combat.js';

// Inspection build: NPCs stand at their spawn points, without movement or AI fire.
const match = new Match(Math.random, { staticBots: true });
match.phase = 'home';
document.body.dataset.phase = 'home';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 150);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.autoClear = false;
renderer.domElement.setAttribute('aria-label', 'Арена GameBlock');
document.body.prepend(renderer.domElement);
buildSandstoneArena(scene, ARENA_WALLS, TEAMS);

// A second lightweight scene presents a real 3D CT preview in the lobby.
// Rendering reuses the same WebGL renderer (important for mobile GPUs).
const menuScene = new THREE.Scene();
menuScene.background = new THREE.Color(0x172632);
const menuCamera = new THREE.PerspectiveCamera(43, innerWidth/innerHeight, .06, 40);
menuCamera.position.set(0, 1.30, -3.60);
menuCamera.lookAt(0, .94, 0);
menuScene.add(new THREE.HemisphereLight(0xfff0d7, 0x404b5d, 2.7));
const menuLight=new THREE.DirectionalLight(0xffd99f, 3);
menuLight.position.set(-4, 8, -5);menuScene.add(menuLight);
let preview=buildRetroOperator('ct');
preview.root.rotation.y=-.32;
menuScene.add(preview.root);
const plinth=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.75,.12,36),
  new THREE.MeshStandardMaterial({color:0x29343d,roughness:.85}));
plinth.position.set(0,-.12,0);menuScene.add(plinth);
const pedestalRing=new THREE.Mesh(new THREE.TorusGeometry(1.5,.027,6,48),
  new THREE.MeshBasicMaterial({color:0xd6aa6c}));
pedestalRing.rotation.x=-Math.PI/2;pedestalRing.position.y=-.051;
menuScene.add(pedestalRing);

// Independent near-camera viewmodel: the original FPS gloves are procedural.
// Only the existing gun/knife GLBs are downloaded; characters require none.
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
let selectedSwatIndex = loadSwatSelection();
// Real-time 3D V6 lineup shares the existing WebGL renderer. Only the current
// 2/3/5 operators are created, keeping GPU memory bounded on mobile devices.
const galleryScene = new THREE.Scene();
galleryScene.background = new THREE.Color(0x111d26);
const galleryCamera = new THREE.PerspectiveCamera(47,innerWidth/innerHeight,.05,65);
galleryScene.add(new THREE.HemisphereLight(0xd2d9d1,0x2b3030,2.25));
const galleryLight = new THREE.DirectionalLight(0xffe8ce,2.8);
galleryLight.position.set(-3,7,-5);galleryScene.add(galleryLight);
let galleryModels=[];
let galleryPlinths=[];
let swatGallery;
const galleryPlateMaterial=new THREE.MeshStandardMaterial({color:0x314046,roughness:1,flatShading:true});
function highlightGallerySelection() {
  for(const fighter of galleryModels) {
    const selected=fighter.variant===selectedSwatIndex;
    fighter.root.scale.setScalar(selected?1.065:1);
  }
}
function updateGalleryCamera(count) {
  galleryCamera.aspect=innerWidth/innerHeight;
  galleryCamera.updateProjectionMatrix();
  const targetWidth=count*1.11+.28;
  const distance=Math.max(4.1,targetWidth/
    (2*Math.tan(THREE.MathUtils.degToRad(galleryCamera.fov/2))*Math.max(.40,galleryCamera.aspect)));
  galleryCamera.position.set(0,1.31,-distance);
  galleryCamera.lookAt(0,.88,0);
}
function clearGalleryModels() {
  for(const fighter of galleryModels) {
    galleryScene.remove(fighter.root);
    fighter.release?.();
  }
  for(const plate of galleryPlinths){
    galleryScene.remove(plate);
    plate.geometry.dispose();
  }
  galleryPlinths=[];
  galleryModels=[];
}
function showGalleryPage(page,pageSize) {
  clearGalleryModels();
  updateGalleryCamera(pageSize);
  if(!assets.swat){
    swatGallery?.setStatus(assetStatus.swat==='failed'
      ? 'Не удалось загрузить 3D-модель SWAT. Обнови страницу.'
      : 'Загружаем базовую 3D-модель для всех 20 вариантов…');
    return;
  }
  const begin=page*pageSize;
  const end=Math.min(begin+pageSize,SWAT_V6_VARIANTS.length);
  const visible=end-begin;
  try {
    for(let i=begin;i<end;i++){
      const model=createSwatV6Operator(assets.swat,i);
      if(!model)throw Error('Cannot build V6 fighter '+i);
      model.root.position.x=(i-begin-(visible-1)/2)*1.10;
      model.root.rotation.y=-.16;
      galleryScene.add(model.root);
      galleryModels.push(model);
      const plate=new THREE.Mesh(new THREE.CylinderGeometry(.46,.46,.025,8),galleryPlateMaterial);
      plate.position.set(model.root.position.x,-.019,0);
      galleryScene.add(plate);
      galleryPlinths.push(plate);
    }
    highlightGallerySelection();
    swatGallery?.setStatus('Ряд '+SWAT_V6_VARIANTS[begin].id+
      ' — '+SWAT_V6_VARIANTS[end-1].id+' · Нажми на номер, затем ВЫБРАТЬ');
  } catch(error){
    console.error('Could not build gallery row',error);
    swatGallery?.setStatus('Ошибка 3D-галереи. Обнови страницу.');
  }
}
function refreshSwatPreview() {
  if(!assets.chosenCT&&!assets.swat)return;
  let next;
  try {
    next=assets.chosenCT
      ?createRocketboxOperator(assets.chosenCT,'ct')
      :createSwatV6Operator(assets.swat,selectedSwatIndex);
  }catch(error){console.warn('Selected CT operator failed',error);return;}
  if(!next)return;
  menuScene.remove(preview.root);
  preview.release?.();
  preview=next;
  preview.root.rotation.y=-.32;
  menuScene.add(preview.root);
}
// V8 Urban is the new detailed face + helmet source GLB for 20 tactical loadouts.
// Eyes, balaclava, helmet and hard shoulder sleeves are actual mesh geometry.
const assetFiles = {
  pistol:'g18', rifle:'ak47', knife_ct:'knife_ct', knife_t:'knife_t',
  swat:'counter_flame_swat_v8', terrorist:'dragomir_t',
  chosenCT:CHOSEN_CT.path
};
const storedTChoice=readTChoice();
if(storedTChoice)assetFiles.chosenT=terroristAssetPath(storedTChoice);
const assetStatus = Object.fromEntries(Object.keys(assetFiles).map(key => [key, 'pending']));
const assetProgress = Object.fromEntries(Object.keys(assetFiles).map(key => [key, 0]));
const assetTasks = Object.entries(assetFiles).map(([key, filename]) => new Promise(resolve => {
  const modelPath=filename.endsWith('.glb')?filename:'models/'+filename+'.glb';
  loader.load(import.meta.env.BASE_URL+modelPath+(key==='chosenT'?'?v=20261018-full-outfit-olive-v7':''), result => {
    try {
      assets[key] = ['swat','terrorist','chosenCT','chosenT'].includes(key)
        ? result : result.scene;
      if (key === 'pistol' || key === 'rifle') views[key].setModel(result.scene);
      else if (key === 'chosenCT') {
        refreshSwatPreview();
      } else if (key === 'swat') {
        refreshSwatPreview();
        if(swatGallery?.isOpen)swatGallery.refresh();
      } else if (key.startsWith('knife_') && match.player?.team === key.slice(6)) mountKnife(key);
      assetStatus[key] = 'ready';
    } catch (error) {
      console.warn('Model setup failed:', key, error);
      assetStatus[key] = 'failed';
    }
    assetProgress[key] = 1;
    resolve();
  }, event => {
    if (event.lengthComputable && event.total > 0)
      assetProgress[key] = Math.min(0.99, event.loaded / event.total);
  }, error => {
    console.warn('Не удалось загрузить ' + filename + '.glb', error);
    assetStatus[key] = 'failed'; assetProgress[key] = 1;
    // Do not hang on an unavailable asset. The fallback weapon remains visible.
    resolve();
  });
}));
const weaponsReady = Promise.all(assetTasks);
function mountKnife(key) {
  views.knife.setModel(assets[key] || null);
}

// Both teams now have real skinned tactical agents; a fallback keeps gameplay
// responsive if the larger character GLBs fail on slow mobile connections.
const fighters = new Map();
function createFighter(actor) {
  if (actor.isPlayer) return;
  const root = new THREE.Group(); scene.add(root);
  let animated = null;
  const preferred=actor.team==='ct'?assets.chosenCT:assets.chosenT;
  const gltf=preferred||assets[actor.team === 'ct' ? 'swat' : 'terrorist'];
  if (gltf) {
    try {
      animated=preferred?createRocketboxOperator(preferred,actor.team)
        :actor.team==='ct'
          ?createSwatV6Operator(gltf,selectedSwatIndex)
          :createTacticalOperator(gltf,assets.rifle,actor.team);
    } catch(error) {
      console.warn('Could not rig '+actor.team+' operator; using fallback',error);
    }
  }
  animated ||= buildRetroOperator(actor.team);
  root.add(animated.root);
  fighters.set(actor.id, {root,animated,lastX:actor.x,lastZ:actor.z});
}
function matchLoadFraction() {
  const values = Object.values(assetProgress);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const $ = id => document.getElementById(id);
const audio = createGameAudio();
let retroMenu;
retroMenu = installRetroMenu({
  onGallery: () => {retroMenu.hide();swatGallery.open('home');},
  onPlay: () => {
    audio.unlock();audio.ui();
    match.phase='selection';
    document.body.dataset.phase='selection';
    $('teamMenu').hidden=false;
    retroMenu.hide();
  },
  onSound: enabled => audio.setEnabled(enabled)
});
$('teamMenu').hidden=true;
swatGallery=installSwatV6Gallery({
  variants:SWAT_V6_VARIANTS,
  getSelection:()=>selectedSwatIndex,
  onOpen:()=>{document.body.dataset.phase='gallery';},
  onClose:origin=>{
    clearGalleryModels();
    document.body.dataset.phase=origin==='selection'?'selection':'home';
    if(origin==='home')retroMenu.show();
  },
  onPage:(page,pageSize)=>showGalleryPage(page,pageSize),
  onChoose:index=>{
    selectedSwatIndex=saveSwatSelection(index);
    refreshSwatPreview();
    highlightGallerySelection();
  },
});
$('openSwatGallery').addEventListener('click',()=>swatGallery.open('selection'));
setupWeaponCalibration({ views, getWeapon: () => weapon, setWeapon: name => selectWeapon(name) });
const stats = $('stats'), hitmarker = $('hitmarker'), radar = $('radar'), ctx = radar.getContext('2d');
const move = { x: 0, y: 0 }, keys = new Set(), lookPointers = new Map();
let weapon = 'pistol', firing = false, jumpHeld = false, joyId = null;
let firePointer = null, fireLastX = 0, fireLastY = 0;
let recoil = 0, shots = 0, lastPlayerShot = -10, hitTimer = 0, finishShown = false, swingAt = -10;
const inspection = new InspectTimeline();
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
  inspection.cancel();
  if (match.player) match.player.keyboardCrouch = false;
  $('knob').style.transform = ''; $('weaponWheel').classList.remove('open'); wheelPointer = null; wheelChoice = null;
}
function selectWeapon(name) {
  if (!['pistol', 'rifle', 'knife'].includes(name)) return;
  if (match.player) match.equip(match.player, name);
  // Any weapon selection interrupts knife/gun inspection immediately.
  inspection.cancel();
  weapon = name; recoil = 0; firing = false;
  views[name].draw(performance.now() / 1000); // Game1 draw animation on every switch
  $('weaponLabel').textContent = { pistol: 'Glock 18', rifle: 'AK-47', knife: 'Нож' }[name];
  $('weaponWheel').classList.remove('open');
}
function inspect() {
  if (!canControl()) return;
  firing = false;
  // Even if the current animation is already running, restart from 0:00.
  inspection.restart(weapon, match.time);
  $('weaponWheel').classList.remove('open');
}
function start(team) {
  resetInputs();
  recoil = 0; shots = 0; game1Burst = 0; lastPlayerShot = -10; finishShown = false;
  for (const tracer of tracers) { scene.remove(tracer.mesh); tracer.mesh.geometry.dispose(); tracer.mesh.material.dispose(); }
  tracers.length = 0;
  for (const mark of marks) scene.remove(mark.mesh);
  marks.length = 0;
  // A new team choice may reuse bot IDs; discard old actors so T skins never
  // appear on CT and retired skinned operators do not stay in the scene.
  for (const fighter of fighters.values()) {
    scene.remove(fighter.root);
    fighter.animated?.release?.();
  }
  fighters.clear();
  match.start(team);
  selectWeapon('pistol'); mountKnife(`knife_${team}`);
  for (const view of Object.values(views)) view.setTeam(team);
  for (const actor of match.actors) createFighter(actor);
  $('teamMenu').hidden = true; $('resultMenu').hidden = true; $('deathNotice').hidden = true;
  retroMenu.hide();
  $('teamBadge').textContent = TEAMS[team].name;
  $('teamBadge').dataset.team = team;
  document.body.dataset.phase = 'playing';
}
let matchLoading = false;
async function prepareMatch(team) {
  if (matchLoading) return;
  matchLoading = true;
  const overlay = $('matchLoading');
  const fill = $('matchLoadingFill');
  const progress = $('matchLoadingPercent');
  const status = $('matchLoadingStatus');
  audio.unlock();
  overlay.hidden = false;
  document.body.dataset.phase = 'loading';
  for (const button of [$('chooseCT'), $('chooseT')]) button.disabled = true;
  let active = true;
  const tick = () => {
    if (!active) return;
    const fraction = matchLoadFraction();
    const percent = Math.round(fraction * 100);
    fill.style.width = percent + '%';
    progress.textContent = percent + '%';
    status.textContent = 'Загружаем SWAT V8 Urban и оружие…';
    if (fraction < 1) requestAnimationFrame(tick);
  };
  tick();
  try {
    await weaponsReady;
    active = false;
    fill.style.width = '100%';
    progress.textContent = '100%';
    const missing = Object.values(assetStatus).filter(x => x === 'failed').length;
    status.textContent = missing ? 'Готово! Недоступное оружие заменено запасными моделями.' : 'Все модели загружены. В бой!';
    // Let the player see 100% and allow the browser to paint it first.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    start(team);
  } catch (error) {
    console.error('Match initialization failed', error);
    status.textContent = 'Ошибка запуска. Попробуй ещё раз.';
    document.body.dataset.phase = 'selection';
  } finally {
    active = false;
    matchLoading = false;
    overlay.hidden = true;
    for (const button of [$('chooseCT'), $('chooseT')]) button.disabled = false;
  }
}
$('chooseCT').addEventListener('click', () => prepareMatch('ct'));
$('chooseT').addEventListener('click', () => prepareMatch('t'));
$('teamBack').addEventListener('click', () => {
  match.phase='home';
  $('teamMenu').hidden=true;
  document.body.dataset.phase='home';
  retroMenu.show();
});
$('playAgain').addEventListener('click', () => start(match.playerTeam));
$('changeTeam').addEventListener('click', () => {
  resetInputs(); match.phase = 'selection';
  $('resultMenu').hidden = true; $('teamMenu').hidden = false;
  document.body.dataset.phase = 'selection';
});
$('returnHome').addEventListener('click', () => {
  resetInputs();
  match.phase='home';
  document.body.dataset.phase='home';
  $('resultMenu').hidden=true;
  $('teamMenu').hidden=true;
  document.body.classList.remove('dead');
  retroMenu.show();
});
function canControl() { return match.phase === 'playing' && match.player?.alive; }
function jump() {
  if (!canControl()) return;
  const player = match.player;
  if (!player.ground || match.time - player.lastJump < 0.24) return;
  player.jumps = match.time - player.lastJump < 1.15 ? Math.min(player.jumps + 1, 6) : 0;
  player.lastJump = match.time; player.vy = JUMP_IMPULSE; player.ground = false;
}
function reloadOrInspect() {
  if (!canControl()) return;
  switch (decideWeaponButtonAction(weapon, match.player)) {
    case 'inspect':
      // Full magazine, or either knife: start/restart inspect from frame zero.
      inspect();
      break;
    case 'reload':
      inspection.cancel();
      if(match.reload(match.player))audio.reload();
      break;
  }
}
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
bind('reload', reloadOrInspect);
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
  if (event.code === 'KeyR' && !event.repeat) reloadOrInspect();
  if (event.code === 'Digit1') selectWeapon('pistol');
  if (event.code === 'Digit2') selectWeapon('knife');
  if (event.code === 'Digit3') selectWeapon('rifle');
});
addEventListener('keyup', event => {
  keys.delete(event.code);
  if (event.code === 'ControlLeft' && match.player) match.player.keyboardCrouch = false;
});
addEventListener('blur', resetInputs);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetInputs(); });
addEventListener('resize', () => {
  camera.aspect = viewCamera.aspect = menuCamera.aspect = innerWidth / innerHeight;
  if(swatGallery?.isOpen)updateGalleryCamera(swatGallery.pageSize);
  camera.updateProjectionMatrix();viewCamera.updateProjectionMatrix();
  menuCamera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
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
  audio.shoot(weapon);
  views[weapon].fire(); // weapon kick and muzzle flash
  if (weapon !== 'knife') game1Burst = Math.min(ACCURACY.maxBurst, game1Burst + ACCURACY.perShot);
  inspection.cancel();
  if (weapon === 'knife') { recoil = 0.14; swingAt = match.time; }
  else {
    if (match.time - lastPlayerShot > 0.36) shots = 0;
    shots++; lastPlayerShot = match.time;
    const phase = Math.min(shots, 26);
    player.pitch = Math.min(1.2, player.pitch + (weapon === 'rifle' ? 0.012 + Math.min(phase, 12) * 0.0014 : 0.019));
    player.yaw += weapon === 'rifle' ? Math.sin(phase * 0.63) * 0.0035 + Math.sin(phase * 0.27) * 0.0025 : (Math.random() - 0.5) * 0.003;
    recoil = Math.min(0.15, recoil + (weapon === 'rifle' ? 0.035 : 0.09));
  }
  if (hit.damaged) {showHitmarker(!hit.actor.alive);audio.hit();}
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
    if(model.animated?.mode==='tactical')
      animateTacticalOperator(model.animated,actor,
        match.time,dt,dist/Math.max(.01,dt));
    else if(model.animated?.mode==='retro')
      animateRetroOperator(model.animated,actor,
        match.time,dt,dist/Math.max(.01,dt));
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
  const canInspect = weapon === 'knife' || player.ammo >= player.magazine;
  $('reload').setAttribute('aria-label', canInspect ? 'Осмотреть оружие' : 'Перезарядить');
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
    retroMenu.recordMatch({kills:player.kills,deaths:player.deaths,
      won:!!winner && winner===player.team});
    if(winner===player.team)audio.win();else audio.lose();
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
  const lobby = match.phase === 'selection' || match.phase === 'home'
    || match.phase === 'finished';
  if (lobby) {
    for(const model of fighters.values())model.root.visible=false;
    preview.root.rotation.y=-.38+Math.sin(now*.00035)*.18;
    if(preview.mode==='tactical')animateTacticalOperator(preview,
      {lastShotAt:-100},now/1000,dt,0);
    else if(preview.mode==='retro')animateRetroOperator(preview,{lastShotAt:-100},now/1000,dt,0);
  }
  effects(now); updateModels(dt);
  if (match.player) {updateHUD(); drawRadar();}
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
    inspectTime: inspection.elapsed(weapon, match.time),
    reloadProgress, slashTime: match.time - swingAt,
    firing: weapon !== 'knife' && match.time - player.lastShotAt < 0.045,
  });
  renderer.clear();
  if(swatGallery?.isOpen)renderer.render(galleryScene,galleryCamera);
  else if(lobby) renderer.render(menuScene,menuCamera);
  else {
    renderer.render(scene,camera);
    renderer.clearDepth();
    renderer.render(viewScene,viewCamera);
  }
}
requestAnimationFrame(frame);
