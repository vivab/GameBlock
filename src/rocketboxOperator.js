import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {readTChoice} from './operatorChoices.js';

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
  const selectedT=team==='t'?readTChoice():0;
  visual.traverse(o=>{
    if(o.isBone)bones++;
    if(!o.isMesh)return;
    o.frustumCulled=false;
    o.castShadow=false;
    o.receiveShadow=true;
    if(o.isSkinnedMesh)skinned++;
    if(selectedT===2||selectedT===5){
      const mats=Array.isArray(o.material)?o.material:[o.material];
      const bright=mats.map(m=>{
        if(!m)return m;
        const name=(m.name||'').toLowerCase();
        const protectedPart=/(balaclava|_head|head$|face|skin|hair|eye|mouth|teeth|mask|helmet)/.test(name);
        const pants=/(leg|pant|trouser|jean|bottom)/.test(name);
        const leather=/(boot|shoe|foot|glove|belt|strap|pouch)/.test(name);
        const cloth=/(body|olive_bandit|jacket|shirt|cloth|uniform|coat|vest|torso|arm|sleeve|pant|trouser|leg|jean|boot|shoe|foot|glove|belt|strap|pouch)/.test(name);
        if(!cloth||protectedPart)return m;
        const c=m.clone();
        const color=leather?0x726e50:pants
          ?(selectedT===2?0xaeb78b:0xc3b995)
          :(selectedT===2?0xc1ce95:0xd8d0a9);
        c.color?.setHex(color);
        c.map=null;
        c.emissive?.setHex(leather?0x17170d:0x272d1c);
        c.emissiveIntensity=.55;
        c.roughness=.97;
        c.metalness=0;
        c.needsUpdate=true;
        return c;
      });
      o.material=Array.isArray(o.material)?bright:bright[0];
    }
  });
  if(bones<20||skinned===0)return null;
  return {root,visual,mode:'rocketbox',team,bones,skinned,
    release(){root.remove(visual);}
  };
}
