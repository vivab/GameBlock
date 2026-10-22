import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,openSync,readSync,closeSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ARENA_WALLS} from '../src/combat.js';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Complete Game1 content is playable beside native GameBlock',()=>{
 const source=file('public/game1/game.js');
 const hands=file('public/game1/hands.js');
 const menu=file('public/game1/menu.html');
 const html=file('public/game1/index.html');
 assert.ok(source.length>100000);
 assert.ok(hands.length>30000);
 assert.ok(menu.length>60000);
 assert.match(hands,/function makeHand/);
 assert.match(menu,/const GAME_URL = 'index\.html\?play=1'/);
 assert.match(html,/src="hands\.js"/);
 assert.match(html,/src="game\.js"/);
 assert.match(source,/const PRIM =/);
 assert.match(file('src/main.js'),/createBlockFighter\(palette\)/,
  'native GameBlock TDM remains available as a separate mode');
 assert.equal(ARENA_WALLS.length,10);
});
test('Original Game1 arena, AK, de_dust2 and M4A4 are included for requested game modes',()=>{
 const source=file('public/game1/game.js');
 const hands=file('public/game1/hands.js');
 assert.match(source,/lowpoly__fps__tdm__game__map_by_resoforge/);
 assert.match(hands,/ak-47_low_poly/);
 assert.match(hands,/rifle__m4a4_weapon_model_cs2\.glb/);
 assert.ok(existsSync(new URL('../public/game1/de_dust2_-_cs_map.glb',import.meta.url)));
 assert.match(file('public/game1/bomb.js'),/de_dust2_-_cs_map\.glb/);
});
test('ALL Game1 weapons and source maps physically exist, with valid GLB headers',()=>{
 const names=[
  'ak-47_low_poly.glb','de_dust2_-_cs_map.glb','glock.glb',
  'knife_default_t__cs2.glb','low-poly_desert_eagle.glb',
  'low-poly_m16a4_acog.glb','low-poly_m249_saw.glb',
  'low-poly_mossberg_590.glb','low-poly_usp-s.glb','low_poly_awp.glb',
  'low_poly_shotgun-m870.glb','low_poly_stylized_karambit_knife.glb',
  'lowpoly__fps__tdm__game__map_by_resoforge.glb','m18_smoke_grenade_low-poly.glb',
  'm4a4_low_poly.glb','m67_grenade_low-poly.glb','m84_stun_grenade_low-poly.glb',
  'rifle__m4a4_weapon_model_cs2.glb','sig_sauer_p250_low-poly.glb'
 ];
 for(const name of names){
  const url=new URL('../public/game1/'+name,import.meta.url);
  assert.ok(existsSync(url),name+' missing');
  assert.ok(statSync(url).size>50000,name+' asset looks truncated');
  const first=Buffer.alloc(4),fd=openSync(url,'r');
  try{readSync(fd,first,0,4,0)}finally{closeSync(fd)}
  assert.equal(first.toString('ascii'),'glTF',name+' has a valid GLB magic');
 }
});
test('Native GameBlock AK is preserved and not overwritten by Game1',()=>{
 const originalAK=readFileSync(new URL('../public/models/ak47.glb',import.meta.url));
 const sha=createHash('sha1').update('blob '+originalAK.length+'\0').update(originalAK).digest('hex');
 assert.equal(sha,'bbe412e7d7aecc442e3446cefade98f5c2248aa2');
});
