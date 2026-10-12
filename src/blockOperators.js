import * as THREE from 'three';

// Lightweight original Block Strike-inspired operators: all geometry is made
// in code, with no character GLB downloads or fragile imported skeletons.
const palettes = {
  ct: { uniform: 0x344e6b, shadow: 0x25374d, armor: 0x26313d,
    accent: 0x627b90, trim: 0x111d29, skin: 0xb7896a, visor: 0x121b24 },
  t: { uniform: 0x807451, shadow: 0x5c563e, armor: 0x4b4534,
    accent: 0xa69566, trim: 0x30291e, skin: 0xc08a63, visor: 0x2a241e }
};
const material = color => new THREE.MeshLambertMaterial({ color });
function cube(parent, mat, w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}
function limb(root, mat, shadow, sign, upper, lower, size, isArm) {
  const pivot = new THREE.Group();
  pivot.position.set(sign * (isArm ? 0.39 : 0.17), isArm ? 1.42 : 0.91, 0);
  root.add(pivot);
  cube(pivot, mat, ...size, 0, -upper / 2, 0);
  const joint = new THREE.Group();
  joint.position.y = -upper; pivot.add(joint);
  cube(joint, shadow, size[0] * 0.86, lower, size[2] * 0.9, 0, -lower / 2, 0);
  if (isArm) {
    cube(joint, shadow, 0.20, 0.13, 0.20, 0, -lower + 0.005, -0.025);
    cube(pivot, shadow, 0.30, 0.14, 0.31, 0, -0.055, 0);
  } else {
    cube(joint, shadow, 0.24, 0.14, 0.38, 0, -lower + 0.035, -0.075);
    cube(pivot, shadow, 0.25, 0.10, 0.25, 0, -upper + 0.015, 0);
  }
  return { pivot, joint };
}
export function buildBlockOperator(team) {
  if (!palettes[team]) throw new Error('Unknown team: ' + team);
  const c = palettes[team], m = Object.fromEntries(
    Object.entries(c).map(([key, value]) => [key, material(value)]));
  const root = new THREE.Group();
  root.name = team === 'ct' ? 'GameBlock спецназ' : 'GameBlock террорист';
  // Character height 1.83 m; +Z is the back, -Z faces the player.
  cube(root, m.uniform, 0.72, 0.66, 0.36, 0, 1.25, 0);
  cube(root, m.shadow, 0.58, 0.24, 0.34, 0, 0.91, 0);
  cube(root, m.armor, 0.77, 0.44, 0.16, 0, 1.28, -0.22);
  cube(root, m.armor, 0.66, 0.41, 0.16, 0, 1.28, 0.22);
  cube(root, m.trim, 0.73, 0.07, 0.40, 0, 0.98, 0);
  // Vest plates, magazine pouches, straps, radio and backpack.
  cube(root, m.accent, 0.37, 0.15, 0.045, 0, 1.40, -0.316);
  for (let i = -1; i <= 1; i++) {
    cube(root, m.shadow, 0.15, 0.19, 0.105, i * 0.19, 1.15, -0.325);
    cube(root, m.accent, 0.10, 0.025, 0.115, i * 0.19, 1.235, -0.335);
  }
  for (const x of [-0.28, 0.28]) cube(root, m.trim, 0.085, 0.54, 0.05, x, 1.34, -0.308);
  cube(root, m.shadow, 0.56, 0.42, 0.23, 0, 1.30, 0.33);
  cube(root, m.accent, 0.45, 0.06, 0.25, 0, 1.43, 0.35);
  cube(root, m.trim, 0.10, 0.22, 0.10, 0.39, 1.40, 0.15);
  // Face, helmet/headwear and distinct CT mask vs T scarf.
  const head = new THREE.Group(); head.position.y = 1.66; root.add(head);
  cube(head, m.skin, 0.38, 0.34, 0.35, 0, 0, 0);
  if (team === 'ct') {
    cube(head, m.armor, 0.48, 0.20, 0.44, 0, 0.16, 0);
    cube(head, m.armor, 0.52, 0.07, 0.48, 0, 0.075, -0.055);
    cube(head, m.visor, 0.40, 0.105, 0.045, 0, 0.025, -0.196);
    cube(head, m.shadow, 0.41, 0.15, 0.08, 0, -0.105, -0.175);
    for (const sign of [-1, 1]) cube(head, m.armor, 0.095, 0.18, 0.35, sign * 0.22, -0.025, 0);
  } else {
    cube(head, m.accent, 0.45, 0.15, 0.42, 0, 0.16, 0);
    cube(head, m.accent, 0.49, 0.045, 0.18, 0, 0.095, -0.23);
    cube(head, m.shadow, 0.42, 0.14, 0.065, 0, -0.12, -0.178);
    for (const sign of [-1, 1]) cube(head, m.visor, 0.055, 0.03, 0.015, sign * 0.09, 0.02, -0.183);
  }
  const arms = [
    limb(root, m.uniform, m.shadow, 1, 0.31, 0.31, [0.27, 0.31, 0.30], true),
    limb(root, m.uniform, m.shadow, -1, 0.31, 0.31, [0.27, 0.31, 0.30], true)
  ];
  const legs = [
    limb(root, m.uniform, m.shadow, 1, 0.43, 0.43, [0.30, 0.43, 0.32], false),
    limb(root, m.uniform, m.shadow, -1, 0.43, 0.43, [0.30, 0.43, 0.32], false)
  ];
  // Low-poly rifle is attached to the hands and always available, even if
  // first-person weapon GLBs are still downloading.
  const gun = new THREE.Group(); gun.position.set(0.03, 1.22, -0.49);
  cube(gun, m.trim, 0.16, 0.15, 0.57, 0, 0, 0);
  cube(gun, m.trim, 0.075, 0.08, 0.36, 0, 0.045, -0.43);
  cube(gun, m.shadow, 0.14, 0.23, 0.14, 0, -0.16, -0.07);
  cube(gun, m.accent, 0.12, 0.14, 0.27, 0, 0.015, 0.26);
  root.add(gun);
  const model = { root, mode: 'block', arms, legs, head, gun };
  animateBlockOperator(model, {lastShotAt: -100}, 0, 0, 0);
  return model;
}
export function animateBlockOperator(model, actor, time, _dt, movement) {
  const speed = Math.min(1, Math.max(0, movement / 3.2));
  const phase = time * 9.0;
  const fire = actor.lastShotAt != null && time - actor.lastShotAt < 0.16;
  for (let i = 0; i < 2; i++) {
    const sign = i === 0 ? 1 : -1;
    const arm = model.arms[i];
    arm.pivot.rotation.set(-0.70 + Math.sin(phase) * speed * 0.09, 0, sign * 0.26);
    arm.joint.rotation.x = -0.90 + (fire ? -0.10 : 0);
    const leg = model.legs[i];
    leg.pivot.rotation.x = Math.sin(phase) * speed * sign * 0.42;
    leg.joint.rotation.x = Math.max(0, -Math.sin(phase) * sign) * speed * 0.28;
  }
  model.head.rotation.y = Math.sin(time * 0.8) * 0.025;
  model.gun.rotation.x = fire ? 0.07 : 0;
}
