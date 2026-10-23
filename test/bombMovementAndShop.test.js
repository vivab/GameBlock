import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BOMB_RULES,BOMB_MOVE_SPEED,bombMoveSpeed,canUseBombShop,makeBombMatch,tickBombClock,makeBombPlayer} from '../public/game1/bomb-rules.js';
import {SUNDOWN_SPAWNS,SUNDOWN_SITES,SUNDOWN_SOLIDS,sundownBlocks,findSundownPath} from '../public/game1/sundown-map.js';

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
 const player=actors[0],spawn=SUNDOWN_SPAWNS.t;
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
 assert.match(src,/if\(!sundownBlocks\(nx,nz,\.40\)\)/);
 assert.doesNotMatch(src,/if\(!actor\.reloadingUntil\).*?updatePlayer\(/s);
 assert.match(src,/if\(result==='next-round'\)byId\('shop'\)\.hidden=true/);
 assert.match(html,/id="shopOpen"/);
 assert.match(html,/id="shopHint"/);
 assert.match(html,/id="grenadeEquip"/);
});
test('map has four accessible interior courtyards with true collision perimeters',()=>{
 const inner=[{x:-23,z:-22},{x:-23,z:0},{x:22,z:-23},{x:24,z:0}];
 for(const p of inner){
   assert.ok(!sundownBlocks(p.x,p.z,.42),'inside should be walkable '+JSON.stringify(p));
   assert.ok(findSundownPath(p,SUNDOWN_SPAWNS.t).length>0,'inside connects to T spawn');
   assert.ok(findSundownPath(p,SUNDOWN_SPAWNS.ct).length>0,'inside connects to CT spawn');
 }
 assert.ok(SUNDOWN_SOLIDS.length>50,'multiple wall segments and cover expected');
 assert.equal(SUNDOWN_SITES.length,2);
});
