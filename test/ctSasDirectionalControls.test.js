import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';

const html=readFileSync('public/game1/ct-sas-studio.html','utf8');
const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
assert.ok(script,'editor inline JavaScript');
test('SAS studio uses six explicit directions and retains existing weapon poses',()=>{
 for(const text of ['← Влево','Вправо →','↓ Вниз','Вверх ↑','⇣ Назад','Вперёд ⇡']){
  assert.ok(html.includes(text)||script.includes(text),'missing direction '+text);
 }
 assert.match(html,/id="moveStep"/);
 assert.match(html,/0,005 м · точно/);
 assert.match(script,/\['wx','← Влево \/ Вправо →',-3,3,\.005\]/);
 assert.match(script,/\['wy','↓ Вниз \/ Вверх ↑',-3,3,\.005\]/);
 assert.match(script,/\['wz','Назад \/ Вперёд',-3,3,\.005\]/);
 for(const axis of ['rx','ry','rz'])assert.match(script,new RegExp("\\['"+axis+"','[^']+',-360,360,1\\]"));
 assert.match(script,/\['scale','Масштаб оружия',\.05,7,\.01\]/);
 assert.match(script,/button\.addEventListener\('click'/);
 assert.match(script,/values\[key\]=n/);
 assert.doesNotThrow(()=>new vm.Script(script));
});
test('world-space offset is inverted through the parent transform, keeping direction consistent',()=>{
 const start=script.indexOf('function worldMoveInParent(');
 const end=script.indexOf('const scene=',start);
 assert.ok(start>0&&end>start,'conversion function bounds');
 const translate=new Function('THREE','d',script.slice(start,end)+'return worldMoveInParent;')(THREE,x=>Number(x)||0);
 const root=new THREE.Group(),shoulder=new THREE.Group();
 root.position.set(4,1,-3);root.rotation.set(.25,.4,-.18);root.scale.setScalar(.025);
 shoulder.position.set(2,0,4);shoulder.rotation.set(-.9,.15,.7);
 root.add(shoulder);root.updateMatrixWorld(true);
 for(const [field,wanted] of [
  ['wx',new THREE.Vector3(1,0,0)],
  ['wy',new THREE.Vector3(0,1,0)],
  ['wz',new THREE.Vector3(0,0,1)]
 ]){
  const coords={wx:0,wy:0,wz:0};coords[field]=1;
  const local=translate(shoulder,coords);
  const forward=local.clone().multiply(shoulder.getWorldScale(new THREE.Vector3()))
   .applyQuaternion(shoulder.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(forward.distanceTo(wanted)<1e-5,field+' should travel in character/world axis');
 }
});
test('direction controls add separate world coordinates without changing old user offsets',()=>{
 assert.match(script,/bone\.position\.copy\(base\.position\)\.add\(vec\(offsets\)\.divideScalar\(/);
 assert.match(script,/bone\.position\.add\(worldMoveInParent\(bone\.parent,worldOffsets\)\)/);
 assert.match(script,/weaponPivot\.position\.add\(worldMoveInParent\(holder,/);
 assert.match(script,/wx:d\(w\.wx\)\+d\(all\.wx\)/);
 assert.match(script,/wz:d\(w\.wz\)\+d\(all\.wz\)/);
 assert.match(script,/GameBlockCT_SAS_StudioV2/);
 assert.match(script,/const USER_AK=copyConfig\(USER_GLOCK\)/);
});
