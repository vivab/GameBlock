import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBlockFighter} from '../src/blockFighter.js';
import {createThirdPersonLoadout,WEAPON_MOUNT_STORAGE} from '../src/thirdPersonGrip.js';
import {MOUNT_CONTROLS,mountControlValue} from '../src/weaponMountEditor.js';
import {makeHand} from '../src/retroHands.js';

test('weapon editor offers live XYZ, Euler rotation and scale with numeric clamps',()=>{
 assert.deepEqual(MOUNT_CONTROLS.map(x=>x.key),['x','y','z','rx','ry','rz','scale']);
 const defaults={x:0,y:0,z:0,rx:0,ry:0,rz:0,scale:1};
 assert.equal(mountControlValue(defaults,'x',.235),.235);
 assert.equal(mountControlValue(defaults,'y',5),.75);
 assert.equal(mountControlValue(defaults,'scale',0),.35);
 assert.equal(mountControlValue(defaults,'ry',-280),-180);
 assert.equal(mountControlValue(defaults,'z','garbage'),0);
});
test('runtime weapon transforms update instantly without destroying support hand IK',()=>{
 const fighter=createBlockFighter();
 const rig=createThirdPersonLoadout(fighter,{kind:'rifle'});
 fighter.update(.2,'aim');
 rig.update({kind:'rifle',mode:'aim',time:.2});
 const gun=rig.weapons.rifle.root;
 const before=gun.position.clone();
 const previousMount=rig.getMount('rifle');
 const mount=rig.setMount('rifle',{x:.18,y:-.16,z:.13,rx:12,ry:22,rz:-8,scale:1.24},false);
 assert.equal(mount.x,.18);
 assert.equal(mount.scale,1.24);
 rig.update({kind:'rifle',mode:'aim',time:.2});
 assert.ok(Math.abs(gun.position.x-before.x-(.18-previousMount.x))<.00001);
 assert.ok(Math.abs(gun.position.y-before.y-(-.16-previousMount.y))<.00001);
 assert.ok(Math.abs(gun.position.z-before.z-(.13-previousMount.z))<.00001);
 assert.ok(Math.abs(gun.rotation.y-THREE.MathUtils.degToRad(22))<.00001);
 assert.equal(gun.scale.x,1.24);
 const error=rig.gripErrors;
 assert.ok(Number.isFinite(error.right)&&Number.isFinite(error.left));
 rig.resetMount('rifle');
 assert.deepEqual(rig.getMount('rifle'),{x:0,y:0,z:0,rx:0,ry:0,rz:0,scale:1});
 fighter.dispose();
});
test('gun does not inherit vertical animation bob when a character jumps',()=>{
 const fighter=createBlockFighter();
 const gear=createThirdPersonLoadout(fighter,{kind:'rifle'});
 fighter.update(0,'aim');
 gear.update({kind:'rifle',mode:'aim'});
 const gun=gear.weapons.rifle.root;
 const y=gun.position.y;
 fighter.update(.5,'jump');
 gear.update({kind:'rifle',mode:'jump',time:.5});
 assert.ok(fighter.bones.Root.position.y>.3,'fighter should jump');
 assert.ok(Math.abs(gun.position.y-y)<.0001,'weapon should not perform an extra independent hop');
 assert.ok(fighter.bones.Calf_L.rotation.x>.5,'left knee should visibly bend');
 assert.ok(fighter.bones.Calf_R.rotation.x>.5,'right knee should visibly bend');
 fighter.update(.2,'crouch');
 gear.update({kind:'rifle',mode:'crouch',time:.2});
 assert.ok(fighter.bones.Root.position.y<-.27,'crouch should lower the character more');
 assert.ok(gun.position.y<y-.19,'the rifle should lower to meet the crouching character');
 fighter.dispose();
});
test('saved mounts are used in both editor and newly spawned match NPCs',()=>{
 const old=globalThis.localStorage;
 const values=new Map();
 globalThis.localStorage={
  getItem:key=>values.get(key)||null,
  setItem:(key,value)=>values.set(key,value),
 };
 try{
  const f=createBlockFighter(),g=createThirdPersonLoadout(f);
  g.setMount('rifle',{x:.09,rz:23,scale:1.16});
  assert.ok(values.has(WEAPON_MOUNT_STORAGE));
  const other=createBlockFighter(),newGear=createThirdPersonLoadout(other);
  assert.equal(newGear.getMount('rifle').x,.09);
  assert.equal(newGear.getMount('rifle').rz,23);
  assert.equal(newGear.getMount('rifle').scale,1.16);
  f.dispose();other.dispose();
 }finally{
  if(old===undefined)delete globalThis.localStorage;
  else globalThis.localStorage=old;
 }
});
test('first-person forearms are blocky and noticeably broader',()=>{
 const a=makeHand('R','pistol');
 const arm=a.userData.arm;
 const boxes=arm.children.filter(x=>x.geometry?.type==='BoxGeometry');
 assert.ok(boxes.length>=3);
 const widest=Math.max(...boxes.map(x=>x.geometry.parameters.width));
 assert.ok(widest>=.11,'visible sleeve width should resemble the Block Fighter arms');
});
