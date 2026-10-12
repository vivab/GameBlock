// The simulation is independent of rendering, so match rules and bot perception
// can be checked without WebGL. Coordinates match the arena in main.js.
export const MATCH_SECONDS = 120;
export const RESPAWN_SECONDS = 3;
export const TEAM_SIZE = 5;
export const ARENA_WALLS = [
  { x: 0, z: -24, w: 48, d: 1, h: 4 },
  { x: 0, z: 24, w: 48, d: 1, h: 4 },
  { x: -24, z: 0, w: 1, d: 48, h: 4 },
  { x: 24, z: 0, w: 1, d: 48, h: 4 },
  { x: -8, z: -5, w: 5, d: 3, h: 2.8 },
  { x: 9, z: -5, w: 4, d: 4, h: 2.8 },
  { x: -11, z: 11, w: 5, d: 4, h: 2.5 },
  { x: 12, z: 10, w: 5, d: 3, h: 2.5 },
  { x: -3, z: 2, w: 3, d: 3, h: 2.4 },
  { x: 4, z: 3, w: 3, d: 2, h: 2.4 },
];
export const TEAMS = {
  ct: { name: 'Спецназ', color: 0x4c9fd5, spawnZ: 20, yaw: 0 },
  t: { name: 'Террористы', color: 0xd99a55, spawnZ: -20, yaw: Math.PI },
};
const DAMAGE = { head: 100, chest: 35, stomach: 40, leg: 20 };
const RADIUS = 0.38;
const VIEW_DISTANCE = 28;
const VIEW_COS = Math.cos(Math.PI * 0.36);
const otherTeam = team => team === 'ct' ? 't' : 'ct';
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const crouched = actor => actor.crouch || actor.keyboardCrouch;
const eyeHeight = actor => actor.y + (crouched(actor) ? 1.05 : 1.65);
const normalize = v => {
  const length = Math.hypot(v.x, v.y, v.z);
  return length > 0 ? { x: v.x / length, y: v.y / length, z: v.z / length } : null;
};

export function collides(x, z, radius = RADIUS) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > 23.2 || Math.abs(z) > 23.2) return true;
  return ARENA_WALLS.some(w => Math.abs(x - w.x) < w.w / 2 + radius && Math.abs(z - w.z) < w.d / 2 + radius);
}

// Slab intersection: every visual wall is also a solid bullet/vision blocker.
function rayBox(origin, direction, min, max, range) {
  let near = 0, far = range, normal = { x: 0, y: 0, z: 0 };
  for (const axis of ['x', 'y', 'z']) {
    if (Math.abs(direction[axis]) < 1e-8) {
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) return null;
      continue;
    }
    let a = (min[axis] - origin[axis]) / direction[axis];
    let b = (max[axis] - origin[axis]) / direction[axis];
    let sign = -1;
    if (a > b) { [a, b] = [b, a]; sign = 1; }
    if (a > near) { near = a; normal = { x: 0, y: 0, z: 0, [axis]: sign }; }
    far = Math.min(far, b);
    if (near > far) return null;
  }
  return near >= 0 && near <= range ? { distance: near, normal } : null;
}

export function wallHit(origin, direction, range) {
  let nearest = null;
  for (const wall of ARENA_WALLS) {
    const hit = rayBox(origin, direction,
      { x: wall.x - wall.w / 2, y: 0, z: wall.z - wall.d / 2 },
      { x: wall.x + wall.w / 2, y: wall.h, z: wall.z + wall.d / 2 }, range);
    if (hit && (!nearest || hit.distance < nearest.distance)) nearest = { ...hit, wall };
  }
  return nearest;
}

export function clearSight(from, to) {
  const delta = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
  const range = Math.hypot(delta.x, delta.y, delta.z);
  const direction = normalize(delta);
  return !direction || !wallHit(from, direction, Math.max(0, range - 0.01));
}

