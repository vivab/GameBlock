import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=name=>readFileSync(new URL('../public/game1/'+name,import.meta.url),'utf8');

test('Bomb mode has circular touch controls and four-slot radial wheel',()=>{
 const html=source('bomb.html');
 assert.match(html,/id="weaponToggle"/);
 assert.match(html,/#weapons\.open/);
 assert.match(html,/#weapons button\[data-slot="bomb"\]/);
 assert.match(html,/#weapons button\[data-slot="pistol"\]/);
 assert.match(html,/#weapons button\[data-slot="knife"\]/);
 assert.match(html,/#weapons button\[data-slot="primary"\]/);
 assert.match(html,/#actionRow button\{width:54px;height:54px/);
});
test('Touch hold-drag and tap selection stay connected to the real weapon state',()=>{
 const js=source('bomb.js');
 assert.match(js,/function wheelTarget\(x,y\)/);
 assert.match(js,/wheelToggle\.addEventListener\('pointermove'/);
 assert.match(js,/if\(hit\)\{setSlot\(hit\.dataset\.slot\);closeWheel\(\)\}/);
 assert.match(js,/if\(setSlot\(b\.dataset\.slot\)\)closeWheel\(\)/);
 assert.match(js,/bombButton\.classList\.toggle\('unavailable'/);
});
test('Dust2 mesh raycasts use broadphase and cached terrain height without fake Y=8 cap',()=>{
 const js=source('bomb.js');
 assert.match(js,/function refreshLevelCollision\(\)/);
 assert.match(js,/levelBounds=levelMeshes\.map/);
 assert.match(js,/function levelHits\(ray\)/);
 assert.match(js,/ray\.ray\.intersectsBox/);
 assert.match(js,/const groundCache=new Map\(\)/);
 assert.doesNotMatch(js,/Math\.min\(8,hit\.point\.y\)/);
});
test('C4 position uses the terrain floor for both drop and plant',()=>{
 const js=source('bomb.js');
 assert.match(js,/game\.bombPosition=\{x:actor\.x,y:floorY,z:actor\.z\}/);
 assert.match(js,/game\.bombDropped=\{x:actor\.x,y:floorY,z:actor\.z\}/);
 assert.match(js,/bombObject\.position\.set\(actor\.x,floorY\+\.012,actor\.z\)/);
});
test('Bomb rush bots throttle vision, floor and route checks',()=>{
 const js=source('bomb.js');
 assert.match(js,/bot\.visionCheckAt=now\+\.17/);
 assert.match(js,/bot\.floorCheckAt=now\+\.12/);
 assert.match(js,/bot\.stepCheckAt=now\+\.085/);
});
