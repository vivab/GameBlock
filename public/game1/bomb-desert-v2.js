import {
 BOMB_RULES,BOMB_WEAPONS,BOMBSHOP_GEAR,makeBombPlayer,
 makeBombMatch,nextBombRound,buyBombItem,awardBombRound,tickBombClock,
 heDamage,flashAlpha,canPlant,canDefuse,defuseDuration,segmentPassesSmoke,bombMoveSpeed,canUseBombShop
} from './bomb-rules.js';
import {buildItalyMap,ITALY_SITES,ITALY_SPAWNS,ITALY_SPAWN_POINTS,findItalyPath,italyBlocks,italyGround,italyCanTraverse} from './italy-import-map.js?v=italy-bot-grid-20261024';
import {italyRole,italySafePoint,italyRouteGates,italyPickCover,italyLeadThreat} from './italy-tactics.js?v=italy-bot-grid-20261024';

const THREE=window.THREE;
console.info('[GameBlock] CS Italy GLB · A market · B wine courtyard · 5v5');
const byId=id=>document.getElementById(id);
const V=THREE.Vector3;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const rng=(a,b)=>a+Math.random()*(b-a);
const rad=Math.PI/180;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#adc6d8');
scene.fog=new THREE.Fog(0xb2c5cc,115,230);
// Italy uses baked unlit atlases; these lights illuminate soldiers, hands and guns.
scene.add(new THREE.HemisphereLight(0xf7fbff,0x82765b,1.1));
const light=new THREE.DirectionalLight(0xffe8c3,1.25);light.position.set(25,60,-25);scene.add(light);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.05,190);
const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.2));
renderer.setSize(innerWidth,innerHeight);
// Three r128 defaults to linear output, which crushed dark baked Italy pixels.
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.NoToneMapping;
renderer.toneMappingExposure=1;
byId('world').append(renderer.domElement);
const weaponContainer=new THREE.Group();
camera.add(weaponContainer);scene.add(camera);
const bombView=bombMesh();
bombView.position.set(.32,-.25,-.72);
bombView.rotation.set(-.18,-.21,-.14);
bombView.scale.setScalar(.85);
bombView.visible=false;
camera.add(bombView);
const grenadeView=new THREE.Group();
const grenadeMaterial=new THREE.MeshStandardMaterial({color:0x516b42,metalness:.25,roughness:.55});
grenadeView.add(new THREE.Mesh(new THREE.CylinderGeometry(.105,.12,.27,10),grenadeMaterial));
const grenadePin=new THREE.Mesh(new THREE.TorusGeometry(.075,.012,6,12),
 new THREE.MeshStandardMaterial({color:0xc6c0a5,metalness:.75,roughness:.3}));
grenadePin.position.set(.08,.17,0);grenadePin.rotation.x=Math.PI/2;grenadeView.add(grenadePin);
grenadeView.position.set(.30,-.30,-.58);grenadeView.rotation.z=-.15;
grenadeView.visible=false;camera.add(grenadeView);
// Reuse Game1's entire finger rig, weapon loader, inspect and reload code.
window.weaponContainer=weaponContainer;
window.camera=camera;
window.renderer=renderer;
window.scene=scene;
const loader=new THREE.GLTFLoader();
const assets=new Map();
const obstacles=[];
let levelMeshes=[],levelBounds=[],mapTop=45;
const groundCache=new Map();
let mapLoaded=false,game=null,players=[],me=null;
let currentSlot='pistol',grenadeHeld=false,aiming=false,lookYaw=0,lookPitch=0;
let targetLookYaw=0,targetLookPitch=0;
const smoothJoy={x:0,y:0},moveVelocity={x:0,z:0};
const damp=(current,target,rate,dt)=>current+(target-current)*(1-Math.exp(-Math.max(0,rate*dt)));
let selectedGrenade='he',firing=false,jumping=false,crouched=false;
let playerY=0,verticalSpeed=0,grounded=true,holdAction=false,progress=0,forcedPlantCrouch=false;
let flashStarted=-100,flashDuration=0,announcedUntil=0,noticeText='';
const joy={x:0,y:0,id:null},keys=new Set(),pointers=new Map();
let activeGrenades=[],smokes=[],bombObject=null,bombDropObject=null,bombBeep=0,tracers=[],spectateTarget=null,roundSerial=0;
const SITES=ITALY_SITES;
// Real-world tactical mini-map. Only this HUD draws site zones and A/B letters.
const miniCanvas=byId('miniMap'),miniCtx=miniCanvas.getContext('2d',{alpha:false});
const MINI_W=116,MINI_H=202;
const miniScale=Math.min((MINI_W-9)/71,(MINI_H-9)/125);
const miniOffsetX=(MINI_W-71*miniScale)/2,miniOffsetY=(MINI_H-125*miniScale)/2;
let miniBackground=null,nextMiniDraw=0;
function miniPoint(x,z){
 return {x:miniOffsetX+(x+35)*miniScale,y:miniOffsetY+(z+62)*miniScale};
}
function makeMiniMap(){
 miniCanvas.width=MINI_W;miniCanvas.height=MINI_H;
 const base=document.createElement('canvas');base.width=MINI_W;base.height=MINI_H;
 const g=base.getContext('2d');
 g.fillStyle='#12222e';g.fillRect(0,0,MINI_W,MINI_H);
 for(let z=-62;z<63;z++)for(let x=-35;x<36;x++){
  if(italyBlocks(x,z,.02))continue;
  const p=miniPoint(x-.48,z-.48);
  const height=positionGround(x,z);
  g.fillStyle=height>1.2?'#94a3a2':height<-.8?'#708887':'#849899';
  g.fillRect(p.x,p.y,miniScale+.24,miniScale+.24);
 }
 g.strokeStyle='#7f9b9d';g.lineWidth=1;
 g.strokeRect(.5,.5,MINI_W-1,MINI_H-1);
 miniBackground=base;
}
function miniDot(pos,color,radius=3){
 const p=miniPoint(pos.x,pos.z);
 miniCtx.beginPath();miniCtx.arc(p.x,p.y,radius,0,Math.PI*2);
 miniCtx.fillStyle=color;miniCtx.fill();
 miniCtx.lineWidth=.85;miniCtx.strokeStyle='#07131e';miniCtx.stroke();
}
function renderMiniMap(now){
 if(!mapLoaded||!me||!game||!miniCtx||now<nextMiniDraw)return;
 nextMiniDraw=now+.14;
 if(!miniBackground)makeMiniMap();
 miniCtx.drawImage(miniBackground,0,0);
 for(const site of SITES){
  const p=miniPoint(site.x,site.z);
  miniCtx.beginPath();miniCtx.arc(p.x,p.y,site.radius*miniScale,0,Math.PI*2);
  miniCtx.fillStyle=site.id==='A'?'#efa9494e':'#74c4e54e';miniCtx.fill();
  miniCtx.strokeStyle=site.id==='A'?'#ffcd83':'#9de4f5';
  miniCtx.lineWidth=1.9;miniCtx.stroke();
  miniCtx.fillStyle='#fff';miniCtx.font='bold 11px system-ui';
  miniCtx.textAlign='center';miniCtx.textBaseline='middle';
  miniCtx.fillText(site.id,p.x,p.y+.3);
 }
 for(const actor of players){
  if(!actor.alive||actor.isPlayer||actor.side!==me.side)continue;
  miniDot(actor,me.side==='ct'?'#64d9ec':'#efc268',2.8);
 }
 if(game.planted&&game.bombPosition)miniDot(game.bombPosition,'#ff594b',3.8);
 else if(game.bombDropped&&me.side==='t')miniDot(game.bombDropped,'#ffb84b',3.8);
 const p=miniPoint(me.x,me.z);
 miniCtx.save();miniCtx.translate(p.x,p.y);miniCtx.rotate(-me.yaw);
 miniCtx.beginPath();miniCtx.moveTo(0,-7);miniCtx.lineTo(-5,5);miniCtx.lineTo(5,5);
 miniCtx.closePath();miniCtx.fillStyle='#a5ffbc';miniCtx.fill();
 miniCtx.strokeStyle='#143824';miniCtx.lineWidth=1.3;miniCtx.stroke();
 miniCtx.restore();
}

