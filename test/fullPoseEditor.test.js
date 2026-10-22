import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createBlockFighter} from '../src/blockFighter.js';
import {createThirdPersonLoadout,GRIP_EDITOR_STORAGE,GRIP_EDITOR_TARGETS} from '../src/thirdPersonGrip.js';

test('weapon, left hand, right hand and whole rig can be edited separately',()=>{
 assert.deepEqual(GRIP_EDITOR_TARGETS,['weapon','right','left','all']);
 const fighter=createBlockFighter();
 const gear=createThirdPersonLoadout(fighter);
 fighter.update(0,'aim');
 gear.update({kind:'rifle'});
 const gun=gear.weapons.rifle.root;
 const original=gun.position.clone();
 const right=gear.setGripEdit('rifle','right',{x:.12,rx:17},false);
 assert.equal(right.x,.12);
 assert.equal(right.rx,17);
 assert.equal(gear.getGripEdit('rifle','left').x,0);
 gear.update({kind:'rifle'});
 assert.ok(gun.position.distanceTo(original)<1e-8,'moving right hand must not move gun');
 gear.setGripEdit('rifle','left',{y:.08,ry:-12},false);
 assert.equal(gear.getGripEdit('rifle','right').y,0);
 gear.setGripEdit('rifle','all',{x:.14,y:.09,z:-.08,rx:5,scale:1.12},false);
 gear.update({kind:'rifle'});
 assert.ok(Math.abs(gun.position.x-original.x-.14)<1e-6);
 assert.ok(Math.abs(gun.position.y-original.y-.09)<1e-6);
 assert.ok(Math.abs(gun.position.z-original.z+.08)<1e-6);
 assert.ok(Math.abs(gun.scale.x-1.12)<1e-6);
 assert.ok(Math.abs(gun.rotation.x-(-.015+THREE.MathUtils.degToRad(5)))<1e-6);
 assert.ok(Number.isFinite(gear.gripErrors.left)&&Number.isFinite(gear.gripErrors.right));
 gear.resetGripEdit('rifle','all');
 assert.equal(gear.getGripEdit('rifle','all').x,0);
 assert.equal(gear.getGripEdit('rifle','right').x,.12);
 assert.equal(gear.getGripEdit('pistol','right').x,0,'pistol edits must be independent');
 fighter.dispose();
});
test('pose editor stores left and right offsets across newly created rigs',()=>{
 const old=globalThis.localStorage;
 const values=new Map();
 globalThis.localStorage={
  getItem:k=>values.get(k)||null,
  setItem:(k,v)=>values.set(k,v)
 };
 try{
  const fighter=createBlockFighter(),gear=createThirdPersonLoadout(fighter);
  gear.setGripEdit('pistol','left',{z:.13,rz:-11});
  assert.ok(values.has(GRIP_EDITOR_STORAGE));
  const second=createBlockFighter(),next=createThirdPersonLoadout(second);
  assert.equal(next.getGripEdit('pistol','left').z,.13);
  assert.equal(next.getGripEdit('pistol','left').rz,-11);
  fighter.dispose();second.dispose();
 }finally{
  if(old===undefined)delete globalThis.localStorage;
  else globalThis.localStorage=old;
 }
});
test('full mobile panel exposes four independent live controls and draggable UI',()=>{
 const s=readFileSync(new URL('../src/weaponMountEditor.js',import.meta.url),'utf8');
 for(const target of ['weapon','right','left','all'])assert.match(s,new RegExp('data-target="'+target+'"'));
 for(const method of ['getGripEdit','setGripEdit','resetGripEdit'])assert.match(s,new RegExp(method));
 for(const id of ['weHeader','weSliders','weCopy','weReset'])assert.match(s,new RegExp(id));
 assert.match(s,/79dvh/);
});

test('weapon-only mode freezes both hands while moving gun; closing restores IK',()=>{
 const fighter=createBlockFighter();
 const gear=createThirdPersonLoadout(fighter,{kind:'pistol'});
 gear.setEditorTarget('weapon');
 fighter.update(.2,'aim');
 gear.update({kind:'pistol',time:.2});
 const beforeR=fighter.bones.Hand_R.getWorldPosition(new THREE.Vector3());
 const beforeL=fighter.bones.Hand_L.getWorldPosition(new THREE.Vector3());
 const gun=gear.weapons.pistol.root;
 const original=gun.position.clone();
 gear.setMount('pistol',{x:.3,y:.2,z:-.1},false);
 fighter.update(.2,'aim');
 gear.update({kind:'pistol',time:.2});
 assert.ok(gun.position.distanceTo(original)>.3);
 assert.ok(fighter.bones.Hand_R.getWorldPosition(new THREE.Vector3()).distanceTo(beforeR)<1e-8);
 assert.ok(fighter.bones.Hand_L.getWorldPosition(new THREE.Vector3()).distanceTo(beforeL)<1e-8);
 gear.setEditorTarget(null);
 fighter.update(.2,'aim');
 gear.update({kind:'pistol',time:.2});
 const moved=fighter.bones.Hand_R.getWorldPosition(new THREE.Vector3()).distanceTo(beforeR);
 assert.ok(moved>.01,'normal IK should resume after leaving calibration');
 fighter.dispose();
});
