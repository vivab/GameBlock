import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ITALY_SOURCE,ITALY_NAV_STATS,ITALY_SITES,ITALY_SPAWNS,ITALY_SPAWN_POINTS,italyBlocks,italyGround,findItalyPath} from '../public/game1/italy-import-map.js';

const glb=readFileSync('public/game1/cs_italy_with_real_light.glb');
const noWall=(a,b)=>{
 const distance=Math.hypot(a.x-b.x,a.z-b.z);
 for(let t=0;t<=distance;t+=.1){
  const k=distance?t/distance:0;
  if(italyBlocks(a.x+(b.x-a.x)*k,a.z+(b.z-a.z)*k,.24))return false;
 }
 return !italyBlocks(b.x,b.z,.24);
};
test('uploaded Italy is a real textured GLB with full attribution',()=>{
 assert.equal(glb.toString('utf8',0,4),'glTF');
 assert.equal(glb.readUInt32LE(4),2);
 assert.equal(glb.readUInt32LE(8),glb.length);
 const size=glb.readUInt32LE(12);
 const model=JSON.parse(glb.subarray(20,20+size).toString('utf8'));
 assert.equal(model.asset.extras.author.startsWith('Neo_minigan'),true);
 assert.ok(model.asset.extras.license.includes('CC-BY-4.0'));
 assert.equal(model.meshes.length,14);
 assert.equal(model.images.length,14);
 assert.equal(glb.length,ITALY_NAV_STATS.modelBytes);
 assert.equal(ITALY_SOURCE.creator,'Neo_minigan');
});
test('both bombsites and all T/CT spawns are on the actual ground',()=>{
 assert.deepEqual(ITALY_SITES.map(s=>s.id),['A','B']);
 assert.ok(Math.hypot(ITALY_SITES[0].x-ITALY_SITES[1].x,ITALY_SITES[0].z-ITALY_SITES[1].z)>35);
 assert.ok(Math.hypot(ITALY_SPAWNS.ct.x-ITALY_SPAWNS.t.x,ITALY_SPAWNS.ct.z-ITALY_SPAWNS.t.z)>70);
 assert.equal(ITALY_NAV_STATS.freeCells,1982);
 for(const p of [...ITALY_SITES,...Object.values(ITALY_SPAWNS)]){
  assert.equal(italyBlocks(p.x,p.z,.38),false);
  assert.ok(Number.isFinite(italyGround(p.x,p.z)));
 }
 for(const side of ['t','ct'])for(const [x,z] of ITALY_SPAWN_POINTS[side])
  assert.equal(italyBlocks(x,z,.38),false,'blocked spawn '+side+' '+x+','+z);
 assert.equal(italyBlocks(200,200),true);
});
test('both teams can navigate to both sites without crossing geometry',()=>{
 for(const side of ['t','ct'])for(const [x,z] of ITALY_SPAWN_POINTS[side]){
  const start={x,z};
  for(const site of ITALY_SITES){
   const path=findItalyPath(start,site);
   assert.ok(path.length>0,side+' cannot reach site '+site.id);
   let p=start;
   for(const next of path){assert.ok(noWall(p,next),'Collision on route to '+site.id);p=next;}
   assert.ok(Math.hypot(p.x-site.x,p.z-site.z)<.001);
  }
 }
});
