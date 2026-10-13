import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

// The actual uploaded Source terrorist and CS2 SAS agent use different rigs.
// Work with their real wrist/elbow joints, instead of rotating a T-pose arm
// around an assumed model-space axis.
const ALIASES = {
  leftLeg: [/leg left thigh/i, /leg_upper_l/i, /thigh_l/i],
  rightLeg: [/leg right thigh/i, /leg_upper_r/i, /thigh_r/i],
  leftArm: [/arm left shoulder 2/i, /arm_upper_l/i, /upperarm_l/i],
  rightArm: [/arm right shoulder 2/i, /arm_upper_r/i, /upperarm_r/i],
  leftElbow: [/arm left elbow/i, /arm_lower_l(?!_twist)/i],
  rightElbow: [/arm right elbow/i, /arm_lower_r(?!_twist)/i],
  leftHand: [/arm left wrist/i, /^hand_l_/i, /left_hand/i],
  rightHand: [/arm right wrist/i, /^hand_r_/i, /right_hand/i],
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
  if (!Number.isFinite(size.y) || size.y < 1e-7) return false;
  const factor = 1.83 / size.y;
  visual.scale.setScalar(factor);
  const center = bounds.getCenter(new THREE.Vector3());
  visual.position.set(-center.x * factor, -bounds.min.y * factor, -center.z * factor);
  return true;
}

function createRifle(source) {
  const holder = new THREE.Group();
  if (source) {
    const rifle = source.clone(true);
    rifle.updateMatrixWorld(true);
    const initial = new THREE.Box3().setFromObject(rifle).getSize(new THREE.Vector3());
    // Like first-person GLBs, orient the longest axis along the barrel.
    if (initial.x >= initial.y && initial.x >= initial.z) rifle.rotation.y = Math.PI / 2;
    else if (initial.y >= initial.x && initial.y >= initial.z) rifle.rotation.x = -Math.PI / 2;
    else rifle.rotation.y = Math.PI;
    rifle.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rifle);
    const size = box.getSize(new THREE.Vector3());
    rifle.scale.multiplyScalar(0.85 / Math.max(0.01, size.z));
    rifle.updateMatrixWorld(true);
    const center = new THREE.Box3().setFromObject(rifle).getCenter(new THREE.Vector3());
    rifle.position.sub(center);
    holder.add(rifle);
  } else {
    // A visible weapon is still held when a GLB fails to download.
    const steel = new THREE.MeshStandardMaterial({ color: 0x20262a, roughness: 0.55 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x69462e, roughness: 0.83 });
    const add = (w,h,d,x,y,z,mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
      m.position.set(x,y,z); holder.add(m);
    };
    add(.11,.12,.52,0,.03,-.12,steel);
    add(.045,.045,.36,0,.06,-.53,steel);
    add(.13,.12,.25,0,.015,-.25,wood);
    add(.10,.22,.09,0,-.15,.045,steel);
    add(.13,.11,.22,0,0,.28,wood);
  }
  return holder;
}

const axisX = new THREE.Vector3(1,0,0);
const axisZ = new THREE.Vector3(0,0,1);
const delta = new THREE.Quaternion();
const parentWorld = new THREE.Quaternion();
const jointWorld = new THREE.Vector3();
const endWorld = new THREE.Vector3();
const from = new THREE.Vector3();
const to = new THREE.Vector3();
function turnJointToward(joint, effector, target) {
  if (!joint || !effector) return;
  joint.getWorldPosition(jointWorld);
  effector.getWorldPosition(endWorld);
  from.copy(endWorld).sub(jointWorld);
  to.copy(target).sub(jointWorld);
  if (from.lengthSq() < 1e-8 || to.lengthSq() < 1e-8) return;
  delta.setFromUnitVectors(from.normalize(), to.normalize());
  if (joint.parent) joint.parent.getWorldQuaternion(parentWorld);
  else parentWorld.identity();
  // Convert a world-space correction into the bone's parent-local rotation.
  const correction = parentWorld.clone().invert().multiply(delta).multiply(parentWorld);
  joint.quaternion.premultiply(correction).normalize();
}

