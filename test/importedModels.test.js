import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createImportedOperator, animateImportedOperator, findOperatorBones } from '../src/importedOperators.js';
import { createWeaponView } from '../src/viewmodels.js';

function fixture(names = ['arm left shoulder 2_017', 'arm right shoulder 2_015', 'leg left thigh_02', 'leg right thigh_01']) {
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.83, 0.35));
  mesh.position.y = 0.915;
  root.add(mesh);
  for (const name of names) {
    const bone = new THREE.Bone();
    bone.name = name;
    root.add(bone);
  }
  return root;
}

test('recognizes Source and CS2 operator skeleton aliases', () => {
  const source = findOperatorBones(fixture());
  assert.ok(source.leftLeg && source.rightLeg && source.leftArm && source.rightArm);
  const sas = findOperatorBones(fixture([
    'arm_upper_l_30','arm_upper_r_58','leg_upper_l_11','leg_upper_r_12'
  ]));
  assert.ok(sas.leftArm && sas.rightArm && sas.leftLeg && sas.rightLeg);
});

test('imported rig keeps its skeleton and animates legs without Mixamo clips', () => {
  const operator = createImportedOperator({ scene: fixture(), animations: [] }, 't');
  assert.equal(operator.mode, 'imported');
  assert.ok(operator.root.children.includes(operator.visual));
  const bone = operator.bones.leftLeg;
  const rest = bone.quaternion.clone();
  animateImportedOperator(operator, { lastShotAt: -10 }, 1.5, 1/60, 2.5);
  assert.ok(bone.quaternion.angleTo(rest) > 0.05, 'leg must swing while moving');
  animateImportedOperator(operator, { lastShotAt: -10 }, 2, 1/60, 0);
  assert.ok(bone.quaternion.angleTo(rest) < 1e-7, 'leg must return to rest');
});

function sourceHandsFixture() {
  const group = new THREE.Group();
  // The provided Source GLB has one continuous shoulder-to-hand joint per arm.
  for (const [side, x] of [['Left', -.42], ['Right', .42]]) {
    const arm = new THREE.Bone();
    arm.name = 'v_weapon.' + side + '_Arm_' + (side === 'Left' ? '03' : '031');
    arm.position.set(x, -.11, .32);
    const hand = new THREE.Bone();
    hand.name = 'v_weapon.' + side + '_Hand_' + (side === 'Left' ? '06' : '034');
    hand.position.set(0, -.03, -.84);
    arm.add(hand);
    group.add(arm);
  }
  const visibleGeometry = new THREE.Mesh(new THREE.BoxGeometry(.8,.35,1.0));
  group.add(visibleGeometry);
  return group;
}

test('imported hands replace procedural gloves and preserve the knife mesh', () => {
  for (const kind of ['pistol', 'rifle', 'knife']) {
    const rig = createWeaponView(kind);
    const hands = sourceHandsFixture();
    assert.equal(rig.setHands(hands), true);
    assert.equal(rig.usesImportedHands, true);
    assert.equal(rig.importedHandsMount.visible, true);
    if (kind === 'knife') {
      assert.equal(rig.modelMount.visible, true);
      assert.equal(rig.arms.group.visible, true);
    } else {
      assert.equal(rig.arms.group.visible, false);
    }
    rig.animate({ time: 1500, reloadProgress: 0.4 });
    const bone = rig.importedHandsMount.getObjectByName('v_weapon.Right_Hand_034');
    const wrist = rig.importedHandsMount.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));
    assert.ok(wrist.z > -0.7 && wrist.z < 0.6, 'source wrist should be near weapon, not behind the camera');
    assert.ok(wrist.y > -1 && wrist.y < 0.3, 'source wrist should be visible at the weapon');
    assert.equal(rig.setHands(null), false);
    assert.equal(rig.usesImportedHands, false);
    assert.equal(rig.arms.group.visible, true);
  }
});

test('gun is visible and both imported operator wrists track the weapon', () => {
  for (const team of ['ct', 't']) {
    const body = fixture([
      'arm left shoulder 2_017', 'arm left elbow_018', 'arm left wrist_019',
      'arm right shoulder 2_015', 'arm right elbow_032', 'arm right wrist_033'
    ]);
    const byName = name => body.getObjectByName(name);
    const configure = (prefix, sign) => {
      const arm = byName('arm '+prefix+' shoulder 2_'+(sign<0?'017':'015'));
      const elbow = byName('arm '+prefix+' elbow_'+(sign<0?'018':'032'));
      const wrist = byName('arm '+prefix+' wrist_'+(sign<0?'019':'033'));
      arm.position.set(sign*.33,1.43,0);
      elbow.position.set(sign*.25,-.2,0);
      wrist.position.set(sign*.05,-.21,0);
      arm.add(elbow); elbow.add(wrist);
    };
    configure('left', -1);
    configure('right', 1);
    const model = createImportedOperator({scene:body,animations:[]},team);
    model.root.updateMatrixWorld(true);
    const arm = model.bones.rightArm;
    const before = arm.quaternion.clone();
    animateImportedOperator(model,{lastShotAt:-10},1,1/60,0);
    assert.ok(arm.quaternion.angleTo(before) > .25, 'right arm should leave T-pose');
    assert.ok(model.gun.children.length > 0, 'gun must be in actor hierarchy');
    assert.ok(model.bones.leftHand && model.bones.rightHand);
  }
});