export function canSee(observer, target) {
  if (!observer.alive || !target.alive || observer.team === target.team) return false;
  const dx = target.x - observer.x, dz = target.z - observer.z;
  const range = Math.hypot(dx, dz);
  if (range > VIEW_DISTANCE) return false;
  if (range > 0.1 && (-Math.sin(observer.yaw) * dx - Math.cos(observer.yaw) * dz) / range < VIEW_COS) return false;
  return clearSight({ x: observer.x, y: eyeHeight(observer), z: observer.z },
    { x: target.x, y: eyeHeight(target) - 0.15, z: target.z });
}

// A small navigation grid routes bots around cover, including diagonal corners.
const GRID_SIZE = 23, GRID_STEP = 2;
const nodes = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, id) => ({
  id, x: -22 + (id % GRID_SIZE) * GRID_STEP,
  z: -22 + Math.floor(id / GRID_SIZE) * GRID_STEP,
}));
const walkable = nodes.map(node => !collides(node.x, node.z, 0.55));
function walkLine(a, b) {
  const steps = Math.max(1, Math.ceil(distance(a, b) / 0.3));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (collides(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, 0.45)) return false;
  }
  return true;
}
function nearestNode(point) {
  let best = null, bestDistance = Infinity;
  for (const node of nodes) {
    const d = distance(point, node);
    if (walkable[node.id] && d < bestDistance) { best = node; bestDistance = d; }
  }
  return best;
}
export function findPath(start, goal) {
  const a = nearestNode(start), b = nearestNode(goal);
  if (!a || !b) return [];
  if (walkLine(start, goal)) return [{ x: goal.x, z: goal.z }];
  const open = [a.id], closed = new Set(), previous = new Map(), costs = new Map([[a.id, 0]]);
  while (open.length) {
    open.sort((i, j) => costs.get(i) + distance(nodes[i], b) - costs.get(j) - distance(nodes[j], b));
    const id = open.shift();
    if (id === b.id) {
      const path = [b]; let next = id;
      while (previous.has(next)) { next = previous.get(next); path.unshift(nodes[next]); }
      // Skip grid points only when the whole segment is collision-free.
      const result = []; let anchor = start, index = 0;
      while (index < path.length) {
        let last = index;
        for (let i = index; i < path.length; i++) { if (walkLine(anchor, path[i])) last = i; else break; }
        result.push({ x: path[last].x, z: path[last].z }); anchor = path[last]; index = last + 1;
      }
      if (walkLine(anchor, goal)) result.push({ x: goal.x, z: goal.z });
      return result;
    }
    closed.add(id);
    const col = id % GRID_SIZE, row = Math.floor(id / GRID_SIZE);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const c = col + dc, r = row + dr;
      if (c < 0 || c >= GRID_SIZE || r < 0 || r >= GRID_SIZE) continue;
      const neighbor = r * GRID_SIZE + c;
      if (!walkable[neighbor] || closed.has(neighbor)) continue;
      if (dc && dr && (!walkable[row * GRID_SIZE + c] || !walkable[r * GRID_SIZE + col])) continue;
      const cost = costs.get(id) + (dc && dr ? Math.SQRT2 : 1) * GRID_STEP;
      if (cost >= (costs.get(neighbor) ?? Infinity)) continue;
      previous.set(neighbor, id); costs.set(neighbor, cost);
      if (!open.includes(neighbor)) open.push(neighbor);
    }
  }
  return [];
}