const shoulderPos = new THREE.Vector3();
const elbowPos = new THREE.Vector3();
const handPos = new THREE.Vector3();
const elbowTarget = new THREE.Vector3();
const direction = new THREE.Vector3();
const pole = new THREE.Vector3();
function solveArm(model, side, grip) {
  const upper = model.bones[side + 'Arm'];
  const elbow = model.bones[side + 'Elbow'];
  const hand = model.bones[side + 'Hand'];
  if (!upper || !hand) return;
  const target = model.root.localToWorld(grip.clone());
  model.root.updateMatrixWorld(true);
  if (!elbow) {
    turnJointToward(upper, hand, target);
    return;
  }
  upper.getWorldPosition(shoulderPos);
  elbow.getWorldPosition(elbowPos);
  hand.getWorldPosition(handPos);
  const a = shoulderPos.distanceTo(elbowPos);
  const b = elbowPos.distanceTo(handPos);
  if (a < 0.01 || b < 0.01) {
    turnJointToward(upper, hand, target);
    return;
  }
  direction.copy(target).sub(shoulderPos);
  const reach = Math.max(0.02, Math.min(direction.length(), (a+b)*0.995));
  direction.normalize();
  const along = Math.min(a, Math.max(-a, (a*a - b*b + reach*reach)/(2*reach)));
  const bend = Math.sqrt(Math.max(0, a*a - along*along));
  // Keep the elbows below and outside the weapon, not through the chest.
  pole.set(side === 'left' ? -1 : 1, -0.85, 0.24)
    .applyQuaternion(model.root.getWorldQuaternion(new THREE.Quaternion()));
  pole.addScaledVector(direction, -pole.dot(direction)).normalize();
  elbowTarget.copy(shoulderPos).addScaledVector(direction, along)
    .addScaledVector(pole, bend);
  turnJointToward(upper, elbow, elbowTarget);
  model.root.updateMatrixWorld(true);
  turnJointToward(elbow, hand, target);
}

export function createImportedOperator(gltf, team, rifleScene = null) {
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

  // A real visible AK is mounted in actor-space. Both hands solve toward
  // fixed foregrip/trigger targets on this weapon each frame.
  const gunPivot = new THREE.Group();
  gunPivot.position.set(0.015, 1.25, -0.43);
  root.add(gunPivot);
  const gun = createRifle(rifleScene);
  gunPivot.add(gun);

  const mixer = new THREE.AnimationMixer(source);
  const clips = gltf.animations || [];
  // eye_test / tools_preview are showcase clips, not movement animations.
  const idle = clips.find(clip => /(^|[_ -])(idle|breathing)([_ -]|$)/i.test(clip.name));
  const walk = clips.find(clip => /(^|[_ -])(walk|run|jog)([_ -]|$)/i.test(clip.name));
  const idleAction = idle ? mixer.clipAction(idle) : null;
  const walkAction = walk ? mixer.clipAction(walk) : null;
  if (idleAction) idleAction.play();
  return { root, visual, source, bones, rest, mixer, idleAction, walkAction,
    gun, gunPivot, lastMode: 'idle', mode: 'imported', team };
}

function offsetBone(model, key, axis, radians) {
  const bone = model.bones[key], base = model.rest[key];
  if (!bone || !base) return;
  bone.quaternion.copy(base).multiply(
    new THREE.Quaternion().setFromAxisAngle(axis, radians));
}

export function animateImportedOperator(model, actor, gameTime, dt, movement) {
  if (!model || !actor) return;
  const speed = Math.min(1, Math.max(0, movement / 3.2));
  const mode = speed > 0.08 ? 'walk' : 'idle';
  if (mode !== model.lastMode && model.walkAction) {
    const next = mode === 'walk' ? model.walkAction : model.idleAction;
    const prev = model.lastMode === 'walk' ? model.walkAction : model.idleAction;
    if (next) { next.reset().play(); if (prev) next.crossFadeFrom(prev, .18, false); }
    else if (prev) prev.fadeOut(.18);
    model.lastMode = mode;
  }
  model.mixer.update(Math.max(0, Math.min(.05, dt)));
  if (!model.idleAction && !model.walkAction) {
    const stride = Math.sin(gameTime * 9) * speed;
    offsetBone(model, 'leftLeg', axisX, stride*.38);
    offsetBone(model, 'rightLeg', axisX, -stride*.38);
    offsetBone(model, 'head', axisZ, Math.sin(gameTime*.8)*.018);
    // Restore bind quaternions each frame: IK must never accumulate rotations.
    for (const key of ['leftArm','rightArm','leftElbow','rightElbow',
                       'leftHand','rightHand'])
      if (model.bones[key] && model.rest[key])
        model.bones[key].quaternion.copy(model.rest[key]);
  }
  const fired = actor.lastShotAt != null && gameTime - actor.lastShotAt < .15;
  model.gunPivot.rotation.x = fired ? .095 : 0;
  model.gunPivot.position.y = 1.25 + Math.sin(gameTime * 9)*speed*.009;

  // Trigger hand and supporting hand converge on the rifle, with elbows
  // bent down like the CS ready stance instead of pointing sideways.
  model.root.updateMatrixWorld(true);
  solveArm(model, 'right', new THREE.Vector3(.13, 1.24, -.31));
  solveArm(model, 'left', new THREE.Vector3(-.12, 1.31, -.59));
  model.root.updateMatrixWorld(true);
}
