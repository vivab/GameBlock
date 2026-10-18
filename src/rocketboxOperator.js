import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

// The user's chosen real SWAT is EXACTLY Police Male 02, casting candidate 08.
// The earlier procedural V8 soldiers remain available in the comparison gallery
// but do not replace the chosen playable CT team's model.
export function createRocketboxOperator(gltf,team='ct'){
  if(!gltf?.scene)return null;
  const root=new THREE.Group();
  const visual=cloneSkeleton(gltf.scene);
  root.name='GameBlock '+team+' / real rigged Rocketbox operator';
  root.add(visual);
  visual.updateMatrixWorld(true);
  const bb=new THREE.Box3().setFromObject(visual);
  const size=bb.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<.05) return null;
  const scale=1.83/size.y;
  visual.scale.multiplyScalar(scale);
  visual.updateMatrixWorld(true);
  const scaled=new THREE.Box3().setFromObject(visual);
  const center=scaled.getCenter(new THREE.Vector3());
  visual.position.x-=center.x;
  visual.position.y-=scaled.min.y;
  visual.position.z-=center.z;
  // Rocketbox native model faces -Z; the FPS simulation faces -Z at yaw 0.
  visual.rotation.y=0;
  let bones=0,skinned=0;
  visual.traverse(o=>{
    if(o.isBone)bones++;
    if(!o.isMesh)return;
    o.frustumCulled=false;
    o.castShadow=false;
    o.receiveShadow=true;
    if(o.isSkinnedMesh)skinned++;
  });
  if(bones<20||skinned===0)return null;
  return {root,visual,mode:'rocketbox',team,bones,skinned,
    release(){root.remove(visual);}
  };
}
