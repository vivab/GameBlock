// Shared and mobile-friendly locomotion tuning (world units per second).
// The centre of the virtual stick is a true dead zone. A light tilt makes
// the player creep; the outer edge makes them run at the weapon's maximum.
export const MOVE_SPEEDS=Object.freeze({
 knife:4.8,
 pistol:4.1,
 rifle:3.6,
 machinegun:2.55
});
export const BOT_MOVEMENT_FACTOR=.85;
export const JOYSTICK_DEADZONE=.09;
export const JOYSTICK_WALK_THRESHOLD=.54;
// The output is a dimensionless 0..1: only near the edge do we reach full run.
export function joystickIntensity(distance,radius){
 const raw=Math.max(0,Math.min(1,(Number(distance)||0)/Math.max(.0001,radius)));
 if(raw<=JOYSTICK_DEADZONE)return 0;
 const t=(raw-JOYSTICK_DEADZONE)/(1-JOYSTICK_DEADZONE);
 return Number(Math.pow(t,1.45).toFixed(6));
}
export function joystickPace(intensity){
 if(intensity<=0)return 'idle';
 return intensity<JOYSTICK_WALK_THRESHOLD?'walk':'run';
}
export function weaponMoveSpeed(weapon,{bot=false,crouch=false,reloading=false}={}){
 const base=MOVE_SPEEDS[weapon]??MOVE_SPEEDS.rifle;
 return base*(bot?BOT_MOVEMENT_FACTOR:1)*(crouch?.53:1)*(reloading?.74:1);
}
