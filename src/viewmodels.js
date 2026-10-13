import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { makeHand } from './game1Hands.js';
import { KF, DRAW, FROM, KICK, sample } from './game1Motion.js';

// Game1 hand rig and animation mechanics adapted for GameBlock's existing
// Glock18, AK47 and CT/T knife .glb files. Nothing from Game1's map is used.
// Game1 geometry, scaled for GameBlock's narrower (58°) first-person FOV.
const DEG = Math.PI / 180, U = 0.105;
export const WEAPON_DEFAULTS = Object.freeze({
  pistol: { x: 0.01, y: -0.14, z: 0.03, rx: -5, ry: 180, rz: 0, scale: 0.94 },
  rifle:  { x: 0.09, y: -0.29, z: 0.12, rx: 1, ry: 0, rz: 0, scale: 1.87 },
  knife:  { x: -0.25, y: -0.02, z: 0.07, rx: -13, ry: -83, rz: 77, scale: 0.84 },
});
const PROFILE = {
  pistol: { ndcX: 0.27, sy: -0.085, sz: -0.73, length: 0.48 },
  rifle:  { ndcX: 0.21, sy: -0.09, sz: -0.95, length: 1.18 },
  knife:  { ndcX: 0.43, sy: -0.17, sz: -0.62, length: 0.64 },
};
// Game1's separate, finger-specific hand poses/angles adapted to the
// trigger, front grip and knife handle of GameBlock's existing weapon GLBs.
export const HAND_DEFAULTS = Object.freeze({
  pistol: {
    R: { pose: 'pistol', x: -0.05, y: -0.85, z: 0.55, pitch: 29, yaw: -28, roll: -66, k: 1.3 },
    L: { pose: 'fist', x: -0.05, y: -0.25, z: -0.5, pitch: 20, yaw: -10, roll: 85, k: 0.55 },
  },
  rifle: {
    R: { pose: 'pistol', x: 1.7, y: -2.9, z: 0, pitch: 15, yaw: 10, roll: -85, k: 1 },
    L: { pose: 'cup', x: 1.05, y: -2.05, z: -0.5, pitch: 4, yaw: -18, roll: 150, k: 1 },
  },
  knife: {
    R: { pose: 'fist', x: 1.35, y: -0.4, z: -0.95, pitch: 26, yaw: 17, roll: -22, k: 0.75 },
    L: { pose: 'open', x: -4.8, y: 1.5, z: -0.5, pitch: 25, yaw: -20, roll: 0, k: 1 },
  },
});
const ANCHORS = {
  pistol: { R: [0.065, -0.105, 0.135], L: [-0.05, -0.17, 0.17] },
  rifle: { R: [-0.035, 0.025, 0.38], L: [-0.10, 0.06, 0.02] },
  knife: { R: [-0.235, 0.005, 0.155], L: [-0.12, -0.19, 0.22] },
};
const matte = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
function fallbackModel(kind) {
  const g = new THREE.Group();
  const block = (w,h,d,x,y,z,mat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    mesh.position.set(x,y,z);g.add(mesh);
  };
  const black = matte(0x292f34), steel = matte(0x737f89), wood = matte(0x665032);
  if (kind === 'pistol') {
    block(0.135,0.12,0.36,0,0.045,-0.115,black);
    block(0.10,0.22,0.10,0,-0.12,0.09,black);
  } else if (kind === 'rifle') {
    block(0.1,0.10,0.84,0,0.035,-0.28,black);
    block(0.15,0.12,0.32,0,0.01,-0.22,wood);
    block(0.13,0.14,0.35,0,-0.025,0.24,wood);
    block(0.075,0.23,0.10,0,-0.14,0.03,black);
  } else {
    block(0.09,0.10,0.23,0,-0.06,0.17,wood);
    block(0.07,0.025,0.46,0,0,-0.185,steel);
  }
  return g;
}
export function weaponAxisRotation(bounds) {
  const v = bounds.getSize(new THREE.Vector3());
  if (v.x >= v.y && v.x >= v.z) return { x: 0, y: Math.PI/2, z: 0 };
  if (v.y >= v.x && v.y >= v.z) return { x: -Math.PI/2, y: 0, z: 0 };
  return { x: 0, y: Math.PI, z: 0 };
}
function normalizeWeapon(gltfScene, kind) {
  const model = gltfScene.clone(true);
  model.updateMatrixWorld(true);
  const rotation = weaponAxisRotation(new THREE.Box3().setFromObject(model));
  model.rotation.set(rotation.x,rotation.y,rotation.z);
  model.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  const scale = PROFILE[kind].length / Math.max(0.001,size.z);
  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const centre = bounds.getCenter(new THREE.Vector3());
  model.position.sub(centre);
  return model;
}

