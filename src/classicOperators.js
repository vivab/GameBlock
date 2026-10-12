import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

/**
 * Counter-Strike-like operators built from the ORIGINAL GIGN and Leet GLBs
 * already uploaded by this project's owner.
 *
 * The CT file is a static Z-up mesh. Give its vertices a proper skinned
 * skeleton with *continuous* shoulder/elbow/knee weights, rather than
 * modifying the mesh's vertex positions every frame (the old "wings" bug).
 * The T file is already skinned: animate its native 86-bone hierarchy.
 *
 * No imported game map, cartoon characters or mesh replacement.
 */
const UP = new THREE.Vector3(0, 1, 0);
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const tempQuat = new THREE.Quaternion();
const tempParentQuat = new THREE.Quaternion();
const tempWorldQuat = new THREE.Quaternion();
const tempV = new THREE.Vector3();
const TARGET_HEIGHT = 1.83;

const smooth = (start, end, value) => {
  const t = THREE.MathUtils.clamp((value - start) / Math.max(1e-5, end - start), 0, 1);
  return t * t * (3 - 2 * t);
};
const bone = (name, position, parent) => {
  const b = new THREE.Bone();
  b.name = name;
  b.position.set(...position);
  parent.add(b);
  return b;
};

export function makeCtSkeleton() {
  const armature = new THREE.Group();
  const hips = bone('Hips', [0, 0.88, 0], armature);
  const spine = bone('Spine', [0, 0.18, 0], hips);
  // Index 0=root, 1=torso, 2/3=right arm, 4/5=left arm,
  // 6/7=right leg, 8/9=left leg.
  const rightArm = bone('RightUpperArm', [0.29, 0.43, 0], spine);
  const rightFore = bone('RightForearm', [0.44, 0, 0], rightArm);
  const leftArm = bone('LeftUpperArm', [-0.29, 0.43, 0], spine);
  const leftFore = bone('LeftForearm', [-0.44, 0, 0], leftArm);
  const rightLeg = bone('RightUpperLeg', [0.14, -0.10, 0], hips);
  const rightCalf = bone('RightLowerLeg', [0, -0.43, 0], rightLeg);
  const leftLeg = bone('LeftUpperLeg', [-0.14, -0.10, 0], hips);
  const leftCalf = bone('LeftLowerLeg', [0, -0.43, 0], leftLeg);
  armature.updateMatrixWorld(true);
  const bones = [hips, spine, rightArm, rightFore, leftArm, leftFore,
    rightLeg, rightCalf, leftLeg, leftCalf];
  return { armature, bones, upperArms: [rightArm, leftArm], forearms: [rightFore, leftFore],
    thighs: [rightLeg, leftLeg], calves: [rightCalf, leftCalf] };
}

export function ctSkinWeights(point) {
  const x = point.x, y = point.y, ax = Math.abs(x);
  const indices = [0, 0, 0, 0];
  const weights = [1, 0, 0, 0];
  // A small upper-arm/shoulder falloff prevents seams, T-pose fans and stretching.
  const arm = smooth(0.20, 0.36, ax) * smooth(0.94, 1.22, y);
  if (arm > 0.00001) {
    const upper = x >= 0 ? 2 : 4;
    const forearm = upper + 1;
    const elbow = smooth(0.57, 0.79, ax);
    indices[0] = 1; weights[0] = 1 - arm;
    indices[1] = upper; weights[1] = arm * (1 - elbow);
    indices[2] = forearm; weights[2] = arm * elbow;
    return { indices, weights };
  }
  const leg = 1 - smooth(0.75, 1.00, y);
  if (leg > 0.00001) {
    const thigh = x >= 0 ? 6 : 8;
    const calf = thigh + 1;
    const knee = 1 - smooth(0.37, 0.59, y);
    indices[0] = 0; weights[0] = 1 - leg;
    indices[1] = thigh; weights[1] = leg * (1 - knee);
    indices[2] = calf; weights[2] = leg * knee;
    return { indices, weights };
  }
  indices[0] = 1;
  return { indices, weights };
}

