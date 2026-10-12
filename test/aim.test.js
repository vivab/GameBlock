import test from 'node:test';
import assert from 'node:assert/strict';
import {rotateAim} from '../src/aim.js';

test('dragging the fire button changes aim in both directions, compensating recoil',()=>{
  const a=rotateAim(0,0,80,-35);
  assert.ok(a.yaw<0);
  assert.ok(a.pitch>0);
  const b=rotateAim(a.yaw,a.pitch,-80,35);
  assert.ok(Math.abs(b.yaw)<1e-9 && Math.abs(b.pitch)<1e-9);
});
test('looking around never exceeds maximum vertical rotation',()=>{
  assert.equal(rotateAim(0,0,0,2000).pitch,-1.2);
  assert.equal(rotateAim(0,0,0,-2000).pitch,1.2);
});
