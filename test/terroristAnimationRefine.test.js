import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync('public/game1/terrorist-studio.html','utf8');
const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
assert.ok(script,'inline studio code');
const start=script.indexOf('function sampleMotion('),end=script.indexOf('function animate(dt){',start);
assert.ok(start>=0&&end>start,'standalone motion function');
const sampleMotion=new Function(script.slice(start,end)+'return sampleMotion;')();

test('Glock, knife and AK contain exact user-supplied weapon grips and arm offsets',()=>{
 const a=script.indexOf('const zero=()=>'),b=script.indexOf('const state=',a);
 const presets=new Function(script.slice(a,b)+'return USER_POSES;')();
 assert.equal(presets.glock.weapon.x,-.02);
 assert.equal(presets.glock.weapon.rx,-86);
 assert.equal(presets.glock.weapon.ry,82);
 assert.equal(presets.glock.left.LeftArm.y,.05);
 assert.deepEqual(presets.knife.right.RightArm,{
  x:-.09,y:.07,z:.015,rx:5,ry:-72,rz:-6,scale:1
 });
 assert.deepEqual(presets.knife.left.LeftArm,{
  x:.06,y:.02,z:.04,rx:-36,ry:37,rz:0,scale:1
 });
 assert.deepEqual(presets.knife.weapon,{
  x:-.005,y:-.005,z:-.165,rx:135,ry:99,rz:97,scale:.89
 });
 assert.deepEqual(presets.ak.right.RightArm,{
  x:-.125,y:-.02,z:.055,rx:0,ry:0,rz:0,scale:1
 });
 assert.deepEqual(presets.ak.left.LeftArm,{
  x:-.035,y:.005,z:-.025,rx:32,ry:23,rz:7,scale:1
 });
 assert.deepEqual(presets.ak.weapon,{
  x:-.02,y:.07,z:-.14,rx:-77,ry:-82,rz:0,scale:1.18
 });
});
test('walk and run only animate modest leg strides and a tiny torso sway',()=>{
 for(const action of ['walk','run'])for(let i=0;i<120;i++){
  const frame=sampleMotion(action,i*.027,false,0);
  const keys=Object.keys(frame.motion);
  assert.ok(keys.every(x=>['LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','LeftFoot','RightFoot','LeftToeBase','RightToeBase','Spine','Spine1'].includes(x)),keys.join(','));
  assert.ok(Math.abs(frame.motion.LeftUpLeg.rx)<=.301);
  assert.ok(Math.abs(frame.motion.RightUpLeg.rx)<=.301);
  assert.ok(frame.motion.LeftLeg.rx<=0&&frame.motion.RightLeg.rx<=0);
  assert.equal(frame.jumpHeight,0);
  assert.equal(frame.recoil,0);
  assert.equal(frame.groundFeet,true);
 }
 assert.ok(Math.abs(sampleMotion('walk',.3,false,0).motion.LeftUpLeg.rx)<
           Math.abs(sampleMotion('run',.3,false,0).motion.LeftUpLeg.rx));
});
test('jump bends knees backwards without moving arms or the weapon mount',()=>{
 for(let i=0;i<=100;i++){
  const f=sampleMotion('jump',0,true,i/100);
  assert.ok(f.motion.LeftLeg.rx<=0&&f.motion.RightLeg.rx<=0);
  assert.ok(f.motion.LeftUpLeg.rx>=0&&f.motion.RightUpLeg.rx>=0);
  assert.ok(!Object.keys(f.motion).some(k=>/Arm|Hand|Shoulder/.test(k)));
  assert.ok(f.jumpHeight>=0&&f.jumpHeight<=.25001);
  assert.equal(f.recoil,0);
 }
});
test('crouch grounds both toes instead of lowering character through the floor',()=>{
 const f=sampleMotion('crouch',0,false,0);
 assert.equal(f.groundFeet,true);
 assert.ok(f.motion.LeftLeg.rx<0&&f.motion.RightLeg.rx<0);
 assert.ok(!Object.keys(f.motion).some(k=>/Arm|Hand|Shoulder/.test(k)));
 assert.match(script,/standingToeY-Math\.min\(l,r\)/);
 assert.match(script,/rig\.position\.y\+=Math\.max\(-\.55,Math\.min\(\.45,adjustment\)\)/);
 assert.match(script,/rig\.position\.y=baseRigY\+frame\.jumpHeight/);
});
test('only shooting moves arms and applies recoil to gun transform',()=>{
 for(const action of ['idle','walk','run','jump','crouch']){
  const f=sampleMotion(action,.15,false,.6);
  assert.equal(f.recoil,0);
 }
 const shot=sampleMotion('shoot',Math.PI/18,false,0);
 assert.ok(shot.recoil>.99);
 assert.ok(shot.motion.RightArm.rx<0);
 assert.match(script,/if\(action==='shoot'\)\{\s*const amount=frame\.recoil/);
 assert.match(script,/weaponPivot\.position\.z-=amount\*\.055/);
});
test('studio saves v2 while retaining the authored presets on first load',()=>{
 assert.match(script,/GameBlockOperatorStudioV2/);
 assert.match(script,/state\.config=\{\.\.\.copyConfig\(USER_POSES\),\.\.\.\(savedV2\|\|\{\}\)\}/);
 assert.doesNotThrow(()=>new vm.Script(script));
});
