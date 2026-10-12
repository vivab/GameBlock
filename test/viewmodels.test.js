import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWeaponView, WEAPON_DEFAULTS, HAND_DEFAULTS, weaponAxisRotation} from '../src/viewmodels.js';
import {KF, DRAW, FROM, sample} from '../src/game1Motion.js';
import {makeHand} from '../src/game1Hands.js';

test('actual Game1 hands include four three-joint fingers and an articulated thumb',()=>{
  for(const type of ['pistol','rifle','knife']){
    const rig=createWeaponView(type);
    for(const side of ['right','left']){
      const hand=rig.arms[side].userData.mesh;
      assert.ok(hand?.userData.hand && hand?.userData.arm,type+' '+side);
      const joints=new Map();
      hand.traverse(mesh=>{
        if(typeof mesh.userData.finger==='number'){
          const digit=mesh.userData.finger;
          joints.set(digit,(joints.get(digit)||0)+1);
        }
      });
      assert.equal(joints.size,5);
      for(let i=0;i<4;i++)assert.equal(joints.get(i),3);
      assert.equal(joints.get(4),2);
    }
    assert.ok(rig.root.children.includes(rig.animated));
    assert.ok(rig.animated.children.includes(rig.modelMount));
    const bounds=new THREE.Box3().setFromObject(rig.root);
    const sz=bounds.getSize(new THREE.Vector3());
    assert.ok([...sz.toArray()].every(Number.isFinite));
  }
});

test('ported Game1 inspection, draw and reload keyframes are present',()=>{
  assert.equal(KF.pistol.length,6);
  assert.equal(KF.heavy.length,6);
  assert.equal(KF.knife.length,5);
  for(const type of ['pistol','rifle','knife']) {
    assert.ok(DRAW[type]>0);
    assert.equal(FROM[type].length,6);
  }
  assert.ok(sample(KF.pistol,1)?.length===7);
  assert.equal(sample(KF.knife,10),null);
});

test('weapons, right glove and left glove stay under a shared animated transform',()=>{
  const rifle=createWeaponView('rifle');
  rifle.draw(9.5);
  rifle.animate({time:10000});
  assert.ok(rifle.animated.position.y<0,'Game1 draw animation not active');
  rifle.animate({time:12000, inspectTime:1.3});
  assert.ok(Math.abs(rifle.animated.rotation.y)>0.25,'inspect animation missing');
  const left=rifle.arms.left;
  const base=left.userData.base.clone();
  rifle.animate({time:12100,reloadProgress:0.5});
  assert.ok(left.position.y<base.y,'support glove should reach down toward magazine');
  rifle.animate({time:12200,reloadProgress:-1});
  assert.ok(left.position.distanceTo(base)<1e-8,'glove should reset after reload');
  const knife=createWeaponView('knife');
  assert.ok(knife.root.children.includes(knife.arms.left.parent),'left knife hand should remain static');
  knife.animate({time:30000,inspectTime:1.2});
  assert.ok(Math.abs(knife.animated.rotation.z)>0.4,'Game1 knife wrist roll animation missing');
});

test('each hand can be calibrated independently including finger bend and pose',()=>{
  const view=createWeaponView('pistol');
  const initial=view.handCalibration;
  view.calibrateHand('R',{x:2.5,k:0.6,pose:'cup',roll:-80});
  assert.equal(view.handCalibration.R.x,2.5);
  assert.equal(view.handCalibration.R.k,0.6);
  assert.equal(view.handCalibration.R.pose,'cup');
  assert.equal(view.handCalibration.L.pose,initial.L.pose);
  assert.equal(view.arms.right.userData.mesh.userData.pose,'cup');
  view.calibrate({x:.18,ry:30,scale:1.25});
  assert.equal(view.calibration.x,.18);
  assert.ok(Math.abs(view.modelMount.rotation.y-30*Math.PI/180)<1e-8);
  assert.equal(view.handCalibration.R.roll,-80);
  const next=createWeaponView('rifle');
  assert.equal(next.calibration.x,WEAPON_DEFAULTS.rifle.x);
  assert.equal(next.handCalibration.R.pose,HAND_DEFAULTS.rifle.R.pose);
});

test('gun files can normalize regardless of X, Y or Z long axis',()=>{
  const box=(x,y,z)=>new THREE.Box3(new THREE.Vector3(-x,-y,-z),new THREE.Vector3(x,y,z));
  assert.equal(weaponAxisRotation(box(2,1,1)).y,Math.PI/2);
  assert.equal(weaponAxisRotation(box(1,2,1)).x,-Math.PI/2);
  assert.equal(weaponAxisRotation(box(1,1,2)).y,Math.PI);
});