// All vertices are converted to Y-up, standing at ground=0 and centered.
// The rest bind transforms are saved BEFORE we pose the arms.
export function skinCtMesh(source) {
  const render = source.clone(true);
  // glTF exporters sometimes bake Z-up into the root node already. Try the
  // source orientation and both quarter-turns, keeping the one with greatest
  // vertical extent rather than forcing a second rotation.
  let rawBounds = null;
  let bestHeight = -1;
  for (const angle of [0, -Math.PI / 2, Math.PI / 2]) {
    render.rotation.x = angle;
    render.updateMatrixWorld(true);
    const candidate = new THREE.Box3().setFromObject(render);
    const height = candidate.getSize(new THREE.Vector3()).y;
    if (Number.isFinite(height) && height > bestHeight) {
      bestHeight = height;
      rawBounds = candidate.clone();
      render.userData.uprightAngle = angle;
    }
  }
  render.rotation.x = render.userData.uprightAngle ?? 0;
  render.updateMatrixWorld(true);
  if (!rawBounds || rawBounds.isEmpty()) throw new Error('GIGN GLB contains no geometry');
  const size = rawBounds.getSize(new THREE.Vector3());
  if (!(size.y > 0.15)) throw new Error('GIGN GLB has invalid upright height: ' + size.y);
  const scale = TARGET_HEIGHT / size.y;
  const center = rawBounds.getCenter(new THREE.Vector3());
  const normalization = new THREE.Matrix4()
    .makeTranslation(-center.x * scale, -rawBounds.min.y * scale, -center.z * scale)
    .multiply(new THREE.Matrix4().makeScale(scale, scale, scale));
  const rig = makeCtSkeleton();
  const root = new THREE.Group();
  root.add(rig.armature);
  rig.armature.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(rig.bones);
  let count = 0;
  render.traverse(node => {
    if (!node.isMesh || node.isSkinnedMesh) return;
    const geometry = node.geometry.clone();
    geometry.applyMatrix4(normalization.clone().multiply(node.matrixWorld));
    const vertices = geometry.getAttribute('position');
    const idx = new Uint16Array(vertices.count * 4);
    const weights = new Float32Array(vertices.count * 4);
    for (let i = 0; i < vertices.count; i++) {
      tempV.fromBufferAttribute(vertices, i);
      const skin = ctSkinWeights(tempV);
      for (let j = 0; j < 4; j++) {
        idx[i * 4 + j] = skin.indices[j];
        weights[i * 4 + j] = skin.weights[j];
      }
    }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    const mesh = new THREE.SkinnedMesh(geometry, node.material);
    mesh.name = 'Animated GIGN ' + count++;
    mesh.frustumCulled = false;
    root.add(mesh);
    mesh.bind(skeleton);
  });
  if (!count) throw new Error('GIGN has no skinnable geometry');
  return { root, mode: 'generated', rig };
}

// Bake the owner's original Leet skin once in its bind pose, then re-rig
// with the SAME proven lightweight GPU skeleton as GIGN. Blender/sketchfab
// rigs often contain nonuniform transform conventions which can otherwise
// explode when animated in-browser. The detailed model and textures remain.
export function flattenOriginalSkinnedModel(scene) {
  scene.updateMatrixWorld(true);
  const baked = new THREE.Group();
  let count = 0;
  scene.traverse(node => {
    if (!node.isMesh || !node.geometry?.getAttribute('position')) return;
    const geometry = node.geometry.clone();
    const position = geometry.getAttribute('position');
    if (node.isSkinnedMesh) {
      node.skeleton.update();
      const vertex = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        node.getVertexPosition(i, vertex);
        position.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
      position.needsUpdate = true;
      // Remove inherited skin indices: a new, safe GPU rig is built later.
      geometry.deleteAttribute('skinIndex');
      geometry.deleteAttribute('skinWeight');
    }
    geometry.applyMatrix4(node.matrixWorld);
    geometry.computeBoundingBox();
    const result = new THREE.Mesh(geometry, node.material);
    result.name = 'Original Leet bind geometry ' + count++;
    baked.add(result);
  });
  if (!count) throw new Error('Leet GLB has no bakeable geometry');
  return baked;
}

function nativeBone(root, pattern) {
  let match = null;
  root.traverse(o => { if (o.isBone && pattern.test(o.name.replace(/_/g, ' '))) match = o; });
  return match;
}

