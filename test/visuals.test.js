import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSoldier, createViewArms } from '../src/visuals.js';

test('both team models have compact, articulated limbs and no T-pose wings', () => {
  for (const team of ['ct', 't']) {
    const soldier = createSoldier(team);
    assert.equal(soldier.legs.length, 2);
    assert.equal(soldier.arms.length, 2);
    const bounds = new THREE.Box3().setFromObject(soldier.root);
    const size = bounds.getSize(new THREE.Vector3());
    assert.ok(size.x < 1.5, team + ' shoulders too wide: ' + size.x);
    assert.ok(size.y > 1.6 && size.y < 2.25, team + ' height: ' + size.y);
    assert.ok(size.z < 1.7, team + ' depth: ' + size.z);
    assert.ok([...size.toArray()].every(Number.isFinite));
  }
});

test('view weapons receive gloves, both gripping hands as appropriate, and recolorable sleeves', () => {
  for (const kind of ['pistol', 'rifle', 'knife']) {
    const parent = new THREE.Group();
    const rig = createViewArms(parent, kind);
    assert.equal(parent.children.includes(rig.hands), true);
    assert.ok(rig.sleeves.length >= 2);
    assert.equal(!!rig.support, kind !== 'knife');
    for (const mesh of rig.sleeves) mesh.material.color.setHex(0x5d6246);
    const bounds = new THREE.Box3().setFromObject(parent);
    const size = bounds.getSize(new THREE.Vector3());
    assert.ok([...size.toArray()].every(Number.isFinite));
    assert.ok(size.x < 1.8 && size.z < 1.8);
  }
});
