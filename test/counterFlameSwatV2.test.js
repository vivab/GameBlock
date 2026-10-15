import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createStaticSwatOperator} from '../src/counterFlameSwat.js';

test('V4 character mounts safely, centers horizontally and keeps boots on ground', () => {
  const scene = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8));
  torso.position.set(0, 1, 0);
  scene.add(torso);
  const operator = createStaticSwatOperator({scene, animations: []});
  assert.ok(operator);
  assert.equal(operator.mode, 'static-swat');
  assert.equal(operator.team, 'ct');
  assert.equal(operator.version, 4);
  const bounds = new THREE.Box3().setFromObject(operator.root);
  assert.ok(Math.abs(bounds.min.y) < 1e-5);
  assert.ok(Math.abs(bounds.max.y - 1.88) < 1e-5);
  assert.equal(createStaticSwatOperator({scene: new THREE.Group()}), null);
});

test('game and GitHub Pages use V4 and keep NPCs static for inspection', () => {
  const game = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const deploy = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  const v2 = readFileSync(new URL('../scripts/build_counter_flame_swat_v2.py', import.meta.url), 'utf8');
  const v4 = readFileSync(new URL('../scripts/build_counter_flame_swat_v4.py', import.meta.url), 'utf8');
  assert.match(game, /swat:'counter_flame_swat_v4'/);
  assert.match(game, /staticBots: true/);
  assert.match(deploy, /python scripts\/build_counter_flame_swat_v2.py/);
  assert.match(deploy, /python scripts\/build_counter_flame_swat_v4.py/);
  assert.ok(deploy.indexOf('python scripts/build_counter_flame_swat_v2.py') <
            deploy.indexOf('python scripts/build_counter_flame_swat_v4.py'));
  assert.match(v2, /CF2_optimized_fullbody/);
  assert.match(v2, /wrists =/);
  assert.match(v4, /def reshape/);
  assert.match(v4, /def recolor/);
  assert.match(v4, /mesh.unmerge_vertices/);
  assert.match(v4, /CF4_gritty_ct_operator_empty_hands/);
  assert.match(v4, /counter_flame_swat_v4.glb/);
  assert.doesNotMatch(v4, /createRifle|addWeapon|createGun/);
});
