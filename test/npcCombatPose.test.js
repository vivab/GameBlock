import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createBlockFighter} from '../src/blockFighter.js';
import {createThirdPersonLoadout, NPC_COMBAT_GRIPS, USER_WEAPON_PRESETS,
 WEAPON_MOUNT_STORAGE, GRIP_EDITOR_STORAGE} from '../src/thirdPersonGrip.js';

test('Bot guns and hands ignore oversized user calibration on the same phone',()=>{
 const previous=globalThis.localStorage;
 const saved=new Map([
  [WEAPON_MOUNT_STORAGE,JSON.stringify({rifle:{x:.85,y:.85,z:.85,ry:180,scale:2.3}})],
  [GRIP_EDITOR_STORAGE,JSON.stringify({rifle:{left:{x:.85,z:-.85,scale:.35}}})]
 ]);
 globalThis.localStorage={
  getItem:key=>saved.get(key)||null,
  setItem:(key,value)=>saved.set(key,value)
 };
 try{
  const fighter=createBlockFighter();
  const gear=createThirdPersonLoadout(fighter,{kind:'rifle',npc:true});
  assert.equal(gear.getMount('rifle').z,0,'NPC gun remains close to its torso');
  assert.equal(gear.getMount('rifle').ry,0);
  assert.equal(gear.getGripEdit('rifle','left').z,0);
  assert.equal(gear.getGripEdit('rifle','right').x,0);
  assert.equal(USER_WEAPON_PRESETS.rifle.left.z,-.75,'editor values remain untouched');
  assert.ok(NPC_COMBAT_GRIPS.rifle.root[2]<.3,'NPC stock stays near chest');
  for(const kind of ['rifle','pistol']){
   for(const action of ['aim','walk','run','shoot']){
    const time=.26;
    fighter.update(time,action,{armed:true});
    const errors=gear.update({kind,mode:action,time});
    for(const side of ['left','right']){
     assert.ok(Number.isFinite(errors[side]),kind+' '+action+' '+side+' IK remains finite');
     assert.ok(errors[side]<.30,kind+' '+action+' '+side+' hand stays within 30cm of grip: '+errors[side]);
    }
   }
  }
  assert.deepEqual(JSON.parse(saved.get(WEAPON_MOUNT_STORAGE)).rifle,
   {x:.85,y:.85,z:.85,ry:180,scale:2.3},'bots never rewrite player settings');
  fighter.dispose();
 }finally{
  if(previous===undefined)delete globalThis.localStorage;
  else globalThis.localStorage=previous;
 }
});

test('Armed bot walking keeps aim arms while legs still stride',()=>{
 const fighter=createBlockFighter();
 fighter.update(.15,'run',{armed:true});
 const thighStart=fighter.bones.Thigh_L.rotation.x;
 const upperStart=fighter.bones.UpperArm_R.rotation.x;
 assert.ok(upperStart<-.8,'right rifle arm stays raised while running');
 assert.ok(fighter.bones.UpperArm_L.rotation.x<-.8,'left support arm stays raised');
 fighter.update(.41,'run',{armed:true});
 assert.ok(Math.abs(fighter.bones.Thigh_L.rotation.x-thighStart)>.12,'running legs continue to stride');
 fighter.update(.15,'walk',{armed:true});
 assert.ok(fighter.bones.UpperArm_R.rotation.x<-.8,'rifle remains raised while walking');
 fighter.update(.15,'run',{armed:false});
 assert.ok(fighter.bones.UpperArm_R.rotation.x>-.6,'unarmed walking animation stays available');
 fighter.dispose();
});

test('Live NPC actor creation opts into independent grips and armed pose',()=>{
 const src=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(src,/createThirdPersonLoadout\(animated,\{kind:actor\.weapon===.*npc:true\}\)/);
 assert.match(src,/model\.animated\.update\(match\.time,pose,\{armed:actor\.weapon!=='knife'\}\)/);
});
