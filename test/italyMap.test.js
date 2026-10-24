import test from 'node:test';
import assert from 'node:assert/strict';
import {ITALY_SITES,ITALY_SPAWNS,ITALY_SOLIDS,italyBlocks,findItalyPath} from '../public/game1/italy-map.js';

const noWall=(a,b,pad=.62)=>{
 const distance=Math.hypot(b.x-a.x,b.z-a.z);
 for(let d=0;d<=distance;d+=.15){
  const k=distance?d/distance:0;
  if(italyBlocks(a.x+(b.x-a.x)*k,a.z+(b.z-a.z)*k,pad))return false;
 }
 return !italyBlocks(b.x,b.z,pad);
};
const interiors=[
 {x:-24,z:-27},{x:-24,z:-8},{x:-23,z:12},{x:-22,z:32},
 {x:24,z:-27},{x:24,z:-8},{x:23,z:12},{x:23,z:32}
];
test('Italia: two separate safe bombsites and usable team spawns',()=>{
 assert.deepEqual(ITALY_SITES.map(s=>s.id),['A','B']);
 assert.ok(Math.hypot(ITALY_SITES[0].x-ITALY_SITES[1].x,ITALY_SITES[0].z-ITALY_SITES[1].z)>65);
 assert.ok(Math.abs(ITALY_SPAWNS.ct.z-ITALY_SPAWNS.t.z)>65);
 assert.ok(ITALY_SOLIDS.length>=90,'real collision walls and cover');
 for(const p of [...ITALY_SITES,...Object.values(ITALY_SPAWNS),...interiors])
  assert.equal(italyBlocks(p.x,p.z,.62),false,'blocked site/spawn/room '+JSON.stringify(p));
});
test('Italia: each of five spawn slots can reach both sites without passing walls',()=>{
 for(const side of ['t','ct'])for(let i=0;i<10;i++){
  const spawn=ITALY_SPAWNS[side],start={
   x:spawn.x+(i%5-2)*1.7,z:spawn.z+(i%2?1:-1)*.85
  };
  assert.equal(italyBlocks(start.x,start.z,.5),false);
  for(const site of ITALY_SITES){
   const path=findItalyPath(start,site);
   assert.ok(path.length>0,'Unreachable '+side+' slot '+i+' site '+site.id);
   let from=start;
   for(const next of path){
    assert.ok(noWall(from,next),'Route hits wall: '+side+' / '+site.id+' / '+JSON.stringify(next));
    from=next;
   }
   assert.ok(Math.hypot(from.x-site.x,from.z-site.z)<.001);
  }
 }
});
test('Italia: eight indoor rooms and Mid connect to both teams',()=>{
 for(const start of [...interiors,{x:0,z:-34},{x:0,z:34}]){
  assert.equal(italyBlocks(start.x,start.z,.62),false);
  for(const goal of Object.values(ITALY_SPAWNS))
   assert.ok(findItalyPath(start,goal).length>0,'Inaccessible '+JSON.stringify(start));
 }
});
