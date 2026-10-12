import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// First-person-only rig. Palms/fingers and the weapon are children of the
// same transform: inspect/recoil/knife slashes cannot detach the weapon.
export const WEAPON_DEFAULTS = Object.freeze({
  pistol: { x: 0.12, y: -0.005, z: -0.05, rx: -4, ry: -55, rz: 0, scale: 0.88 },
  rifle:  { x: 0, y: 0.025, z: -0.10, rx: 0, ry: 0, rz: 0, scale: 0.86 },
  knife:  { x: 0.28, y: -0.075, z: -0.08, rx: 0, ry: 90, rz: -10, scale: 0.87 },
});
const WEAPON_LENGTH = { pistol: 0.66, rifle: 1.26, knife: 0.79 };
const LOOK = {
  pistol: { x: 0.32, y: -0.18, z: -1.16, scale: 0.93 },
  rifle: { x: 0.31, y: -0.22, z: -1.24, scale: 0.92 },
  knife: { x: 0.31, y: -0.19, z: -1.15, scale: 0.95 },
};
const mat = (color, roughness = 0.94) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02, flatShading: false });
const glove = mat(0x232a2b), gloveTop = mat(0x333c3e);
const seams = mat(0x121a1b), sleeveCT = mat(0x314a5e), sleeveT = mat(0x555b44);
const cuff = mat(0x1d282d);
const v = a => new THREE.Vector3(...a);

function roundBox(parent, w, h, d, rad, material, position) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rad), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}
function bone(parent, a, b, ra, rb, material, segments = 10) {
  const from = v(a), to = v(b), direction = to.clone().sub(from);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rb, ra, direction.length(), segments), material);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  parent.add(mesh);
  return mesh;
}
function finger(parent, joints, thickness, material, index) {
  for (let part = 0; part < joints.length - 1; part++) {
    const segment = bone(parent, joints[part], joints[part + 1], thickness * (1 - part * 0.11),
      thickness * (0.93 - part * 0.12), material, 9);
    segment.userData.finger = index;
  }
}
// Correctly proportioned flat glove with knuckles and FIVE individual digits.
// This is deliberately NOT a sphere for the hand.
function makePalm(parent, wrist, palmCenter, style = 'grip', side = 1) {
  const hand = new THREE.Group(); parent.add(hand);
  const center = v(palmCenter);
  const at = v(wrist);
  bone(hand, wrist, palmCenter, 0.062, 0.072, cuff);
  const palm = roundBox(hand, 0.133, 0.085, 0.176, 0.027, glove, palmCenter);
  palm.rotation.z = side * 0.12;
  roundBox(hand, 0.115, 0.027, 0.125, 0.012, gloveTop,
    [center.x, center.y + 0.049, center.z - 0.009]);
  // Four curved fingers curl around either a pistol grip or rifle handguard.
  for (let i = 0; i < 4; i++) {
    const offset = (i - 1.5) * 0.031;
    const x = center.x - side * 0.040 + offset * 0.18;
    const z = center.z - 0.057 + offset;
    const spread = style === 'open' ? 0.045 : 0.0;
    finger(hand, [
      [x, center.y - 0.003, z],
      [x - side * (0.040 + spread), center.y - 0.032, z - 0.025],
      [x - side * (0.064 + spread), center.y - 0.059, z + (style === 'open' ? -0.05 : 0.002)],
    ], 0.020 - i * 0.001, glove, i);
  }
  // Thumb wraps from the opposite side; trigger index remains distinct.
  finger(hand, [
    [center.x + side * 0.063, center.y + 0.018, center.z + 0.015],
    [center.x + side * 0.089, center.y - 0.012, center.z - 0.021],
    [center.x + side * 0.055, center.y - 0.045, center.z - 0.059],
  ], 0.026, gloveTop, 4);
  hand.userData.palm = true;
  return hand;
}

