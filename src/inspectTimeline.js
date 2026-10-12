import { KF } from './game1Motion.js';

// The same inspection action works for both original CT/T knives, Glock and AK.
// Switching weapons, dying, or attacking cancels immediately. Tapping inspect
// again explicitly restarts at the first animation keyframe.
const DURATIONS = Object.freeze({
  knife: KF.knife.at(-1)[0],
  pistol: KF.pistol.at(-1)[0],
  rifle: KF.heavy.at(-1)[0],
});

export class InspectTimeline {
  constructor() {
    this.weapon = null;
    this.startedAt = null;
  }

  restart(weapon, gameTime) {
    if (!(weapon in DURATIONS) || !Number.isFinite(gameTime)) return false;
    this.weapon = weapon;
    this.startedAt = gameTime;
    return true;
  }

  cancel() {
    this.weapon = null;
    this.startedAt = null;
  }

  elapsed(weapon, gameTime) {
    if (this.weapon !== weapon || this.startedAt === null) return -1;
    const elapsed = Math.max(0, gameTime - this.startedAt);
    if (elapsed + 0.0000001 >= DURATIONS[weapon]) {
      this.cancel();
      return -1;
    }
    return elapsed;
  }

  get active() { return this.startedAt !== null; }
}
