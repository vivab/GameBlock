import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BOMB_WEAPONS,BOMB_RULES} from '../public/game1/bomb-rules.js';

const source=name=>readFileSync(new URL('../public/game1/'+name,import.meta.url),'utf8');

test('M4A4 upgrade is the same new GLB in bomb prices and Game1 first-person hands',()=>{
 const hands=source('hands.js');
 assert.equal(BOMB_WEAPONS.m4a4.file,'rifle__m4a4_weapon_model_cs2.glb');
 assert.match(hands,/m4a4:\s*\{ file: 'rifle__m4a4_weapon_model_cs2\.glb'/);
 assert.match(hands,/Preserve original GLB paint and textures/);
});
test('Karambit inspection moves wrist and finger joints, without moving shoulder',()=>{
 const hands=source('hands.js');
 assert.match(hands,/kar: kf/);
 assert.match(hands,/fingerChains/);
 assert.match(hands,/restCurl/);
 assert.match(hands,/const fold=kw/);
 assert.match(hands,/gR\.userData\.arm\.matrix\.identity\(\)/);
 assert.ok(hands.includes('6.283185307'),'blade makes one full turn');
});
test('M16 red dot suppresses regular crosshair; flash tests vertical viewing',()=>{
 const html=source('bomb.html'),code=source('bomb.js');
 assert.match(html,/#scope\.red:before/);
 assert.match(code,/byId\('crosshair'\)\.style\.visibility='hidden'/);
 assert.match(code,/byId\('crosshair'\)\.style\.visibility='visible'/);
 assert.match(code,/camera\.getWorldDirection\(new V\(\)\)/);
 assert.equal(BOMB_WEAPONS.m16.scope,true);
});
test('Bomb bots split positions, detour around geometry, and retain all timers',()=>{
 const code=source('bomb.js');
 assert.match(code,/function botObjective\(bot\)/);
 assert.match(code,/function passableStep\(bot,x,z\)/);
 assert.match(code,/function seekBot\(bot,goal,dt,speed\)/);
 assert.match(code,/if\(!passableStep\(bot,x,z\)\)/);
 assert.equal(BOMB_RULES.plantSeconds,4);
 assert.equal(BOMB_RULES.defuseSeconds,10);
 assert.equal(BOMB_RULES.kitDefuseSeconds,5);
 assert.equal(BOMB_RULES.grenadeFuse,3);
});
