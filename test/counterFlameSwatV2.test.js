import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createStaticSwatOperator} from '../src/counterFlameSwat.js';

// Ensure our character is a usable game object even before the binary asset
// has been generated during GitHub Pages deployment.
test('V2 operator centers its real 3D mesh and places the boots on the ground', () => {
  const scene = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8));
  torso.position.set(0, 1, 0);
  scene.add(torso);
  const gltf = {scene, animations:[]};
  const operator = createStaticSwatOperator(gltf);
  assert.ok(operator);
  assert.equal(operator.mode, 'static-swat');
  assert.equal(operator.team, 'ct');
  assert.equal(operator.version, 2);
  const box = new THREE.Box3().setFromObject(operator.root);
  assert.ok(Math.abs(box.min.y) < 1e-5);
  assert.ok(Math.abs(box.max.y - 1.88) < 1e-5);
  assert.equal(createStaticSwatOperator({scene:new THREE.Group()}),null);
});

test('the game and Pages deployment both reference the original V2 build', () => {
  const game = readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const deploy = readFileSync(new URL('../.github/workflows/deploy.yml',import.meta.url),'utf8');
  const generator = readFileSync(new URL('../scripts/build_counter_flame_swat_v2.py',import.meta.url),'utf8');
  assert.match(game,/swat:'counter_flame_swat_v2'/);
  assert.match(game,/staticBots: true/);
  assert.match(deploy,/python scripts\/build_counter_flame_swat_v2.py/);
  assert.match(generator,/wrists =/);
  assert.match(generator,/CF2_optimized_fullbody/);
  assert.doesNotMatch(generator,/createRifle|addWeapon|createGun/);
});
