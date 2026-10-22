import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {MOVE_SPEEDS,weaponMoveSpeed,BOT_MOVEMENT_FACTOR,joystickIntensity,joystickPace,JOYSTICK_DEADZONE,JOYSTICK_WALK_THRESHOLD} from '../src/movementSpeed.js';
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
 assert.ok(MOVE_SPEEDS.rifle<4.2,'new rifle pace must be slower than original game');
 assert.ok(MOVE_SPEEDS.knife<7,'knife speed should not feel like flying');
 assert.ok(weaponMoveSpeed('rifle',{bot:true})>2.7,
  'bots remain active and responsive without sprinting at previous speeds');
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
 assert.ok(fingers.every(p=>p.size[0]>=.07));
 assert.ok(fighter.joints.includes('Finger_R_0'));
 fighter.dispose();
});
test('both live mount menus provide dedicated smaller/bigger weapon buttons',()=>{
 const ui=readFileSync(new URL('../src/weaponMountEditor.js',import.meta.url),'utf8');
 const first=readFileSync(new URL('../src/calibration.js',import.meta.url),'utf8');
 for(const id of ['weSmaller','weBigger'])assert.match(ui,new RegExp(id));
 for(const id of ['calSmaller','calBigger'])assert.match(first,new RegExp(id));
});


test('analog touch stick eases from silent walking to fast edge run',()=>{
 assert.ok(JOYSTICK_DEADZONE>.04&&JOYSTICK_DEADZONE<.18);
 assert.ok(JOYSTICK_WALK_THRESHOLD>.4&&JOYSTICK_WALK_THRESHOLD<.7);
 assert.equal(joystickIntensity(0,48),0);
 assert.equal(joystickIntensity(2,48),0,'tiny thumb drift must not move the player');
 const light=joystickIntensity(12,48);
 const medium=joystickIntensity(24,48);
 const strong=joystickIntensity(39,48);
 const full=joystickIntensity(48,48);
 assert.ok(0<light&&light<medium&&medium<strong&&strong<full);
 assert.ok(medium<.45,'half-stick must produce walking speed, not a sprint');
 assert.equal(joystickPace(light),'walk');
 assert.equal(joystickPace(medium),'walk');
 assert.equal(joystickPace(strong),'run');
 assert.equal(joystickPace(full),'run');
 assert.equal(joystickIntensity(250,48),1,'overshooting edge must clamp');
 assert.equal(joystickIntensity(Number.NaN,48),0);
});
test('player touch UI preserves partial stick magnitude and walking label',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(main,/move\.x=nx\*intensity;move\.y=nz\*intensity/);
 assert.match(main,/const length = Math\.max\(1, Math\.hypot\(mx, mz\)\)/);
 assert.match(main,/const pace=joystickPace\(intensity\)/);
 assert.match(html,/id="joyMode"/);
 assert.match(html,/data-pace="idle"/);
});