function makeArms(root, kind) {
  const group = new THREE.Group(); root.add(group);
  const sleeveParts = [];
  const right = new THREE.Group(); group.add(right);
  let grip = kind === 'rifle' ? [0.085, -0.17, 0.155] :
    kind === 'knife' ? [0.066, -0.125, 0.105] : [0.080, -0.163, 0.107];
  sleeveParts.push(bone(right, [0.43, -0.53, 0.30], [0.25, -0.33, 0.30],
    0.106, 0.096, sleeveCT));
  sleeveParts.push(bone(right, [0.25, -0.33, 0.30], [0.125, -0.205, 0.21],
    0.096, 0.076, sleeveCT));
  roundBox(right, 0.125, 0.077, 0.085, 0.016, cuff, [0.125, -0.206, 0.213]);
  makePalm(right, [0.125, -0.205, 0.21], grip, 'grip', 1);
  const left = new THREE.Group(); group.add(left);
  const support = kind === 'rifle' ? [-0.107, -0.115, -0.370]
    : kind === 'knife' ? [-0.235, -0.225, -0.14] : [-0.058, -0.173, 0.007];
  sleeveParts.push(bone(left, [-0.43, -0.54, 0.31], [-0.29, -0.34, 0.23],
    0.106, 0.096, sleeveCT));
  sleeveParts.push(bone(left, [-0.29, -0.34, 0.23], [support[0] - 0.032, support[1] - 0.04, support[2] + 0.12],
    0.096, 0.076, sleeveCT));
  makePalm(left, [support[0] - 0.032, support[1] - 0.04, support[2] + 0.12],
    support, kind === 'knife' ? 'open' : 'grip', -1);
  return { group, left, right, sleeveParts };
}

