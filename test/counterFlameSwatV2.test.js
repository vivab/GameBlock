import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createStaticSwatOperator} from '../src/counterFlameSwat.js';

test('V5 character mounts safely, centers horizontally and keeps boots on ground', () => {
  const scene = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8));
  torso.position.set(0, 1, 0);
  scene.add(torso);
  const operator = createStaticSwatOperator({scene, animations: []});
  assert.ok(operator);
  assert.equal(operator.mode, 'static-swat');
  assert.equal(operator.team, 'ct');
  assert.equal(operator.version, 5);
  const bounds = new THREE.Box3().setFromObject(operator.root);
  assert.ok(Math.abs(bounds.min.y) < 1e-5);
  assert.ok(Math.abs(bounds.max.y - 1.88) < 1e-5);
  assert.equal(createStaticSwatOperator({scene: new THREE.Group()}), null);
});

test('game loads anatomical V7 GLB and GitHub Pages builds it from modular V2', () => {
  const game = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const deploy = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  const v2 = readFileSync(new URL('../scripts/build_counter_flame_swat_v2.py', import.meta.url), 'utf8');
  const v5 = readFileSync(new URL('../scripts/build_counter_flame_swat_v5.py', import.meta.url), 'utf8');
  const v7 = readFileSync(new URL('../scripts/build_counter_flame_swat_v7.py', import.meta.url), 'utf8');
  assert.match(game, /swat:'counter_flame_swat_v7'/);
  assert.match(game, /staticBots: true/);
  assert.match(deploy, /python scripts\/build_counter_flame_swat_v2.py/);
  assert.match(deploy, /python scripts\/build_counter_flame_swat_v5.py/);
  assert.match(deploy, /python scripts\/build_counter_flame_swat_v7.py/);
  assert.ok(deploy.indexOf('python scripts/build_counter_flame_swat_v2.py') <
            deploy.indexOf('python scripts/build_counter_flame_swat_v5.py'));
  assert.match(v2, /CF2_optimized_fullbody/);
  assert.match(v2, /wrists =/);
  assert.match(v5, /def reshape/);
  assert.match(v5, /def recolor/);
  assert.match(v5, /out\[shoulders\]/);
  assert.match(v5, /out\[boots\]/);
  assert.match(v5, /out\[chestgear\]/);
  assert.match(v5, /mesh.unmerge_vertices/);
  assert.match(v5, /CF5_humanized_ct_operator_empty_hands/);
  assert.match(v5, /counter_flame_swat_v5.glb/);
  assert.doesNotMatch(v5, /createRifle|addWeapon|createGun/);
  assert.match(v7, /counter_flame_swat_v7.glb/);
  assert.match(v7, /shoulder_jacket/);
  assert.match(v7, /tapered_sleeve/);
  assert.match(v7, /CF7_URBAN_anatomical_shoulders_empty_hands/);
  assert.doesNotMatch(v7, /createRifle|addWeapon|createGun/);
});
