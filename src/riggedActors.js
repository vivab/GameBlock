import * as THREE from 'three';
import { clone as cloneSkinnedScene } from 'three/addons/utils/SkeletonUtils.js';

// Quaternius Ultimate Modular Men, CC0. These two costumes share the same
// 24-animation humanoid rig. Never flatten/deform skinned mesh vertices.
// For future calibration, all model dimensions and orientation live here.
export const OPERATOR_SETTINGS = Object.freeze({
  ct: { height: 1.83, yaw: Math.PI, offsetX: 0, offsetZ: 0 },
  t: { height: 1.83, yaw: Math.PI, offsetX: 0, offsetZ: 0 },
});

export function chooseAnimationName(names, state) {
  const candidates = {
    idle: ['Idle_Gun', 'Idle_Gun_Pointing', 'Idle', 'Idle_Neutral'],
    move: ['Run_Shoot', 'Run', 'Walk', 'Idle_Gun'],
    fire: ['Idle_Gun_Shoot', 'Gun_Shoot', 'Idle_Gun'],
    death: ['Death'],
  }[state] || ['Idle_Gun', 'Idle'];
  for (const candidate of candidates) {
    const match = names.find(name => name === candidate || name.endsWith('|' + candidate));
    if (match) return match;
  }
  return names[0] || null;
}

export function buildAnimatedOperator(gltf, team) {
  if (!gltf?.scene) throw new Error('Operator asset must be a decoded GLTF scene');
  const options = OPERATOR_SETTINGS[team] || OPERATOR_SETTINGS.ct;
  const holder = new THREE.Group();
  const visual = cloneSkinnedScene(gltf.scene);
  holder.add(visual);
  visual.rotation.y = options.yaw;
  visual.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(visual);
  const dimension = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(dimension.y) || dimension.y < 0.05)
    throw new Error('Operator model has an invalid height');
  visual.scale.multiplyScalar(options.height / dimension.y);
  visual.updateMatrixWorld(true);
  const scaled = new THREE.Box3().setFromObject(visual);
  const center = scaled.getCenter(new THREE.Vector3());
  visual.position.set(
    options.offsetX - center.x,
    -scaled.min.y,
    options.offsetZ - center.z
  );

  const mixer = new THREE.AnimationMixer(visual);
  const all = gltf.animations || [];
  const names = all.map(clip => clip.name);
  const clips = {};
  for (const state of ['idle', 'move', 'fire', 'death']) {
    const name = chooseAnimationName(names, state);
    const clip = all.find(item => item.name === name);
    if (clip) clips[state] = mixer.clipAction(clip);
  }
  // Keep the gun in a ready position even when the model isn't moving.
  let active = null, current = '';
  const transition = state => {
    const wanted = clips[state] || clips.idle || clips.move;
    if (!wanted || state === current) return;
    if (active && active !== wanted) active.fadeOut(0.15);
    wanted.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).fadeIn(0.15).play();
    if (state === 'death') {
      wanted.setLoop(THREE.LoopOnce, 1);
      wanted.clampWhenFinished = true;
    } else {
      wanted.setLoop(THREE.LoopRepeat, Infinity);
      wanted.clampWhenFinished = false;
    }
    active = wanted;
    current = state;
  };
  transition('idle');

  return {
    root: holder,
    mixer,
    get animationState() { return current; },
    update(dt, speed, shooting = false) {
      const state = speed > 0.25 ? 'move' : shooting ? 'fire' : 'idle';
      transition(state);
      // Some animation glTF files contain vertex morphs as well as bone tracks.
      // The mixer is tied to this bot's own SkeletonUtils.clone, not shared.
      mixer.update(Math.min(0.05, Math.max(0, dt)));
    },
    dispose() { mixer.stopAllAction(); mixer.uncacheRoot(visual); },
  };
}
