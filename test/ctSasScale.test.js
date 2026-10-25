import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';

const html=readFileSync('public/game1/ct-sas-studio.html','utf8');
const js=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1];
const binary=readFileSync('public/game1/ctm_sas_gameblock.glb');
const jsonLength=binary.readUInt32LE(12);
const doc=JSON.parse(binary.toString('utf8',20,20+jsonLength));

const parent=new Map();
doc.nodes.forEach((node,i)=>node.children?.forEach(child=>parent.set(child,i)));
const cache=new Map();
function nodeWorld(i){
 if(cache.has(i))return cache.get(i);
 const node=doc.nodes[i];
 const local=node.matrix?new THREE.Matrix4().fromArray(node.matrix):
  new THREE.Matrix4().compose(new THREE.Vector3().fromArray(node.translation||[0,0,0]),
   new THREE.Quaternion().fromArray(node.rotation||[0,0,0,1]),
   new THREE.Vector3().fromArray(node.scale||[1,1,1]));
 const result=parent.has(i)?nodeWorld(parent.get(i)).clone().multiply(local):local;
 cache.set(i,result);return result;
}
function xyz(name){
 const index=doc.nodes.findIndex(n=>n.name===name);
 assert.ok(index>=0,'missing joint '+name);
 return new THREE.Vector3().setFromMatrixPosition(nodeWorld(index));
}

test('actual SAS rig is already upright in Y space despite Z-space skinned vertices',()=>{
 const head=xyz('head_0_097'),leftToe=xyz('ball_L_019'),
 rightToe=xyz('ball_R_010'),leftAnkle=xyz('ankle_L_018');
 assert.ok(head.y>65&&head.y<78,'head has standing vertical height');
 assert.ok(leftToe.y>=0&&leftToe.y<5);
 assert.ok(rightToe.y>=0&&rightToe.y<5);
 assert.ok(leftAnkle.y>leftToe.y);
 assert.ok(Math.abs(head.z-leftToe.z)<12);
 const floor=Math.min(leftToe.y,rightToe.y)-1;
 const height=head.y+7.5-floor;
 const scaled=height*(1.8/height);
 assert.ok(height>70&&height<85);
 assert.ok(Math.abs(scaled-1.8)<1e-8);
});
test('SAS fit uses head and toes rather than unposed mesh vertex bounding box',()=>{
 const i=js.indexOf('if(isSAS){'),end=js.indexOf('}else{',i);
 assert.ok(i>0&&end>i);
 const sas=js.slice(i,end);
 assert.match(sas,/model\.rotation\.set\(0,0,0\)/);
 assert.doesNotMatch(sas,/model\.rotation\.set\(Math\.PI\/2/);
 assert.match(sas,/getObjectByName\('head_0_097'\)/);
 assert.match(sas,/getObjectByName\('ball_L_019'\)/);
 assert.match(sas,/getObjectByName\('ball_R_010'\)/);
 assert.match(sas,/bodyScale=1\.8\/standingHeight/);
 assert.match(sas,/headP\.y>ankleLP\.y&&headP\.y>ankleRP\.y/);
 assert.match(sas,/model\.position\.set\(-footCenterX\*bodyScale,-toeFloor\*bodyScale/);
 assert.match(js,/bodyScale=1\.8\/Math\.max\(\.01,sz\.y\)/);
 assert.doesNotThrow(()=>new vm.Script(js));
});
test('weapon poses remain user-editable and SAS saves separately',()=>{
 for(const str of ['const USER_GLOCK=','const USER_AK=','const USER_KNIFE=','GameBlockCT_SAS_StudioV2'])
  assert.ok(js.includes(str),str);
});