function smallFallback(kind) {
  // Clean, functional placeholder until the GLB loads; never stack it under the GLB.
  const root = new THREE.Group();
  const metal = mat(0x292d30), black = mat(0x151a1c), wood = mat(0x68482c);
  if (kind === 'pistol') {
    roundBox(root, 0.145, 0.12, 0.42, 0.015, metal, [0, 0.035, -0.12]);
    roundBox(root, 0.116, 0.22, 0.115, 0.012, black, [0.01, -0.145, 0.065]);
  } else if (kind === 'rifle') {
    roundBox(root, 0.115, 0.12, 0.85, 0.014, metal, [0, 0.02, -0.26]);
    roundBox(root, 0.13, 0.135, 0.32, 0.012, wood, [0, -0.015, -0.4]);
    roundBox(root, 0.11, 0.17, 0.35, 0.012, wood, [0, -0.04, 0.21]);
    roundBox(root, 0.08, 0.23, 0.10, 0.008, black, [0, -0.14, 0.1]);
  } else {
    roundBox(root, 0.095, 0.11, 0.25, 0.01, black, [0, -0.12, 0.15]);
    const blade = roundBox(root, 0.068, 0.035, 0.53, 0.012, mat(0x9ca9af, 0.38), [0, -0.038, -0.22]);
    blade.rotation.z = -0.04;
  }
  return root;
}
// Coarse orientation for third-party weapon meshes. Rifle usually points along
// +X, but pistol models also come with the barrel along +Y (the old vertical bug).
export function weaponAxisRotation(bounds) {
  const size = bounds.getSize(new THREE.Vector3());
  if (size.x >= size.y && size.x >= size.z) return { x: 0, y: Math.PI / 2, z: 0 };
  if (size.y >= size.x && size.y >= size.z) return { x: -Math.PI / 2, y: 0, z: 0 };
  return { x: 0, y: Math.PI, z: 0 };
}
function normalizeWeapon(source, kind) {
  const mesh = source.clone(true);
  const native = new THREE.Box3().setFromObject(mesh);
  const rot = weaponAxisRotation(native);
  mesh.rotation.set(rot.x, rot.y, rot.z);
  mesh.updateMatrixWorld(true);
  const rotated = new THREE.Box3().setFromObject(mesh);
  const length = Math.max(0.0001, ...rotated.getSize(new THREE.Vector3()).toArray());
  mesh.scale.multiplyScalar(WEAPON_LENGTH[kind] / length);
  mesh.updateMatrixWorld(true);
  const sized = new THREE.Box3().setFromObject(mesh);
  const center = sized.getCenter(new THREE.Vector3());
  // Weapon midpoint is around the receiver/guard, with muzzle facing -Z.
  mesh.position.sub(center);
  mesh.updateMatrixWorld(true);
  return mesh;
}
export function createWeaponView(kind) {
  if (!WEAPON_DEFAULTS[kind]) throw new Error('Unknown weapon: ' + kind);
  const root = new THREE.Group();
  const modelMount = new THREE.Group();
  root.add(modelMount);
  let model = smallFallback(kind);
  modelMount.add(model);
  const arms = makeArms(root, kind);
  const muzzle = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 7),
    new THREE.MeshBasicMaterial({ color: 0xffdc86, transparent: true, opacity: 0.9 }));
  muzzle.rotation.x = -Math.PI / 2;
  muzzle.position.set(0, 0.03, kind === 'rifle' ? -0.79 : -0.46);
  muzzle.visible = false; root.add(muzzle);
  const profile = LOOK[kind];
  root.scale.setScalar(profile.scale);
  const data = { ...WEAPON_DEFAULTS[kind] };
  function calibrate(next) {
    for (const key of Object.keys(data)) {
      if (typeof next[key] === 'number' && Number.isFinite(next[key]))
        data[key] = Math.min(key === 'scale' ? 2.5 : 180, Math.max(key === 'scale' ? 0.35 : -180, next[key]));
    }
    modelMount.position.set(data.x, data.y, data.z);
    modelMount.rotation.set(data.rx * Math.PI / 180, data.ry * Math.PI / 180, data.rz * Math.PI / 180);
    modelMount.scale.setScalar(data.scale);
    return { ...data };
  }
  calibrate({});
  return {
    kind, root, muzzle, arms, modelMount,
    get calibration() { return { ...data }; },
    setModel(source) {
      if (model) modelMount.remove(model);
      model = source ? normalizeWeapon(source, kind) : smallFallback(kind);
      modelMount.add(model);
    },
    calibrate,
    setTeam(team) {
      for (const segment of arms.sleeveParts) segment.material =
        team === 't' ? sleeveT : sleeveCT;
    },
    animate({ time = 0, right = 0.27, moving = false, recoil = 0,
      inspectTime = -10, reloadProgress = -1, slashTime = -10, firing = false }) {
      const inspect = inspectTime >= 0 && inspectTime < 2
        ? Math.sin(Math.PI * inspectTime / 2) : 0;
      const reload = reloadProgress >= 0 && reloadProgress <= 1
        ? Math.sin(Math.PI * reloadProgress) : 0;
      const slash = slashTime >= 0 && slashTime < 0.38
        ? Math.sin(Math.PI * slashTime / 0.38) : 0;
      const bob = moving ? Math.sin(time * 0.008) * 0.009 : 0;
      root.position.set(right + (profile.x - 0.27) + bob - inspect * 0.10,
        profile.y - Math.abs(bob) - reload * 0.16 + inspect * 0.095,
        profile.z + recoil * 0.52 + inspect * 0.085);
      // All children — BOTH hands and the weapon — rotate about this root.
      root.rotation.set(recoil * 1.0 - reload * 0.55 + (kind === 'knife' ? slash * -0.65 : 0),
        0.09 + inspect * (kind === 'knife' ? 1.55 : 1.18) + (kind === 'knife' ? slash * 0.82 : 0),
        -reload * 0.32 + inspect * 0.39 + (kind === 'knife' ? slash * -0.52 : 0));
      arms.left.position.set(-reload * 0.055,
        -reload * (kind === 'rifle' ? 0.15 : 0.11),
        reload * (kind === 'rifle' ? 0.16 : 0.08));
      arms.left.rotation.x = reload * (kind === 'rifle' ? -0.55 : -0.30);
      arms.left.rotation.z = -reload * 0.18;
      muzzle.visible = kind !== 'knife' && firing;
    },
  };
}
