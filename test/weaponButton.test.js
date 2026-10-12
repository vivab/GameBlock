import test from 'node:test';
import assert from 'node:assert/strict';
import { decideWeaponButtonAction } from '../src/weaponButton.js';

const player = (ammo, magazine, reserve=80, reloadingUntil=0) => ({
  alive:true, ammo, magazine, reserve, reloadingUntil
});

test('one circular ↻ control inspects when magazine full, including both knife teams',()=>{
  assert.equal(decideWeaponButtonAction('pistol',player(17,17)),'inspect');
  assert.equal(decideWeaponButtonAction('rifle',player(30,30)),'inspect');
  assert.equal(decideWeaponButtonAction('knife',player(0,0)),'inspect');
});

test('same control reloads when Glock or AK magazine is not full',()=>{
  assert.equal(decideWeaponButtonAction('pistol',player(16,17)),'reload');
  assert.equal(decideWeaponButtonAction('rifle',player(1,30)),'reload');
  assert.equal(decideWeaponButtonAction('rifle',player(0,30)),'reload');
});

test('already reloading, no remaining ammo and dead players never trigger new action',()=>{
  assert.equal(decideWeaponButtonAction('pistol',player(12,17,80,2.5)),'none');
  assert.equal(decideWeaponButtonAction('pistol',player(12,17,0)),'none');
  assert.equal(decideWeaponButtonAction('pistol',{...player(17,17),alive:false}),'none');
  assert.equal(decideWeaponButtonAction('knife',{...player(0,0),alive:false}),'none');
});