const levelRoot=new THREE.Group();scene.add(levelRoot);
// Limit raycasting to the meshes whose bounding boxes the ray can reach.
// This avoids costly full-map triangle queries for every AI movement step.
function levelHits(ray){
 if(!levelMeshes.length)return [];
 const candidates=levelBounds.length===levelMeshes.length
  ? levelMeshes.filter((mesh,index)=>ray.ray.intersectsBox(levelBounds[index]))
  : levelMeshes;
 return candidates.length?ray.intersectObjects(candidates,false):[];
}
// Read the actual half-metre mesh floor height, including stairs and sloped streets.
// Avoid stepping onto disconnected roofs or onto decorative crate tops.
function positionGround(x,z,fromY=45){return italyGround(x,z);}
function refreshLevelCollision(){
 groundCache.clear();
 levelBounds=levelMeshes.map(mesh=>new THREE.Box3().setFromObject(mesh));
}
// The real textured GLB is loaded before anyone can spawn.
function buildItaly(){
 byId('mapStatus').textContent='Загружаем готовую карту Italy (11 МБ)…';
 buildItalyMap(THREE,levelRoot).then(({floor,obstacles:solids,meshCount})=>{
  // Never enable a match with white, textureless geometry. Every GLB mesh
  // ships with a 1024px baked atlas; missing atlases mean an incompatible loader.
  const meshes=[floor,...solids];
  const textured=meshes.filter(mesh=>{
   const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
   return mats.some(mat=>mat?.map?.image?.width>0);
  }).length;
  console.info('[GameBlock] Italy textured meshes:',textured,'/',meshes.length);
  if(textured<12)throw new Error('Текстуры Italy не загрузились ('+textured+'/'+meshes.length+'). Обнови страницу.');
  obstacles.push(...solids);
  levelMeshes=[floor,...obstacles];mapTop=20;refreshLevelCollision();
  mapLoaded=true;
  onMapReady('ITALY GLB · A: РЫНОК · B: ЗАПАДНЫЙ ДВОР · '+meshCount+' частей');
 }).catch(error=>{
  console.error('Italy map loading failed',error);
  byId('mapStatus').textContent='Ошибка загрузки Italy: '+(error?.message||error);
 });
}
function onMapReady(message){
 byId('mapStatus').textContent=message;
 makeMiniMap();
}

