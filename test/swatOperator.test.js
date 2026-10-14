import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTacticalOperator, animateTacticalOperator} from '../src/dragomirOperator.js';

function swatSkeleton(){
  const root=new THREE.Group();
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(.28,.22,1.7,10),
    new THREE.MeshStandardMaterial({color:0x24313a}));
  torso.position.y=.90;root.add(torso);
  const hip=new THREE.Bone();hip.name='pelvis_69';hip.position.y=.96;root.add(hip);
  const spine=new THREE.Bone();spine.name='spine_2_58';
  spine.position.y=.34;hip.add(spine);
  const head=new THREE.Bone();head.name='head_0_0';
  head.position.y=.42;spine.add(head);
  for(const [side,sign] of [['l',-1],['r',1]]){
    const upper=new THREE.Bone();upper.name='arm_upper_'+side+'_28';
    upper.position.set(sign*.32,.10,0);spine.add(upper);
    const lower=new THREE.Bone();lower.name='arm_lower_'+side+'_25';
    lower.position.set(sign*.31,-.04,0);upper.add(lower);
    const hand=new THREE.Bone();hand.name='hand_'+side+'_22';
    hand.position.set(sign*.30,-.03,0);lower.add(hand);
    const thigh=new THREE.Bone();thigh.name='leg_upper_'+side+'_64';
    thigh.position.set(sign*.15,-.08,0);hip.add(thigh);
    const shin=new THREE.Bone();shin.name='leg_lower_'+side+'_63';
    shin.position.y=-.43;thigh.add(shin);
  }
  return root;
}
test('SWAT operator bends its actual shoulder/elbow joints around tactical carbine',()=>{
  const swat=createTacticalOperator({scene:swatSkeleton(),animations:[]},null,'ct');
  assert.ok(swat);
  assert.equal(swat.team,'ct');
  assert.equal(swat.mode,'tactical');
  assert.match(swat.root.name,/SWAT/);
  assert.ok(swat.gun.children.length>=10);
  for(const key of ['leftArm','rightArm']){
    assert.ok(swat.bones[key].quaternion.angleTo(swat.rest[key])>.16,
      'arm should leave T pose: '+key);
  }
  swat.root.updateWorldMatrix(true,true);
  const wrist=swat.bones.rightHand.getWorldPosition(new THREE.Vector3());
  assert.ok(wrist.toArray().every(Number.isFinite));
});
test('SWAT walks/runs, returns to idle and has firearm recoil independent of T',()=>{
  const m=createTacticalOperator({scene:swatSkeleton(),animations:[]},null,'ct');
  animateTacticalOperator(m,{lastShotAt:-10},.2,.016,3.2);
  assert.ok(m.bones.leftLeg.quaternion.angleTo(m.rest.leftLeg)>.05);
  animateTacticalOperator(m,{lastShotAt:-10},.23,.016,0);
  assert.ok(m.bones.leftLeg.quaternion.angleTo(m.rest.leftLeg)<1e-6);
  animateTacticalOperator(m,{lastShotAt:.19},.22,.016,0);
  assert.ok(m.gunPivot.rotation.x>.06);
  animateTacticalOperator(m,{lastShotAt:-10},.40,.016,0);
  assert.ok(m.gunPivot.rotation.x===0);
});
test('both teams use compatible rigs and invalid humanoids safely fall back',()=>{
  const gltf={scene:swatSkeleton(),animations:[]};
  const ct=createTacticalOperator(gltf,null,'ct');
  const t=createTacticalOperator(gltf,null,'t');
  assert.ok(ct && t);
  assert.equal(ct.team,'ct');assert.equal(t.team,'t');
  assert.equal(createTacticalOperator({scene:new THREE.Group()},null,'ct'),null);
});
