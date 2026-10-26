import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const path='public/game1/ctm_sas_gameblock.glb';
const glb=readFileSync(path);
const html=readFileSync('public/game1/ct-sas-studio.html','utf8');
const js=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
const size=glb.readUInt32LE(8);
const jl=glb.readUInt32LE(12);
const doc=JSON.parse(glb.toString('utf8',20,20+jl));

test('SAS uses an optimized valid glTF 2.0 with intact 111-bone rig and 8 textures',()=>{
 assert.equal(glb.toString('utf8',0,4),'glTF');
 assert.equal(glb.readUInt32LE(4),2);
 assert.equal(size,glb.length);
 assert.equal(doc.skins.length,1);
 assert.equal(doc.skins[0].joints.length,111);
 assert.equal(doc.images.length,8);
 assert.equal(doc.meshes.length,5);
 assert.ok(glb.length<2500000);
 assert.ok(!doc.animations?.length);
 assert.ok(doc.nodes.some(n=>n.name==='hand_R_037'));
 assert.ok(doc.nodes.some(n=>n.name==='hand_L_070'));
});

test('CT editor supports independent arm joints, all fingers and weapon attachment',()=>{
 assert.match(html,/swat_animated_180cm\.glb/);
 assert.match(html,/CTM_SAS_ATTRIBUTION\.txt/);
 for(const part of ['RightShoulder','RightArm','RightForeArm','RightHand','LeftShoulder',
 'LeftArm','LeftForeArm','LeftHand','LeftThumb','LeftIndex','RightThumb','RightIndex',
 'RightFoot','LeftFoot','WeaponSocketR']){
  assert.ok(js.includes(part),part);
 }
 assert.match(js,/model\.rotation\.set\(0,0,0\)/);
 assert.match(js,/holder=bones\.WeaponSocketR\|\|bones\.RightHand\|\|model/);
 assert.match(js,/model\.getObjectByName\(actual\)/);
 assert.match(js,/function ctRigMotion\(name,p\)/);
 assert.match(js,/GameBlockCT_SAS_StudioV2/);
 assert.match(js,/const USER_POSES=\{glock:USER_GLOCK,ak:USER_AK,knife:USER_KNIFE/);
 assert.match(js,/const USER_AK=copyConfig\(USER_GLOCK\)/);
 assert.match(js,/USER_KNIFE\.weapon=P\(-\.01,\.02,-\.03,128,76,92,\.95\)/);
 assert.doesNotThrow(()=>new vm.Script(js));
});

test('CT model license has authorship and URL for CC BY attribution',()=>{
 const info=readFileSync('public/game1/CTM_SAS_ATTRIBUTION.txt','utf8');
 assert.match(info,/yttur6453/);
 assert.match(info,/05e0ea795e314c49b099000de002e719/);
 assert.match(info,/CC BY 4\.0/);
});