// SkinnedMesh.computeBoundingBox() often returns a bogus zero-height box
// before GPU skin matrices are ready. Native bind-pose geometry is reliable.
export function geometryWorldBounds(node) {
  node.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  const corner = new THREE.Box3();
  node.traverse(mesh => {
    if (!mesh.isMesh) return;
    const position = mesh.geometry?.getAttribute('position');
    if (!position) return;
    corner.setFromBufferAttribute(position).applyMatrix4(mesh.matrixWorld);
    if (!corner.isEmpty()) bounds.union(corner);
  });
  return bounds;
}
export function uprightRotationFromBones(head, feet) {
  const direction = head.clone().sub(feet);
  if (direction.lengthSq() < 0.0001) throw new Error('Invalid humanoid skeleton head and feet');
  return new THREE.Quaternion().setFromUnitVectors(direction.normalize(), UP);
}
function alignSkinnedHumanoid(scene) {
  scene.updateMatrixWorld(true);
  const head = nativeBone(scene, /Bip01 Head/i);
  const leftFoot = nativeBone(scene, /Bip01 L Foot/i);
  const rightFoot = nativeBone(scene, /Bip01 R Foot/i);
  if (!head || !leftFoot || !rightFoot) throw new Error('Leet head/feet joints are missing');
  const h = new THREE.Vector3(), feet = new THREE.Vector3();
  head.getWorldPosition(h);
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  leftFoot.getWorldPosition(a);
  rightFoot.getWorldPosition(b);
  feet.copy(a).add(b).multiplyScalar(0.5);
  const up = uprightRotationFromBones(h, feet);
  scene.quaternion.premultiply(up);
  scene.updateMatrixWorld(true);
}
function poseNative(root) {
  const get = p => nativeBone(root, p);
  const upper = [get(/Bip01 L UpperArm/i), get(/Bip01 R UpperArm/i)];
  const lower = [get(/Bip01 L Forearm/i), get(/Bip01 R Forearm/i)];
  const thighs = [get(/Bip01 L Thigh/i), get(/Bip01 R Thigh/i)];
  const calves = [get(/Bip01 L Calf/i), get(/Bip01 R Calf/i)];
  const tracks = [...upper, ...lower, ...thighs, ...calves]
    .filter(Boolean).map(b => ({ bone: b, bind: b.quaternion.clone() }));
  if (upper.some(x => !x) || lower.some(x => !x) ||
      thighs.some(x => !x)) {
    const found = [];
    root.traverse(o => { if (o.isBone) found.push(o.name); });
    throw new Error('Original Leet skeleton is incomplete: found ' +
      found.filter(n => /UpperArm|Forearm|Thigh/i.test(n)).join(', '));
  }
  return { upper, lower, thighs, calves, tracks };
}

export function buildClassicOperator(gltf, team) {
  if (!gltf?.scene) throw new Error('GLB model must be loaded first');
  if (team === 'ct') return skinCtMesh(gltf.scene);
  // Real Leet appearance, but animated with the stable 10-bone rig instead
  // of the glTF's fragile legacy armature.
  if (team === 't') return skinCtMesh(flattenOriginalSkinnedModel(gltf.scene));
  const root = new THREE.Group();
  const loaded = cloneSkinned(gltf.scene);
  root.add(loaded);
  alignSkinnedHumanoid(loaded);
  root.updateMatrixWorld(true);
  const box = geometryWorldBounds(root);
  if (box.isEmpty()) throw new Error('Leet GLB contains no geometry');
  const sourceHeight = box.getSize(new THREE.Vector3()).y;
  if (!(sourceHeight > 0.1)) throw new Error('Leet has invalid bind geometry height ' + sourceHeight);
  const factor = TARGET_HEIGHT / sourceHeight;
  // Never let a malformed glTF bounding box turn a fighter into a
  // multi-meter-wide creature covering the camera.
  if (factor < 0.3 || factor > 5) throw new Error('Leet scale is out of range: ' + factor);
  loaded.scale.multiplyScalar(factor);
  root.updateMatrixWorld(true);
  const scaled = geometryWorldBounds(root);
  const center = scaled.getCenter(new THREE.Vector3());
  loaded.position.set(-center.x, -scaled.min.y, -center.z);
  root.updateMatrixWorld(true);
  return { root, mode: 'native', rig: poseNative(loaded) };
}

// The same AK GLB already used by the owner's first-person hands. In third
// person it receives its own independent object, shared textures/geometry,
// with the barrel pointing toward the combat actor's -Z forward direction.
export function buildThirdPersonRifle(source) {
  if (!source) throw new Error('AK model missing');
  const mesh = source.clone(true);
  const initial = new THREE.Box3().setFromObject(mesh);
  if (initial.isEmpty()) throw new Error('AK model is empty');
  const dims = initial.getSize(new THREE.Vector3());
  if (dims.x > dims.y && dims.x > dims.z) mesh.rotation.y = Math.PI / 2;
  else if (dims.y > dims.z) mesh.rotation.x = -Math.PI / 2;
  else mesh.rotation.y = Math.PI;
  mesh.updateMatrixWorld(true);
  const aligned = new THREE.Box3().setFromObject(mesh);
  const length = aligned.getSize(new THREE.Vector3()).z;
  if (!(length > 0.001)) throw new Error('AK barrel axis was not determined');
  mesh.scale.multiplyScalar(0.78 / length);
  mesh.updateMatrixWorld(true);
  const centered = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
  mesh.position.sub(centered);
  const mount = new THREE.Group();
  mount.name = 'Bot AK-47';
  // Receivers sit near the hands, while the barrel points away from the torso.
  mount.position.set(0.015, 1.20, -0.52);
  mount.add(mesh);
  return mount;
}