const handClone = kind => JSON.parse(JSON.stringify(HAND_DEFAULTS[kind]));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export function createWeaponView(kind) {
  if (!WEAPON_DEFAULTS[kind]) throw new Error('Unsupported viewmodel: '+kind);
  const root = new THREE.Group(), animated = new THREE.Group();
  root.add(animated);
  const modelMount = new THREE.Group();
  // Unlike the old inspect animation, wrist inspection never moves/rotates
  // the long Game1 sleeve. A wrist-only pivot owns the palm AND blade.
  const knifeWrist = kind === 'knife' ? new THREE.Group() : null;
  const knifeRest = kind === 'knife' ? new THREE.Group() : null;
  if (knifeWrist) {
    knifeRest.matrixAutoUpdate = false;
    knifeWrist.add(knifeRest);
    knifeRest.add(modelMount);
  } else animated.add(modelMount);
  const staticHolder = new THREE.Group(); root.add(staticHolder);
  const handGroup = new THREE.Group(); animated.add(handGroup);
  const importedHandsMount = new THREE.Group(); animated.add(importedHandsMount);
  importedHandsMount.visible = false;
  let importedHands = null, importedBones = null, importedRest = null;
  const arms = { group: handGroup, left: new THREE.Group(), right: new THREE.Group() };
  handGroup.add(arms.right);
  (kind === 'knife' ? staticHolder : handGroup).add(arms.left);
  const mounts = { ...WEAPON_DEFAULTS[kind] };
  const poses = handClone(kind);
  const sourceAnchor = ANCHORS[kind];
  let loaded = fallbackModel(kind);
  modelMount.add(loaded);
  let team = 'ct', drawStarted = 0;

  const muzzle = new THREE.Mesh(new THREE.ConeGeometry(0.035,0.13,6),
    new THREE.MeshBasicMaterial({color:0xffd98b,transparent:true,opacity:0.95,depthWrite:false}));
  muzzle.rotation.x = -Math.PI/2;
  muzzle.position.set(0,0.06,-PROFILE[kind].length*0.52);
  muzzle.visible = false;
  animated.add(muzzle);
  function updateMount() {
    modelMount.position.set(mounts.x,mounts.y,mounts.z);
    modelMount.rotation.set(mounts.rx*DEG,mounts.ry*DEG,mounts.rz*DEG,'YXZ');
    modelMount.scale.setScalar(mounts.scale);
  }
  function updateHand(side, rebuild=false) {
    const anchor=sourceAnchor[side], cfg=poses[side], holder=side==='R'?arms.right:arms.left;
    if (rebuild || !holder.userData.mesh) {
      if (holder.userData.mesh) holder.remove(holder.userData.mesh);
      const mesh=makeHand(side,cfg.pose,U,cfg.k,team);
      holder.add(mesh);holder.userData.mesh=mesh;
      if (knifeWrist && side === 'R') {
        // Rebuild only the glove; the fixed shoulder remains with the mesh.
        // The exact same wrist pivot owns the knife and the palm.
        const palm = mesh.userData.hand;
        knifeWrist.add(palm);
        mesh.add(knifeWrist);
      }
    }
    holder.position.set(anchor[0]+cfg.x*U,anchor[1]+cfg.y*U,anchor[2]+cfg.z*U);
    holder.rotation.set(cfg.pitch*DEG,cfg.yaw*DEG,cfg.roll*DEG,'YXZ');
    holder.userData.base = holder.position.clone();
    if (knifeRest && side === 'R') {
      // Neutral pose must match the approved calibration exactly. The inverse
      // of the hand's mount transform cancels any parent offset/rotation.
      holder.updateMatrix();
      knifeRest.matrix.copy(holder.matrix).invert();
      knifeRest.matrixWorldNeedsUpdate = true;
    }
  }
  updateMount();
  updateHand('R',true); updateHand('L',true);

  // The knife blade lives under the legacy wrist pivot. Hide only the
  // procedural glove polygons, never their child weapon model.
  function showKnifeProceduralGlove(show) {
    if (kind !== 'knife') return;
    const rig = arms.right.userData.mesh;
    rig?.traverse(node => {
      if (!node.isMesh) return;
      let ancestor = node;
      while (ancestor && ancestor !== rig) {
        if (ancestor === modelMount) return;
        ancestor = ancestor.parent;
      }
      node.visible = show;
    });
  }
  let kick=0,lastNow=null;
  const view = {
    kind, root, animated, arms, modelMount, muzzle, knifeWrist, importedHandsMount,
    get usesImportedHands() { return !!importedHands; },
    setHands(gltfScene) {
      if (importedHands) importedHandsMount.remove(importedHands);
      importedHands = null; importedBones = importedRest = null;
      if (!gltfScene) {
        importedHandsMount.visible = false;
        handGroup.visible = true; staticHolder.visible = true;
        showKnifeProceduralGlove(true);
        return false;
      }
      const model = cloneSkinned(gltfScene);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      if (!Number.isFinite(size.x) || Math.max(size.x, size.y, size.z) < 0.001) return false;
      // Keep the original Source hand skeleton intact. Position/scale its
      // entire rig, not the SkinnedMesh, so the skin bind matrices remain valid.
      const factor = 0.82 / Math.max(size.x, size.z, 0.001);
      model.scale.setScalar(factor);
      const middle = bounds.getCenter(new THREE.Vector3());
      model.position.set(-middle.x * factor, -middle.y * factor, -middle.z * factor);
      importedHandsMount.position.set(kind === 'rifle' ? 0 : -0.035, -0.28, 0.11);
      importedHandsMount.rotation.set(-0.15, 0, 0);
      importedHandsMount.add(model);
      importedHands = model;
      importedHandsMount.visible = true;
      handGroup.visible = kind === 'knife'; // preserve the knife wrist/model
      staticHolder.visible = false;
      showKnifeProceduralGlove(false);
      importedBones = { left: null, right: null };
      model.traverse(object => {
        if (!object.isBone) return;
        if (/Left_Arm_/i.test(object.name)) importedBones.left = object;
        if (/Right_Arm_/i.test(object.name)) importedBones.right = object;
      });
      importedRest = Object.fromEntries(Object.entries(importedBones)
        .map(([side, bone]) => [side, bone?.quaternion.clone() || null]));
      return true;
    },
    get calibration() { return {...mounts}; },
    get handCalibration() { return JSON.parse(JSON.stringify(poses)); },
    setModel(gltfScene) {
      modelMount.remove(loaded);
      loaded=gltfScene ? normalizeWeapon(gltfScene,kind) : fallbackModel(kind);
      modelMount.add(loaded);
    },
    setTeam(side) {
      if (team===side)return;
      team=side;
      updateHand('R',true); updateHand('L',true);
      if (importedHands) showKnifeProceduralGlove(false);
    },
    calibrate(config={}) {
      for(const k of ['x','y','z','rx','ry','rz','scale']){
        if (typeof config[k]!=='number'||!Number.isFinite(config[k]))continue;
        mounts[k]=clamp(config[k],k==='scale'?0.35:k[0]==='r'?-180:-1.1,
          k==='scale'?2.5:k[0]==='r'?180:1.1);
      }
      updateMount();return {...mounts};
    },
    calibrateHand(side,config={}) {
      if(!poses[side])throw Error('Unknown hand: '+side);
      const current=poses[side];
      let rebuild=false;
      if(['fist','pistol','cup','open'].includes(config.pose) && config.pose!==current.pose){
        current.pose=config.pose;rebuild=true;
      }
      for(const key of ['x','y','z','pitch','yaw','roll','k']){
        if(typeof config[key]!=='number'||!Number.isFinite(config[key]))continue;
        const min=key==='k'?0.25:['x','y','z'].includes(key)?-8:-180;
        const max=key==='k'?1.8:['x','y','z'].includes(key)?8:180;
        const value=clamp(config[key],min,max);
        if(key==='k' && value!==current.k)rebuild=true;
        current[key]=value;
      }
      updateHand(side,rebuild);
      return {...current};
    },
    draw(time=0){ drawStarted=time; kick=0; },
    fire() { kick=clamp(kick+(kind==='rifle'?0.5:1.0),0,2.2); },
    animate({time=0,right,aspect=1.7,visible=true,inspectTime=-10,reloadProgress=-1,
      slashTime=-10,recoil=0,moving=false,firing=false}={}) {
      const tsec=time/1000;
      const dt=lastNow===null?0.016:clamp((time-lastNow)/1000,0,0.05);
      lastNow=time;
      kick*=Math.exp(-dt*14);
      const ref=PROFILE[kind];
      const xRight=typeof right==='number'?right:ref.ndcX*(-ref.sz)*Math.tan(58*DEG/2)*aspect;
      const sway=moving?Math.sin(time*0.008)*0.004:0;
      root.position.set(xRight+sway,ref.sy-Math.abs(sway),ref.sz);
      root.rotation.set(0,0,0);
      animated.position.set(0,0,0);
      animated.rotation.set(0,0,0,'YXZ');
      let move=[0,0,0,0,0,0,0], kw=null;
      const add=v=>{
        for(let i=0;i<Math.min(7,v?.length||0);i++)move[i]+=v[i]||0;
      };
      const drawElapsed=tsec-drawStarted;
      if(drawElapsed>=0&&drawElapsed<DRAW[kind]){
        const t=1-drawElapsed/DRAW[kind],q=FROM[kind];
        for(let i=0;i<6;i++)move[i]+=q[i]*t*t*(3-2*t);
      }
      if(inspectTime>=0){
        if(kind==='knife')kw=sample(KF.knife,inspectTime);
        else add(sample(KF[kind==='rifle'?'heavy':'pistol'],inspectTime));
      }
      // Source-inspired reload choreography: support hand releases its grip,
      // travels to the magazine, pulls it down, seats a fresh one and returns.
      // Curves are eased to prevent sharp transitions on mobile frame rates.
      const smooth = v => { const t=clamp(v,0,1); return t*t*(3-2*t); };
      const pulse = (p,a,b,c,d) => smooth((p-a)/(b-a))*(1-smooth((p-c)/(d-c)));
      const reloading = kind !== 'knife' && reloadProgress >= 0 && reloadProgress < 1;
      const p = reloading ? reloadProgress : -1;
      const reloadDip = reloading ? pulse(p,0,0.15,0.79,1) : 0;
      const magReach = reloading ? pulse(p,0.08,0.24,0.64,0.82) : 0;
      const magPull = reloading ? pulse(p,0.23,0.34,0.47,0.60) : 0;
      const boltPull = reloading && kind === 'rifle' ? pulse(p,0.76,0.84,0.89,0.98) : 0;
      if(reloading) {
        move[3] -= reloadDip*(kind==='rifle'?0.13:0.20);
        move[4] += reloadDip*(kind==='rifle'?0.12:0.18);
        move[5] += reloadDip*(kind==='rifle'?0.11:0.16);
        move[2] += boltPull*0.055;
      }
      if(kind!=='knife') {
        const k=KICK[kind];
        move[2]+=k[0]*kick+recoil*0.45;
        move[3]+=k[1]*kick+recoil*1.2;
        move[1]+=0.01*kick;
      }
      if(slashTime>=0&&slashTime<0.38&&kind==='knife'){
        const s=Math.sin(Math.PI*slashTime/0.38);
        move[0]-=0.16*s;move[1]-=0.025*s;move[3]+=0.15*s;
        move[4]+=0.85*s;move[5]+=0.42*s;
      }
      if (knifeWrist) {
        if (kw) {
          // CS-style knife check: roll/turn the blade WITH the fingers at the
          // wrist joint. No animated shoulder, elbow or full viewmodel spin.
          // Clamps prevent the blade/hand from cutting across the camera.
          knifeWrist.rotation.set(
            clamp(-kw[2] * 0.40, -0.14, 0.14),
            clamp(kw[4] * 0.42, -0.52, 0.52),
            clamp(kw[3] * 0.43, -0.82, 0.82),
            'YXZ'
          );
          knifeWrist.position.set(0, clamp(kw[1] * 0.12, -0.015, 0.015), 0);
        } else {
          knifeWrist.rotation.set(0, 0, 0);
          knifeWrist.position.set(0, 0, 0);
        }
        // Game1's forearm mesh uses a manual matrix. Keep it IDENTICAL for
        // every inspect frame, including repeats and interruptions.
        const forearm = arms.right.userData.mesh?.userData.arm;
        if (forearm && !forearm.matrix.equals(new THREE.Matrix4())) {
          // Inspect never modifies its matrix; this guard also resets an old
          // pose retained by a previous animation or browser session.
          forearm.matrix.identity();
          forearm.matrixWorldNeedsUpdate = true;
        }
      }
      animated.position.set(move[0],move[1],move[2]);
      root.position.y -= reloadDip * 0.42;
      root.position.z += reloadDip * 0.06;
      animated.rotation.set(move[3],move[4],move[5],'YXZ');
      if(kind==='knife')animated.rotation.z+=move[6];
      const leftBase=arms.left.userData.base;
      if(leftBase){
        arms.left.position.copy(leftBase);
        arms.left.rotation.set(poses.L.pitch*DEG,poses.L.yaw*DEG,poses.L.roll*DEG,'YXZ');
        // Support-hand key poses are relative to the calibrated neutral grip.
        // On pistol reload the free hand comes in from below; on AK it grabs
        // the magazine, pulls down and reaches toward the charging handle.
        if(kind==='rifle') {
          arms.left.position.x += magReach*0.075 + boltPull*0.12;
          arms.left.position.y -= magReach*0.11 + magPull*0.17 - boltPull*0.07;
          arms.left.position.z += magReach*0.17 - boltPull*0.12;
          arms.left.rotation.x += magReach*0.42 - boltPull*0.35;
          arms.left.rotation.z -= magReach*0.34;
        } else if(kind==='pistol') {
          arms.left.position.x += magReach*0.095;
          arms.left.position.y -= magReach*0.16 + magPull*0.10;
          arms.left.position.z -= magReach*0.14;
          arms.left.rotation.x += magReach*0.30;
          arms.left.rotation.z -= magReach*0.35;
        }
      }
      if (importedBones && importedRest) {
        // A small Source-style wrist action; the real model bones animate,
        // rather than only sliding the entire imported hand mesh around.
        const left = importedBones.left, right = importedBones.right;
        if (left && importedRest.left) {
          left.quaternion.copy(importedRest.left);
          left.quaternion.multiply(new THREE.Quaternion().setFromEuler(
            new THREE.Euler(-magReach * 0.45 + boltPull * 0.30, magReach * 0.23, -magPull * 0.25)));
        }
        if (right && importedRest.right) {
          right.quaternion.copy(importedRest.right);
          right.quaternion.multiply(new THREE.Quaternion().setFromEuler(
            new THREE.Euler(kind === 'knife' ? (knifeWrist?.rotation.x || 0) : -reloadDip * 0.10,
              kind === 'knife' ? (knifeWrist?.rotation.y || 0) : 0,
              kind === 'knife' ? (knifeWrist?.rotation.z || 0) : kick * 0.025)));
        }
      }
      muzzle.visible=visible&&kind!=='knife'&&firing;
    }
  };
  return view;
}
