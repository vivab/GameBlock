import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGlb} from '../scripts/inspect-glb.mjs';

test('uploaded Dragomir is real GLB with animations and a skinned skeleton',()=>{
  const glb=inspectGlb('balkan__cs2_agent_model_dragomir_no2.glb');
  assert.ok(glb.bytes>1000000);
  assert.ok(glb.skins>0, 'character requires skin for animation');
  assert.ok(glb.animations.length>0, 'character requires clips');
  assert.ok(glb.externalUris.length===0,
    'GLB must have embedded textures/buffers or bundle external resources');
  console.log('DRAGOMIR_COUNT '+glb.animations.length);
  console.log('DRAGOMIR_SKINS '+glb.skins);
  console.log('DRAGOMIR_NODES '+JSON.stringify(glb.skeletonNodes.slice(0,140)));
  console.log('DRAGOMIR_CLIPS '+JSON.stringify(glb.animations.map(a=>a.name)));
});
