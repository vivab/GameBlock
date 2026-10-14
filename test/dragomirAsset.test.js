import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGlb} from '../scripts/inspect-glb.mjs';

test('uploaded CS2 Dragomir GLB has a compatible skinned humanoid',()=>{
  const glb=inspectGlb('public/models/dragomir_t.glb');
  assert.equal(glb.skins,1);
  assert.equal(glb.meshes,4);
  assert.equal(glb.animations.length,120);
  assert.deepEqual(glb.externalUris,[]);
  assert.ok(glb.skeletonNodes.some(x=>/^arm_upper_l_/i.test(x)));
  assert.ok(glb.skeletonNodes.some(x=>/^arm_upper_r_/i.test(x)));
  assert.ok(glb.skeletonNodes.some(x=>/^leg_upper_l_/i.test(x)));
  assert.ok(glb.skeletonNodes.some(x=>/^leg_upper_r_/i.test(x)));
  assert.ok(glb.skeletonNodes.some(x=>/^hand_l_/i.test(x)));
  assert.ok(glb.skeletonNodes.some(x=>/^hand_r_/i.test(x)));
  // Every preview pose has precisely one static keyframe; do not present
  // these as animation-ready locomotion clips.
  assert.equal(glb.animationDurations.filter(a=>a.maxFrames>1).length,0);
  assert.equal(glb.animationDurations.filter(a=>a.maxTime>.05).length,0);
});
