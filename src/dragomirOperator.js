import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

// The user's Dragomir (T) and SAS SWAT (CT) agents use matching CS2-style
// skinned rigs, but their GLBs contain one-frame preview poses, not locomotion
// clips. Drive their *actual bones* with the same deterministic IK animation.
// Each bot has an independent skeleton; the geometry/materials stay shared.
const E = Math.PI;
const X = new THREE.Vector3(1,0,0);
const Z = new THREE.Vector3(0,0,1);
const UP = new THREE.Vector3(0,1,0);
const clamp=THREE.MathUtils.clamp;
const material=(color)=>new THREE.MeshStandardMaterial({
  color,roughness:.78,metalness:.12,flatShading:true
});
const mats={
  receiver:material(0x232c2b),barrel:material(0x3c4340),
  grip:material(0x584333),wood:material(0x765336)
};
function block(parent,mat,w,h,d,x,y,z) {
  const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  body.position.set(x,y,z);parent.add(body);return body;
}
function fallbackRifle(root) {
  block(root,mats.receiver,.11,.12,.52,0,.015,-.10);
  block(root,mats.barrel,.048,.05,.42,0,.055,-.52);
  block(root,mats.wood,.13,.14,.28,0,.015,-.27);
  block(root,mats.grip,.11,.26,.09,0,-.16,.015);
  block(root,mats.wood,.12,.12,.24,0,.015,.27);
  block(root,mats.barrel,.035,.035,.31,0,.125,-.23);
}
function createSwatCarbine() {
  // Compact black tactical carbine: muzzle, handguard, upper/lower receiver,
  // box magazine, stock and iron sights. Looks like CT kit, not a toy AK.
  const group=new THREE.Group();
  const dark=material(0x182027),rubber=material(0x303b42);
  const steel=material(0x434b50);
  const cylinder=(radius,height,x,y,z,mtl=dark)=>{
    const obj=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,10),mtl);
    obj.rotation.x=Math.PI/2;obj.position.set(x,y,z);group.add(obj);
    return obj;
  };
  block(group,dark,.13,.135,.40,0,.01,0);
  block(group,steel,.09,.025,.44,0,.094,-.03);
  block(group,rubber,.145,.14,.32,0,.035,-.38);
  cylinder(.035,.37,0,.062,-.67,steel);
  cylinder(.045,.085,0,.064,-.87,dark);
  block(group,steel,.07,.08,.105,0,.145,-.15);
  block(group,dark,.08,.055,.085,0,.19,-.15);
  block(group,dark,.13,.14,.20,0,.025,.32);
  cylinder(.034,.25,0,.030,.43,rubber);
  const mag=block(group,steel,.088,.25,.108,0,-.16,-.04);
  mag.rotation.x=-.18;
  const grip=block(group,rubber,.091,.21,.084,0,-.14,.14);
  grip.rotation.x=-.22;
  block(group,rubber,.09,.11,.22,0,-.018,-.39);
  block(group,steel,.075,.028,.17,0,.137,-.39);
  return group;
}
function createRifle(scene,team='t') {
  if(team==='ct')return createSwatCarbine();
  const root=new THREE.Group();
  if (!scene) {fallbackRifle(root);return root;}
  try {
    const rifle=scene.clone(true);
    rifle.updateMatrixWorld(true);
    const size=new THREE.Box3().setFromObject(rifle).getSize(new THREE.Vector3());
    if(size.x>=size.y && size.x>=size.z)rifle.rotation.y=E/2;
    else if(size.y>=size.x && size.y>=size.z)rifle.rotation.x=-E/2;
    else rifle.rotation.y=E;
    rifle.updateMatrixWorld(true);
    const adjusted=new THREE.Box3().setFromObject(rifle);
    const depth=adjusted.getSize(new THREE.Vector3()).z;
    if(depth<1e-7 || !Number.isFinite(depth))throw Error('Zero-sized rifle');
    rifle.scale.multiplyScalar(.90/depth);
    rifle.updateMatrixWorld(true);
    rifle.position.sub(new THREE.Box3().setFromObject(rifle)
      .getCenter(new THREE.Vector3()));
    root.add(rifle);
  }catch(error){
    console.warn('Using procedural bot AK:',error);
    fallbackRifle(root);
  }
  return root;
}
function bone(scene,pattern) {
  let out=null;
  scene.traverse(node=>{
    if(!out && node.isBone && pattern.test(node.name))out=node;
  });
  return out;
}
export function discoverDragomirBones(scene) {
  return {
    head:bone(scene,/^head_0_0$/i),
    pelvis:bone(scene,/^pelvis_/i),
    spine:bone(scene,/^spine_2_/i),
    leftArm:bone(scene,/^arm_upper_l_/i),
    rightArm:bone(scene,/^arm_upper_r_/i),
    leftElbow:bone(scene,/^arm_lower_l_(?!twist)/i),
    rightElbow:bone(scene,/^arm_lower_r_(?!twist)/i),
    leftHand:bone(scene,/^hand_l_/i),
    rightHand:bone(scene,/^hand_r_/i),
    leftLeg:bone(scene,/^leg_upper_l_/i),
    rightLeg:bone(scene,/^leg_upper_r_/i),
    leftKnee:bone(scene,/^leg_lower_l_/i),
    rightKnee:bone(scene,/^leg_lower_r_/i)
  };
}
function orientAndFit(root,visual,bones) {
  root.updateMatrixWorld(true);
  if(bones.head && bones.pelvis){
    const high=bones.head.getWorldPosition(new THREE.Vector3());
    const low=bones.pelvis.getWorldPosition(new THREE.Vector3());
    const up=high.sub(low);
    if(up.lengthSq()>1e-8)
      visual.quaternion.setFromUnitVectors(up.normalize(),UP);
  }
  root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(visual);
  const size=bounds.getSize(new THREE.Vector3());
  if(size.y<.00001 || !Number.isFinite(size.y))return false;
  const factor=1.80/size.y;
  visual.scale.setScalar(factor);
  const mid=bounds.getCenter(new THREE.Vector3());
  visual.position.set(-mid.x*factor,-bounds.min.y*factor,-mid.z*factor);
  root.updateMatrixWorld(true);
  return true;
}
export function createTacticalOperator(gltf, rifleAsset=null, team='t') {
  if(team!=='ct' && team!=='t')return null;
  if(!gltf?.scene)return null;
  const root=new THREE.Group();
  root.name=team==='ct'?'GB / SAS SWAT / Counter-Terrorist'
    :'GB / Dragomir / Terrorist';
  const visual=new THREE.Group();
  const source=cloneSkinned(gltf.scene);
  visual.add(source);
  root.add(visual);
  const bones=discoverDragomirBones(source);
  // A missing joint should fall back to our original low-poly bot rather than
  // showing a horizontal or T-posed player.
  if(!bones.pelvis || !bones.head || !bones.leftArm || !bones.rightArm ||
     !bones.leftHand || !bones.rightHand)return null;
  if(!orientAndFit(root,visual,bones))return null;
  const rest={};
  for(const [key,node] of Object.entries(bones))
    if(node)rest[key]=node.quaternion.clone();
  // Imported mesh is skinned. Bone deformation can move outside bind bounds.
  source.traverse(node=>{
    if(node.isSkinnedMesh)node.frustumCulled=false;
  });
  const gunPivot=new THREE.Group();
  gunPivot.position.set(.015,1.24,-.41);
  root.add(gunPivot);
  const gun=createRifle(rifleAsset,team);
  gunPivot.add(gun);
  const duration=glTFDurationInventory(gltf.animations||[]);
  const model={root,source,visual,bones,rest,gun,gunPivot,mode:'tactical',
    team,clipCount:duration.total,playableClipCount:duration.playable,
    startVisualY:visual.position.y};
  animateTacticalOperator(model,{lastShotAt:-10},0,.016,0);
  return model;
}
// Backward-compatible name for the Dragomir-specific integration tests.
export const createDragomirOperator=(gltf,rifleAsset=null)=>
  createTacticalOperator(gltf,rifleAsset,'t');
