import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {MOVE_SPEEDS,weaponMoveSpeed,BOT_MOVEMENT_FACTOR} from '../src/movementSpeed.js';
import {Match} from '../src/combat.js';
import {createBlockFighter} from '../src/blockFighter.js';
import {attachBlockFighterGLB} from '../src/blockFighterGLB.js';
import {createThirdPersonLoadout} from '../src/thirdPersonGrip.js';
import {makeHand} from '../src/retroHands.js';

test('knife > pistol > AK rifle > future machinegun for player and bot',()=>{
 for(const bot of [false,true]){
  const speeds=['knife','pistol','rifle','machinegun'].map(weapon=>
   weaponMoveSpeed(weapon,{bot}));
  assert.ok(speeds.every(x=>Number.isFinite(x)&&x>0));
  for(let i=1;i<speeds.length;i++)assert.ok(speeds[i-1]>speeds[i]);
 }
 assert.ok(MOVE_SPEEDS.rifle>4.2,'new rifle pace must be above former player pace');
 assert.ok(weaponMoveSpeed('rifle',{bot:true})>2.7,
  'ranged NPCs are faster than the original 2.7 m/s');
 assert.ok(BOT_MOVEMENT_FACTOR>0&&BOT_MOVEMENT_FACTOR<1);
 assert.ok(weaponMoveSpeed('pistol',{crouch:true})<MOVE_SPEEDS.pistol);
 assert.ok(weaponMoveSpeed('pistol',{reloading:true})<MOVE_SPEEDS.pistol);
 assert.equal(weaponMoveSpeed('unrecognized'),MOVE_SPEEDS.rifle);
});
test('5v5 bots receive real rifle/pistol/knife inventory and move using weapon speeds',()=>{
 const game=new Match(()=>.5);
 game.start('ct');
 assert.equal(game.actors.length,10);
 assert.equal(game.staticBots,false);
 assert.equal(game.actors.filter(a=>a.isPlayer).length,1);
 const botPistol=game.actors.find(a=>!a.isPlayer&&a.weapon==='pistol');
 const botRifle=game.actors.find(a=>!a.isPlayer&&a.weapon==='rifle');
 const botKnife=game.actors.find(a=>!a.isPlayer&&a.weapon==='knife');
 assert.ok(botPistol&&botRifle&&botKnife);
 const origin={x:botRifle.x,z:botRifle.z};
 game.follow(botRifle,{x:botRifle.x,z:botRifle.z-3},.3);
 assert.ok(Math.hypot(botRifle.x-origin.x,botRifle.z-origin.z)>2.7*.3*.7);
 // Reload code must never give a knife bot bullets or pin it in place.
 botKnife.ammo=0;
 assert.equal(game.reload(botKnife),false);
 assert.equal(botKnife.reloadingUntil,0);
});
test('linked GLB-compatible rig renders its own skin and follows source poses/IK',()=>{
 const source=createBlockFighter();
 const controller=createBlockFighter();
 const gear=createThirdPersonLoadout(controller);
 const copy=attachBlockFighterGLB(controller,source.root,{team:'t'});
 assert.equal(controller.mesh.visible,false,'original geometry should be hidden');
 assert.ok(copy.skinnedMeshes>=1);
 assert.ok(copy.matchedBones>=30);
 controller.update(.3,'aim');
 gear.update({kind:'rifle',mode:'aim',time:.3});
 copy.sync();
 const src=controller.bones.Forearm_L;
 let dst=null;
 copy.visual.traverse(o=>{if(o.isBone&&o.name==='Forearm_L')dst=o});
 assert.ok(dst);
 assert.ok(src.quaternion.angleTo(dst.quaternion)<1e-5,
  'visible GLB hand rig should follow IK from animated controller');
 const visible=[];
 copy.visual.traverse(o=>{if(o.isSkinnedMesh)visible.push(o)});
 assert.ok(visible.length>=1);
 const tinted=visible.some(o=>[...([].concat(o.material))].some(m=>
  m?.name==='cloth'&&m.color?.getHexString()==='515b47'));
 assert.ok(tinted,'T GLB should adopt the olive team uniform');
 copy.dispose();
 assert.equal(controller.mesh.visible,true,'fallback restored when GLB removed');
 source.dispose();controller.dispose();
});
test('thicker first- and third-person fingers still belong to articulated joints',()=>{
 const a=makeHand('R','pistol');
 const digits=[];
 a.traverse(mesh=>{if(mesh.userData.finger!==undefined&&mesh.userData.segment===0)digits.push(mesh)});
 assert.equal(digits.length,5);
 assert.ok(digits.every(mesh=>mesh.scale.x>=.013),
  'every right-hand finger should have meaningful glove thickness');
 const fighter=createBlockFighter();
 const fingers=fighter.parts.filter(p=>p.name.startsWith('FingerSegment'));
 assert.equal(fingers.length,6);
 assert.ok(fingers.every(p=>p.size[0]>=.055));
 assert.ok(fighter.joints.includes('Finger_R_0'));
 fighter.dispose();
});
test('both live mount menus provide dedicated smaller/bigger weapon buttons',()=>{
 const ui=readFileSync(new URL('../src/weaponMountEditor.js',import.meta.url),'utf8');
 const first=readFileSync(new URL('../src/calibration.js',import.meta.url),'utf8');
 for(const id of ['weSmaller','weBigger'])assert.match(ui,new RegExp(id));
 for(const id of ['calSmaller','calBigger'])assert.match(first,new RegExp(id));
});
