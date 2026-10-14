import test from 'node:test';
import assert from 'node:assert/strict';
import { Match, canSee, collides, findPath, clearSight, MATCH_SECONDS } from '../src/combat.js';

function seeded(seed = 7) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
function setup(team = 'ct') { const game = new Match(seeded()); game.start(team); return game; }

test('either team has exactly five fighters, including one human', () => {
  for (const side of ['ct', 't']) {
    const game = setup(side);
    assert.equal(game.actors.length, 10);
    assert.equal(game.actors.filter(a => a.team === side && !a.isPlayer).length, 4);
    assert.equal(game.actors.filter(a => a.team !== side).length, 5);
    assert.equal(game.player.team, side);
    assert.ok(game.actors.every(a => !collides(a.x, a.z)));
  }
});

test('one death gives one point and respawns on the same base after three seconds', () => {
  const game = setup(), victim = game.actors.find(a => a.team === 't');
  game.time = 2;
  assert.equal(game.damage(victim, game.player, 100), true);
  assert.equal(game.damage(victim, game.player, 100), false);
  assert.equal(game.score.ct, 1);
  assert.equal(game.player.kills, 1);
  assert.equal(victim.alive, false);
  game.step(2.99); assert.equal(victim.alive, false);
  game.step(0.02); assert.equal(victim.alive, true);
  assert.equal(victim.health, 100); assert.equal(victim.z, -20);
  assert.equal(victim.deaths, 1); assert.equal(game.actors.length, 10);
});

test('friendly fire is disabled and a teammate blocks a shot', () => {
  const game = setup(); game.time = 2;
  const ally = game.actors.find(a => a.team === 'ct' && !a.isPlayer);
  const foe = game.actors.find(a => a.team === 't');
  game.player.x = 0; game.player.z = 10;
  ally.x = 0; ally.z = 7; foe.x = 0; foe.z = 0;
  assert.equal(game.damage(ally, game.player, 100), false);
  const hit = game.fire(game.player, { x: 0, y: 0, z: -1 });
  assert.equal(hit.actor, ally); assert.equal(hit.damaged, false);
  assert.equal(ally.health, 100); assert.equal(foe.health, 100);
});

test('walls block sight, bullets and the knife; bots cannot see behind themselves', () => {
  const game = setup(); game.time = 2;
  const foe = game.actors.find(a => a.team === 't');
  Object.assign(game.player, { x: -3, z: 6, yaw: 0 });
  Object.assign(foe, { x: -3, z: -2, yaw: Math.PI });
  assert.equal(canSee(game.player, foe), false);
  assert.equal(clearSight({ x: -3, y: 1.65, z: 6 }, { x: -3, y: 1.65, z: -2 }), false);
  const hit = game.fire(game.player, { x: 0, y: 0, z: -1 });
  assert.ok(hit.wall); assert.equal(foe.health, 100);
  game.player.z = 4; foe.z = 0;
  const knifeHit = game.fire(game.player, { x: 0, y: 0, z: -1 }, true);
  assert.ok(knifeHit.wall); assert.equal(foe.health, 100);
  game.player.x = 0; game.player.z = 10; foe.x = 0; foe.z = 13;
  assert.equal(canSee(game.player, foe), false);
  game.player.yaw = Math.PI; assert.equal(canSee(game.player, foe), true);
});

test('navigation routes around solid cover', () => {
  const start = { x: -3, z: 8 }, goal = { x: -3, z: -4 }, path = findPath(start, goal);
  assert.ok(path.length > 1);
  let point = start;
  for (const next of path) {
    for (let i = 0; i <= 40; i++) assert.equal(collides(point.x + (next.x - point.x) * i / 40, point.z + (next.z - point.z) * i / 40), false);
    point = next;
  }
  assert.ok(Math.hypot(point.x - goal.x, point.z - goal.z) < 0.01);
});

test('bot memory stops at the last visible location when an enemy hides', () => {
  const game = setup(); game.time = 2;
  const bot = game.actors.find(a => a.team === 'ct' && !a.isPlayer);
  const foe = game.actors.find(a => a.team === 't');
  Object.assign(bot, { x: -3, z: 8, yaw: 0, nextScan: 0 });
  Object.assign(foe, { x: -3, z: 5 });
  game.updateBot(bot, 0);
  assert.equal(bot.targetId, foe.id);
  assert.deepEqual(bot.lastSeen, { x: -3, z: 5, time: 2 });
  foe.z = -2; game.time = 2.2; game.updateBot(bot, 0);
  assert.equal(bot.targetId, null);
  assert.deepEqual(bot.lastSeen, { x: -3, z: 5, time: 2 });
});

