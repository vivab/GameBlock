import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,openSync,readSync,closeSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ARENA_WALLS} from '../src/combat.js';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Game1 complete game and menu were copied without overwriting GameBlock',()=>{
  const source=file('public/game1/game.js');
  const hands=file('public/game1/hands.js');
  const menu=file('public/game1/menu.html');
  const html=file('public/game1/index.html');
  assert.ok(source.length>100000);
  assert.ok(menu.length>60000);
  assert.match(hands,/function makeHand/);
  assert.match(source,/buildGameBlockArena\(\)/);
  assert.match(menu,/const GAME_URL = 'index\.html\?play=1'/);
  assert.match(html,/gameblock-arena-data\.js/);
  assert.match(html,/gameblock-arena\.js/);
  assert.match(html,/src="hands\.js"/);
  assert.match(html,/src="game\.js"/);
  assert.match(file('src/menu.js'),/retroGame1/);
  assert.match(file('src/main.js'),/swat:'counter_flame_swat_v8'/);
});
test('Game1 map and AK are strictly excluded from imported game',()=>{
  assert.equal(ARENA_WALLS.length,10);
  for(const path of ['public/game1/game.js','public/game1/hands.js','public/game1/index.html']){
    const s=file(path);
    assert.doesNotMatch(s,/lowpoly__fps__tdm__game__map_by_resoforge/);
    assert.doesNotMatch(s,/ak-47_low_poly/);
    assert.match(s,/\.\.\/models\/ak47\.glb/);
  }
  const adapter=file('public/game1/gameblock-arena.js');
  const generator=file('scripts/build-game1-map.mjs');
  const importer=file('scripts/sync-game1-assets.sh');
  assert.match(adapter,/GAMEBLOCK_ARENA_WALLS/);
  assert.match(generator,/import \{ARENA_WALLS\} from '\.\.\/src\/combat\.js'/);
  assert.match(importer,/0ca998c64b0c3638152d8bd49f9e3dc0bd8879f1/);
  assert.match(importer,/cp public\/models\/knife_t\.glb/);
});

test('all permitted Game1 weapons physically exist in GameBlock, with valid GLB headers',()=>{
  const allowed=[
    'glock.glb','knife_default_t__cs2.glb','low-poly_desert_eagle.glb',
    'low-poly_m16a4_acog.glb','low-poly_m249_saw.glb',
    'low-poly_mossberg_590.glb','low-poly_usp-s.glb','low_poly_awp.glb',
    'low_poly_shotgun-m870.glb','low_poly_stylized_karambit_knife.glb',
    'rifle__m4a4_weapon_model_cs2.glb','sig_sauer_p250_low-poly.glb'
  ];
  for(const name of allowed){
    const url=new URL('../public/game1/'+name,import.meta.url);
    assert.ok(existsSync(url),name+' missing from the GameBlock repository');
    assert.ok(statSync(url).size>160000,name+' file seems incomplete');
    const first=Buffer.alloc(4),fd=openSync(url,'r');
    try{readSync(fd,first,0,4,0);}finally{closeSync(fd);}
    assert.equal(first.toString('ascii'),'glTF',name+' must be a binary glTF');
  }
  for(const banned of [
    'ak-47_low_poly.glb','lowpoly__fps__tdm__game__map_by_resoforge.glb'
  ])assert.ok(!existsSync(new URL('../public/game1/'+banned,import.meta.url)));
});
test('native GameBlock AK stays byte-for-byte identical to before the import',()=>{
  const originalAK=readFileSync(new URL('../public/models/ak47.glb',import.meta.url));
  const objectSha=createHash('sha1')
    .update('blob '+originalAK.length+'\0').update(originalAK).digest('hex');
  assert.equal(objectSha,'bbe412e7d7aecc442e3446cefade98f5c2248aa2');
});