// Native bones use their original local bind quaternions. Apply a rotation
// expressed in soldier-local 3D axes, transformed through the parent;
// no vertex-level T-pose edits, and no shared skeletons between bots.
function nativeRotation(bone, rest, actorRoot, axis, degrees) {
  if (!bone || !rest) return;
  const worldAxis = axis.clone();
  actorRoot.getWorldQuaternion(tempWorldQuat);
  worldAxis.applyQuaternion(tempWorldQuat);
  bone.parent.getWorldQuaternion(tempParentQuat);
  worldAxis.applyQuaternion(tempParentQuat.invert()).normalize();
  bone.quaternion.copy(rest).premultiply(tempQuat.setFromAxisAngle(worldAxis,
    THREE.MathUtils.degToRad(degrees)));
}
function worldSide(bone, actorRoot) {
  bone.getWorldPosition(tempV);
  actorRoot.worldToLocal(tempV);
  return tempV.x >= 0 ? 1 : -1;
}

export function animateClassicOperator(model, actor, time, dt, movement) {
  if (!model) return;
  const rig = model.rig;
  const walk = Math.min(1, Math.max(0, movement / 3.2));
  const stride = Math.sin(time * 8.5);
  const fire = actor.lastShotAt != null && time - actor.lastShotAt < 0.25;
  if (model.mode === 'generated') {
    // Native bone skinning computed by Three.js GPU, no per-frame vertices.
    for (let i = 0; i < 2; i++) {
      const sign = i === 0 ? 1 : -1;
      // Aim both elbows forward and bring wrists together around the gun,
      // rather than leaving classic GLB arms spread in an A/T pose.
      // Solve a two-bone forward hold: shoulders ±0.29m, elbows ±0.46m,
      // wrists ±0.09m at chest height, around the third-person rifle.
      // The y/z rotations are mirrored so neither side forms a T-pose.
      rig.upperArms[i].rotation.set(0, sign * 0.92,
        -sign * (0.88 + (fire ? 0.055 : 0)));
      rig.forearms[i].rotation.set(0, sign * 1.70,
        sign * (0.017 + (fire ? 0.035 : 0)));
      rig.thighs[i].rotation.set(stride * (i === 0 ? 0.45 : -0.45) * walk, 0, 0);
      rig.calves[i].rotation.set(Math.max(0, -stride * (i === 0 ? 1 : -1)) * 0.24 * walk, 0, 0);
    }
    rig.armature.updateMatrixWorld(true);
  } else {
    const actorRoot = model.root;
    model.root.updateMatrixWorld(true);
    const restMap = new Map(rig.tracks.map(t => [t.bone, t.bind]));
    for (const [i, bone] of rig.upper.entries()) {
      const sign = worldSide(bone, actorRoot);
      nativeRotation(bone, restMap.get(bone), actorRoot, AXIS_Z,
        -sign * (61 + (fire ? 5 : 0)));
      nativeRotation(bone, bone.quaternion.clone(), actorRoot, AXIS_Y, sign * 27);
      bone.updateMatrixWorld(true);
    }
    for (const [i, bone] of rig.lower.entries()) {
      const sign = worldSide(bone, actorRoot);
      nativeRotation(bone, restMap.get(bone), actorRoot, AXIS_Z, sign * 66);
      bone.updateMatrixWorld(true);
    }
    for (const [i, b] of rig.thighs.entries()) {
      nativeRotation(b, restMap.get(b), actorRoot, AXIS_X,
        stride * (i === 0 ? 25 : -25) * walk);
      b.updateMatrixWorld(true);
    }
    for (const [i, b] of rig.calves.entries()) {
      if (!b) continue;
      nativeRotation(b, restMap.get(b), actorRoot, AXIS_X,
        Math.max(0, -stride * (i === 0 ? 1 : -1)) * 18 * walk);
    }
    model.root.updateMatrixWorld(true);
  }
}
