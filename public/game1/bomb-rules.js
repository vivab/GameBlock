// Bomb-planting rules shared by the live mode and its tests.
// Money applies ONLY in bomb mode. Game1 team deathmatch stays free.
export const BOMB_RULES = Object.freeze({
  buySeconds:10, shopSeconds:25, roundSeconds:130, bombSeconds:40,
  plantSeconds:4, defuseSeconds:10, kitDefuseSeconds:5,
  grenadeFuse:3, smokeSeconds:20, flashSeconds:5, flashWhiteSeconds:2,
  heRadius:8, heMaxDamage:95,
  roundsBeforeSideSwap:9, winsToFinish:10, startingMoney:800
});
export const BOMB_WEAPONS = Object.freeze({
  usp:     {name:'USP-S',slot:'pistol',price:200,mag:12,reserve:72,damage:24,delay:.20,file:'low-poly_usp-s.glb'},
  glock:   {name:'Glock 18',slot:'pistol',price:200,mag:17,reserve:68,damage:19,delay:.17,file:'glock.glb'},
  p250:    {name:'P250',slot:'pistol',price:400,mag:13,reserve:52,damage:28,delay:.20,file:'sig_sauer_p250_low-poly.glb'},
  deagle:  {name:'Desert Eagle',slot:'pistol',price:700,mag:7,reserve:42,damage:54,delay:.36,file:'low-poly_desert_eagle.glb'},
  rifle:   {name:'AK-47',slot:'primary',price:3000,mag:30,reserve:120,damage:31,delay:.115,file:'ak-47_low_poly.glb'},
  m4a4:    {name:'M4A4',slot:'primary',price:3000,mag:30,reserve:120,damage:28,delay:.10,file:'rifle__m4a4_weapon_model_cs2.glb'},
  m16:     {name:'M16A4',slot:'primary',price:3200,mag:30,reserve:120,damage:30,delay:.115,file:'low-poly_m16a4_acog.glb',scope:true},
  mossberg:{name:'Mossberg 590',slot:'primary',price:1000,mag:7,reserve:42,damage:22,delay:.78,pellets:7,file:'low-poly_mossberg_590.glb'},
  m870:   {name:'M870',slot:'primary',price:1000,mag:7,reserve:42,damage:22,delay:.75,pellets:7,file:'low_poly_shotgun-m870.glb'},
  m249:   {name:'M249',slot:'primary',price:3600,mag:100,reserve:200,damage:23,delay:.085,file:'low-poly_m249_saw.glb'},
  awp:    {name:'AWP',slot:'primary',price:4000,mag:5,reserve:30,damage:100,delay:1.25,file:'low_poly_awp.glb',scope:true},
  knife:  {name:'Нож',slot:'knife',price:0,mag:0,reserve:0,damage:55,delay:.55,file:'knife_default_t__cs2.glb'},
  karambit:{name:'Керамбит',slot:'knife',price:0,mag:0,reserve:0,damage:55,delay:.55,file:'low_poly_stylized_karambit_knife.glb'}
});
export const BOMBSHOP_GEAR=Object.freeze({
 kit:{name:'Режим сапёра',side:'ct',price:400},
 he:{name:'HE-граната',price:300,file:'m67_grenade_low-poly.glb'},
 flash:{name:'Flashbang',price:200,file:'m84_stun_grenade_low-poly.glb'},
 smoke:{name:'Smoke',price:300,file:'m18_smoke_grenade_low-poly.glb'}
});
// Units per second. Reloading deliberately has no movement penalty.
export const BOMB_MOVE_SPEED = Object.freeze({
  knife:5.25, grenade:5.38, bomb:5.17, pistol:4.90,
  rifle:4.55, sniper:3.70, machinegun:3.05
});
export function bombMoveSpeed(weaponId,{crouched=false,aiming=false,grenadeHeld=false}={}){
  let type='rifle';
  if(grenadeHeld)type='grenade';
  else if(weaponId==='bomb')type='bomb';
  else if(['knife','karambit'].includes(weaponId))type='knife';
  else if(['usp','glock','p250','deagle'].includes(weaponId))type='pistol';
  else if(weaponId==='awp')type='sniper';
  else if(weaponId==='m249')type='machinegun';
  const speed=BOMB_MOVE_SPEED[type];
  return crouched?Math.min(2.55,speed*.50):aiming?speed*.70:speed;
}
export function canUseBombShop(game,actor,spawn,radius=11){
  return !!(game&&actor?.alive&&spawn&&(game.phase==='buy'||game.phase==='live')&&
    game.shopRemaining>0&&
    Math.hypot(actor.x-spawn.x,actor.z-spawn.z)<=radius);
}
export const otherSide=team=>team==='ct'?'t':'ct';
export const actualSide=(startingSide,round)=>round>9?otherSide(startingSide):startingSide;
export const heDamage=distance=>distance>=BOMB_RULES.heRadius?0:
 Math.max(1,Math.round(BOMB_RULES.heMaxDamage*(1-distance/BOMB_RULES.heRadius)));
