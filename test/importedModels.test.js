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

test('imported hands replace procedural gloves and preserve the knife mesh', () => {
  for (const kind of ['pistol', 'rifle', 'knife']) {
    const rig = createWeaponView(kind);
    const hands = fixture(['v_weapon.Left_Arm_03', 'v_weapon.Right_Arm_031']);
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
    assert.equal(rig.setHands(null), false);
    assert.equal(rig.usesImportedHands, false);
    assert.equal(rig.arms.group.visible, true);
  }
});
