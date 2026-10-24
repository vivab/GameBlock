import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BOMB_RULES,BOMB_MOVE_SPEED,bombMoveSpeed,canUseBombShop,makeBombMatch,tickBombClock,makeBombPlayer} from '../public/game1/bomb-rules.js';
import {ITALY_SPAWNS,ITALY_SITES,ITALY_SPAWN_POINTS,italyBlocks,findItalyPath} from '../public/game1/italy-import-map.js';

test('weapon speed hierarchy and grenade sprint are strict',()=>{
 const knife=bombMoveSpeed('knife');
 assert.ok(bombMoveSpeed('he',{grenadeHeld:true})>knife);
 assert.ok(knife>bombMoveSpeed('bomb'));
 assert.ok(bombMoveSpeed('bomb')>bombMoveSpeed('glock'));
 assert.ok(bombMoveSpeed('glock')>bombMoveSpeed('rifle'));
 assert.ok(bombMoveSpeed('rifle')>bombMoveSpeed('awp'));
 assert.ok(bombMoveSpeed('awp')>bombMoveSpeed('m249'));
 assert.ok(bombMoveSpeed('rifle',{aiming:true})<bombMoveSpeed('rifle'));
 assert.ok(bombMoveSpeed('knife',{crouched:true})<bombMoveSpeed('knife'));
 assert.equal(Object.keys(BOMB_MOVE_SPEED).length,7);
});
test('shop is accessible at the CURRENT spawn for precisely 25 seconds total',()=>{
 const actors=[makeBombPlayer('player','t',true),makeBombPlayer('ct','ct')];
 const game=makeBombMatch(actors,()=>0);
 const player=actors[0],spawn=ITALY_SPAWNS.t;
 player.x=spawn.x;player.z=spawn.z;
 assert.equal(BOMB_RULES.buySeconds,10);
 assert.equal(BOMB_RULES.shopSeconds,25);
 assert.ok(canUseBombShop(game,player,spawn));
 tickBombClock(game,10,actors);
 assert.equal(game.phase,'live');
 assert.ok(canUseBombShop(game,player,spawn),'shop must work after freeze ends');
 player.x=spawn.x+12;
 assert.equal(canUseBombShop(game,player,spawn),false,'cannot buy outside spawn radius');
 player.x=spawn.x;
 tickBombClock(game,14.9,actors);
 assert.ok(canUseBombShop(game,player,spawn));
 tickBombClock(game,.2,actors);
 assert.equal(canUseBombShop(game,player,spawn),false);
});
test('reload does not gate movement and mobile controls expose shop/grenade',()=>{
 const src=readFileSync('public/game1/bomb-desert-v2.js','utf8');
 const html=readFileSync('public/game1/desert.html','utf8');
 assert.match(src,/bombMoveSpeed\(weaponId,\{crouched:doCrouch,aiming,grenadeHeld\}\)/);
 assert.match(src,/const canWalk=\(x,z\)=>!italyBlocks\(x,z,\.38\)/);
 assert.doesNotMatch(src,/if\(!actor\.reloadingUntil\).*?updatePlayer\(/s);
 assert.match(src,/if\(result==='next-round'\)byId\('shop'\)\.hidden=true/);
 assert.match(html,/id="shopOpen"/);
 assert.match(html,/id="shopHint"/);
 assert.match(html,/id="grenadeEquip"/);
});
test('downloaded Italy has five safe spawn locations for each side',()=>{
 for(const side of ['t','ct']){
  assert.equal(ITALY_SPAWN_POINTS[side].length,5);
  for(const [x,z] of ITALY_SPAWN_POINTS[side]){
   assert.equal(italyBlocks(x,z,.38),false);
   for(const site of ITALY_SITES)assert.ok(findItalyPath({x,z},site).length>0);
  }
 }
 assert.equal(ITALY_SITES.length,2);
});
