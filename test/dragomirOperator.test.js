import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDragomirOperator,discoverDragomirBones,
  animateDragomirOperator,glTFDurationInventory} from '../src/dragomirOperator.js';

function sampleHumanoid(){
  const root=new THREE.Group();
  const shape=new THREE.Mesh(new THREE.BoxGeometry(.6,1.78,.33));
  shape.position.y=.89;root.add(shape);
  const pelvis=new THREE.Bone();pelvis.name='pelvis_69';
  pelvis.position.y=.98;root.add(pelvis);
  const spine=new THREE.Bone();spine.name='spine_2_58';
  spine.position.y=.31;pelvis.add(spine);
  const head=new THREE.Bone();head.name='head_0_0';
  head.position.y=.44;spine.add(head);
  for(const [side,sign] of [['l',-1],['r',1]]){
    const arm=new THREE.Bone();arm.name='arm_upper_'+side+'_28';
    arm.position.set(sign*.30,.10,0);spine.add(arm);
    const elbow=new THREE.Bone();elbow.name='arm_lower_'+side+'_25';
    elbow.position.set(sign*.33,-.02,0);arm.add(elbow);
    const wrist=new THREE.Bone();wrist.name='hand_'+side+'_22';
    wrist.position.set(sign*.31,0,0);elbow.add(wrist);
    const leg=new THREE.Bone();leg.name='leg_upper_'+side+'_64';
    leg.position.set(sign*.15,-.1,0);pelvis.add(leg);
    const knee=new THREE.Bone();knee.name='leg_lower_'+side+'_63';
    knee.position.y=-.41;leg.add(knee);
  }
  return root;
}
test('detects Dragomir upper/lower arm and hand bones',()=>{
  const b=discoverDragomirBones(sampleHumanoid());
  for(const x of ['pelvis','head','leftArm','rightArm','leftHand','rightHand',
    'leftElbow','rightElbow','leftLeg','rightLeg'])
    assert.ok(b[x], 'missing '+x);
});
test('zero-duration preview poses do not count as playable animation',()=>{
  assert.deepEqual(glTFDurationInventory([{duration:0},{duration:0},
    {duration:1.3}]),{total:3,playable:1});
});
test('the T agent leaves bind T-pose to hold the gun and moves its actual leg joints',()=>{
  const gltf={scene:sampleHumanoid(),animations:Array.from({length:120},()=>({duration:0}))};
  const actor=createDragomirOperator(gltf);
  assert.ok(actor,'uploaded humanoid should instantiate');
  assert.equal(actor.mode,'tactical');
  assert.equal(actor.clipCount,120);
  assert.equal(actor.playableClipCount,0);
  assert.ok(actor.gun.children.length>3,'weapon should be visible');
  assert.ok(actor.bones.leftArm.quaternion.angleTo(actor.rest.leftArm)>.15,
    'left shoulder should be in weapon grip, not T-pose');
  assert.ok(actor.bones.rightArm.quaternion.angleTo(actor.rest.rightArm)>.15,
    'right shoulder should be in weapon grip, not T-pose');
  animateDragomirOperator(actor,{lastShotAt:-10},.20,.016,3.2);
  const walking=actor.bones.leftLeg.quaternion.angleTo(actor.rest.leftLeg);
  assert.ok(walking>.05,'actual thigh joint should swing while walking');
  animateDragomirOperator(actor,{lastShotAt:.19},.22,.016,0);
  assert.ok(actor.gunPivot.rotation.x>.03,'gun should recoil when firing');
  assert.ok(actor.bones.leftLeg.quaternion.angleTo(actor.rest.leftLeg)<1e-7,
    'stopping should reset walking pose');
});
test('invalid source skeleton safely chooses the original fallback',()=>{
  assert.equal(createDragomirOperator({scene:new THREE.Group(),animations:[]}),null);
});