buildItaly();
const materials={
 ct:new THREE.MeshStandardMaterial({color:0x325675,roughness:.85}),
 t:new THREE.MeshStandardMaterial({color:0x77713d,roughness:.9}),
 vest:new THREE.MeshStandardMaterial({color:0x242d35,roughness:.95}),
 skin:new THREE.MeshStandardMaterial({color:0xad8568,roughness:1}),
 gun:new THREE.MeshStandardMaterial({color:0x2d2e32,metalness:.35,roughness:.5}),
 glove:new THREE.MeshStandardMaterial({color:0x1a232b,roughness:1})
};
function meshBox(parent,w,h,d,x,y,z,mat){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;
}
function makeSoldier(actor){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const cloth=actor.side==='ct'?materials.ct:materials.t;
 meshBox(body,.59,.73,.34,0,1.32,0,cloth);
 meshBox(body,.48,.50,.39,0,1.39,-.01,materials.vest);
 meshBox(body,.40,.39,.37,0,1.85,0,materials.vest);
 meshBox(body,.21,.11,.03,-.09,1.89,-.20,materials.skin);
 meshBox(body,.21,.11,.03,.09,1.89,-.20,materials.skin);
 const arms=[],legs=[];
 for(const sign of [-1,1]){
  const arm=new THREE.Group();arm.position.set(sign*.36,1.57,-.04);body.add(arm);
  // Aim arms forward: never re-create GameBlock's outstretched T-pose.
  meshBox(arm,.20,.22,.45,0,-.10,-.17,cloth);
  meshBox(arm,.21,.12,.20,0,-.18,-.42,materials.glove);
  arms.push(arm);
  const leg=new THREE.Group();leg.position.set(sign*.17,.94,0);body.add(leg);
  meshBox(leg,.24,.75,.27,0,-.37,0,cloth);
  meshBox(leg,.26,.18,.37,0,-.76,-.08,materials.vest);legs.push(leg);
 }
 const gun=meshBox(body,.13,.13,.85,.02,1.29,-.55,materials.gun);
 gun.rotation.x=-.02;root.userData={body,legs,arms,gun};
 root.position.set(actor.x,0,actor.z);scene.add(root);
 return root;
}
function respawnActor(actor,index){
 const isCt=actor.side==='ct',row=index%5;
 const spawn=ITALY_SPAWN_POINTS[actor.side][row];
 actor.x=spawn[0];actor.z=spawn[1];
 actor.y=positionGround(actor.x,actor.z,mapTop+5);
 actor.yaw=isCt?0:Math.PI;
 actor.health=100;actor.alive=true;actor.target=null;actor.travel=0;actor.actionTime=0;
 actor.hasPlanted=false;actor.reloadingUntil=0;actor.lastShot=-10;actor.botGoal=null;
 actor.nextDecision=0;actor.flashUntil=0;actor.walkPhase=0;actor.mapRoute=null;
 actor.navSample=null;actor.navGoal=null;actor.navStalls=0;
 if(actor.mesh){
  actor.mesh.visible=true;actor.mesh.position.set(actor.x,actor.y,actor.z);
  actor.mesh.traverse(o=>{if(o.isMesh&&o.material===materials.ct||o.material===materials.t)o.material=actor.side==='ct'?materials.ct:materials.t});
 }
}
function setMessage(message,seconds=2.5){
 noticeText=message;announcedUntil=performance.now()+seconds*1000;
 byId('message').textContent=message;
}
function start(side){
 if(!mapLoaded){byId('mapStatus').textContent='Карта ещё загружается';return}
 players=[makeBombPlayer('player',side,true)];
 for(let i=0;i<4;i++)players.push(makeBombPlayer('ally-'+i,side));
 const opposite=side==='ct'?'t':'ct';
 for(let i=0;i<5;i++)players.push(makeBombPlayer('enemy-'+i,opposite));
 me=players[0];
 game=makeBombMatch(players);
 players.forEach((p,i)=>{respawnActor(p,i);if(!p.isPlayer)p.mesh=makeSoldier(p)});
 resetPositions();
 roundSerial=game.round;
 byId('choose').hidden=true;byId('hud').hidden=false;
 window.loadGLTFModels?.();
 setSlot('pistol');
 buildShop();
 setMessage('25 секунд закупки · старт $800',3);
 updateHud();
}
function resetPositions(){
 teamIntel.ct=teamIntel.t=null;coverCache.clear();
 teamSeeds.ct=Math.floor(Math.random()*5);teamSeeds.t=Math.floor(Math.random()*5);
 players.forEach((p,i)=>{
  respawnActor(p,i);
  if(!p.isPlayer){
   p.role=italyRole(p.side,botIndex(p),game.round,teamSeeds[p.side]);
   p.routeVariant=Math.floor(Math.random()*3);
   p.order=null;p.mapRoute=null;p.visionCheckAt=0;p.nextPeek=0;
   // Spread heavy path-search work over the first second, instead of one mobile frame.
   p.routePlanAt=performance.now()/1000+(botIndex(p)+(p.side==='t'?5:0))*.105;
  }
  if(!p.isPlayer&&p.mesh){p.mesh.visible=true;p.mesh.position.set(p.x,p.y,p.z)}
 });
 me.yaw=me.side==='ct'?0:Math.PI;
 lookYaw=me.yaw;lookPitch=0;targetLookYaw=lookYaw;targetLookPitch=0;
  smoothJoy.x=smoothJoy.y=0;moveVelocity.x=moveVelocity.z=0;
  playerY=me.y;verticalSpeed=0;
 aiming=false;stopScope();currentSlot='pistol';grenadeHeld=false;crouched=false;progress=0;holdAction=false;
 activeGrenades.forEach(g=>scene.remove(g.mesh));activeGrenades=[];
 smokes.forEach(s=>scene.remove(s.mesh));smokes=[];
 if(bombObject){scene.remove(bombObject);bombObject=null}
 if(bombDropObject){scene.remove(bombDropObject);bombDropObject=null}
 for(const p of players)if(!p.isPlayer){
  const money=p.money;
  const plan=money>=4000?'awp':money>=3000?(Math.random()<.5?'m4a4':'rifle'):money>=1000?'m870':null;
  if(plan)buyBombItem(p,plan,'buy');
  if(p.side==='ct'&&p.money>=400&&Math.random()<.45)buyBombItem(p,'kit','buy');
  if(p.money>=300&&Math.random()<.32)buyBombItem(p,'he','buy');
  p.equipped=p.weapons.primary||p.weapons.pistol;
 }
 const bombCarrier=players.find(p=>p.hasBomb);
 if(bombCarrier?.isPlayer)setMessage('Тебе досталась C4! Четвёртый слот',3);
 else setMessage('Раунд '+game.round+' · подготовка',2);
 setSlot('pistol');
}
function canShop(){return canUseBombShop(game,me,ITALY_SPAWNS[me?.side]);}
function buildShop(){
 const container=byId('shopItems');container.replaceChildren();
 for(const [id,entry] of [...Object.entries(BOMB_WEAPONS),...Object.entries(BOMBSHOP_GEAR)]){
  if(id==='kit'&&me?.side!=='ct')continue;
  const button=document.createElement('button');
  const name=document.createElement('span');name.textContent=entry.name;
  const price=document.createElement('strong');price.textContent='$'+entry.price;
  button.append(name,price);
  button.addEventListener('click',()=>{
   const result=buyBombItem(me,id,canShop()?'buy':'closed');
   byId('shopStatus').textContent=result.ok?'Куплено: '+entry.name:result.reason;
   if(result.ok){
    updateHud();
    if(entry.slot)setSlot(entry.slot);
    if(id==='kit')setMessage('Набор сапёра: 5 сек на обезвреживание');
   }
  });
  container.append(button);
 }
}
function equipCurrent(){
 const id=currentSlot==='pistol'?me.weapons.pistol:
  currentSlot==='primary'?me.weapons.primary:
  currentSlot==='knife'?me.weapons.knife:null;
 if(id&&window.HW_set)window.HW_set(id);
 bombView.visible=currentSlot==='bomb'&&!grenadeHeld;
 grenadeView.visible=grenadeHeld;
 if(window.HW_visible)window.HW_visible(currentSlot!=='bomb'&&!grenadeHeld);
}
function setSlot(slot){
 if(!me)return;
 if(slot==='bomb'&&!(me.hasBomb&&me.side==='t'))return false;
 if(slot==='primary'&&!me.weapons.primary)return false;
 currentSlot=slot;
 grenadeHeld=false;
 stopScope();
 equipCurrent();
 byId('weapons').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.slot===slot));
 updateHud();
 return true;
}
window.GAME_SET=id=>{
 const def=BOMB_WEAPONS[id];if(!def||!me)return;
 // The Game1 pose editor may switch among owned guns for preview, but
 // cannot mint expensive weapons for free during the bomb-economy match.
 if(def.slot==='primary'||def.slot==='pistol'||def.slot==='knife'){
  if(me.weapons[def.slot]!==id){
   setMessage('Сначала купи '+def.name+' в магазине закладки бомбы',2);
   equipCurrent();return;
  }
  currentSlot=def.slot;
  grenadeHeld=false;
  grenadeView.visible=false;
  updateHud();
  window.HW_set?.(id);
 }
};
function stopScope(){
 if(!aiming)return;
 aiming=false;camera.fov=75;camera.updateProjectionMatrix();byId('scope').style.display='none';
 byId('crosshair').style.visibility='visible';
 if(window.HW_visible)window.HW_visible(currentSlot!=='bomb'&&!grenadeHeld);
}
function toggleScope(){
 if(aiming){stopScope();return}
 const item=BOMB_WEAPONS[me.weapons[currentSlot]];
 if(!item?.scope||!me.alive)return;
 aiming=true;camera.fov=item===BOMB_WEAPONS.awp?23:47;camera.updateProjectionMatrix();
 byId('scope').classList.toggle('red',item===BOMB_WEAPONS.m16);
 byId('scope').style.display='block';
 byId('crosshair').style.visibility='hidden';
 if(window.HW_visible)window.HW_visible(false);
}
function groundLOS(a,b){
 if(!mapLoaded||!levelMeshes.length)return true;
 const delta=b.clone().sub(a),len=delta.length();
 if(len<.01)return true;
 const ray=new THREE.Raycaster(a,delta.divideScalar(len),.12,len-.14);
 const hit=levelHits(ray)[0];
 return !hit||hit.distance>=len-.14;
}
function insideSmoke(a,b){
 return smokes.some(s=>segmentPassesSmoke(a,b,s.position));
}
function findSite(x,z){
 return SITES.find(s=>Math.hypot(s.x-x,s.z-z)<=s.radius);
}
function direction(yaw){
 return new V(-Math.sin(yaw),0,-Math.cos(yaw));
}
function getClosestEnemy(actor,maxRange=42){
 let best=null,dist=maxRange;
 for(const other of players){
  if(other===actor||!other.alive||other.side===actor.side)continue;
  const d=Math.hypot(other.x-actor.x,other.z-actor.z);
  if(d>=dist)continue;
  const from=new V(actor.x,actor.y+1.45,actor.z);
  const to=new V(other.x,other.y+1.3,other.z);
  if(insideSmoke(from,to)||!groundLOS(from,to))continue;
  dist=d;best=other;
 }
 return best;
}
function damaged(actor,amount,killer=null){
 if(!actor?.alive||amount<=0)return;
 actor.health=Math.max(0,actor.health-Math.round(amount));
 if(actor.health>0)return;
 actor.alive=false;actor.deaths++;
 if(killer&&killer!==actor){killer.kills++;killer.money=Math.min(16000,killer.money+300)}
 if(actor.hasBomb&&!game.planted){
  actor.hasBomb=false;game.bombCarrier=null;
  const floorY=positionGround(actor.x,actor.z,actor.y+1.25);
  game.bombDropped={x:actor.x,y:floorY,z:actor.z};
  if(bombDropObject)scene.remove(bombDropObject);
  bombDropObject=bombMesh();
  bombDropObject.position.set(actor.x,floorY+.012,actor.z);
  scene.add(bombDropObject);
 }
 if(actor.mesh)actor.mesh.visible=false;
 if(actor.isPlayer){firing=false;holdAction=false;stopScope();setMessage('Ты погиб · ожидай следующего раунда',4)}
 else if(killer===me)setMessage('Противник устранён +$300',1.25);
 updateHud();
}
function checkElimination(){
 if(game.phase!=='live'&&game.phase!=='planted')return;
 const ct=players.some(p=>p.alive&&p.side==='ct');
 const t=players.some(p=>p.alive&&p.side==='t');
 if(!ct){awardBombRound(game,players,'t');setMessage('ТЕРРОРИСТЫ ПОБЕДИЛИ',4)}
 else if(!t&&!game.planted){awardBombRound(game,players,'ct');setMessage('СПЕЦНАЗ ПОБЕДИЛ',4)}
}
function fireGun(actor){
 if(!actor.alive||!['live','planted'].includes(game.phase))return;
 const id=actor.isPlayer?me.weapons[currentSlot]:actor.equipped;
 const item=BOMB_WEAPONS[id];
 if(!item||!item.slot||item.slot==='knife'&&actor.isPlayer&&currentSlot!=='knife')return;
 const now=performance.now()/1000;
 if(now-(actor.lastShot||-10)<item.delay||now<(actor.reloadingUntil||0))return;
 let ammo=actor.ammo[id];
 if(item.mag){
  if(!ammo){ammo={mag:item.mag,reserve:item.reserve};actor.ammo[id]=ammo}
  if(ammo.mag<=0){reloadActor(actor,id);return}
  ammo.mag--;
 }
 actor.lastShot=now;
 if(actor.isPlayer){
  window.HW_fire?.(id);
  lookPitch=clamp(lookPitch+(.012+(item.damage/100)*.012),-1.2,1.2);
 }else if(actor.mesh){actor.mesh.userData.legs[0].rotation.x=-.07}
 const origin=new V(actor.x,actor.y+(actor.isPlayer?(crouched?.95:1.62):1.54),actor.z);
 let aim;
 if(actor.isPlayer){
  camera.getWorldDirection(aim=new V());
  aim.y+=rng(-.008,.008)+(aiming?0:.008);
  aim.x+=rng(-.008,.008);aim.normalize();
 }else{
  if(!actor.target?.alive)return;
  aim=new V(actor.target.x-actor.x,actor.target.y+1.25-(actor.y+1.5),actor.target.z-actor.z).normalize();
  aim.x+=rng(-.035,.035);aim.y+=rng(-.026,.026);aim.z+=rng(-.035,.035);aim.normalize();
 }
 let closest=null,distance=id==='knife'?2:110,hitPoint=origin.clone().addScaledVector(aim,distance);
 if(id==='knife'&&!actor.isPlayer)distance=2.1;
 for(const other of players){
  if(!other.alive||other.side===actor.side)continue;
  const center=new V(other.x,other.y+1.26,other.z);
  const offset=center.clone().sub(origin);const t=offset.dot(aim);
  if(t<0||t>=distance)continue;
  const nearest=origin.clone().addScaledVector(aim,t);
  const miss=nearest.distanceTo(center);
  if(miss<(id==='knife'?.82:.59)){
   if(!groundLOS(origin,nearest))continue;
   closest=other;distance=t;hitPoint.copy(nearest);
  }
 }
 // In fire mode, do not shoot enemies through the original Italia geometry.
 const surfaceRay=new THREE.Raycaster(origin,aim,.02,distance);
 const surface=levelHits(surfaceRay)[0];
 if(surface&&surface.distance<distance-.04){closest=null;hitPoint.copy(surface.point);distance=surface.distance}
 if(closest){
  const damage=item.pellets ? item.damage*3: item.damage;
  const headHit=Math.abs(hitPoint.y-(closest.y+1.68))<.20;
  damaged(closest,Math.round(damage*(headHit?1.7:1)),actor);
 }
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin,hitPoint]),
  new THREE.LineBasicMaterial({color:actor.side==='ct'?0xb4ecff:0xffcd82,transparent:true,opacity:.8}));
 scene.add(line);tracers.push({mesh:line,t:now+.12});
 if(actor.isPlayer)updateHud();
}
function reloadActor(actor,id){
 if(!actor.alive)return;
 const item=BOMB_WEAPONS[id],ammo=actor.ammo[id];
 if(!item?.mag||!ammo||ammo.mag===item.mag||!ammo.reserve||performance.now()/1000<actor.reloadingUntil)return;
 const seconds=item===BOMB_WEAPONS.awp?2.5:item===BOMB_WEAPONS.m249?3.7:1.6;
 actor.reloadingUntil=performance.now()/1000+seconds;
 actor.reloadingWeapon=id;
 if(actor.isPlayer)window.HW_reload?.(seconds*1000);
}
function finishReloads(){
 const time=performance.now()/1000;
 for(const actor of players){
  if(!actor.reloadingUntil||time<actor.reloadingUntil)continue;
  actor.reloadingUntil=0;
  const id=actor.reloadingWeapon;actor.reloadingWeapon=null;
  const item=BOMB_WEAPONS[id],ammo=actor.ammo[id];
  if(item?.mag&&ammo){
   const add=Math.min(item.mag-ammo.mag,ammo.reserve);
   ammo.mag+=add;ammo.reserve-=add;
  }
 }
}
// Lightweight C4 render fallback: recognizable keypad, clock, wires and LED.
// The user-provided bomb GLB can replace this when present in Game1 assets.
function bombMesh(){
 const box=new THREE.Group();
 const shell=new THREE.MeshStandardMaterial({color:0x242b2b,metalness:.18,roughness:.72});
 const black=new THREE.MeshStandardMaterial({color:0x101719,roughness:.83});
 const strap=new THREE.MeshStandardMaterial({color:0x51534d,roughness:.96});
 const core=new THREE.Mesh(new THREE.BoxGeometry(.43,.18,.29),shell);
 core.position.y=.11;box.add(core);
 for(const z of [-.12,.12]){
  const band=new THREE.Mesh(new THREE.BoxGeometry(.46,.21,.036),strap);
  band.position.set(0,.12,z);box.add(band);
 }
 const screen=new THREE.Mesh(new THREE.BoxGeometry(.16,.017,.083),
  new THREE.MeshBasicMaterial({color:0x173d25}));
 screen.position.set(-.094,.211,-.064);box.add(screen);
 const screenGlow=new THREE.Mesh(new THREE.BoxGeometry(.095,.019,.01),
  new THREE.MeshBasicMaterial({color:0x7ddc86}));
 screenGlow.position.set(-.095,.223,-.064);box.add(screenGlow);
 const keyMat=new THREE.MeshStandardMaterial({color:0xd2d4c8,roughness:.7});
 for(let r=0;r<4;r++)for(let c=0;c<3;c++){
  const pad=new THREE.Mesh(new THREE.BoxGeometry(.044,.023,.032),keyMat);
  pad.position.set(.035+c*.051,.209,-.093+r*.047);box.add(pad);
 }
 for(const [color,offset] of [[0xd55b46,-.054],[0x5a84bc,.042]]){
  const line=new THREE.CatmullRomCurve3([
   new V(-.21,.177,offset),new V(-.14,.285,offset+.04),
   new V(.075,.28,offset+.09),new V(.21,.167,offset+.06)
  ]);
  box.add(new THREE.Mesh(new THREE.TubeGeometry(line,13,.006,5,false),
   new THREE.MeshStandardMaterial({color,roughness:.5})));
 }
 const led=new THREE.Mesh(new THREE.SphereGeometry(.025,8,8),
  new THREE.MeshBasicMaterial({color:0xff2828}));
 led.position.set(.18,.24,.099);box.add(led);box.userData.led=led;
 return box;
}
function plantBomb(actor,site){
 if(!canPlant(actor.side,actor.hasBomb,site,actor.alive)||game.planted)return;
 game.planted=true;game.phase='planted';game.site=site.id;game.time=BOMB_RULES.bombSeconds;
 const floorY=positionGround(actor.x,actor.z,actor.y+1.25);
 game.bombPosition={x:actor.x,y:floorY,z:actor.z};
 actor.hasBomb=false;game.bombCarrier=null;game.bombDropped=null;
 if(bombDropObject){scene.remove(bombDropObject);bombDropObject=null}
 actor.hasPlanted=true;
 // The C4 mesh origin is its base: position it on the actual floor.
 bombObject=bombMesh();bombObject.position.set(actor.x,floorY+.012,actor.z);scene.add(bombObject);
 setMessage('БОМБА УСТАНОВЛЕНА · '+site.id+' · 40 СЕКУНД',4);
 if(actor.isPlayer){forcedPlantCrouch=false;setSlot('pistol')}
}
function defuseBomb(actor){
 if(!canDefuse(actor.side,game.planted,actor.alive))return;
 if(awardBombRound(game,players,'ct')){
  scene.remove(bombObject);bombObject=null;
  setMessage('БОМБА ОБЕЗВРЕЖЕНА · СПЕЦНАЗ ПОБЕДИЛ',4);
  holdAction=false;progress=0;
 }
}
function pickupDropped(){
 if(!game.bombDropped||game.planted)return;
 for(const actor of players){
  if(actor.side!=='t'||!actor.alive)continue;
  if(Math.hypot(actor.x-game.bombDropped.x,actor.z-game.bombDropped.z)<1.6){
   actor.hasBomb=true;game.bombCarrier=actor.id;game.bombDropped=null;
   if(bombDropObject){scene.remove(bombDropObject);bombDropObject=null}
   if(actor.isPlayer)setMessage('Ты подобрал C4 · четвёртый слот',3);
   break;
  }
 }
}
function tickHold(dt){
 let duration=0;
 if(me.alive&&['live','planted'].includes(game.phase)&&holdAction){
  if(game.phase==='live'&&me.hasBomb&&me.side==='t'&&findSite(me.x,me.z)){
   duration=BOMB_RULES.plantSeconds;
   forcedPlantCrouch=true;
  }else if(game.planted&&me.side==='ct'&&game.bombPosition&&
   Math.hypot(me.x-game.bombPosition.x,me.z-game.bombPosition.z)<2.2)
   duration=defuseDuration(me.hasKit);
 }
 if(!duration){progress=0;forcedPlantCrouch=false;byId('progress').style.display='none';return}
 progress=Math.min(duration,progress+dt);
 byId('progress').style.display='block';
 byId('progress').firstElementChild.style.width=100*progress/duration+'%';
 if(progress>=duration){
  if(me.side==='t')plantBomb(me,findSite(me.x,me.z));
  else defuseBomb(me);
  progress=0;forcedPlantCrouch=false;holdAction=false;
 }
}
function addGrenade(type,actor){
 if(!actor.alive||!['live','planted'].includes(game.phase))return;
 if(!actor.grenades[type])return;
 actor.grenades[type]--;
 if(actor.isPlayer&&grenadeHeld){grenadeHeld=false;equipCurrent();}
 const forward=direction(actor.yaw);
 const to={x:clamp(actor.x+forward.x*8,-46,46),z:clamp(actor.z+forward.z*8,-46,46)};
 const from=new V(actor.x,actor.y+1.4,actor.z);
 const mesh=new THREE.Group();
 const mat=new THREE.MeshStandardMaterial({color:type==='he'?0x4f6c3a:type==='flash'?0xbcc2c8:0x87949a,roughness:.7});
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.12,.13,.26,8),mat);mesh.add(body);
 mesh.position.copy(from);scene.add(mesh);
 activeGrenades.push({type,actor,mesh,from,to,elapsed:0});
 const ref=BOMBSHOP_GEAR[type];if(ref&&!assets.has(type)){
  assets.set(type,'loading');
  loader.load(ref.file,g=>{assets.set(type,g.scene)},undefined,()=>assets.set(type,null));
 }
 const template=assets.get(type);
 if(template?.isObject3D){
  mesh.remove(body);
  const copy=template.clone(true),bounds=new THREE.Box3().setFromObject(copy);
  const max=bounds.getSize(new V()).length()||1;copy.scale.multiplyScalar(.28/max);mesh.add(copy);
 }
 updateHud();
}
function grenadeEffect(grenade){
 const type=grenade.type,center=grenade.mesh.position.clone();
 scene.remove(grenade.mesh);
 if(type==='he'){
  const burst=new THREE.Mesh(new THREE.SphereGeometry(BOMB_RULES.heRadius,16,8),
   new THREE.MeshBasicMaterial({color:0xffb66e,transparent:true,opacity:.18,depthWrite:false}));
  burst.position.copy(center);scene.add(burst);
  setTimeout(()=>{scene.remove(burst);burst.geometry.dispose();burst.material.dispose()},260);
  for(const actor of players){
   if(!actor.alive)continue;
   const d=Math.hypot(actor.x-center.x,actor.z-center.z);
   const dmg=heDamage(d);
   if(dmg>0&&groundLOS(center.clone().add(new V(0,.35,0)),new V(actor.x,actor.y+1,actor.z)))
    damaged(actor,dmg,grenade.actor);
  }
 }else if(type==='flash'){
  for(const actor of players){
   if(!actor.alive)continue;
   const d=Math.hypot(actor.x-center.x,actor.z-center.z);
   if(d>28)continue;
   // A flash only blinds someone actually looking toward its explosion.
   // Use camera pitch too: staring at the floor cannot be a direct flash hit.
   const eye=new V(actor.x,actor.y+(actor.isPlayer?(crouched?1.03:1.62):1.5),actor.z);
   const forward=actor.isPlayer?camera.getWorldDirection(new V()):direction(actor.yaw);
   const to=center.clone().sub(eye).normalize();
   const facing=forward.dot(to);
   if(facing>.38&&groundLOS(eye,center)){
    if(actor.isPlayer){flashStarted=performance.now()/1000;flashDuration=5}
    else actor.flashUntil=performance.now()/1000+BOMB_RULES.flashSeconds;
   }
  }
 }else{
  const fog=new THREE.Group();
  const material=new THREE.MeshBasicMaterial({color:0xc4cbd0,transparent:true,opacity:.17,depthWrite:false});
  for(let i=0;i<13;i++){
   const m=new THREE.Mesh(new THREE.SphereGeometry(rng(1.5,2.7),8,6),material);
   m.position.set(rng(-2.1,2.1),rng(.5,2.5),rng(-2.1,2.1));fog.add(m);
  }
  fog.position.set(center.x,center.y,center.z);scene.add(fog);
  smokes.push({mesh:fog,position:{x:center.x,z:center.z},until:performance.now()/1000+BOMB_RULES.smokeSeconds});
 }
}
function updateGrenades(dt){
 for(let i=activeGrenades.length-1;i>=0;i--){
  const g=activeGrenades[i];g.elapsed+=dt;
  const u=Math.min(1,g.elapsed/1.1);
  const ground=positionGround(g.to.x,g.to.z,g.actor.y+3);
  g.mesh.position.set(g.from.x+(g.to.x-g.from.x)*u,
   ground+.2+(1-u)*1.2+Math.sin(u*Math.PI)*1.7,
   g.from.z+(g.to.z-g.from.z)*u);
  g.mesh.rotation.z+=dt*3;
  if(g.elapsed>=BOMB_RULES.grenadeFuse){
   activeGrenades.splice(i,1);grenadeEffect(g);
  }
 }
 const now=performance.now()/1000;
 for(let i=smokes.length-1;i>=0;i--)if(now>=smokes[i].until){
  scene.remove(smokes[i].mesh);smokes.splice(i,1);
 }
}
// Squad-level roles, memory and route variation: no hidden-enemy coordinates.
const teamIntel={ct:null,t:null};
const teamSeeds={ct:0,t:0};
const coverCache=new Map();
function botIndex(bot){
 const match=String(bot.id).match(/(\d+)$/);
 return match?Number(match[1]):0;
}
function lineBetweenPoints(a,b){
 const from=new V(a.x,positionGround(a.x,a.z)+1.42,a.z);
 const to=new V(b.x,positionGround(b.x,b.z)+1.42,b.z);
 return groundLOS(from,to);
}
function coverFor(bot,site,rank=0){
 const key=site.id+':'+bot.side+':'+rank+':'+game.round;
 if(coverCache.has(key))return coverCache.get(key);
 const occupied=players.filter(p=>p!==bot&&p.alive&&p.side===bot.side&&p.order?.goals?.length)
  .map(p=>p.order.goals[0]);
 const point=italyPickCover(site,italyLeadThreat(bot.side),rank,lineBetweenPoints,occupied);
 coverCache.set(key,point);
 return point;
}
function activeSquad(side){return players.filter(p=>p.alive&&p.side===side&&!p.isPlayer)}
function italyPhaseKey(){
 if(game.planted){
  const ct=players.filter(p=>p.alive&&p.side==='ct').map(p=>p.id).join(',');
  return 'planted:'+game.site+':'+ct;
 }
 return game.bombDropped?'dropped:'+Math.round(game.bombDropped.x)+':'+Math.round(game.bombDropped.z):'live';
}
function createBotOrder(bot,now){
 const role=bot.role||'rotate',index=botIndex(bot),side=bot.side;
 const lane=['west','middle','east'][(index+game.round+bot.routeVariant)%3];
 const attackSite=SITES[(game.round+Math.floor(game.round/3))%2];
 const enemyHome=italyLeadThreat(side);
 const intel=teamIntel[side]&&now-teamIntel[side].seenAt<6?teamIntel[side]:null;
 const order={key:italyPhaseKey(),goals:[],mode:'patrol',hold:rng(3,7),face:enemyHome,
  arrivedAt:0,renewAt:now+rng(11,18)};
 const goto=p=>{if(!p)return;const safe=italySafePoint(p.x,p.z);if(safe)order.goals.push(safe)};
 const via=(route,goal)=>{
  for(const p of italyRouteGates(side,route,goal))goto(p);
 };
 const holdAt=(p,seconds=11)=>{
  goto(p);order.mode='hold';order.hold=seconds;
  order.renewAt=now+Math.max(24,seconds+14);
 };
 if(game.planted&&game.bombPosition){
  const planted=SITES.find(s=>s.id===game.site)||attackSite;
  if(side==='ct'){
   const ct=players.filter(p=>p.alive&&p.side==='ct')
    .sort((a,b)=>Math.hypot(a.x-game.bombPosition.x,a.z-game.bombPosition.z)-
     Math.hypot(b.x-game.bombPosition.x,b.z-game.bombPosition.z));
   if(bot===ct[0]){
    // One designated defuser goes for the device, even when others provide cover.
    goto(game.bombPosition);order.mode='defuse';order.hold=0;
   }else if(bot===ct[1]){
    goto(coverFor(bot,planted,index+1));goto(game.bombPosition);
    order.mode='retake';order.hold=1;
   }else if(role==='push'||role==='ambush'){
    via(lane,coverFor(bot,planted,index+3));order.mode='flank';order.hold=5;
   }else holdAt(coverFor(bot,planted,index+2),rng(4,8));
   order.face=game.bombPosition;
  }else{
   const fighters=activeSquad('t');
   const hunter=fighters.length?fighters[game.round%fighters.length]:null;
   if(bot===hunter){
    // A rotating hunter searches CT approaches while others protect C4.
    const hunt=intel||{x:enemyHome.x,z:enemyHome.z-(enemyHome.z>0?13:-13)};
    via(lane,hunt);order.mode='hunt';order.hold=rng(2,5);
   }else if(role==='flank'||role==='lurk'){
    const place=coverFor(bot,planted,index+4);
    holdAt(place,rng(7,13));order.mode='flank-guard';
   }else holdAt(coverFor(bot,planted,index),rng(9,17));
   order.face=enemyHome;
  }
 }else if(side==='ct'){
  const sightSite=role==='anchorA'?SITES[0]:role==='anchorB'?SITES[1]:
   SITES[(index+game.round)%2];
  if(role==='anchorA'||role==='anchorB'){
   holdAt(coverFor(bot,sightSite,index),rng(11,20));
   order.face=ITALY_SPAWNS.t;
  }else if(role==='push'){
   // Sometimes CT cross mid or advance towards T instead of camping a site.
   via(lane,{x:-11,z:12+((game.round+index)%2)*9});
   order.mode='push';order.hold=rng(3,8);
  }else if(role==='ambush'){
   holdAt(italySafePoint((index%2?8:-12),-25),rng(9,18));
  }else if(intel){
   via(lane,intel);order.mode='rotate';order.hold=2;
  }else if(game.round%3===0){
   via(lane,{x:-11,z:-8});order.mode='scout';order.hold=rng(3,7);
  }else{
   holdAt(coverFor(bot,sightSite,index+2),rng(7,14));
  }
 }else if(game.bombDropped){
  const recover=activeSquad('t').sort((a,b)=>
   Math.hypot(a.x-game.bombDropped.x,a.z-game.bombDropped.z)-
   Math.hypot(b.x-game.bombDropped.x,b.z-game.bombDropped.z))[0];
  if(bot===recover){goto(game.bombDropped);order.mode='recover';order.hold=0}
  else holdAt(coverFor(bot,attackSite,index),rng(5,10));
 }else{
  const carrier=players.find(p=>p.alive&&p.side==='t'&&p.hasBomb);
  if(bot.hasBomb){
   // The carrier picks a site, but its team can clear other lanes.
   via(lane,attackSite);order.mode='plant';order.hold=0;
  }else if(role==='escort'&&carrier){
   const following=italySafePoint(carrier.x+(index%2?3:-3),carrier.z-3);
   goto(following);order.mode='escort';order.hold=1;order.renewAt=now+2.3;
  }else if(role==='lurk'){
   via(lane,coverFor(bot,attackSite,index+3));order.mode='lurk';order.hold=rng(7,14);
  }else if(role==='flank'){
   const other=SITES.find(s=>s!==attackSite);
   const flankGate=italySafePoint(other.x,other.z+(index%2?7:-7));
   goto(flankGate);goto(coverFor(bot,attackSite,index));
   order.mode='flank';order.hold=rng(4,10);
  }else if(role==='support'&&intel){
   goto(intel);order.mode='support';order.hold=2;
  }else{
   via(lane,italySafePoint(attackSite.x+(index%2?4:-4),attackSite.z+3));
   order.mode='entry';order.hold=rng(2,5);
  }
 }
 if(!order.goals.length)goto(intel||attackSite);
 return order;
}
function followBotOrder(bot,now,dt){
 const key=italyPhaseKey();
 if(!bot.order||bot.order.key!==key||now>bot.order.renewAt){
  bot.order=createBotOrder(bot,now);
  bot.mapRoute=null;bot.routeCheck=0;
 }
 const order=bot.order;
 while(order.goals.length&&Math.hypot(order.goals[0].x-bot.x,order.goals[0].z-bot.z)<1.15){
  order.goals.shift();order.arrivedAt=now;
 }
 if(order.goals.length){
  const pace=order.mode==='lurk'||order.mode==='hold'||order.mode==='flank-guard'?.68:
   order.mode==='hunt'||order.mode==='push'?.91:.80;
  seekBot(bot,order.goals[0],dt,bombMoveSpeed(bot.equipped)*pace);
 }else{
  if(!order.arrivedAt)order.arrivedAt=now;
  const look=order.face||italyLeadThreat(bot.side);
  bot.yaw=Math.atan2(-(look.x-bot.x),-(look.z-bot.z));
  if(now-order.arrivedAt>order.hold)bot.order=null;
 }
}
function passableStep(bot,x,z){
 const y0=positionGround(bot.x,bot.z),y1=positionGround(x,z);
 const elevation=y1-y0;
 // The nav edge mask comes from torso-height rays against the ORIGINAL GLB.
 // Stairs and ramps are legal; a genuine wall or a huge vertical drop is not.
 return elevation<1.02&&elevation> -1.55&&
  italyCanTraverse({x:bot.x,z:bot.z},{x,z},.12);
}
function seekBot(bot,goal,dt,speed){
 const now=performance.now()/1000;
 const distanceGoal=Math.hypot(goal.x-bot.x,goal.z-bot.z);
 if(distanceGoal<.8){bot.detour=null;return}
 // A ray can appear clear across Italy while the first 20cm hits a sharp
 // raster corner. Follow the actual half-metre graph, cell by cell.
 if(!bot.navGoal||Math.hypot(bot.navGoal.x-goal.x,bot.navGoal.z-goal.z)>2.5){
  bot.navGoal={x:goal.x,z:goal.z};bot.mapRoute=null;bot.routePlanUntil=0;
 }
 // If terrain or another actor prevents progress, retry from the current
 // position. Repeated stalls change the squad's tactical route as well.
 if(!bot.navSample||now-bot.navSample.time>1.5){
  if(bot.navSample&&Math.hypot(bot.x-bot.navSample.x,bot.z-bot.navSample.z)<.26){
   bot.navStalls=(bot.navStalls||0)+1;
   bot.mapRoute=null;bot.routePlanUntil=0;bot.routePlanAt=0;
   if(bot.navStalls>=3){
    bot.routeVariant=((bot.routeVariant||0)+1)%3;
    bot.order=null;bot.navStalls=0;
   }
  }else bot.navStalls=0;
  bot.navSample={x:bot.x,z:bot.z,time:now};
 }
 if(!bot.mapRoute?.length||now>(bot.routePlanUntil||0)){
  if(now<(bot.routePlanAt||0))return;
  bot.mapRoute=findItalyPath({x:bot.x,z:bot.z},goal,true);
  bot.routePlanUntil=now+2.25+botIndex(bot)*.22;
  bot.routePlanAt=now+.18;
 }
 // Never discard a narrow-corner waypoint just because it is within 1.35m:
 // that shortcut made nearly every bot run straight into the wall.
 while(bot.mapRoute?.length&&
  Math.hypot(bot.mapRoute[0].x-bot.x,bot.mapRoute[0].z-bot.z)<.18)
   bot.mapRoute.shift();
 if(!bot.mapRoute?.length)return;
 const target=bot.mapRoute[0];
 let dx=target.x-bot.x,dz=target.z-bot.z;
 const d=Math.hypot(dx,dz);
 if(d<.01)return;
 dx/=d;dz/=d;
 const step=Math.min(dt*speed,d);
 let x=clamp(bot.x+dx*step,-34,34);
 let z=clamp(bot.z+dz*step,-61,61);
 if(!passableStep(bot,x,z)){
  // Legal lateral movement frees a shoulder against a corner without clipping.
  const side=botIndex(bot)%2?1:-1;
  const nx=clamp(bot.x-side*dz*step,-34,34);
  const nz=clamp(bot.z+side*dx*step,-61,61);
  if(!passableStep(bot,nx,nz))return;
  x=nx;z=nz;
  bot.routePlanUntil=0;
 }
 bot.x=x;bot.z=z;
 bot.y=positionGround(x,z);
 bot.yaw=Math.atan2(-dx,-dz);
 bot.walkPhase+=dt*9;
}
function aiStep(dt){
 if(!game||!['live','planted'].includes(game.phase))return;
 const now=performance.now()/1000;
 for(const bot of players){
  if(bot.isPlayer||!bot.alive)continue;
  const oldX=bot.x,oldZ=bot.z;
  // Every bot scans only what its own eyes can see through actual Italy geometry.
  if(now>=(bot.visionCheckAt||0)){
   bot.cachedEnemy=getClosestEnemy(bot);
   bot.visionCheckAt=now+.17+botIndex(bot)*.009;
  }
  const target=bot.cachedEnemy?.alive?bot.cachedEnemy:null;
  bot.target=target;
  const nearbySmoke=smokes.some(s=>Math.hypot(bot.x-s.position.x,bot.z-s.position.z)<5);
  const vision=target&&now>=bot.flashUntil&&!nearbySmoke;
  if(vision){
   teamIntel[bot.side]={x:target.x,z:target.z,seenAt:now};
   const dx=target.x-bot.x,dz=target.z-bot.z;
   bot.yaw=Math.atan2(-dx,-dz);
   const d=Math.hypot(dx,dz);
   const mode=bot.order?.mode||'entry';
   const aggressive=['hunt','push','flank','scout','entry','retake','defuse'].includes(mode);
   // Guards hold crossfire angles. Pushers advance and try to outflank.
   if(aggressive&&d>10){
    const sign=(botIndex(bot)+game.round)%2?1:-1;
    seekBot(bot,{x:target.x+Math.sin(now*.4)*sign*4,
     z:target.z+Math.cos(now*.4)*sign*4},dt,bombMoveSpeed(bot.equipped)*.78);
   }else if(d<4){
    seekBot(bot,{x:bot.x-dx*.5,z:bot.z-dz*.5},dt,bombMoveSpeed(bot.equipped)*.63);
   }else if(d<17&&now>(bot.nextPeek||0)){
    const sign=(botIndex(bot)+game.round)%2?1:-1;
    seekBot(bot,{x:bot.x+sign*dz*.18,z:bot.z-sign*dx*.18},dt,bombMoveSpeed(bot.equipped)*.55);
    bot.nextPeek=now+1.5;
   }
   if(d<35)fireGun(bot);
   if(bot.grenades.he&&d>9&&d<22&&now>(bot.nextGrenade||0)&&Math.random()<dt*.06){
    addGrenade('he',bot);bot.nextGrenade=now+15;
   }
  }else{
   followBotOrder(bot,now,dt);
  }
  if(bot.hasBomb&&!game.planted){
   const site=findSite(bot.x,bot.z);
   if(site&&!vision){
    bot.actionTime+=dt;
    if(bot.actionTime>=BOMB_RULES.plantSeconds)plantBomb(bot,site);
   }else bot.actionTime=0;
  }else if(bot.side==='ct'&&game.planted&&game.bombPosition){
   const d=Math.hypot(bot.x-game.bombPosition.x,bot.z-game.bombPosition.z);
   if(d<2.1&&!vision){
    bot.actionTime+=dt;
    if(bot.actionTime>=defuseDuration(bot.hasKit))defuseBomb(bot);
   }else bot.actionTime=0;
  }
  if(bot.mesh){
   bot.mesh.position.set(bot.x,bot.y,bot.z);
   bot.mesh.rotation.y=bot.yaw;
   const walking=Math.hypot(bot.x-oldX,bot.z-oldZ)>.004;
   const shift=walking?Math.sin(bot.walkPhase)*.27:0;
   bot.mesh.userData.legs[0].rotation.x=shift;
   bot.mesh.userData.legs[1].rotation.x=-shift;
   bot.mesh.userData.arms[0].rotation.x=-.5;
   bot.mesh.userData.arms[1].rotation.x=-.5;
  }
 }
}
function updatePlayer(dt){
 if(!me?.alive)return;
 // Frame-rate-independent easing: responsive aim, smoother thumbstick and acceleration.
 lookYaw=damp(lookYaw,targetLookYaw,24,dt);
 lookPitch=damp(lookPitch,targetLookPitch,24,dt);
 smoothJoy.x=damp(smoothJoy.x,joy.x,18,dt);
 smoothJoy.y=damp(smoothJoy.y,joy.y,18,dt);
 me.yaw=lookYaw;
 const doCrouch=crouched||forcedPlantCrouch;
 const forward=direction(lookYaw);
 const right=new V(Math.cos(lookYaw),0,-Math.sin(lookYaw));
 const sx=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+smoothJoy.x;
 const sy=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)-smoothJoy.y;
 const dir=forward.multiplyScalar(sy).addScaledVector(right,sx);
 if(dir.lengthSq()>1)dir.normalize();
 const weaponId=currentSlot==='bomb'?'bomb':me.weapons[currentSlot];
 const speed=bombMoveSpeed(weaponId,{crouched:doCrouch,aiming,grenadeHeld});
 const moving=dir.lengthSq()>.001;
 const easeRate=moving?12:20;
 moveVelocity.x=damp(moveVelocity.x,dir.x*speed,easeRate,dt);
 moveVelocity.z=damp(moveVelocity.z,dir.z*speed,easeRate,dt);
 if(game.phase==='buy'){
  moveVelocity.x=moveVelocity.z=0;
 }else if(Math.hypot(moveVelocity.x,moveVelocity.z)>.01){
  // Independent wall sliding remains active during reload and inspection.
  const nx=clamp(me.x+moveVelocity.x*dt,-34,34);
  const nz=clamp(me.z+moveVelocity.z*dt,-61,61);
  const canWalk=(x,z)=>{
   const current=positionGround(me.x,me.z),next=positionGround(x,z);
   const elevation=next-current;
   // Both the player and bots use the same real-geometry collision edges.
   return elevation<1.02&&elevation> -1.55&&
    italyCanTraverse({x:me.x,z:me.z},{x,z},.12);
  };
  if(canWalk(nx,nz)){me.x=nx;me.z=nz;}
  else {
   if(canWalk(nx,me.z))me.x=nx;else moveVelocity.x=0;
   if(canWalk(me.x,nz))me.z=nz;else moveVelocity.z=0;
  }
 }
 const ground=positionGround(me.x,me.z,me.y+1.45);
 if(grounded)playerY=ground;
 if(jumping&&grounded&&!forcedPlantCrouch&&game.phase!=='buy'){verticalSpeed=5.8;grounded=false}
 if(!grounded){
  verticalSpeed-=16*dt;playerY+=verticalSpeed*dt;
  if(playerY<=ground){playerY=ground;verticalSpeed=0;grounded=true}
 }
 me.y=playerY;
 const camH=doCrouch?1.03:1.62;
 camera.position.set(me.x,me.y+camH,me.z);
 camera.rotation.set(lookPitch,lookYaw,0,'YXZ');
 if(firing&&currentSlot!=='bomb'&&!grenadeHeld&&game.phase!=='buy')fireGun(me);
}
function updateHud(){
 if(!me||!game)return;
 byId('ctWins').textContent=game.wins.ct;byId('tWins').textContent=game.wins.t;
 byId('roundClock').textContent='Раунд '+game.round+' · '+(game.phase==='buy'?'ЗАКУПКА':
 game.phase==='planted'?'C4: '+game.site:game.phase==='live'?'БОЙ':
 game.phase==='result'?'ПЕРЕРЫВ':'МАТЧ ЗАВЕРШЁН')+' · '+Math.ceil(game.time)+' сек';
 byId('money').textContent='$'+me.money;
 byId('shopMoney').textContent='$'+me.money;
 const id=me.weapons[currentSlot],item=BOMB_WEAPONS[id];
 const ammo=me.ammo[id];
 const name=grenadeHeld?'Граната':currentSlot==='bomb'?'C4':item?.name||'Пусто';
 byId('hp').textContent='♥ '+Math.ceil(me.health)+' · '+name+' '+(ammo?ammo.mag+'/'+ammo.reserve:'');
 const bombButton=byId('weapons').querySelector('[data-slot="bomb"]');
 bombButton.textContent=me.hasBomb?'C4':'—';
 bombButton.classList.toggle('unavailable',!me.hasBomb||me.side!=='t');
 byId('weapons').querySelector('[data-slot="primary"]')
  .classList.toggle('unavailable',!me.weapons.primary);
 const shopAvailable=canShop();
 byId('shopOpen').classList.toggle('locked',!shopAvailable);
 byId('shopOpen').setAttribute('aria-disabled',String(!shopAvailable));
 byId('shopOpen').title=shopAvailable?'Магазин · '+Math.ceil(game.shopRemaining)+' сек':
  game.shopRemaining<=0?'Закупка закончилась':'Магазин доступен только на своей базе';
 byId('shopHint').textContent=shopAvailable?'МАГАЗИН '+Math.ceil(game.shopRemaining)+'с':
  game.shopRemaining>0?'МАГАЗИН · НА БАЗЕ':'ЗАКУПКА ЗАКРЫТА';
 if(!shopAvailable)byId('shop').hidden=true;
 byId('aim').style.display=item?.scope&&me.alive?'block':'none';
 const nearbySite=me.side==='t'&&me.hasBomb&&!!findSite(me.x,me.z)&&game.phase==='live';
 const nearbyBomb=me.side==='ct'&&game.planted&&game.bombPosition&&
  Math.hypot(me.x-game.bombPosition.x,me.z-game.bombPosition.z)<2.2;
 byId('plant').style.display=me.alive&&(nearbySite||nearbyBomb)?'block':'none';
 byId('plant').textContent=nearbySite?'ДЕРЖАТЬ · C4 4с':
  nearbyBomb?'САПЁР · '+defuseDuration(me.hasKit)+'с':'';
 byId('grenade').textContent=(selectedGrenade==='he'?'HE':selectedGrenade==='flash'?'FLASH':'SMOKE')+
  ' '+me.grenades[selectedGrenade];
 byId('grenadeEquip').classList.toggle('active',grenadeHeld);
 byId('grenadeEquip').textContent=grenadeHeld?'В РУКАХ':'ВЗЯТЬ';
 if(game.finished)byId('message').textContent='МАТЧ ОКОНЧЕН · CT '+game.wins.ct+':'+game.wins.t+' T';
}
function screen(dt){
 if(!game)return;
 const result=tickBombClock(game,dt,players);
 // Shop stays open when live play starts; availability is 25 seconds total.
 if(result==='next-round')byId('shop').hidden=true;
 if(result==='next-round'){
  resetPositions();buildShop();roundSerial=game.round;
  setMessage(game.round===10?'СМЕНА СТОРОН · раунд 10':'Новый раунд · старт через 10 секунд',4);
 }else if(result==='round-start')setMessage('Раунд начался · держите позиции!',3);
 else if(result==='explosion'){
  if(bombObject){
   const burst=new THREE.Mesh(new THREE.SphereGeometry(9,18,10),
    new THREE.MeshBasicMaterial({color:0xffbb70,transparent:true,opacity:.45}));
   burst.position.copy(bombObject.position);scene.add(burst);
   setTimeout(()=>scene.remove(burst),550);
  }
  setMessage('C4 ВЗОРВАЛАСЬ · ТЕРРОРИСТЫ ПОБЕДИЛИ',4);
 }else if(result==='time-ct')setMessage('ВРЕМЯ ВЫШЛО · СПЕЦНАЗ ПОБЕДИЛ',4);
 if(['live','planted'].includes(game.phase)){
  updatePlayer(dt);aiStep(dt);updateGrenades(dt);pickupDropped();tickHold(dt);
  checkElimination();
 }else if(game.phase==='buy')updatePlayer(dt);
 finishReloads();
 const now=performance.now()/1000;
 if(bombObject&&bombObject.userData.led){
  bombObject.userData.led.visible=Math.sin(now*12)>0;
  if(now-bombBeep>.8){bombBeep=now}
 }
 if(bombDropObject?.userData.led)bombDropObject.userData.led.visible=Math.sin(now*5)>0;
 if(bombView?.userData.led)bombView.userData.led.visible=Math.sin(now*4)>0;
 for(let i=tracers.length-1;i>=0;i--)if(tracers[i].t<now){
  scene.remove(tracers[i].mesh);tracers[i].mesh.geometry.dispose();tracers[i].mesh.material.dispose();tracers.splice(i,1);
 }
 if(flashDuration){
  const elapsed=now-flashStarted;
  byId('flash').style.opacity=String(flashAlpha(elapsed));
  if(elapsed>=BOMB_RULES.flashSeconds)flashDuration=0;
 }
 if(performance.now()>announcedUntil&&game.phase!=='finished')byId('message').textContent='';
 updateHud();renderMiniMap(now);
}
let last=performance.now();
function animate(now){
 requestAnimationFrame(animate);
 const dt=Math.min(.04,Math.max(0,(now-last)/1000));last=now;
 if(game)screen(dt);
 renderer.render(scene,camera);
}
requestAnimationFrame(animate);
function pointerButton(el,down,up){
 const b=byId(el);
 b.addEventListener('pointerdown',e=>{
  e.preventDefault();
  if(!me?.alive)return;
  b.setPointerCapture(e.pointerId);down(e);
 });
 b.addEventListener('pointerup',e=>{e.preventDefault();up?.(e)});
 b.addEventListener('pointercancel',e=>{e.preventDefault();up?.(e)});
}
pointerButton('fire',()=>firing=true,()=>firing=false);
pointerButton('plant',()=>{holdAction=true;progress=0},()=>{holdAction=false;forcedPlantCrouch=false;progress=0});
pointerButton('jump',()=>jumping=true,()=>jumping=false);
// Use pointer-down for mobile: the right thumb can reload while the left
// thumb continuously holds the joystick (no click/gesture delay).
function reloadOrInspect(){
 const id=me?.weapons[currentSlot],item=BOMB_WEAPONS[id];
 if(!me||!item||grenadeHeld)return;
 const ammo=me.ammo[id];
 if(item.slot==='knife'||(ammo&&ammo.mag===item.mag)){window.HW_inspect?.();return}
 reloadActor(me,id);
}
let lastTouchReload=-1000;
const reloadButton=byId('reload');
reloadButton.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse')return;
 e.preventDefault();lastTouchReload=performance.now();reloadOrInspect();
});
reloadButton.addEventListener('click',()=>{
 if(performance.now()-lastTouchReload>180)reloadOrInspect();
});
byId('crouch').addEventListener('click',()=>{
 crouched=!crouched;byId('crouch').style.background=crouched?'#7b8648':'';
});
byId('aim').addEventListener('click',toggleScope);
// Hold the circular button and drag into a slot, or tap to open and select.
const wheel=byId('weapons'),wheelToggle=byId('weaponToggle');
let wheelDrag=null;
function openWheel(){
 if(!me?.alive)return;
 wheel.classList.add('open');wheelToggle.classList.add('active');
 wheelToggle.setAttribute('aria-expanded','true');
}
function closeWheel(){
 wheel.classList.remove('open');wheelToggle.classList.remove('active');
 wheelToggle.setAttribute('aria-expanded','false');
 wheel.querySelectorAll('button').forEach(b=>b.classList.remove('hovered'));
}
function wheelTarget(x,y){
 let nearest=null,best=49;
 for(const b of wheel.querySelectorAll('button')){
  if(b.classList.contains('unavailable'))continue;
  const rect=b.getBoundingClientRect();
  const distance=Math.hypot(x-(rect.left+rect.width/2),y-(rect.top+rect.height/2));
  if(distance<best){best=distance;nearest=b}
 }
 if(nearest)return nearest;
 const rect=wheel.getBoundingClientRect(),dx=x-(rect.left+rect.width/2),dy=y-(rect.top+rect.height/2);
 if(Math.hypot(dx,dy)>112||Math.hypot(dx,dy)<29)return null;
 const slot=Math.abs(dx)>Math.abs(dy)?(dx<0?'pistol':'knife'):(dy<0?'bomb':'primary');
 const chosen=wheel.querySelector('[data-slot="'+slot+'"]');
 return chosen&&!chosen.classList.contains('unavailable')?chosen:null;
}

