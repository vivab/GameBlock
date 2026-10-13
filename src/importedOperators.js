import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

// The supplied Source terrorist and SAS agent have different bone naming
// conventions. Both are skinned meshes; always clone the bones with the mesh.
const ALIASES = {
  leftLeg: [/leg left thigh/i, /leg_upper_l/i, /thigh_l/i],
  rightLeg: [/leg right thigh/i, /leg_upper_r/i, /thigh_r/i],
  leftArm: [/arm left shoulder 2/i, /arm_upper_l/i, /upperarm_l/i],
  rightArm: [/arm right shoulder 2/i, /arm_upper_r/i, /upperarm_r/i],
  leftElbow: [/arm left elbow/i, /arm_lower_l(?!_twist)/i],
  rightElbow: [/arm right elbow/i, /arm_lower_r(?!_twist)/i],
  head: [/head neck upper/i, /^head_0_0$/i],
};

export function findOperatorBones(scene) {
  const nodes = [];
  scene.traverse(object => { if (object.isBone) nodes.push(object); });
  const result = {};
  for (const [key, patterns] of Object.entries(ALIASES))
    result[key] = nodes.find(bone => patterns.some(pattern => pattern.test(bone.name))) || null;
  return result;
}

function normalizeActor(scene, visual) {
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(scene);
  const size = bounds.getSize(new THREE.Vector3());
  // Exclude malformed / zero-sized meshes so bots can still use the fallback.
  if (!Number.isFinite(size.y) || size.y < 1e-7) return false;
  visual.scale.setScalar(1.83 / size.y);
  // Normalize offsets without changing the bind pose or detaching the skeleton.
  visual.position.set(
    -bounds.getCenter(new THREE.Vector3()).x * visual.scale.x,
    -bounds.min.y * visual.scale.y,
    -bounds.getCenter(new THREE.Vector3()).z * visual.scale.z
  );
  return true;
}

export function createImportedOperator(gltf, team) {
  if (!gltf?.scene || !['ct', 't'].includes(team)) return null;
  const root = new THREE.Group();
  const visual = new THREE.Group();
  const source = cloneSkinned(gltf.scene);
  root.add(visual);
  visual.add(source);
  if (!normalizeActor(source, visual)) return null;
  const bones = findOperatorBones(source);
  const rest = {};
  for (const [name, bone] of Object.entries(bones)) if (bone) rest[name] = bone.quaternion.clone();
  const mixer = new THREE.AnimationMixer(source);
  // Preview/eye-test clips in the supplied SAS model are not walking clips.
  // Future Mixamo clips may be added by name without changing gameplay code.
  const clips = gltf.animations || [];
  const idle = clips.find(clip => /(^|[_ -])(idle|breathing)([_ -]|$)/i.test(clip.name));
  const walk = clips.find(clip => /(^|[_ -])(walk|run|jog)([_ -]|$)/i.test(clip.name));
  const idleAction = idle ? mixer.clipAction(idle) : null;
  const walkAction = walk ? mixer.clipAction(walk) : null;
  if (idleAction) idleAction.play();
  return { root, visual, source, bones, rest, mixer, idleAction, walkAction,
    lastMode: 'idle', mode: 'imported', lastTime: null, team };
}

const axisX = new THREE.Vector3(1, 0, 0);
const axisZ = new THREE.Vector3(0, 0, 1);
const turn = new THREE.Quaternion();
function offsetBone(model, key, axis, radians) {
  const bone = model.bones[key], base = model.rest[key];
  if (!bone || !base) return;
  turn.setFromAxisAngle(axis, radians);
  bone.quaternion.copy(base).multiply(turn);
}

export function animateImportedOperator(model, actor, gameTime, dt, movement) {
  if (!model || !actor) return;
  const speed = Math.min(1, Math.max(0, movement / 3.2));
  const walking = speed > 0.08;
  const mode = walking ? 'walk' : 'idle';
  if (mode !== model.lastMode && model.walkAction) {
    const next = mode === 'walk' ? model.walkAction : model.idleAction;
    const prev = model.lastMode === 'walk' ? model.walkAction : model.idleAction;
    if (next) { next.reset().play(); if (prev) next.crossFadeFrom(prev, 0.18, false); }
    else if (prev) prev.fadeOut(0.18);
    model.lastMode = mode;
  }
  model.mixer.update(Math.max(0, Math.min(0.05, dt)));
  // No animation clips? Use real hip/arm bones with procedural run/idle.
  if (!model.walkAction && !model.idleAction) {
    const stride = Math.sin(gameTime * 9) * speed;
    offsetBone(model, 'leftLeg', axisX, stride * 0.36);
    offsetBone(model, 'rightLeg', axisX, -stride * 0.36);
    offsetBone(model, 'leftArm', axisX, -0.25 - stride * 0.25);
    offsetBone(model, 'rightArm', axisX, -0.42 + stride * 0.25);
    offsetBone(model, 'leftElbow', axisX, -0.12);
    offsetBone(model, 'rightElbow', axisX, -0.25);
    offsetBone(model, 'head', axisZ, Math.sin(gameTime * 0.7) * 0.025);
  }
  const fire = actor.lastShotAt != null && gameTime - actor.lastShotAt < 0.17;
  if (fire && model.bones.rightArm) {
    const base = model.bones.rightArm.quaternion.clone();
    turn.setFromAxisAngle(axisX, -0.10);
    model.bones.rightArm.quaternion.copy(base).multiply(turn);
  }
}
