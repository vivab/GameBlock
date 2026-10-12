// Angle (radians) used as the half-width of the bullet spread cone.
// Keep the four movement states explicit and stable across weapons.
export const ACCURACY = Object.freeze({
  crouching: 0.004, // most accurate
  standing: 0.013,  // medium
  running: 0.044,   // high
  airborne: 0.072,  // highest
  perShot: 0.0045,
  maxBurst: 0.028,
  recoveryPerSecond: 0.035,
});

export function accuracyState({ground, crouched, moving}) {
  // Airborne always wins, even if crouch was pressed in the jump.
  if (!ground) return 'airborne';
  if (moving && !crouched) return 'running';
  if (crouched) return 'crouching';
  return 'standing';
}

export function weaponSpread({ground, crouched, moving, weapon, burst=0}) {
  const state=accuracyState({ground,crouched,moving});
  const multiplier=weapon==='pistol' ? 0.82 : 1;
  return (ACCURACY[state] + Math.min(ACCURACY.maxBurst,Math.max(0,burst))) * multiplier;
}

// One rate-independent recovery for held fire: call once per physics frame.
export function recoverBurst(burst,deltaSeconds) {
  return Math.max(0,burst - Math.max(0,deltaSeconds)*ACCURACY.recoveryPerSecond);
}
