import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildBlockOperator, animateBlockOperator } from '../src/blockOperators.js';

for (const team of ['ct', 't']) {
  test(team + ' operator is detailed, instantly available and stands at player scale', () => {
    const model = buildBlockOperator(team);
    let meshes = 0;
    model.root.traverse(o => { if (o.isMesh) meshes++; });
    assert.ok(meshes >= 35, 'operator must have detailed vest, helmet, pouches, limbs and gun');
    const bounds = new THREE.Box3().setFromObject(model.root);
    assert.ok(bounds.getSize(new THREE.Vector3()).y > 1.7);
    assert.ok(bounds.getSize(new THREE.Vector3()).y < 2.1);
    assert.ok(bounds.getSize(new THREE.Vector3()).x < 1.5);
    assert.ok(bounds.getSize(new THREE.Vector3()).z < 1.5);
    assert.equal(model.legs.length, 2);
    assert.equal(model.arms.length, 2);
    assert.ok(model.gun.children.length >= 3);
  });
  test(team + ' operator animates without detaching or stretching parts', () => {
    const model = buildBlockOperator(team);
    const left = model.legs[0].pivot.rotation.x;
    animateBlockOperator(model, {lastShotAt: -100}, 0.2, 0.016, 3.2);
    assert.notEqual(model.legs[0].pivot.rotation.x, left);
    assert.ok(Number.isFinite(model.arms[0].joint.rotation.x));
    animateBlockOperator(model, {lastShotAt: 0.3}, 0.35, 0.016, 0);
    assert.ok(model.gun.rotation.x > 0);
    model.root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model.root);
    assert.ok(bounds.getSize(new THREE.Vector3()).x < 1.8);
    assert.ok(bounds.getSize(new THREE.Vector3()).y < 2.3);
  });
}
