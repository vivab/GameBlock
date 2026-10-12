import * as THREE from 'three';
import { makeHand } from './game1Hands.js';
import { KF, DRAW, FROM, KICK, sample } from './game1Motion.js';

// Game1 hand rig and animation mechanics adapted for GameBlock's existing
// Glock18, AK47 and CT/T knife .glb files. Nothing from Game1's map is used.
const DEG = Math.PI / 180, U = 0.105 * 1.35;
export const WEAPON_DEFAULTS = Object.freeze({
  pistol: { x: 0.01, y: -0.018, z: 0.03, rx: -5, ry: -42, rz: 0, scale: 0.94 },
  rifle:  { x: 0.005, y: 0.015, z: -0.055, rx: 0, ry: 0, rz: 0, scale: 0.80 },
  knife:  { x: 0.005, y: -0.02, z: 0.045, rx: -12, ry: -75, rz: 8, scale: 0.92 },
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
    R: { pose: 'pistol', x: 0.3, y: -0.2, z: 0.55, pitch: 29, yaw: -28, roll: -66, k: 1.3 },
    L: { pose: 'fist', x: -0.45, y: -0.3, z: 0.2, pitch: 20, yaw: -10, roll: 85, k: 0.8 },
  },
  rifle: {
    R: { pose: 'pistol', x: 0.5, y: -1.2, z: 0, pitch: 15, yaw: 10, roll: -85, k: 1 },
    L: { pose: 'cup', x: 0.55, y: -1.0, z: 0.5, pitch: 4, yaw: -18, roll: 150, k: 1 },
  },
  knife: {
    R: { pose: 'fist', x: 0.2, y: 0, z: 0, pitch: 19, yaw: -17, roll: -17, k: 1 },
    L: { pose: 'open', x: -4.2, y: -0.5, z: -0.5, pitch: 25, yaw: -20, roll: 0, k: 1 },
  },
});
const ANCHORS = {
  pistol: { R: [0.065, -0.105, 0.135], L: [-0.05, -0.17, 0.17] },
  rifle: { R: [0.035, -0.045, 0.65], L: [-0.060, 0.005, 0.26] },
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
  const modelMount = new THREE.Group(); animated.add(modelMount);
  const staticHolder = new THREE.Group(); root.add(staticHolder);
  const handGroup = new THREE.Group(); animated.add(handGroup);
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
    }
    holder.position.set(anchor[0]+cfg.x*U,anchor[1]+cfg.y*U,anchor[2]+cfg.z*U);
    holder.rotation.set(cfg.pitch*DEG,cfg.yaw*DEG,cfg.roll*DEG,'YXZ');
    holder.userData.base = holder.position.clone();
  }
  updateMount();
  updateHand('R',true); updateHand('L',true);

  let kick=0,lastNow=null;
  const view = {
    kind, root, animated, arms, modelMount, muzzle,
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
      if(reloadProgress>=0&&reloadProgress<1&&kind!=='knife')
        add(sample(KF.rel[kind],reloadProgress));
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
      if(kw){
        move[1]+=kw[1];move[3]+=kw[0];move[4]+=kw[4]*0.5;move[5]+=kw[3];
        // Knife & right glove share the animated parent; left palm stays calm.
        const hand=arms.right.userData.mesh;
        if(hand?.userData.hand){
          hand.userData.arm.matrix.makeRotationX(kw[0]*0.45);
          hand.userData.hand.matrix.makeRotationZ(kw[3]*0.5).multiply(
            new THREE.Matrix4().makeRotationX(kw[2]));
        }
      } else if(kind==='knife'){
        const hand=arms.right.userData.mesh;
        if(hand?.userData.hand){
          hand.userData.arm.matrix.identity();hand.userData.hand.matrix.identity();
        }
      }
      animated.position.set(move[0],move[1],move[2]);
      animated.rotation.set(move[3],move[4],move[5],'YXZ');
      if(kind==='knife')animated.rotation.z+=move[6];
      const leftBase=arms.left.userData.base;
      if(leftBase){
        arms.left.position.copy(leftBase);
        arms.left.rotation.set(poses.L.pitch*DEG,poses.L.yaw*DEG,poses.L.roll*DEG,'YXZ');
        if(reloadProgress>=0&&reloadProgress<1&&kind!=='knife'){
          // Move supporting fingers to the magazine and back with Game1 curves.
          const u=Math.sin(Math.PI*reloadProgress);
          arms.left.position.y-=0.11*u;
          arms.left.position.z+=kind==='rifle'?0.16*u:0.08*u;
          arms.left.rotation.x-=0.33*u;
        }
      }
      muzzle.visible=visible&&kind!=='knife'&&firing;
    }
  };
  return view;
}
