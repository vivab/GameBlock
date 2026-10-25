import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('public/game1/ct-sas-studio.html','utf8');
const js=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
assert.ok(js,'inline CT studio logic');

const start=js.indexOf('const MATCHED_SKELETON=');
const end=js.indexOf('for(const [weapon,mapping] of Object.entries(MATCHED_SKELETON))',start);
assert.ok(start>=0&&end>start,'retargeted SAS presets exist');
const poses=new Function(js.slice(start,end)+'return MATCHED_SKELETON;')();
test('Glock, rifle and knife have independent anatomical poses',()=>{
 assert.deepEqual(Object.keys(poses),['glock','ak','knife']);
 for(const [gun,p] of Object.entries(poses)){
  for(const side of ['left','right']){
   for(const joint of [side==='left'?'LeftShoulder':'RightShoulder',
                       side==='left'?'LeftArm':'RightArm',
                       side==='left'?'LeftForeArm':'RightForeArm']){
    const ang=p[side][joint];
    assert.equal(ang.length,3,joint+' '+gun);
    assert.ok(ang.every(x=>Number.isFinite(x)&&Math.abs(x)<=150));
   }
  }
  for(const value of ['x','y','z','rx','ry','rz','scale'])
   assert.ok(Number.isFinite(p.weapon[value]),gun+' '+value);
 }
 assert.notDeepEqual(poses.glock.right.RightArm,poses.ak.right.RightArm);
 assert.notDeepEqual(poses.knife.left.LeftForeArm,poses.ak.left.LeftForeArm);
 assert.notDeepEqual(poses.glock.weapon,poses.ak.weapon);
});
test('numerical retarget includes distinct CT socket offsets and original weapon scale',()=>{
 assert.ok(Math.abs(poses.glock.weapon.y+.1219)<1e-8);
 assert.ok(Math.abs(poses.ak.weapon.z+.2187)<1e-8);
 assert.ok(Math.abs(poses.knife.weapon.rz-140)<1e-8);
 assert.equal(poses.glock.weapon.scale,1);
 assert.equal(poses.ak.weapon.scale,1.18);
 assert.equal(poses.knife.weapon.scale,.89);
});
test('pose is applied to real SAS rig and not to a dummy character',()=>{
 assert.match(js,/const USER_POSES=\{glock:USER_GLOCK,ak:USER_AK,knife:USER_KNIFE/);
 assert.match(js,/pose\[side\]\[joint\]=\{\.\.\.zero\(\),rx:angles\[0\],ry:angles\[1\],rz:angles\[2\]\}/);
 assert.match(js,/pose\[side\]\[side==='right'\?'RightHand':'LeftHand'\]=zero\(\)/);
 assert.match(js,/pose\.weapon=\{\.\.\.mapping\.weapon\}/);
 assert.match(js,/holder=bones\.WeaponSocketR\|\|bones\.RightHand/);
 assert.match(js,/bone\.quaternion\.copy\(base\.quaternion\)\.multiply/);
 assert.doesNotThrow(()=>new vm.Script(js));
});
test('users retain separate legacy saved edits and can reapply all 3 baseline poses',()=>{
 assert.match(html,/id="matchTerrorist"/);
 assert.match(html,/id="restorePrevious"/);
 assert.match(js,/GameBlockCT_SAS_StudioV2/);
 assert.match(js,/GameBlockCT_SAS_StudioV3/);
 assert.match(js,/state\.config=copyConfig\(MATCHED_POSES\)/);
 assert.match(js,/state\.config=\{\.\.\.copyConfig\(MATCHED_POSES\),\.\.\.\(savedV3\|\|\{\}\)\}/);
 assert.match(js,/localStorage\.setItem\('GameBlockCT_SAS_StudioV3'/);
});
