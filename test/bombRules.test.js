import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
 BOMB_RULES,BOMB_WEAPONS,BOMBSHOP_GEAR,actualSide,heDamage,flashAlpha,
 canPlant,canDefuse,defuseDuration,makeBombPlayer,makeBombMatch,buyBombItem,
 awardBombRound,nextBombRound,tickBombClock,segmentPassesSmoke
} from '../public/game1/bomb-rules.js';

test('User-approved weapon economics and magazine sizes are preserved',()=>{
 const expected={
  usp:[200,12,72],glock:[200,17,68],p250:[400,13,52],deagle:[700,7,42],
  rifle:[3000,30,120],m4a4:[3000,30,120],m16:[3200,30,120],
  mossberg:[1000,7,42],m870:[1000,7,42],m249:[3600,100,200],awp:[4000,5,30]
 };
 for(const [id,[price,mag,reserve]] of Object.entries(expected)){
  const info=BOMB_WEAPONS[id];
  assert.deepEqual([info.price,info.mag,info.reserve],[price,mag,reserve],id);
 }
 assert.equal(BOMBSHOP_GEAR.kit.side,'ct');
 assert.equal(BOMB_RULES.buySeconds,10);
 assert.equal(BOMB_RULES.shopSeconds,25);
 assert.equal(BOMB_RULES.winsToFinish,10);
 assert.equal(BOMB_RULES.roundsBeforeSideSwap,9);
});
test('First round has $800, random C4 carrier and T/CT swap after ninth',()=>{
 const actors=[makeBombPlayer('me','ct',true),
  ...Array.from({length:4},(_,i)=>makeBombPlayer('c'+i,'ct')),
  ...Array.from({length:5},(_,i)=>makeBombPlayer('t'+i,'t'))];
 const state=makeBombMatch(actors,()=>.99);
 assert.equal(actors[0].money,800);
 assert.equal(state.phase,'buy');
 assert.equal(state.time,10);
 assert.equal(state.shopRemaining,25);
 assert.equal(actors.filter(x=>x.hasBomb).length,1);
 assert.equal(actors[9].hasBomb,true,'random picker can choose any of five terrorists');
 for(let i=2;i<=10;i++)nextBombRound(state,actors,()=>.01);
 assert.equal(state.round,10);
 assert.equal(actors[0].side,'t');
 assert.equal(actors[9].side,'ct');
 assert.equal(actors.filter(x=>x.hasBomb&&x.side==='t').length,1);
 assert.equal(actualSide('ct',9),'ct');
 assert.equal(actualSide('ct',10),'t');
});
test('CT-only defuse kit, shop lock and economy',()=>{
 const ct=makeBombPlayer('c','ct',true),t=makeBombPlayer('t','t');
 assert.equal(buyBombItem(ct,'kit','buy').ok,true);
 assert.equal(ct.money,400);
 assert.equal(ct.hasKit,true);
 assert.equal(buyBombItem(ct,'kit','buy').ok,false);
 assert.equal(buyBombItem(t,'kit','buy').ok,false);
 assert.equal(buyBombItem(t,'deagle','buy').ok,true);
 assert.equal(t.money,100);
 assert.equal(buyBombItem(t,'m4a4','buy').ok,false);
 assert.equal(buyBombItem(ct,'glock','live').ok,false);
 assert.equal(defuseDuration(true),5);
 assert.equal(defuseDuration(false),10);
 assert.equal(canPlant('t',true,'A'),true);
 assert.equal(canPlant('ct',true,'A'),false);
 assert.equal(canDefuse('ct',true),true);
 assert.equal(canDefuse('t',true),false);
});
test('Free karambit is available in the bomb-mode store without deducting $800',()=>{
 const actor=makeBombPlayer('player','ct',true);
 const original=actor.money;
 const upgraded=buyBombItem(actor,'karambit','buy');
 assert.equal(upgraded.ok,true);
 assert.equal(upgraded.cost,0);
 assert.equal(actor.money,original);
 assert.equal(actor.weapons.knife,'karambit');
 assert.equal(buyBombItem(actor,'knife','buy').ok,true);
 assert.equal(actor.weapons.knife,'knife');
 assert.equal(buyBombItem(actor,'karambit','live').ok,false,
  'knife variants can be changed only during buy time');
});

test('Timed phases, first-to-ten wins and no instant win at 9',()=>{
 const players=[makeBombPlayer('c','ct'),makeBombPlayer('t','t')];
 const state=makeBombMatch(players,()=>0);
 assert.equal(tickBombClock(state,10,players),'round-start');
 assert.equal(state.phase,'live');
 assert.equal(awardBombRound(state,players,'ct'),true);
 assert.equal(awardBombRound(state,players,'ct'),false);
 for(let i=2;i<=9;i++){
  nextBombRound(state,players);
  awardBombRound(state,players,'ct');
 }
 assert.equal(state.wins.ct,9);
 assert.equal(state.finished,false);
 nextBombRound(state,players);
 assert.equal(awardBombRound(state,players,'ct'),true);
 assert.equal(state.wins.ct,10);
 assert.equal(state.phase,'finished');
});
test('HE falloff, white 2 seconds and fade 3 seconds, smoke vision',()=>{
 assert.equal(heDamage(0),95);
 assert.equal(heDamage(8),0);
 assert.ok(heDamage(4)>heDamage(7));
 assert.equal(flashAlpha(0),1);
 assert.equal(flashAlpha(2),1);
 assert.ok(flashAlpha(3)>0&&flashAlpha(3)<1);
 assert.equal(flashAlpha(5),0);
 assert.equal(BOMB_RULES.grenadeFuse,3);
 assert.equal(BOMB_RULES.smokeSeconds,20);
 assert.equal(segmentPassesSmoke({x:0,z:0},{x:10,z:0},{x:5,z:0}),true);
 assert.equal(segmentPassesSmoke({x:0,z:0},{x:10,z:0},{x:5,z:9}),false);
});
test('Bomb UI loads Game1 weapon hands and our new map and exposes independent phase controls',()=>{
 const html=readFileSync(new URL('../public/game1/bomb.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../public/game1/bomb.js',import.meta.url),'utf8');
 for(const file of ['GLTFLoader.js','hands.js','bomb.js'])
  assert.ok(html.includes(file),'Game1 script '+file+' must be loaded');
 assert.ok(js.includes('Desert Crossroads'));
 assert.ok(!js.includes("loader.load('de_dust2_-_cs_map.glb'"));
 for(const token of ['window.loadGLTFModels','positionGround','tickHold','grenadeEffect',
  'segmentPassesSmoke','aiming','roundSerial','checkElimination','plantBomb'])
  assert.ok(js.includes(token),token);
});

test('Every imported Game1 gameplay script parses and bomb UI controls exist',()=>{
 for(const path of ['../public/game1/bomb.js','../public/game1/bomb-rules.js',
   '../public/game1/game.js','../public/game1/hands.js']){
  const url=new URL(path,import.meta.url);
  assert.doesNotThrow(()=>execFileSync(process.execPath,['--check',fileURLToPath(url)],{stdio:'pipe'}),path);
 }
 const html=readFileSync(new URL('../public/game1/bomb.html',import.meta.url),'utf8');
 const code=readFileSync(new URL('../public/game1/bomb.js',import.meta.url),'utf8');
 const used=new Set([...code.matchAll(/byId\\('([^']+)'\\)/g)].map(x=>x[1]));
 for(const id of used)assert.ok(html.includes('id="'+id+'"'),'bomb.html missing #'+id);
});
