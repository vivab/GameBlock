import * as THREE from 'three';
// The glove mesh, three-joint fingers, and four finger poses below are ported
// directly from vivab/Game1/hands.js, not approximations from the old
// GameBlock sphere hands. The arm segment uses team-coloured sleeves.
const DEG=Math.PI/180, V=THREE.Vector3;
const mat=(c,r=0.7)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
const SKIN=mat(0xe8a98a,0.65),GLOVE=mat(0x3b3f46),CUFF=mat(0x2a2d32),PAD=mat(0x555a63);
const SLEEVE_CT=mat(0x344c66),SLEEVE_T=mat(0x666047);
  const POSES = {
    fist:   { f: [[-75, -85, -60], [-80, -90, -65], [-80, -90, -65], [-75, -85, -60]], th: [-30, -35] },
    pistol: { f: [[-25, -30, -15], [-80, -90, -65], [-80, -90, -65], [-75, -85, -60]], th: [-20, -25] },
    cup:    { f: [[-45, -60, -40], [-55, -65, -45], [-60, -65, -45], [-60, -60, -40]], th: [-10, -15] },
    open:   { f: [[-15, -20, -10], [-20, -25, -12], [-22, -28, -14], [-25, -30, -15]], th: [-5, -10], sp: [0.15, 0.05, -0.08, -0.2] }
  };
  function chain(x, y, z, lens, t, curls, yaw, k, mats, digit) {
    const root = new THREE.Group();
    root.position.set(x, y, z); root.rotation.order = 'YXZ'; root.rotation.y = yaw;
    let parent = root;
    lens.forEach((len, i) => {
      const j = new THREE.Group();
      j.rotation.x = curls[i] * k * DEG;
      if (i) j.position.z = -lens[i - 1];
      const m = new THREE.Mesh(new THREE.BoxGeometry(t, t, len * 0.96), mats[i]);
      m.position.z = -len / 2; m.userData.finger = digit; m.userData.segment = i; j.add(m); parent.add(j); parent = j;
    });
    return root;
  }
  // Рука в перчатке без кончиков пальцев: ладонь в нуле, пальцы вперёд (−z), предплечье назад (+z)
  export function makeHand(side, pose, u, k = 1, team = 'ct') {
    const sx = side === 'R' ? -1 : 1, P = POSES[pose], g = new THREE.Group();
    if (!P) throw new Error('Unknown Game1 finger pose: ' + pose);
    g.rotation.order = 'YXZ';
    const hand = new THREE.Group(), arm = new THREE.Group();            // кисть и предплечье двигаются отдельно (осмотр ножа)
    hand.matrixAutoUpdate = arm.matrixAutoUpdate = false; g.add(hand); g.add(arm);
    g.userData.hand = hand; g.userData.arm = arm; g.userData.wr = new V(0, 0, 0.5 * u); g.userData.el = new V(0, 0, 7 * u);   // запястье и локоть (в системе руки)
    hand.add(new THREE.Mesh(new THREE.BoxGeometry(0.95 * u, 0.38 * u, 1.05 * u), GLOVE));
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.7 * u, 0.12 * u, 0.6 * u), PAD);
    pad.position.set(0, 0.22 * u, -0.1 * u); hand.add(pad);
    const lens = [[0.5, 0.35, 0.28], [0.55, 0.4, 0.3], [0.5, 0.37, 0.28], [0.4, 0.28, 0.24]];
    for (let i = 0; i < 4; i++) hand.add(chain(sx * (0.33 - i * 0.22) * u, 0, -0.52 * u, lens[i].map(v => v * u), 0.2 * u, P.f[i], P.sp ? -sx * P.sp[i] : 0, k, [GLOVE, GLOVE, SKIN], i));
    hand.add(chain(sx * 0.5 * u, -0.02 * u, 0.2 * u, [0.55 * u, 0.42 * u], 0.24 * u, P.th, -sx * 0.5, k, [GLOVE, SKIN], 4));
    const part = (a, b, w, h, m) => { const p = new THREE.Mesh(new THREE.BoxGeometry(w * u, h * u, (b - a) * u), m); p.position.z = (a + b) / 2 * u; arm.add(p); };
    part(0.5, 1.5, 0.95, 0.62, CUFF); part(1.5, 7, 0.85, 0.75, team === 't' ? SLEEVE_T : SLEEVE_CT);
    g.userData.pose = pose;
    g.userData.side = side;
    return g;
  }

