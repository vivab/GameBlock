import test from 'node:test';
import assert from 'node:assert/strict';
import { InspectTimeline } from '../src/inspectTimeline.js';
import { KF } from '../src/game1Motion.js';
import { createWeaponView } from '../src/viewmodels.js';

test('knife inspect can restart at zero on a second tap', () => {
  const clip = new InspectTimeline();
  assert.equal(clip.elapsed('knife', 7), -1);
  assert.equal(clip.restart('knife', 10), true);
  assert.equal(clip.elapsed('knife', 10), 0);
  assert.ok(clip.elapsed('knife', 11.5) > 1.49);
  assert.equal(clip.restart('knife', 11.5), true);
  assert.equal(clip.elapsed('knife', 11.5), 0);
  assert.ok(clip.elapsed('knife', 11.8) < 0.31);
});

test('switching weapon immediately cancels inspection; switching back cannot resume it', () => {
  const clip = new InspectTimeline();
  clip.restart('knife', 20);
  clip.cancel();
  assert.equal(clip.active, false);
  assert.equal(clip.elapsed('rifle', 21), -1);
  assert.equal(clip.elapsed('knife', 21), -1);
  clip.restart('rifle', 22);
  assert.equal(clip.elapsed('knife', 22.2), -1);
  clip.cancel();
  clip.restart('knife', 22.4);
  assert.equal(clip.elapsed('knife', 22.4), 0);
});

test('inspect clips stop naturally after the original Game1 keyframe duration', () => {
  const clip = new InspectTimeline();
  for (const [weapon, key] of [['knife', 'knife'], ['pistol', 'pistol'], ['rifle', 'heavy']]) {
    clip.restart(weapon, 40);
    assert.equal(clip.elapsed(weapon, 40 + KF[key].at(-1)[0]), -1);
    assert.equal(clip.active, false);
  }
  assert.equal(clip.restart('unknown', 100), false);
});

test('restarting knife inspection resets its visual keyframe, not user calibration', () => {
  const clip = new InspectTimeline();
  const knife = createWeaponView('knife');
  knife.calibrate({ x: -0.25, ry: -83, rz: 77, scale: 0.84 });
  knife.calibrateHand('R', { x: 1.35, y: -0.4, z: -0.95, k: 0.75 });
  const saved = knife.handCalibration.R;
  clip.restart('knife', 2);
  knife.animate({ time: 3000, inspectTime: clip.elapsed('knife', 3) });
  const firstPeak = knife.knifeWrist.rotation.z;
  assert.ok(Math.abs(firstPeak) > 0.3, 'Knife should turn visibly during inspection');
  clip.restart('knife', 3);
  knife.animate({ time: 3001, inspectTime: clip.elapsed('knife', 3) });
  assert.ok(Math.abs(knife.knifeWrist.rotation.z) < 0.05, 'Second tap should return to keyframe zero');
  assert.deepEqual(knife.handCalibration.R, saved);
  clip.cancel();
  knife.animate({ time: 3100, inspectTime: clip.elapsed('knife', 3.1) });
  assert.ok(Math.abs(knife.knifeWrist.rotation.z) < 0.05, 'Canceled inspection must clear knife rotation');
});
