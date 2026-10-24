import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ITALY_SPAWNS,ITALY_SPAWN_POINTS,ITALY_SITES,italyCanTraverse,italyGround,findItalyPath} from '../public/game1/italy-import-map.js';
import {italyRouteGates} from '../public/game1/italy-tactics.js';

const source=readFileSync('public/game1/bomb-desert-v2.js','utf8');
// Run the game's actual steering logic without needing WebGL on CI.
function grab(name){
 const start=source.indexOf('function '+name+'(');
 assert.ok(start>=0,'Missing '+name);
 const first=source.indexOf('{',start);
 let depth=0;
 for(let i=first;i<source.length;i++){
  if(source[i]==='{')depth++;
  if(source[i]==='}'&&!--depth)return source.slice(start,i+1);
 }
 throw new Error('Unclosed '+name);
}
const clock={time:0};
const {seekBot}=new Function('positionGround','italyCanTraverse','findItalyPath','performance','botIndex','clamp',
 grab('passableStep')+'\n'+grab('seekBot')+'\nreturn {seekBot};'
)(italyGround,italyCanTraverse,findItalyPath,{now:()=>clock.time*1000},
 bot=>Number(String(bot.id).match(/(\d+)$/)?.[1]||0),
 (v,lo,hi)=>Math.max(lo,Math.min(hi,v))
);
function fighter(x,z,i=1){return {id:'bot'+i,x,z,y:italyGround(x,z),routeVariant:i,walkPhase:0}}
function walk(bot,goal,fps=30,speed=4.5,limit=120,arrival=.85){
 const dt=1/fps,end=clock.time+limit;
 let standing=0;
 while(clock.time<end){
  if(Math.hypot(bot.x-goal.x,bot.z-goal.z)<arrival)return true;
  const x=bot.x,z=bot.z;
  seekBot(bot,goal,dt,speed);clock.time+=dt;
  standing=Math.hypot(bot.x-x,bot.z-z)<.001?standing+dt:0;
  if(standing>15)break;
 }
 return Math.hypot(bot.x-goal.x,bot.z-goal.z)<arrival;
}
test('precise paths preserve safe half-metre turns',()=>{
 let edges=0;
 for(const side of ['ct','t'])for(const [x,z] of ITALY_SPAWN_POINTS[side])
  for(const site of ITALY_SITES){
   let here={x,z};
   const points=findItalyPath(here,site,true);
   assert.ok(points.length>0,side+' has no path to '+site.id);
   for(const next of points){
    assert.ok(Math.hypot(here.x-next.x,here.z-next.z)<.73,'shortcut across a corner');
    assert.equal(italyCanTraverse(here,next,.1),true,'blocked grid edge');
    here=next;edges++;
   }
  }
 assert.ok(edges>900);
});
test('all twenty journeys reach both bombsites at 20 and 60 fps',()=>{
 for(const fps of [20,60])for(const side of ['ct','t'])
  for(let i=0;i<5;i++)for(const site of ITALY_SITES){
   clock.time=0;
   const [x,z]=ITALY_SPAWN_POINTS[side][i],bot=fighter(x,z,i+1);
   assert.ok(walk(bot,site,fps),side+' bot '+i+' stalled en route to '+site.id+
    ' at '+bot.x.toFixed(2)+','+bot.z.toFixed(2));
  }
});
test('twelve squad lanes follow every intermediate tactical gate',()=>{
 for(const side of ['ct','t'])for(const lane of ['west','middle','east'])
  for(const site of ITALY_SITES){
   clock.time=0;const bot=fighter(ITALY_SPAWNS[side].x,ITALY_SPAWNS[side].z);
   for(const gate of italyRouteGates(side,lane,site))
    assert.ok(walk(bot,gate,30,3.5,60,1.15),
     side+' '+lane+' to '+site.id+' stalled at '+bot.x.toFixed(2)+','+bot.z.toFixed(2));
  }
});
