// Persistent character selection for the two fictional FPS teams.
// Candidate CT #08 was explicitly selected by the player on 2026-10-18.
export const CHOSEN_CT=Object.freeze({
  number:8,name:'Police Male 02',path:'casting/realistic/08.glb',
  source:'Microsoft Rocketbox',license:'MIT'
});
// Old 15 candidates and their save key are retained separately for rollback.
export const T_KEY='gameblock:selected-masked-terrorist';
export const T_COUNT=10;
export const ELITE_T_KEY='gameblock:selected-elite-terrorist';
export const ELITE_T_COUNT=5;
export function saveEliteTChoice(number,storage=globalThis.localStorage){
  if(!Number.isInteger(number)||number<1||number>ELITE_T_COUNT)
    throw Error('Choose elite T candidate 1–5');
  try{storage?.setItem(ELITE_T_KEY,String(number));}catch{}
  return 100+number;
}

export function readTChoice(storage=globalThis.localStorage){
  try{
    const elite=Number(storage?.getItem(ELITE_T_KEY));
    if(Number.isInteger(elite)&&elite>=1&&elite<=ELITE_T_COUNT)
      return 100+elite;
    const number=Number(storage?.getItem(T_KEY));
    return Number.isInteger(number)&&number>=1&&number<=T_COUNT?number:0;
  }catch{return 0;}
}
export function terroristAssetPath(number){
  if(Number.isInteger(number)&&number>=101&&number<=100+ELITE_T_COUNT)
    return 'casting/elite/'+String(number-100).padStart(2,'0')+'.glb';
  return Number.isInteger(number)&&number>=1&&number<=T_COUNT?
    'casting/masked/'+String(number).padStart(2,'0')+'.glb':null;
}
export function saveTChoice(number,storage=globalThis.localStorage){
  if(!terroristAssetPath(number))throw Error('Masked T candidate must be 1–10');
  try{storage?.setItem(T_KEY,String(number));}catch{}
  return number;
}