test('the two-minute deadline ends combat and a fresh round clears the score', () => {
  const game = setup(), victim = game.actors.find(a => a.team === 't');
  game.time = MATCH_SECONDS - 0.01; game.step(0.02);
  assert.equal(game.phase, 'finished'); assert.equal(game.time, MATCH_SECONDS);
  assert.equal(game.damage(victim, game.player, 100), false);
  assert.equal(game.fire(game.player, { x: 0, y: 0, z: -1 }), null);
  game.start('t'); assert.equal(game.phase, 'playing');
  assert.equal(game.time, 0); assert.deepEqual(game.score, { ct: 0, t: 0 });
});

test('a full bot match produces opposing kills, changes tactics and keeps positions valid', () => {
  const game = setup(); const tactics = new Set(); let botShots = 0;
  for (let i = 0; i < MATCH_SECONDS * 30; i++) {
    game.step(1 / 30);
    for (const event of game.takeEvents()) if (event.type === 'shot' && !event.shooter.isPlayer) botShots++;
    tactics.add(game.plans.ct.tactic); tactics.add(game.plans.t.tactic);
    for (const actor of game.actors) {
      assert.ok(Number.isFinite(actor.x) && Number.isFinite(actor.z));
      assert.equal(collides(actor.x, actor.z), false);
    }
  }
  game.step(0.01);
  assert.equal(game.phase, 'finished');
  assert.ok(botShots > 50, `Only ${botShots} bot shots`);
  assert.ok(game.score.ct > 0 && game.score.t > 0, JSON.stringify(game.score));
  assert.ok(tactics.size >= 3);
  assert.equal(game.score.ct + game.score.t, game.actors.reduce((sum, actor) => sum + actor.deaths, 0));
});


test('manual reload responds to a button press and finishes after the correct weapon time', () => {
  const game = setup(); game.time = 2;
  game.player.ammo = 4; game.player.reserve = 20;
  assert.equal(game.reload(game.player), true);
  assert.equal(game.reload(game.player), false);
  assert.equal(game.player.reloadingUntil, 2 + 1.45);
  game.step(1.44);
  assert.equal(game.player.ammo, 4);
  game.step(0.02);
  assert.equal(game.player.ammo, 17);
  assert.equal(game.player.reserve, 7);
  assert.equal(game.player.reloadingUntil, 0);
});

test('both Glock and AK automatically reload on their last bullet', () => {
  for (const weapon of ['pistol', 'rifle']) {
    const game = setup(); game.time = 2;
    game.equip(game.player, weapon);
    const actor = game.player, duration = weapon === 'pistol' ? 1.45 : 2.1;
    actor.ammo = 1;
    actor.nextFire = 0;
    assert.ok(game.fire(actor, { x: 0, y: 0, z: -1 }));
    assert.equal(actor.ammo, 0);
    assert.ok(Math.abs(actor.reloadingUntil - game.time - duration) < 1e-6);
    game.step(duration + 0.02);
    assert.equal(actor.ammo, actor.magazine);
    assert.equal(actor.reloadingUntil, 0);
  }
});

test('empty gun triggers reload even when the player attempts to fire again', () => {
  const game = setup(); game.time = 2;
  game.player.ammo = 0; game.player.nextFire = 0;
  assert.equal(game.fire(game.player, { x: 0, y: 0, z: -1 }), null);
  assert.ok(game.player.reloadingUntil > game.time);
});

test('inspection mode freezes NPC positions, facing and attacks', () => {
  const game = new Match(seeded(), { staticBots: true });
  game.start('ct');
  const initial = game.actors.filter(a => !a.isPlayer)
    .map(a => ({id:a.id,x:a.x,z:a.z,yaw:a.yaw}));
  for (let i = 0; i < 300; i++) game.step(1/30);
  const after = game.actors.filter(a => !a.isPlayer)
    .map(a => ({id:a.id,x:a.x,z:a.z,yaw:a.yaw}));
  assert.deepEqual(after, initial);
  assert.ok(game.takeEvents().every(e => e.type !== 'shot'));
  assert.deepEqual(game.score, {ct:0, t:0});
});