wheelToggle.addEventListener('pointerdown',e=>{
 e.preventDefault();if(!me?.alive)return;
 const wasOpen=wheel.classList.contains('open');
 openWheel();wheelDrag={id:e.pointerId,x:e.clientX,y:e.clientY,wasOpen};
 wheelToggle.setPointerCapture(e.pointerId);
});
wheelToggle.addEventListener('pointermove',e=>{
 if(!wheelDrag||wheelDrag.id!==e.pointerId)return;
 const hit=wheelTarget(e.clientX,e.clientY);
 wheel.querySelectorAll('button').forEach(b=>b.classList.toggle('hovered',b===hit));
});
function finishWheelDrag(e){
 if(!wheelDrag||wheelDrag.id!==e.pointerId)return;
 const hit=wheelTarget(e.clientX,e.clientY);
 const moved=Math.hypot(e.clientX-wheelDrag.x,e.clientY-wheelDrag.y)>18;
 if(hit){setSlot(hit.dataset.slot);closeWheel()}
 else if(moved||wheelDrag.wasOpen)closeWheel();
 // A first short tap keeps the radial menu open for a second tap.
 wheelDrag=null;
}
wheelToggle.addEventListener('pointerup',finishWheelDrag);
wheelToggle.addEventListener('pointercancel',()=>{wheelDrag=null;closeWheel()});
wheel.querySelectorAll('button').forEach(b=>{
 // Pointerdown is independent of the held left-thumb movement pointer on iOS.
 b.addEventListener('pointerdown',event=>{
  event.preventDefault();event.stopPropagation();
  if(setSlot(b.dataset.slot))closeWheel();
 });
 b.addEventListener('click',()=>{if(setSlot(b.dataset.slot))closeWheel()});
});
document.addEventListener('pointerdown',e=>{
 if(wheel.classList.contains('open')&&!e.target.closest('#weapons,#weaponToggle,#joystick'))
  closeWheel();
});
byId('grenade').addEventListener('click',()=>{
 if(me)addGrenade(selectedGrenade,me);
});
byId('grenadeEquip').addEventListener('click',()=>{
 if(!me?.alive)return;
 if(!me.grenades[selectedGrenade]){setMessage('Сначала купи гранату в магазине',2);return;}
 grenadeHeld=!grenadeHeld;
 if(grenadeHeld)stopScope();
 equipCurrent();updateHud();
});
byId('grenadeType').addEventListener('click',()=>{
 const types=['he','flash','smoke'];
 selectedGrenade=types[(types.indexOf(selectedGrenade)+1)%types.length];
 grenadeMaterial.color.setHex(selectedGrenade==='he'?0x516b42:selectedGrenade==='flash'?0xc8d0ce:0x8196a6);
 if(!me?.grenades[selectedGrenade]){grenadeHeld=false;equipCurrent();}
 updateHud();
});
byId('shopOpen').addEventListener('click',()=>{
 if(canShop()){byId('shop').hidden=false;buildShop();byId('shopStatus').textContent='Только на базе · ещё '+Math.ceil(game.shopRemaining)+' сек';}
 else setMessage(game.shopRemaining<=0?'25 секунд закупки закончились':'Магазин работает только на своей базе',2);
});
byId('shopClose').addEventListener('click',()=>byId('shop').hidden=true);
byId('choose').querySelectorAll('[data-team]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.team)));
const zone=byId('joystick'),stick=byId('stick');
zone.addEventListener('pointerdown',e=>{e.preventDefault();if(joy.id!==null)return;
 joy.id=e.pointerId;zone.setPointerCapture(e.pointerId);moveStick(e)});
zone.addEventListener('pointermove',e=>{if(e.pointerId===joy.id)moveStick(e)});
function moveStick(e){
 const box=zone.getBoundingClientRect(),dx=e.clientX-box.left-62.5,dy=e.clientY-box.top-62.5;
 const scale=Math.min(1,49/Math.max(1,Math.hypot(dx,dy)));
 joy.x=dx*scale/49;joy.y=dy*scale/49;
 stick.style.transform='translate('+(dx*scale)+'px,'+(dy*scale)+'px)';
}
function endStick(e){if(e.pointerId!==joy.id)return;joy.id=null;joy.x=joy.y=0;stick.style.transform=''}
zone.addEventListener('pointerup',endStick);zone.addEventListener('pointercancel',endStick);
renderer.domElement.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button===0){firing=true;return}
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId))return;
 const point=pointers.get(e.pointerId),dx=e.clientX-point.x,dy=e.clientY-point.y;
 point.x=e.clientX;point.y=e.clientY;
 targetLookYaw-=dx*.004;targetLookPitch=clamp(targetLookPitch-dy*.004,-1.45,1.45);
});
renderer.domElement.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);if(e.pointerType==='mouse')firing=false});
renderer.domElement.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);firing=false});
addEventListener('keydown',e=>{
 keys.add(e.code);
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 if(e.code==='Space')jumping=true;
 if(e.code==='KeyR')byId('reload').click();
 if(e.code==='KeyB')byId('shopOpen').click();
 if(e.code==='KeyC')byId('crouch').click();
 if(e.code==='KeyQ')toggleScope();
 if(e.code==='KeyE'){holdAction=true;progress=0}
 if(e.code==='KeyG')byId('grenade').click();
 if(e.code==='Digit1')setSlot('knife');
 if(e.code==='Digit2')setSlot('pistol');
 if(e.code==='Digit3')setSlot('primary');
 if(e.code==='Digit4')setSlot('bomb');
 if(e.code==='Escape')closeWheel();
});
addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space')jumping=false;if(e.code==='KeyE'){holdAction=false;progress=0}});
addEventListener('resize',()=>{
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);
});
addEventListener('blur',()=>{firing=false;holdAction=false;jumping=false;keys.clear();joy.x=joy.y=0;smoothJoy.x=smoothJoy.y=0;moveVelocity.x=moveVelocity.z=0;
 targetLookYaw=lookYaw;targetLookPitch=lookPitch;pointers.clear();closeWheel()});
