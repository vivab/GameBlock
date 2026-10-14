import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGlb} from '../scripts/inspect-glb.mjs';

test('the restored SWAT CT is an actual realistic skinned humanoid, not a blocky fallback',()=>{
  const glb=inspectGlb('public/models/swat_ct.glb');
  assert.equal(glb.bytes,12928304);
  assert.equal(glb.skins,1);
  assert.equal(glb.meshes,5);
  assert.ok(glb.nodes>80);
  assert.deepEqual(glb.externalUris,[]);
  for(const joint of [/^head_0_0$/i,/^pelvis_/i,/^arm_upper_l_/i,
    /^arm_upper_r_/i,/^arm_lower_l_/i,/^arm_lower_r_/i,
    /^hand_l_/i,/^hand_r_/i,/^leg_upper_l_/i,/^leg_upper_r_/i]){
    assert.ok(glb.skeletonNodes.some(name=>joint.test(name)),String(joint));
  }
});
test('SWAT preview clips are single-frame poses, and need procedural combat animation',()=>{
  const glb=inspectGlb('public/models/swat_ct.glb');
  assert.equal(glb.animations.length,6);
  assert.ok(glb.animationDurations.every(a=>a.maxTime===0 && a.maxFrames===1));
});
