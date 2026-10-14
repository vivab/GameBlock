import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGlb} from '../scripts/inspect-glb.mjs';

test('restored SWAT operator contains a skinned tactical humanoid',()=>{
  const glb=inspectGlb('public/models/swat_ct.glb');
  assert.ok(glb.bytes>1000000);
  assert.ok(glb.skins>=1);
  assert.ok(glb.meshes>0);
  assert.deepEqual(glb.externalUris,[]);
  for(const s of [/head_0_0/i,/arm_upper_l_/i,/arm_upper_r_/i,
    /arm_lower_l_/i,/arm_lower_r_/i,/hand_l_/i,/hand_r_/i,
    /leg_upper_l_/i,/leg_upper_r_/i]){
    assert.ok(glb.skeletonNodes.some(name=>s.test(name)),String(s));
  }
  console.log('SWAT_AUDIT',JSON.stringify({
    bytes:glb.bytes,skins:glb.skins,meshes:glb.meshes,nodes:glb.nodes,
    sceneRoots:glb.sceneRoots,meshNodes:glb.meshNodes,
    firstNodes:glb.rootNodes,
    clips:glb.animations.map(a=>a.name),
    durations:glb.animationDurations.map(a=>[a.name,a.maxTime,a.maxFrames])
  }));
});
