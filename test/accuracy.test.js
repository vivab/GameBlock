import test from 'node:test';
import assert from 'node:assert/strict';
import {ACCURACY,accuracyState,weaponSpread,recoverBurst} from '../src/accuracy.js';
import {GRAVITY,JUMP_IMPULSE,peakJumpHeight} from '../src/jumpPhysics.js';

test('accuracy states: crouch low, standing medium, running high, airborne highest',()=>{
  const options={weapon:'rifle',burst:0};
  const crouch=weaponSpread({...options,ground:true,crouched:true,moving:false});
  const stand=weaponSpread({...options,ground:true,crouched:false,moving:false});
  const run=weaponSpread({...options,ground:true,crouched:false,moving:true});
  const air=weaponSpread({...options,ground:false,crouched:true,moving:true});
  assert.ok(crouch<stand && stand<run && run<air);
  assert.deepEqual([crouch,stand,run,air],
    [ACCURACY.crouching,ACCURACY.standing,ACCURACY.running,ACCURACY.airborne]);
  assert.equal(accuracyState({ground:false,crouched:true,moving:true}),'airborne');
  assert.equal(accuracyState({ground:true,crouched:true,moving:true}),'crouching');
});

test('Glock a bit more accurate than AK, recoil-burst builds and then recovers',()=>{
  const basic={ground:true,crouched:false,moving:false};
  const rifle=weaponSpread({...basic,weapon:'rifle'});
  const pistol=weaponSpread({...basic,weapon:'pistol'});
  assert.ok(pistol<rifle);
  const rapid=weaponSpread({...basic,weapon:'rifle',burst:0.017});
  assert.ok(rapid>rifle);
  assert.equal(recoverBurst(0.02,1),0);
  assert.ok(recoverBurst(0.02,0.1)<0.02);
  assert.equal(recoverBurst(0.02,0),0.02);
  assert.equal(weaponSpread({...basic,weapon:'rifle',burst:-1}),rifle);
});

test('new jump impulse produces clearly shorter jump without changing gravity',()=>{
  assert.equal(GRAVITY,14);
  assert.equal(JUMP_IMPULSE,4.2);
  assert.ok(peakJumpHeight()>0.6 && peakJumpHeight()<0.7);
  assert.ok(peakJumpHeight()<5.8*5.8/(2*GRAVITY)*0.6);
});