export class Match {
  constructor(random = Math.random) {
    this.random = random; this.phase = 'selection'; this.time = 0;
    this.actors = []; this.score = { ct: 0, t: 0 }; this.events = []; this.killfeed = [];
  }
  start(team) {
    if (!TEAMS[team]) throw new Error('Unknown team');
    this.phase = 'playing'; this.time = 0; this.score = { ct: 0, t: 0 };
    this.events = []; this.killfeed = []; this.actors = []; this.playerTeam = team;
    this.plans = {
      ct: { tactic: 'split', changedAt: 0, nextChange: 12, sighting: null },
      t: { tactic: 'group-left', changedAt: 0, nextChange: 15, sighting: null },
    };
    for (const side of ['ct', 't']) {
      for (let slot = 0; slot < TEAM_SIZE; slot++) {
        const isPlayer = side === team && slot === 2;
        const actor = { id: side + slot, name: isPlayer ? 'Ты' : (side === 'ct' ? 'CT-' : 'T-') + (slot + 1),
          team: side, slot, isPlayer, kills: 0, deaths: 0, magazine: isPlayer ? 30 : 12 };
        this.actors.push(actor); this.spawn(actor);
        if (isPlayer) this.player = actor;
      }
    }
  }
  spawn(actor) {
    const base = TEAMS[actor.team];
    // Fixed team slots keep every respawn on its own base. Try nearby spaces if
    // another living fighter is standing on the slot.
    let x = (actor.slot - 2) * 3, z = base.spawnZ;
    for (const [dx, dz] of [[0, 0], [0, -1.5], [1.5, 0], [-1.5, 0], [0, 1.5]]) {
      const candidate = { x: x + dx, z: z + dz };
      if (!collides(candidate.x, candidate.z) && !this.actors.some(a => a !== actor && a.alive && distance(a, candidate) < 0.85)) {
        x = candidate.x; z = candidate.z; break;
      }
    }
    Object.assign(actor, { x, z, y: 0, yaw: base.yaw, pitch: 0, vy: 0, ground: true, crouch: false, keyboardCrouch: false,
      health: 100, alive: true, respawnAt: 0, protectedUntil: this.time + 1.25,
      ammo: actor.magazine, reserve: actor.isPlayer ? 90 : Infinity, reloadingUntil: 0,
      nextFire: this.time + 0.4, lastShotAt: -10, nextKnife: 0, lastJump: -10, jumps: 0,
      targetId: null, lastSeen: null, noticedAt: 0, nextScan: this.time + this.random() * 0.2,
      path: [], nextPath: 0, patrolStage: 0, strafe: this.random() < 0.5 ? -1 : 1 });
    if (actor.isPlayer) this.events.push({ type: 'spawn', actor });
  }
  damage(victim, attacker, amount) {
    if (this.phase !== 'playing' || !victim.alive || !attacker.alive || victim.team === attacker.team || this.time < victim.protectedUntil) return false;
    victim.health = Math.max(0, victim.health - amount);
    if (victim.health > 0) return true;
    victim.alive = false; victim.deaths++; victim.respawnAt = this.time + RESPAWN_SECONDS;
    victim.targetId = null; victim.path = []; victim.reloadingUntil = 0;
    attacker.kills++; this.score[attacker.team]++;
    this.killfeed.unshift({ killer: attacker.name, victim: victim.name, team: attacker.team, time: this.time });
    this.killfeed = this.killfeed.slice(0, 4);
    this.events.push({ type: 'death', actor: victim });
    return true;
  }
  trace(shooter, direction, range = 80) {
    const origin = { x: shooter.x, y: eyeHeight(shooter), z: shooter.z };
    let hit = wallHit(origin, direction, range);
    if (direction.y < -1e-8) {
      const floorDistance = -origin.y / direction.y;
      if (floorDistance < range && (!hit || floorDistance < hit.distance)) hit = { distance: floorDistance, normal: { x: 0, y: 1, z: 0 }, wall: 'floor' };
    }
    for (const actor of this.actors) {
      if (actor === shooter || !actor.alive) continue;
      const height = crouched(actor) ? 1.2 : 1.88;
      const actorHit = rayBox(origin, direction,
        { x: actor.x - 0.43, y: actor.y, z: actor.z - 0.43 },
        { x: actor.x + 0.43, y: actor.y + height, z: actor.z + 0.43 }, range);
      if (!actorHit || (hit && actorHit.distance >= hit.distance)) continue;
      const relativeY = (origin.y + direction.y * actorHit.distance - actor.y) / (height / 1.88);
      const zone = relativeY > 1.43 ? 'head' : relativeY > 0.82 ? 'chest' : relativeY > 0.5 ? 'stomach' : 'leg';
      hit = { ...actorHit, actor, zone };
    }
    const length = hit?.distance ?? Math.min(range, 40);
    return { ...hit, origin, point: { x: origin.x + direction.x * length, y: origin.y + direction.y * length, z: origin.z + direction.z * length } };
  }
  fire(shooter, direction, knife = false) {
    if (this.phase !== 'playing' || !shooter.alive) return null;
    const dir = normalize(direction);
    if (!dir) return null;
    if (knife) {
      if (this.time < shooter.nextKnife) return null;
      shooter.nextKnife = this.time + 0.55;
    } else {
      if (this.time < shooter.nextFire || shooter.reloadingUntil || shooter.ammo <= 0) return null;
      shooter.nextFire = this.time + (shooter.isPlayer ? 0.105 : 0.62 + this.random() * 0.25);
      shooter.ammo--; shooter.lastShotAt = this.time;
    }
    const hit = this.trace(shooter, dir, knife ? 2.4 : 80);
    hit.damaged = hit.actor ? this.damage(hit.actor, shooter, knife ? 65 : DAMAGE[hit.zone]) : false;
    this.events.push({ type: 'shot', shooter, knife, hit });
    return hit;
  }
  reload(actor) {
    if (this.phase !== 'playing' || !actor.alive || actor.reloadingUntil || actor.ammo === actor.magazine || actor.reserve <= 0) return;
    actor.reloadingUntil = this.time + 1.7;
  }
  move(actor, dx, dz) {
    const valid = (x, z) => !collides(x, z) && !this.actors.some(a => a !== actor && a.alive && Math.hypot(a.x - x, a.z - z) < RADIUS * 2);
    if (valid(actor.x + dx, actor.z)) actor.x += dx;
    if (valid(actor.x, actor.z + dz)) actor.z += dz;
  }
  changePlans() {
    for (const side of ['ct', 't']) {
      const plan = this.plans[side];
      if (this.time < plan.nextChange) continue;
      const losing = this.score[side] < this.score[otherTeam(side)];
      const options = losing ? ['group-left', 'group-right', 'split'] : ['split', 'center', 'group-left', 'group-right', 'hold'];
      const choices = options.filter(t => t !== plan.tactic);
      plan.tactic = choices[Math.floor(this.random() * choices.length)];
      plan.changedAt = this.time; plan.nextChange = this.time + 12 + this.random() * 8;
      for (const bot of this.actors.filter(a => a.team === side && !a.isPlayer)) { bot.patrolStage = 0; bot.nextPath = 0; }
    }
  }
  objective(bot) {
    const plan = this.plans[bot.team], sign = bot.team === 'ct' ? 1 : -1;
    // A shared report contains a last observed place, never a hidden live target.
    if (plan.sighting && this.time - plan.sighting.time < 3 && distance(bot, plan.sighting) < 20) return plan.sighting;
    const lane = plan.tactic === 'group-left' ? -16 * sign : plan.tactic === 'group-right' ? 16 * sign :
      plan.tactic === 'center' ? 0 : [-16, -7, 0, 7, 16][bot.slot];
    const offset = (bot.slot % 3 - 1) * 1.4;
    const stages = plan.tactic === 'hold' ? [sign * 7, sign * 4] : [sign * 8, 0, -sign * 11, 0];
    const goal = { x: lane + offset, z: stages[bot.patrolStage % stages.length] };
    if (distance(bot, goal) < 1.8) bot.patrolStage = (bot.patrolStage + 1) % stages.length;
    return goal;
  }
  updateBot(bot, dt) {
    if (this.time >= bot.nextScan) {
      bot.nextScan = this.time + 0.16;
      const visible = this.actors.filter(a => canSee(bot, a)).sort((a, b) => distance(bot, a) - distance(bot, b));
      const target = visible[0];
      if (target) {
        if (bot.targetId !== target.id) bot.noticedAt = this.time + 0.35 + this.random() * 0.35;
        bot.targetId = target.id;
        bot.lastSeen = { x: target.x, z: target.z, time: this.time };
        this.plans[bot.team].sighting = { ...bot.lastSeen };
      } else bot.targetId = null;
    }
    const target = this.actors.find(a => a.id === bot.targetId);
    const visible = target && canSee(bot, target);
    if (visible) {
      const dx = target.x - bot.x, dz = target.z - bot.z, range = Math.hypot(dx, dz);
      bot.yaw = Math.atan2(-dx, -dz);
      if (this.time >= bot.noticedAt && !bot.reloadingUntil) {
        if (bot.ammo === 0) this.reload(bot);
        else if (this.time >= bot.nextFire) {
          // Deliberately modest skill: reaction time, slow fire and imperfect aim.
          const aim = { x: target.x - bot.x + (this.random() - 0.5) * range * 0.085,
            y: target.y + (crouched(target) ? 0.8 : 1.15) - eyeHeight(bot) + (this.random() - 0.5) * range * 0.065,
            z: target.z - bot.z + (this.random() - 0.5) * range * 0.085 };
          this.fire(bot, aim);
        }
      }
      if (range > 15) this.follow(bot, { x: target.x, z: target.z }, dt);
      else if (!bot.reloadingUntil) {
        const step = dt * 1.15;
        const before = { x: bot.x, z: bot.z };
        this.move(bot, -dz / Math.max(1, range) * step * bot.strafe, dx / Math.max(1, range) * step * bot.strafe);
        if (distance(bot, before) < step * 0.2 || this.random() < dt * 0.25) bot.strafe *= -1;
      }
    } else {
      const goal = bot.lastSeen && this.time - bot.lastSeen.time < 2.5 ? bot.lastSeen : this.objective(bot);
      this.follow(bot, goal, dt);
    }
  }
  follow(bot, goal, dt) {
    if (this.time >= bot.nextPath) {
      bot.path = findPath(bot, goal); bot.nextPath = this.time + 0.8 + this.random() * 0.4;
    }
    while (bot.path.length && distance(bot, bot.path[0]) < 0.35) bot.path.shift();
    if (!bot.path.length) return;
    const waypoint = bot.path[0], dx = waypoint.x - bot.x, dz = waypoint.z - bot.z, range = Math.hypot(dx, dz);
    if (range < 0.001) return;
    bot.yaw = Math.atan2(-dx, -dz);
    const step = Math.min(range, dt * (bot.reloadingUntil ? 1.5 : 2.7));
    const before = { x: bot.x, z: bot.z };
    this.move(bot, dx / range * step, dz / range * step);
    if (distance(bot, before) < step * 0.15) {
      // Yield sideways when a squadmate blocks the route, then repath.
      this.move(bot, -dz / range * step * bot.strafe, dx / range * step * bot.strafe);
      bot.nextPath = Math.min(bot.nextPath, this.time + 0.2);
    }
  }
  step(dt) {
    if (this.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    this.time = Math.min(MATCH_SECONDS, this.time + dt);
    if (this.time >= MATCH_SECONDS) { this.phase = 'finished'; return; }
    this.changePlans();
    for (const actor of this.actors) {
      if (!actor.alive) { if (this.time >= actor.respawnAt) this.spawn(actor); continue; }
      if (actor.reloadingUntil && this.time >= actor.reloadingUntil) {
        const count = Math.min(actor.magazine - actor.ammo, actor.reserve);
        actor.ammo += count; actor.reserve -= count; actor.reloadingUntil = 0;
      }
      if (!actor.isPlayer) this.updateBot(actor, Math.min(dt, 0.05));
    }
    this.killfeed = this.killfeed.filter(item => this.time - item.time < 5);
  }
  takeEvents() { return this.events.splice(0); }
}
