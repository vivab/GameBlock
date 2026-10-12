import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseAnimationName, OPERATOR_SETTINGS } from '../src/riggedActors.js';

const names = [
  'CharacterArmature|Idle_Neutral',
  'CharacterArmature|Idle_Gun',
  'CharacterArmature|Idle_Gun_Shoot',
  'CharacterArmature|Run_Shoot',
  'CharacterArmature|Death'
];

test('rigged fighter clips select gun-ready idle/run/shoot/death states', () => {
  assert.equal(chooseAnimationName(names,'idle'), names[1]);
  assert.equal(chooseAnimationName(names,'move'), names[3]);
  assert.equal(chooseAnimationName(names,'fire'), names[2]);
  assert.equal(chooseAnimationName(names,'death'), names[4]);
});

test('rigged fighter selection has safe fallbacks and metric scale for both teams', () => {
  assert.equal(chooseAnimationName(['Idle'], 'move'), 'Idle');
  assert.equal(chooseAnimationName([], 'idle'), null);
  assert.ok(OPERATOR_SETTINGS.ct.height > 1.7 && OPERATOR_SETTINGS.ct.height < 2);
  assert.ok(OPERATOR_SETTINGS.t.height > 1.7 && OPERATOR_SETTINGS.t.height < 2);
});
