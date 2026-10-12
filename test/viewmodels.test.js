import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWeaponView, WEAPON_DEFAULTS, weaponAxisRotation } from '../src/viewmodels.js';

test('each weapon has two hands with four curved fingers plus a thumb', () => {
  for (const kind of ['pistol', 'rifle', 'knife']) {
    const view = createWeaponView(kind);
    const counts = new Map();
    view.arms.group.traverse(mesh => {
      if (typeof mesh.userData?.finger === 'number') {
        const k = mesh.userData.finger;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    });
    assert.equal(counts.size, 5, kind + ' must have five fingers per hand');
    for (let i = 0; i < 5; i++) assert.ok(counts.get(i) >= 4, kind + ' missing joints on digit ' + i);
    assert.equal(view.root.children.includes(view.modelMount), true);
    assert.equal(view.root.children.includes(view.arms.group), true);
    const box = new THREE.Box3().setFromObject(view.root);
    const size = box.getSize(new THREE.Vector3());
    assert.ok(size.x < 2.2 && size.z < 2.3, kind + ' hands out of range');
  }
});
test('inspect, knife hit and reload move a shared root; support hand resets', () => {
  const knife = createWeaponView('knife');
  knife.animate({ inspectTime: 1, slashTime: 0.19 });
  assert.ok(knife.root.rotation.y > 1, 'inspect should rotate entire rig');
  assert.ok(Math.abs(knife.root.rotation.z) > 0.1);
  const rifle = createWeaponView('rifle');
  rifle.animate({ reloadProgress: 0.5 });
  assert.ok(rifle.arms.left.position.y < 0);
  rifle.animate({ reloadProgress: -1 });
  assert.ok(Math.abs(rifle.arms.left.position.y) < 1e-9);
  assert.ok(Math.abs(rifle.arms.left.position.z) < 1e-9);
});
test('calibration is independent per weapon, and handles XY and Y-forward assets', () => {
  const p = createWeaponView('pistol');
  p.calibrate({ x: 0.14, ry: 22, scale: 1.25 });
  assert.equal(p.calibration.x, 0.14);
  assert.equal(p.modelMount.position.x, 0.14);
  assert.ok(Math.abs(p.modelMount.rotation.y - 22 * Math.PI / 180) < 1e-6);
  const r = createWeaponView('rifle');
  assert.equal(r.calibration.x, WEAPON_DEFAULTS.rifle.x);
  assert.equal(weaponAxisRotation(new THREE.Box3(new THREE.Vector3(-2,-1,-1),new THREE.Vector3(2,1,1))).y, Math.PI/2);
  assert.equal(weaponAxisRotation(new THREE.Box3(new THREE.Vector3(-1,-2,-1),new THREE.Vector3(1,2,1))).x, -Math.PI/2);
});
