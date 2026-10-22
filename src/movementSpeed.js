// One shared, testable movement balance for player and bot locomotion.
// Future machinegun use is already reserved, but equipping it remains disabled.
export const MOVE_SPEEDS=Object.freeze({
 knife:7.0,
 pistol:6.1,
 rifle:5.35,
 machinegun:3.7
});
export const BOT_MOVEMENT_FACTOR=.85;
export function weaponMoveSpeed(weapon,{bot=false,crouch=false,reloading=false}={}){
 const base=MOVE_SPEEDS[weapon]??MOVE_SPEEDS.rifle;
 return base*(bot?BOT_MOVEMENT_FACTOR:1)*(crouch?.53:1)*(reloading?.74:1);
}
