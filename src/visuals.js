import * as THREE from 'three';

// Small articulated operator meshes replace the unrigged T-pose geometry.
// Every limb has its own pivot, so movement never stretches mesh triangles.
const mat = color => new THREE.MeshLambertMaterial({ color, flatShading: true });
const cube = (parent, size, pos, color) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat(color));
  mesh.position.set(...pos); parent.add(mesh); return mesh;
};
const sphere = (parent, radii, pos, color) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat(color));
  mesh.scale.set(...radii); mesh.position.set(...pos); parent.add(mesh); return mesh;
};
const limb = (parent, a, b, r1, r2, color, sides = 9) => {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, start.distanceTo(end), sides), mat(color));
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
  parent.add(mesh); return mesh;
};

export function createSoldier(team) {
  const root = new THREE.Group(), ct = team === 'ct';
  const cloth = ct ? 0x304b6c : 0x66654a, pants = ct ? 0x26354b : 0x504638;
  const vest = ct ? 0x202d3c : 0x383e36, gear = ct ? 0x151f28 : 0x302f28;
  const skin = ct ? 0xb99478 : 0xba906e;
  cube(root, [0.65, 0.65, 0.36], [0, 1.15, 0], cloth);
  cube(root, [0.57, 0.48, 0.41], [0, 1.16, -0.04], vest);
  cube(root, [0.51, 0.18, 0.39], [0, 0.79, 0], pants);
  for (const side of [-1, 1]) {
    cube(root, [0.14, 0.22, 0.09], [side * 0.16, 1.10, -0.26], gear);
    cube(root, [0.16, 0.17, 0.07], [side * 0.18, 0.88, -0.25], gear);
    cube(root, [0.075, 0.32, 0.05], [side * 0.26, 1.21, -0.265], gear);
  }
  cube(root, [0.5, 0.11, 0.38], [0, 0.75, 0], gear);
  sphere(root, [0.225, 0.27, 0.21], [0, 1.72, 0], skin);
  if (ct) {
    sphere(root, [0.24, 0.235, 0.225], [0, 1.78, 0], 0x232b36);
    cube(root, [0.37, 0.09, 0.065], [0, 1.80, -0.222], 0x18232b);
    cube(root, [0.29, 0.05, 0.078], [0, 1.81, -0.235], 0x64788a);
    cube(root, [0.31, 0.08, 0.13], [0, 1.60, -0.16], 0x171e25);
  } else {
    sphere(root, [0.225, 0.105, 0.212], [0, 1.94, 0.015], 0x35291c);
    cube(root, [0.35, 0.07, 0.045], [0, 1.78, -0.22], 0x222425);
    for (const s of [-1, 1]) cube(root, [0.11, 0.051, 0.03], [s * 0.105, 1.78, -0.244], 0x6e7775);
    cube(root, [0.18, 0.025, 0.044], [0, 1.59, -0.214], 0x5c3e2c);
  }
  const legs = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.17, 0.75, 0); root.add(pivot);
    limb(pivot, [0, 0, 0], [0, -0.40, 0], 0.15, 0.13, pants);
    sphere(pivot, [0.142, 0.12, 0.14], [0, -0.40, 0], cloth);
    limb(pivot, [0, -0.4, 0], [0, -0.64, 0.02], 0.12, 0.09, pants);
    cube(pivot, [0.22, 0.13, 0.33], [0, -0.69, -0.078], gear);
    return pivot;
  });
  const arms = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.37, 1.39, 0); root.add(pivot);
    sphere(pivot, [0.17, 0.18, 0.17], [0, -0.06, 0], cloth);
    limb(pivot, [0, -0.05, 0], [-side * 0.05, -0.26, -0.21], 0.143, 0.115, cloth);
    limb(pivot, [-side * 0.05, -0.26, -0.21], [-side * 0.21, -0.25, -0.50], 0.11, 0.08, pants);
    sphere(pivot, [0.105, 0.075, 0.125], [-side * 0.21, -0.25, -0.53], gear);
    return pivot;
  });
  return { root, legs, arms };
}

function fingers(group, color) {
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * 0.032;
    limb(group, [x, -0.01, -0.053], [x, -0.045, -0.106], 0.019, 0.012, color, 6);
  }
  limb(group, [-0.067, -0.005, -0.005], [-0.073, -0.051, -0.056], 0.025, 0.017, color, 6);
}

export function createViewArms(group, kind) {
  const sleeve = 0x314b60, gloves = 0x252c2b, seams = 0x182329;
  const hands = new THREE.Group(); group.add(hands);
  const right = new THREE.Group(); hands.add(right);
  limb(right, [0.42, -0.50, 0.60], [0.22, -0.31, 0.33], 0.15, 0.11, sleeve);
  limb(right, [0.22, -0.31, 0.33], [0.045, -0.15, 0.09], 0.11, 0.078, sleeve);
  sphere(right, [0.098, 0.09, 0.13], [0.043, -0.16, 0.06], gloves);
  const rFingers = new THREE.Group(); rFingers.position.set(0.033, -0.16, 0.03);
  right.add(rFingers); fingers(rFingers, gloves);
  let support = null;
  if (kind !== 'knife') {
    support = new THREE.Group(); hands.add(support);
    const wrist = kind === 'rifle' ? [-0.15, -0.11, -0.36] : [-0.04, -0.19, -0.05];
    limb(support, [-0.39, -0.48, 0.56], [-0.25, -0.31, 0.24], 0.15, 0.11, sleeve);
    limb(support, [-0.25, -0.31, 0.24], wrist, 0.11, 0.076, sleeve);
    sphere(support, [0.105, 0.081, 0.12], wrist, gloves);
    const f = new THREE.Group(); f.position.set(wrist[0], wrist[1], wrist[2] - 0.03);
    support.add(f); fingers(f, seams);
  }
  return { hands, support };
}
