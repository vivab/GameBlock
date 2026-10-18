// Persistent character selection for the two fictional FPS teams.
// Candidate CT #08 was explicitly selected by the player on 2026-10-18.
export const CHOSEN_CT=Object.freeze({
  number:8,name:'Police Male 02',path:'casting/realistic/08.glb',
  source:'Microsoft Rocketbox',license:'MIT'
});
export const T_KEY='gameblock:selected-terrorist';
export const T_COUNT=15;
export function readTChoice(storage=globalThis.localStorage){
  try{
    const number=Number(storage?.getItem(T_KEY));
    return Number.isInteger(number)&&number>=1&&number<=T_COUNT?number:0;
  }catch{return 0;}
}
export function terroristAssetPath(number){
  return Number.isInteger(number)&&number>=1&&number<=T_COUNT?
    'casting/terrorists/'+String(number).padStart(2,'0')+'.glb':null;
}
export function saveTChoice(number,storage=globalThis.localStorage){
  if(!terroristAssetPath(number))throw Error('T candidate must be 1–15');
  try{storage?.setItem(T_KEY,String(number));}catch{}
  return number;
}