export function flashAlpha(elapsed){
 if(elapsed<0||elapsed>=BOMB_RULES.flashSeconds)return 0;
 if(elapsed<BOMB_RULES.flashWhiteSeconds)return 1;
 return 1-(elapsed-BOMB_RULES.flashWhiteSeconds)/
  (BOMB_RULES.flashSeconds-BOMB_RULES.flashWhiteSeconds);
}
export const canPlant=(side,hasBomb,site,alive=true)=>side==='t'&&hasBomb&&!!site&&alive;
export const canDefuse=(side,planted,alive=true)=>side==='ct'&&planted&&alive;
export const defuseDuration=hasKit=>hasKit?BOMB_RULES.kitDefuseSeconds:BOMB_RULES.defuseSeconds;
export function makeBombPlayer(id,startingSide,isPlayer=false){
 const side=startingSide;
 const basePistol=side==='ct'?'usp':'glock';
 return {id,startingSide,side,isPlayer,alive:true,health:100,money:800,
   weapons:{pistol:basePistol,primary:null,knife:'knife'},
   ammo:{[basePistol]:{mag:BOMB_WEAPONS[basePistol].mag,reserve:BOMB_WEAPONS[basePistol].reserve}},
   grenades:{he:0,flash:0,smoke:0},hasKit:false,hasBomb:false,kills:0,deaths:0};
}
export function buyBombItem(actor,id,phase){
 if(phase!=='buy'||!actor.alive)return {ok:false,reason:'Покупки доступны только в начале раунда'};
 const info=BOMB_WEAPONS[id]||BOMBSHOP_GEAR[id];
 if(!info)return {ok:false,reason:'Неизвестный предмет'};
 if(info.side&&actor.side!==info.side)return {ok:false,reason:'Только для спецназа'};
 if(info.price>actor.money)return {ok:false,reason:'Недостаточно денег'};
 // Both default knife and karambit are free cosmetic choices in bomb mode.
 // They never take away the $800 starting balance.
 if(info.slot==='knife'){actor.weapons.knife=id;return {ok:true,item:id,cost:0}}
 if(id==='kit'&&actor.hasKit)return {ok:false,reason:'Набор уже куплен'};
 if(['he','flash','smoke'].includes(id)&&actor.grenades[id]>=2)
  return {ok:false,reason:'Не больше двух гранат этого типа'};
 actor.money-=info.price;
 if(info.slot){
  actor.weapons[info.slot]=id;
  actor.ammo[id]={mag:info.mag,reserve:info.reserve};
 }else if(id==='kit')actor.hasKit=true;
 else actor.grenades[id]++;
 return {ok:true,item:id,cost:info.price};
}
export function nextBombRound(game,actors,random=Math.random){
 game.round++;
 game.phase='buy';
 game.time=BOMB_RULES.buySeconds;
 game.shopRemaining=BOMB_RULES.shopSeconds;
 game.planted=false;game.plantedAt=0;game.bombPosition=null;
 game.bombCarrier=null;game.winner=null;game.site=null;
 game.bombExploded=false;game.bombDropped=null;
 for(const actor of actors){
  actor.side=actualSide(actor.startingSide,game.round);
  actor.alive=true;actor.health=100;actor.hasBomb=false;actor.plantProgress=0;
  actor.defuseProgress=0;
  actor.weapons.primary=null;
  actor.weapons.pistol=actor.side==='ct'?'usp':'glock';
  const pistol=BOMB_WEAPONS[actor.weapons.pistol];
  actor.ammo={[actor.weapons.pistol]:{mag:pistol.mag,reserve:pistol.reserve}};
  actor.grenades={he:0,flash:0,smoke:0};
  actor.hasKit=false;
 }
 const terrorists=actors.filter(a=>a.side==='t');
 if(terrorists.length){
  const carrier=terrorists[Math.min(terrorists.length-1,Math.floor(random()*terrorists.length))];
  carrier.hasBomb=true;game.bombCarrier=carrier.id;
 }
 return game;
}
export function makeBombMatch(actors,random=Math.random){
 const match={round:0,wins:{ct:0,t:0},phase:'ready',time:0,planted:false,bombCarrier:null,
  bombPosition:null,bombDropped:null,site:null,winner:null,finished:false};
 nextBombRound(match,actors,random);
 return match;
}
export function awardBombRound(game,actors,winner){
 if(!['ct','t'].includes(winner)||game.phase==='finished'||game.phase==='result')return false;
 game.wins[winner]++;game.winner=winner;
 game.finished=game.wins[winner]>=BOMB_RULES.winsToFinish;
 game.phase=game.finished?'finished':'result';game.time=game.finished?0:5;
 for(const actor of actors)actor.money=Math.min(16000,actor.money+(actor.side===winner?3250:1900));
 return true;
}
export function tickBombClock(game,dt,actors){
 if(game.phase==='finished')return null;
 if(game.phase==='buy'||game.phase==='live')game.shopRemaining=Math.max(0,(game.shopRemaining??BOMB_RULES.shopSeconds)-dt);
 game.time=Math.max(0,game.time-dt);
 if(game.time>0)return null;
 if(game.phase==='buy'){game.phase='live';game.time=BOMB_RULES.roundSeconds;return 'round-start'}
 if(game.phase==='live'){awardBombRound(game,actors,'ct');return 'time-ct'}
 if(game.phase==='planted'){awardBombRound(game,actors,'t');game.bombExploded=true;return 'explosion'}
 if(game.phase==='result'){nextBombRound(game,actors);return 'next-round'}
 return null;
}
export function segmentPassesSmoke(a,b,center,r=4.5){
 const dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;
 const t=den?Math.max(0,Math.min(1,((center.x-a.x)*dx+(center.z-a.z)*dz)/den)):0;
 return Math.hypot(a.x+t*dx-center.x,a.z+t*dz-center.z)<r;
}
