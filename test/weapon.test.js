import test from 'node:test';
import assert from 'node:assert/strict';
import { Match, WEAPONS } from '../src/combat.js';

test('switching Glock and AK preserves separate magazines, fire rates and reloads', () => {
  const match = new Match(() => 0.5); match.start('ct'); match.time = 2;
  const player = match.player, aim = { x: 0, y: 0, z: -1 };
  assert.equal(player.ammo, 17);
  assert.ok(match.fire(player, aim));
  assert.equal(match.fire(player, aim), null);
  match.time += WEAPONS.pistol.interval;
  assert.ok(match.fire(player, aim));
  match.equip(player, 'rifle');
  assert.equal(player.ammo, 30);
  match.time = player.nextFire + 0.001;
  assert.ok(match.fire(player, aim));
  match.time += WEAPONS.rifle.interval + 0.001;
  assert.ok(match.fire(player, aim));
  match.equip(player, 'pistol');
  assert.equal(player.ammo, 15);
  match.reload(player);
  assert.ok(player.reloadingUntil > match.time);
  match.step(WEAPONS.pistol.reload + 0.01);
  assert.equal(player.ammo, 17);
  assert.equal(player.reserve, 66);
  match.equip(player, 'rifle');
  assert.equal(player.ammo, 28);
  assert.equal(player.reserve, 90);
});
