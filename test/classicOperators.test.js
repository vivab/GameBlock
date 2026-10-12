import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeCtSkeleton, ctSkinWeights, buildClassicOperator, animateClassicOperator } from '../src/classicOperators.js';

test('rig has articulated shoulders, elbows, thighs and knees for original GIGN', () => {
  const rig = makeCtSkeleton();
  assert.equal(rig.bones.length, 10);
  assert.equal(rig.upperArms.length, 2);
  assert.equal(rig.forearms.length, 2);
  assert.equal(rig.thighs.length, 2);
  assert.equal(rig.calves.length, 2);
});

test('GIGN vertex influences sum to one and blend at shoulders/elbows/knees', () => {
  for (let y = 0.01; y < 1.9; y += 0.08) {
    for (let x = -1.03; x < 1.04; x += 0.052) {
      const { indices, weights } = ctSkinWeights(new THREE.Vector3(x, y, -0.13));
      assert.equal(indices.length, 4);
      assert.ok(indices.every(k => Number.isInteger(k) && k >= 0 && k < 10));
      assert.ok(weights.every(w => Number.isFinite(w) && w >= 0 && w <= 1));
      assert.ok(Math.abs(weights.reduce((a, b) => a + b, 0) - 1) < 1e-5);
    }
  }
  const wrist = ctSkinWeights(new THREE.Vector3(0.96, 1.5, 0));
  assert.equal(wrist.indices[2], 3);
  assert.ok(wrist.weights[2] > 0.9);
  const knee = ctSkinWeights(new THREE.Vector3(-0.17, 0.43, 0));
  assert.ok(knee.weights[2] > 0);
  const head = ctSkinWeights(new THREE.Vector3(0, 1.72, 0));
  assert.deepEqual(head.indices[0], 1);
});

test('static GIGN becomes real GPU skinned meshes, with intact geometry and materials', () => {
  const source = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.4, 1.83),
    new THREE.MeshStandardMaterial({ color: 0x384d68 }));
  mesh.position.z = 0.915;
  source.add(mesh);
  const gltf = { scene: source };
  const model = buildClassicOperator(gltf, 'ct');
  assert.equal(model.mode, 'generated');
  const meshes = [];
  model.root.traverse(node => { if (node.isSkinnedMesh) meshes.push(node); });
  assert.ok(meshes.length >= 1);
  const m = meshes[0];
  assert.ok(m.geometry.getAttribute('skinIndex'));
  assert.ok(m.geometry.getAttribute('skinWeight'));
  assert.equal(m.skeleton.bones.length, 10);
  // Geometry contains upright rest-pose coordinates. Three.js Box3's CPU
  // skinning bounds are not guaranteed until bone matrices have been updated.
  m.geometry.computeBoundingBox();
  const size = m.geometry.boundingBox.getSize(new THREE.Vector3());
  assert.ok(size.y > 1.75 && size.y < 1.96, 'Incorrect GIGN rest-pose height: '+size.y);
  const actor = { lastShotAt: -100, crouch: false };
  animateClassicOperator(model, actor, 0.4, 0.016, 2.5);
  assert.ok(Math.abs(model.rig.upperArms[0].rotation.z) > 0.3);
  assert.ok(model.rig.thighs[0].rotation.x !== 0);
});
