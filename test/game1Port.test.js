import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