export function glTFDurationInventory(clips) {
  return {total:clips.length,playable:clips.filter(clip=>
    Number.isFinite(clip.duration) && clip.duration>.05).length};
}
const q=new THREE.Quaternion();
function restore(model,key) {
  const node=model.bones[key];
  if(node && model.rest[key])node.quaternion.copy(model.rest[key]);
}
function rotate(model,key,axis,angle) {
  const node=model.bones[key],original=model.rest[key];
  if(!node||!original)return;
  q.setFromAxisAngle(axis,angle);
  node.quaternion.copy(original).multiply(q);
}
const tmpWorld=new THREE.Vector3(),tmpEnd=new THREE.Vector3(),tmpTarget=new THREE.Vector3();
const axisStart=new THREE.Vector3(),axisAim=new THREE.Vector3();
function aimJoint(joint,end,target) {
  if(!joint || !end)return;
  joint.getWorldPosition(tmpWorld);
  end.getWorldPosition(tmpEnd);
  axisStart.copy(tmpEnd).sub(tmpWorld);
  axisAim.copy(target).sub(tmpWorld);
  if(axisStart.lengthSq()<1e-9 || axisAim.lengthSq()<1e-9)return;
  const worldCorrection=new THREE.Quaternion().setFromUnitVectors(
    axisStart.normalize(),axisAim.normalize());
  const parentQ=joint.parent?.getWorldQuaternion(new THREE.Quaternion())||
    new THREE.Quaternion();
  const local=parentQ.clone().invert().multiply(worldCorrection).multiply(parentQ);
  joint.quaternion.premultiply(local).normalize();
}
const sPos=new THREE.Vector3(),ePos=new THREE.Vector3(),wPos=new THREE.Vector3();
const direction=new THREE.Vector3(),pole=new THREE.Vector3(),elbowGoal=new THREE.Vector3();
function aimArm(model,side,grip) {
  const upper=model.bones[side+'Arm'];
  const lower=model.bones[side+'Elbow'];
  const wrist=model.bones[side+'Hand'];
  if(!upper||!wrist)return;
  model.root.updateWorldMatrix(true,true);
  const goal=model.root.localToWorld(grip.clone());
  if(!lower){aimJoint(upper,wrist,goal);return;}
  upper.getWorldPosition(sPos);
  lower.getWorldPosition(ePos);
  wrist.getWorldPosition(wPos);
  const upperLen=sPos.distanceTo(ePos),lowerLen=ePos.distanceTo(wPos);
  if(upperLen<.012 || lowerLen<.012){
    aimJoint(upper,wrist,goal);return;
  }
  direction.copy(goal).sub(sPos);
  const length=clamp(direction.length(),.025,
    (upperLen+lowerLen)*.985);
  direction.normalize();
  const along=clamp(
    (upperLen*upperLen-lowerLen*lowerLen+length*length)/(2*length),
    -upperLen,upperLen);
  const bend=Math.sqrt(Math.max(0,upperLen*upperLen-along*along));
  pole.set(side==='left'?-1:1,-.6,.42)
    .applyQuaternion(model.root.getWorldQuaternion(new THREE.Quaternion()));
  pole.addScaledVector(direction,-pole.dot(direction));
  if(pole.lengthSq()<1e-8)pole.set(side==='left'?-1:1,0,0);
  pole.normalize();
  elbowGoal.copy(sPos).addScaledVector(direction,along)
    .addScaledVector(pole,bend);
  aimJoint(upper,lower,elbowGoal);
  model.root.updateWorldMatrix(true,true);
  aimJoint(lower,wrist,goal);
}
export function animateTacticalOperator(model,actor,time,dt,movement) {
  if(!model)return;
  const speed=clamp(movement/3.5,0,1);
  const moving=speed>.06;
  const cycle=time*(moving?9.7:1.1);
  const stride=Math.sin(cycle)*speed;
  const firing=actor?.lastShotAt!==undefined && time-actor.lastShotAt<.14 &&
    time>=actor.lastShotAt;
  for(const key of Object.keys(model.rest))restore(model,key);
  rotate(model,'leftLeg',X,stride*.45);
  rotate(model,'rightLeg',X,-stride*.45);
  rotate(model,'leftKnee',X,Math.max(0,-stride)*.30);
  rotate(model,'rightKnee',X,Math.max(0,stride)*.30);
  rotate(model,'spine',Z,Math.sin(time*1.3)*.012);
  rotate(model,'head',Z,Math.sin(time*.85)*.022);
  model.visual.position.y=model.startVisualY + speed*.012*Math.sin(cycle*2);
  model.gunPivot.position.y=1.24+speed*.011*Math.sin(cycle*2);
  model.gunPivot.rotation.x=firing?.105:0;
  model.root.updateWorldMatrix(true,true);
  // GameBlock actors face -Z, with the rifle receiver near the right hand.
  // These targets create a bent-elbow CS-like ready stance instead of a T-pose.
  aimArm(model,'right',new THREE.Vector3(.105,1.24,-.32));
  aimArm(model,'left',new THREE.Vector3(-.12,1.28,-.62));
  model.root.updateWorldMatrix(true,true);
}

export const animateDragomirOperator=animateTacticalOperator;
