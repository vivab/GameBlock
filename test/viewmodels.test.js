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
    assert.ok(rig.animated.getObjectById(rig.modelMount.id));
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
  rifle.animate({time:12100,reloadProgress:-1});
  const idleY=rifle.root.position.y;
  rifle.animate({time:12110,reloadProgress:0.5});
  assert.ok(rifle.root.position.y < idleY-0.35,
    'gun and both gloves should lower together while reloading');
  assert.ok(left.position.distanceTo(base)<1e-8,
    'support glove must stay attached to the weapon during reload');
  rifle.animate({time:12200,reloadProgress:-1});
  assert.ok(Math.abs(rifle.root.position.y-idleY)<1e-8,
    'weapon must return to its original height after reloading');
  assert.ok(left.position.distanceTo(base)<1e-8,
    'support glove should reset after reload');
  const knife=createWeaponView('knife');
  assert.ok(knife.root.children.includes(knife.arms.left.parent),'left knife hand should remain static');
  knife.animate({time:30000,inspectTime:1.2});
  assert.ok(Math.abs(knife.knifeWrist.rotation.z)>0.4,'Game1 knife wrist roll animation missing');
  assert.equal(knife.animated.rotation.z,0,'whole forearm must not rotate on inspect');
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

test('all user-approved Glock, AK and both-knife grip positions are the new defaults',()=>{
  const approved={
    pistol: {
      mount:{x:0.01,y:-0.14,z:0.03,rx:-5,ry:180,rz:0,scale:0.94},
      hands:{R:{pose:'pistol',x:-0.05,y:-0.85,z:0.55,pitch:29,yaw:-28,roll:-66,k:1.3},
        L:{pose:'fist',x:-0.05,y:-0.25,z:-0.5,pitch:20,yaw:-10,roll:85,k:0.55}},
    },
    rifle: {
      mount:{x:0.09,y:-0.29,z:0.12,rx:1,ry:0,rz:0,scale:1.87},
      hands:{R:{pose:'pistol',x:1.7,y:-2.9,z:0,pitch:15,yaw:10,roll:-85,k:1},
        L:{pose:'cup',x:1.05,y:-2.05,z:-0.5,pitch:4,yaw:-18,roll:150,k:1}},
    },
    knife: {
      mount:{x:-0.25,y:-0.02,z:0.07,rx:-13,ry:-83,rz:77,scale:0.84},
      hands:{R:{pose:'fist',x:1.35,y:-0.4,z:-0.95,pitch:26,yaw:17,roll:-22,k:0.75},
        L:{pose:'open',x:-4.8,y:1.5,z:-0.5,pitch:25,yaw:-20,roll:0,k:1}},
    },
  };
  for(const [kind, config] of Object.entries(approved)){
    assert.deepEqual(WEAPON_DEFAULTS[kind],config.mount,kind+' mount');
    assert.deepEqual(HAND_DEFAULTS[kind],config.hands,kind+' gloves');
    const rig=createWeaponView(kind);
    assert.deepEqual(rig.calibration,config.mount);
    assert.deepEqual(rig.handCalibration,config.hands);
  }
  // Both knife_ct.glb and knife_t.glb load through the same knife view.
  const both=createWeaponView('knife');
  both.setTeam('t');
  assert.deepEqual(both.calibration,approved.knife.mount);
  assert.deepEqual(both.handCalibration,approved.knife.hands);
});

test('reload pose is down through the middle, easing at both ends, with no hand detachment',()=>{
  for(const kind of ['pistol','rifle']){
    const rig=createWeaponView(kind);
    rig.animate({time:2000,reloadProgress:-1});
    const baseline=rig.root.position.clone();
    const left=rig.arms.left.position.clone(),right=rig.arms.right.position.clone();
    for(const progress of [0.25,0.5,0.75]){
      rig.animate({time:2000+progress*1000,reloadProgress:progress});
      assert.ok(rig.root.position.y<=baseline.y-0.4);
      assert.ok(rig.arms.left.position.distanceTo(left)<1e-8);
      assert.ok(rig.arms.right.position.distanceTo(right)<1e-8);
    }
    rig.animate({time:3100,reloadProgress:1});
    assert.ok(rig.root.position.distanceTo(baseline)<1e-8);
  }
});

test('knife inspect pivots only wrist, with blade and fingers together and forearm unchanged', () => {
  for (const team of ['ct','t']) {
    const knife = createWeaponView('knife');
    knife.setTeam(team);
    const hand = knife.arms.right.userData.mesh.userData.hand;
    const forearm = knife.arms.right.userData.mesh.userData.arm;
    assert.equal(hand.parent,knife.knifeWrist);
    assert.equal(knife.modelMount.parent.parent,knife.knifeWrist);
    assert.equal(forearm.parent,knife.arms.right.userData.mesh);
    knife.animate({time:2000,inspectTime:-1});
    knife.root.updateMatrixWorld(true);
    const armRest=forearm.matrixWorld.clone();
    const baselineHand=hand.matrixWorld.clone();
    const pivotBase=knife.knifeWrist.rotation.clone();
    for(const t of [0.3,0.7,1.2,1.9,2.7]) {
      knife.animate({time:2000+t*1000,inspectTime:t});
      knife.root.updateMatrixWorld(true);
      assert.ok(forearm.matrix.equals(new THREE.Matrix4()),
        'Forearm sleeve transform must never be animated');
      assert.ok(forearm.matrixWorld.equals(armRest),
        'Inspection may not displace the upper arm or shoulder');
      assert.ok(Math.abs(knife.animated.rotation.x)<1e-9);
      assert.ok(Math.abs(knife.animated.rotation.y)<1e-9);
      assert.ok(Math.abs(knife.animated.rotation.z)<1e-9);
      assert.ok(Math.abs(knife.knifeWrist.rotation.z)<0.84);
      // Knife shares wrist pivot with palm so it cannot levitate away.
      assert.equal(knife.modelMount.parent.parent,hand.parent);
    }
    knife.animate({time:5100,inspectTime:-1});
    assert.ok(Math.abs(knife.knifeWrist.rotation.z-pivotBase.z)<1e-9);
    assert.ok(hand.matrixWorld.equals(baselineHand));
  }
});
