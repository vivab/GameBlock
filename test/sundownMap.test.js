import test from 'node:test';
import assert from 'node:assert/strict';
import {SUNDOWN_SOLIDS,SUNDOWN_SITES,SUNDOWN_SPAWNS,findSundownPath} from '../public/game1/sundown-map.js';

const occupied=(x,z,pad=.6)=>SUNDOWN_SOLIDS.some(([cx,cz,w,d,h])=>h>1&&Math.abs(cx-x)<w/2+pad&&Math.abs(cz-z)<d/2+pad);
const traversable=(a,b)=>{
 const len=Math.hypot(a.x-b.x,a.z-b.z);
 for(let t=0;t<=len;t+=.5){
   const f=len?t/len:0;
   if(occupied(a.x+(b.x-a.x)*f,a.z+(b.z-a.z)*f))return false;
 }
 return !occupied(b.x,b.z);
};
test('SUNDOWN has two different bombsites and separated T/CT spawns',()=>{
 assert.deepEqual(SUNDOWN_SITES.map(s=>s.id),['A','B']);
 assert.ok(Math.hypot(SUNDOWN_SPAWNS.ct.x-SUNDOWN_SPAWNS.t.x,
   SUNDOWN_SPAWNS.ct.z-SUNDOWN_SPAWNS.t.z)>60);
 for(const s of SUNDOWN_SITES)assert.equal(occupied(s.x,s.z),false);
 for(const s of Object.values(SUNDOWN_SPAWNS))assert.equal(occupied(s.x,s.z),false);
});
test('SUNDOWN routes both teams to each bombsite without crossing walls',()=>{
 for(const start of Object.values(SUNDOWN_SPAWNS))for(const site of SUNDOWN_SITES){
   const path=findSundownPath(start,site);
   assert.ok(path.length>0,'Missing route to '+site.id);
   let prev=start;
   for(const next of path){
     assert.equal(traversable(prev,next),true,'Wall on way to '+site.id+': '+JSON.stringify(next));
     prev=next;
   }
   assert.ok(Math.hypot(prev.x-site.x,prev.z-site.z)<1);
 }
});
test('SUNDOWN keeps an accessible Mid lane',()=>{
 const start={x:0,z:-30},end={x:0,z:32};
 assert.ok(!occupied(start.x,start.z));
 assert.ok(!occupied(end.x,end.z));
 assert.ok(findSundownPath(start,end).length>0);
});
