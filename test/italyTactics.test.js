import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 CT_ROLES,T_ROLES,italyRole,italySafePoint,italyRouteGates,italyRouteReachable,italyPickCover
} from '../public/game1/italy-tactics.js';
import {ITALY_SPAWNS,ITALY_SITES,italyBlocks} from '../public/game1/italy-import-map.js';

const code=readFileSync('public/game1/bomb-desert-v2.js','utf8');
const html=readFileSync('public/game1/desert.html','utf8');
const map=readFileSync('public/game1/italy-import-map.js','utf8');

test('Italy baked sunlit textures render in sRGB without crushed shadows',()=>{
 assert.match(code,/renderer\.outputEncoding=THREE\.sRGBEncoding/);
 assert.match(code,/renderer\.toneMapping=THREE\.NoToneMapping/);
 assert.match(map,/material\.toneMapped=false/);
 assert.match(map,/diffuseColor\.rgb = mix\(diffuseColor\.rgb, sqrt/);
});
test('bomb zones and letters are only rendered on HUD mini-map',()=>{
 assert.match(html,/<canvas id="miniMap"/);
 assert.match(code,/function makeMiniMap\(\)/);
 assert.match(code,/function renderMiniMap\(now\)/);
 assert.match(code,/miniCtx\.fillText\(site\.id/);
 assert.doesNotMatch(code,/new THREE\.RingGeometry\(site/);
 assert.doesNotMatch(code,/new THREE\.Sprite\(/);
});
test('mobile movement and weapon pointers have independent capture',()=>{
 assert.match(code,/if\(joy\.id!==null\)return/);
 assert.match(code,/zone\.setPointerCapture\(e\.pointerId\)/);
 assert.match(code,/wheelToggle\.setPointerCapture\(e\.pointerId\)/);
 assert.match(code,/b\.addEventListener\('pointerdown',event=>/);
 assert.match(code,/if\(setSlot\(b\.dataset\.slot\)\)closeWheel\(\)/);
 assert.match(code,/wheel\.classList\.contains\('open'\).*#joystick/);
});
test('each round squad roles include anchors, pushers, flankers and escorts',()=>{
 assert.ok(CT_ROLES.includes('push')&&CT_ROLES.includes('anchorA')&&CT_ROLES.includes('anchorB'));
 assert.ok(T_ROLES.includes('flank')&&T_ROLES.includes('escort')&&T_ROLES.includes('lurk'));
 for(const side of ['ct','t'])for(let round=1;round<=10;round++){
  const roles=Array.from({length:5},(_,i)=>italyRole(side,i,round,round%5));
  assert.equal(new Set(roles).size,5);
 }
});
test('alternate west/middle/east tactical routes stay on actual Italy walkable ground',()=>{
 for(const side of ['ct','t'])for(const lane of ['west','middle','east'])
  for(const site of ITALY_SITES){
   const points=italyRouteGates(side,lane,site);
   assert.ok(points.length>=3,side+' '+lane);
   assert.equal(italyRouteReachable(ITALY_SPAWNS[side],points),true,side+' '+lane+' '+site.id);
   for(const p of points)assert.equal(italyBlocks(p.x,p.z,.38),false);
  }
});
test('cover spots are reachable, near their plant and physically separated',()=>{
 for(const site of ITALY_SITES){
  const occupied=[];
  for(let i=0;i<5;i++){
   const p=italyPickCover(site,ITALY_SPAWNS.ct,i,()=>false,occupied);
   assert.ok(p,'cover is missing');
   assert.equal(italyBlocks(p.x,p.z,.38),false);
   assert.ok(Math.hypot(p.x-site.x,p.z-site.z)<15);
   occupied.push(p);
  }
  assert.ok(new Set(occupied.map(p=>Math.round(p.x)+','+Math.round(p.z))).size>=4);
 }
});
test('bot decisions support postplant hold/hunt, CT retake and remembered sightings',()=>{
 assert.match(code,/const hunter=fighters\.length\?/);
 assert.match(code,/order\.mode='hunt'/);
 assert.match(code,/order\.mode='defuse'/);
 assert.match(code,/order\.mode='flank-guard'/);
 assert.match(code,/teamIntel\[bot\.side\]=\{x:target\.x,z:target\.z,seenAt:now\}/);
 assert.match(code,/groundLOS\(from,to\)/);
 assert.match(code,/italyCanTraverse\(\{x:bot\.x,z:bot\.z\},\{x,z\},\.12\)/);
});
