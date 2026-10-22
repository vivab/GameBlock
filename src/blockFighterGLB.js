import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

// GameBlock's generated block_fighter_v1.glb has the SAME named skeleton as
// createBlockFighter(). The lightweight procedural rig remains the pose/IK
// controller; the imported, skinned GLB becomes the visible NPC/lobby model.
// If loading fails, callers simply keep the procedural rig visible.
const T_COLORS=Object.freeze({
 cloth:'#515b47',clothDark:'#3a4439',seam:'#657455',
 balaclava:'#242b28',balaclavaDetail:'#343e35',
 armor:'#2d382f',armorTrim:'#4b584a',
 pouch:'#444837',pouchFlap:'#555a45',
 glove:'#313b34',glovePalm:'#242f28'
});
const T_MATERIALS=new Map();
function recolorT(material){
 if(!material)return material;
 const name=material.name;
 const color=T_COLORS[name];
 if(!color)return material;
 const cached=T_MATERIALS.get(material.uuid);
 if(cached)return cached;
 const replacement=material.clone();
 replacement.color=new THREE.Color(color);
 replacement.needsUpdate=true;
 T_MATERIALS.set(material.uuid,replacement);
 return replacement;
}
export function attachBlockFighterGLB(controller,source,{team='ct'}={}){
 if(!controller?.root||!controller.mesh?.isSkinnedMesh)throw Error('Block Fighter controller required');
 const original=source?.scene||source;
 if(!original?.isObject3D)throw Error('GLB scene required');
 const visual=cloneSkeleton(original);
 const targets=new Map();
 let skinned=0;
 visual.traverse(obj=>{
  if(obj.isBone)targets.set(obj.name,obj);
  if(obj.isSkinnedMesh)skinned++;
  if(obj.isMesh&&team==='t'){
   obj.material=Array.isArray(obj.material)?
    obj.material.map(recolorT):recolorT(obj.material);
  }
 });
 const missing=Object.keys(controller.bones).filter(name=>!targets.has(name));
 if(!skinned||missing.length)throw Error('GLB rig incompatible: '+missing.slice(0,6).join(','));
 visual.name='Visible rigged Block Fighter GLB / '+team;
 controller.root.add(visual);
 controller.mesh.visible=false;
 const linked=Object.entries(controller.bones).map(([name,sourceBone])=>[sourceBone,targets.get(name)]);
 const sync=()=>{
  for(const [sourceBone,targetBone] of linked){
   targetBone.position.copy(sourceBone.position);
   targetBone.quaternion.copy(sourceBone.quaternion);
   targetBone.scale.copy(sourceBone.scale);
  }
  visual.updateMatrixWorld(true);
 };
 sync();
 return {
  visual,sync,skinnedMeshes:skinned,matchedBones:linked.length,
  dispose(){
   controller.mesh.visible=true;
   controller.root.remove(visual);
   // Base GLB meshes and team materials are shared; avoid disposing them here.
  }
 };
}
