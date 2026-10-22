import {
 BOMB_RULES,BOMB_WEAPONS,BOMBSHOP_GEAR,makeBombPlayer,
 makeBombMatch,nextBombRound,buyBombItem,awardBombRound,tickBombClock,
 heDamage,flashAlpha,canPlant,canDefuse,defuseDuration,segmentPassesSmoke
} from './bomb-rules.js';

const THREE=window.THREE;
const byId=id=>document.getElementById(id);
const V=THREE.Vector3;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const rng=(a,b)=>a+Math.random()*(b-a);
const rad=Math.PI/180;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#a4b2c0');
scene.fog=new THREE.Fog(0xa4b2c0,75,180);
scene.add(new THREE.HemisphereLight(0xeaf5ff,0x766751,2.2));
const light=new THREE.DirectionalLight(0xffe3ad,2.1);light.position.set(25,60,-25);scene.add(light);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.05,190);
const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.4));
byId('world').append(renderer.domElement);
const weaponContainer=new THREE.Group();
camera.add(weaponContainer);scene.add(camera);
const bombView=bombMesh();
bombView.position.set(.32,-.25,-.72);
bombView.rotation.set(-.18,-.21,-.14);
bombView.scale.setScalar(.85);
bombView.visible=false;
camera.add(bombView);
// Reuse Game1's entire finger rig, weapon loader, inspect and reload code.
window.weaponContainer=weaponContainer;
window.camera=camera;
window.renderer=renderer;
window.scene=scene;
const loader=new THREE.GLTFLoader();
const assets=new Map();
const obstacles=[];
let levelMeshes=[];
let mapLoaded=false,game=null,players=[],me=null;
let currentSlot='pistol',aiming=false,lookYaw=0,lookPitch=0;
let selectedGrenade='he',firing=false,jumping=false,crouched=false;
let playerY=0,verticalSpeed=0,grounded=true,holdAction=false,progress=0,forcedPlantCrouch=false;
let flashStarted=-100,flashDuration=0,announcedUntil=0,noticeText='';
const joy={x:0,y:0,id:null},keys=new Set(),pointers=new Map();
let activeGrenades=[],smokes=[],bombObject=null,bombDropObject=null,bombBeep=0,tracers=[],spectateTarget=null,roundSerial=0;
const SITES=[
 {id:'A',x:-21,z:-18,radius:7,color:0xffc777},
 {id:'B',x:22,z:17,radius:7,color:0x7ac6fb}
];
const levelRoot=new THREE.Group();scene.add(levelRoot);
function positionGround(x,z,fromY=45){
 if(!mapLoaded||!levelMeshes.length)return 0;
 const rc=new THREE.Raycaster(new V(x,fromY,z),new V(0,-1,0),0,100);
 const hits=rc.intersectObjects(levelMeshes,false);
 for(const hit of hits)if(hit.face&&hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y>.34)
  return Math.max(-1,Math.min(8,hit.point.y));
 return 0;
}
function makeFallbackMap(){
 const sand=new THREE.MeshStandardMaterial({color:0xcdb58a,roughness:1});
 const wallmat=new THREE.MeshStandardMaterial({color:0x8f7659,roughness:1});
 const floor=new THREE.Mesh(new THREE.BoxGeometry(104,.3,104),sand);
 floor.position.y=-.19;levelRoot.add(floor);
 const add=(x,z,w,d,h)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wallmat);
  mesh.position.set(x,h/2,z);levelRoot.add(mesh);obstacles.push(mesh);
 };
 add(-50,0,2,100,9);add(50,0,2,100,9);add(0,-50,100,2,9);add(0,50,100,2,9);
 for(const [x,z,w,d,h] of [[-8,4,12,3,4],[7,3,11,3,4],[-16,-9,3,16,5],[14,10,4,18,5],
   [-27,20,12,5,5],[30,-20,13,5,5],[0,-29,5,12,4],[0,27,5,12,4]])add(x,z,w,d,h);
 levelMeshes=obstacles.slice();mapLoaded=true;onMapReady('Резервная тренировочная карта (de_dust2 пока недоступна)');
}
function loadDust2(){
 byId('mapStatus').textContent='Читаем оригинальный de_dust2 из Game1…';
 loader.load('de_dust2_-_cs_map.glb',g=>{
  try{
   const root=g.scene;
   root.updateMatrixWorld(true);
   let box=new THREE.Box3().setFromObject(root);
   const size=box.getSize(new V()),center=box.getCenter(new V());
   const scale=96/Math.max(size.x,size.z,1);
   root.scale.setScalar(scale);
   root.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
   levelRoot.add(root);
   root.updateMatrixWorld(true);
   const meshes=[];root.traverse(o=>{if(o.isMesh){meshes.push(o);o.frustumCulled=true;o.castShadow=false;o.receiveShadow=false}});
   if(!meshes.length)throw Error('No GLB map geometry');
   levelMeshes=meshes;mapLoaded=true;
   onMapReady('Оригинальная de_dust2 из Game1 загружена');
  }catch(e){console.warn(e);makeFallbackMap()}
 },e=>{
  if(e.lengthComputable)byId('mapStatus').textContent='Загрузка de_dust2: '+Math.round(100*e.loaded/e.total)+'%';
 },e=>{console.warn('Dust2 asset:',e);makeFallbackMap()});
}
function onMapReady(message){
 byId('mapStatus').textContent=message;
 for(const site of SITES){
  const y=positionGround(site.x,site.z)+.08;
  const mat=new THREE.MeshBasicMaterial({color:site.color,transparent:true,opacity:.88,side:THREE.DoubleSide,depthWrite:false});
  const ring=new THREE.Mesh(new THREE.RingGeometry(site.radius-.15,site.radius+.15,56),mat);
  ring.rotation.x=-Math.PI/2;ring.position.set(site.x,y,site.z);scene.add(ring);
  const disk=new THREE.Mesh(new THREE.CircleGeometry(site.radius,48),
   new THREE.MeshBasicMaterial({color:site.color,transparent:true,opacity:.085,side:THREE.DoubleSide,depthWrite:false}));
  disk.rotation.x=-Math.PI/2;disk.position.set(site.x,y-.03,site.z);scene.add(disk);
  const marker=document.createElement('canvas');marker.width=128;marker.height=128;
  const c=marker.getContext('2d');c.fillStyle=site.id==='A'?'#ffe19e':'#b5e4ff';
  c.font='bold 106px system-ui';c.textAlign='center';c.fillText(site.id,64,108);
  const texture=new THREE.CanvasTexture(marker);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
  sprite.position.set(site.x,y+4,site.z);sprite.scale.set(3,3,1);scene.add(sprite);
 }
}
loadDust2();
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
 actor.x=(isCt?30:-29)+(row-2)*1.5;
 actor.z=(isCt?31:-30)+(Math.floor(index/5))*1.2;
 actor.y=positionGround(actor.x,actor.z);
 actor.yaw=isCt?2.25:-.75;
 actor.health=100;actor.alive=true;actor.target=null;actor.travel=0;actor.actionTime=0;
 actor.hasPlanted=false;actor.reloadingUntil=0;actor.lastShot=-10;actor.botGoal=null;
 actor.nextDecision=0;actor.flashUntil=0;actor.walkPhase=0;
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
 players.forEach((p,i)=>{
  respawnActor(p,i);
  if(!p.isPlayer&&p.mesh){p.mesh.visible=true;p.mesh.position.set(p.x,p.y,p.z)}
 });
 me.yaw=me.side==='ct'?2.25:-.75;
 lookYaw=me.yaw;lookPitch=0;playerY=me.y;verticalSpeed=0;
 aiming=false;stopScope();currentSlot='pistol';crouched=false;progress=0;holdAction=false;
 activeGrenades.forEach(g=>scene.remove(g.mesh));activeGrenades=[];
 smokes.forEach(s=>scene.remove(s.mesh));smokes=[];
 if(bombObject){scene.remove(bombObject);bombObject=null}
 if(bombDropObject){scene.remove(bombDropObject);bombDropObject=null}
 for(const p of players)if(!p.isPlayer){
  const money=p.money;
  const plan=money>=4000?'awp':money>=3000?(Math.random()<.5?'m4a4':'rifle'):money>=1000?'m870':null;
  if(plan)buyBombItem(p,plan,'buy');
  if(p.side==='ct'&&p.money>=400&&Math.random()<.45)buyBombItem(p,'kit','buy');
  p.equipped=p.weapons.primary||p.weapons.pistol;
 }
 const bombCarrier=players.find(p=>p.hasBomb);
 if(bombCarrier?.isPlayer)setMessage('Тебе досталась C4! Четвёртый слот',3);
 else setMessage('Раунд '+game.round+' · подготовка',2);
 setSlot('pistol');
}
function buildShop(){
 const container=byId('shopItems');container.replaceChildren();
 for(const [id,entry] of [...Object.entries(BOMB_WEAPONS),...Object.entries(BOMBSHOP_GEAR)]){
  if(entry.slot==='knife')continue;
  if(id==='kit'&&me?.side!=='ct')continue;
  const button=document.createElement('button');
  const name=document.createElement('span');name.textContent=entry.name;
  const price=document.createElement('strong');price.textContent='$'+entry.price;
  button.append(name,price);
  button.addEventListener('click',()=>{
   const result=buyBombItem(me,id,game.phase);
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
 bombView.visible=currentSlot==='bomb';
 if(window.HW_visible)window.HW_visible(currentSlot!=='bomb');
}
function setSlot(slot){
 if(!me)return;
 if(slot==='bomb'&&!(me.hasBomb&&me.side==='t'))return;
 if(slot==='primary'&&!me.weapons.primary)return;
 currentSlot=slot;
 stopScope();
 equipCurrent();
 byId('weapons').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.slot===slot));
 updateHud();
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
  updateHud();
  window.HW_set?.(id);
 }
};
function stopScope(){
 if(!aiming)return;
 aiming=false;camera.fov=75;camera.updateProjectionMatrix();byId('scope').style.display='none';
 byId('crosshair').style.visibility='visible';
 if(window.HW_visible)window.HW_visible(currentSlot!=='bomb');
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
 return ray.intersectObjects(levelMeshes,false).length===0;
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
  game.bombDropped={x:actor.x,y:actor.y,z:actor.z};
  if(bombDropObject)scene.remove(bombDropObject);
  bombDropObject=bombMesh();
  bombDropObject.position.set(actor.x,actor.y+.08,actor.z);
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
 // In fire mode, do not shoot enemies through the original Dust2 geometry.
 const surfaceRay=new THREE.Raycaster(origin,aim,.02,distance);
 const surface=levelMeshes.length?surfaceRay.intersectObjects(levelMeshes,false)[0]:null;
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
function bombMesh(){
 const box=new THREE.Group();
 const core=new THREE.Mesh(new THREE.BoxGeometry(.38,.16,.26),new THREE.MeshStandardMaterial({color:0x24282c,roughness:.75}));
 core.position.y=.11;box.add(core);
 for(let i=0;i<4;i++){
  const pad=new THREE.Mesh(new THREE.BoxGeometry(.08,.022,.055),new THREE.MeshBasicMaterial({color:0xddddcc}));
  pad.position.set((i-1.5)*.084,.2,.02);box.add(pad);
 }
 const led=new THREE.Mesh(new THREE.SphereGeometry(.025,8,8),new THREE.MeshBasicMaterial({color:0xff2828}));
 led.position.set(.13,.21,-.065);box.add(led);box.userData.led=led;
 return box;
}
function plantBomb(actor,site){
 if(!canPlant(actor.side,actor.hasBomb,site,actor.alive)||game.planted)return;
 game.planted=true;game.phase='planted';game.site=site.id;game.time=BOMB_RULES.bombSeconds;
 game.bombPosition={x:actor.x,y:actor.y,z:actor.z};
 actor.hasBomb=false;game.bombCarrier=null;game.bombDropped=null;
 if(bombDropObject){scene.remove(bombDropObject);bombDropObject=null}
 actor.hasPlanted=true;
 bombObject=bombMesh();bombObject.position.set(actor.x,actor.y+.03,actor.z);scene.add(bombObject);
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
  const ground=positionGround(g.to.x,g.to.z);
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
function seekBot(bot,goal,dt,speed){
 let dx=goal.x-bot.x,dz=goal.z-bot.z;
 const d=Math.hypot(dx,dz);if(d<1)return;
 dx/=d;dz/=d;
 const origin=new V(bot.x,bot.y+1.2,bot.z);
 const ahead=origin.clone().add(new V(dx,0,dz).multiplyScalar(1.5));
 if(!groundLOS(origin,ahead)){
  const nx=-dz,nz=dx;dx=dx*.25+nx*(bot.id.length%2?1:-1);dz=dz*.25+nz*(bot.id.length%2?1:-1);
 }
 const nx=clamp(bot.x+dx*dt*speed,-46,46),nz=clamp(bot.z+dz*dt*speed,-46,46);
 bot.x=nx;bot.z=nz;bot.y=positionGround(nx,nz);bot.yaw=Math.atan2(-dx,-dz);
 bot.walkPhase+=dt*9;
}
function aiStep(dt){
 if(!game||!['live','planted'].includes(game.phase))return;
 const now=performance.now()/1000;
 for(const bot of players){
  if(bot.isPlayer||!bot.alive)continue;
  const target=getClosestEnemy(bot);
  bot.target=target;
  const nearbySmoke=smokes.some(s=>Math.hypot(bot.x-s.position.x,bot.z-s.position.z)<5);
  const vision=target&&now>=bot.flashUntil&&!nearbySmoke;
  if(vision){
   const dx=target.x-bot.x,dz=target.z-bot.z;
   bot.yaw=Math.atan2(-dx,-dz);
   const d=Math.hypot(dx,dz);
   if(d>8)seekBot(bot,{x:target.x+Math.sin(now+bot.id.length)*4,z:target.z+Math.cos(now+bot.id.length)*4},dt,2.2);
   if(d<35&&Math.random()<.95)fireGun(bot);
  }else{
   let destination;
   if(bot.side==='t'){
    const bombTarget=game.planted&&game.bombPosition?game.bombPosition:
      game.bombDropped?game.bombDropped:
      (bot.hasBomb?SITES[bot.id.length%2]:SITES[bot.id.length%2]);
    destination={x:bombTarget.x+rng(-1,1),z:bombTarget.z+rng(-1,1)};
   }else{
    const place=game.planted?game.bombPosition:SITES[bot.id.length%2];
    destination={x:place.x,z:place.z};
   }
   if(destination){
    if(!bot.botGoal||now>bot.nextDecision){
     const scatter=bot.hasBomb?1.6:4;
     bot.botGoal={x:destination.x+rng(-scatter,scatter),z:destination.z+rng(-scatter,scatter)};
     bot.nextDecision=now+rng(2.2,4.5);
    }
    seekBot(bot,bot.botGoal,dt,2.8);
   }
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
   const shift=Math.sin(bot.walkPhase)*.27;
   bot.mesh.userData.legs[0].rotation.x=shift;
   bot.mesh.userData.legs[1].rotation.x=-shift;
   bot.mesh.userData.arms[0].rotation.x=-.5;
   bot.mesh.userData.arms[1].rotation.x=-.5;
  }
 }
}
function updatePlayer(dt){
 if(!me?.alive)return;
 me.yaw=lookYaw;
 const doCrouch=crouched||forcedPlantCrouch;
 const forward=direction(lookYaw);
 const right=new V(Math.cos(lookYaw),0,-Math.sin(lookYaw));
 const sx=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+joy.x;
 const sy=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)-joy.y;
 const dir=forward.multiplyScalar(sy).addScaledVector(right,sx);
 if(dir.lengthSq()>1)dir.normalize();
 const speed=doCrouch?2.1:aiming?2.45:4.3;
 if(game.phase!=='buy'){
  const dist=dir.length()*speed*dt;
  if(dist>.001){
   const proposed=new V(me.x,me.y+1.1,me.z);
   const ray=new THREE.Raycaster(proposed,dir.clone().normalize(),.05,dist+.32);
   const blocked=levelMeshes.length&&ray.intersectObjects(levelMeshes,false)[0];
   if(!blocked||blocked.distance>dist+.26){
    me.x=clamp(me.x+dir.x*speed*dt,-46,46);
    me.z=clamp(me.z+dir.z*speed*dt,-46,46);
   }
  }
 }
 if(jumping&&grounded&&!forcedPlantCrouch&&game.phase!=='buy'){verticalSpeed=5.8;grounded=false}
 if(!grounded){verticalSpeed-=16*dt;playerY+=verticalSpeed*dt}
 const ground=positionGround(me.x,me.z,me.y+12);
 if(playerY<=ground){playerY=ground;verticalSpeed=0;grounded=true}
 me.y=playerY;
 const camH=doCrouch?1.03:1.62;
 camera.position.set(me.x,me.y+camH,me.z);
 camera.rotation.set(lookPitch,lookYaw,0,'YXZ');
 if(firing&&currentSlot!=='bomb'&&game.phase!=='buy')fireGun(me);
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
 const name=currentSlot==='bomb'?'C4':item?.name||'Пусто';
 byId('hp').textContent='♥ '+Math.ceil(me.health)+' · '+name+' '+(ammo?ammo.mag+'/'+ammo.reserve:'');
 byId('weapons').querySelector('[data-slot="bomb"]').textContent=me.hasBomb?'4 C4':'4 —';
 byId('shopOpen').style.display=game.phase==='buy'?'block':'none';
 byId('aim').style.display=item?.scope&&me.alive?'block':'none';
 const nearbySite=me.side==='t'&&me.hasBomb&&!!findSite(me.x,me.z)&&game.phase==='live';
 const nearbyBomb=me.side==='ct'&&game.planted&&game.bombPosition&&
  Math.hypot(me.x-game.bombPosition.x,me.z-game.bombPosition.z)<2.2;
 byId('plant').style.display=me.alive&&(nearbySite||nearbyBomb)?'block':'none';
 byId('plant').textContent=nearbySite?'ДЕРЖАТЬ · C4 4с':
  nearbyBomb?'САПЁР · '+defuseDuration(me.hasKit)+'с':'';
 byId('grenade').textContent=(selectedGrenade==='he'?'HE':selectedGrenade==='flash'?'FLASH':'SMOKE')+
  ' '+me.grenades[selectedGrenade];
 if(game.finished)byId('message').textContent='МАТЧ ОКОНЧЕН · CT '+game.wins.ct+':'+game.wins.t+' T';
}
function screen(dt){
 if(!game)return;
 const result=tickBombClock(game,dt,players);
 if(result==='round-start'||result==='next-round'){
  byId('shop').hidden=true;
 }
 if(result==='next-round'){
  resetPositions();buildShop();roundSerial=game.round;
  setMessage(game.round===10?'СМЕНА СТОРОН · раунд 10':'Новый раунд · закупка 25 секунд',4);
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
 updateHud();
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
byId('reload').addEventListener('click',()=>{
 const id=me?.weapons[currentSlot],item=BOMB_WEAPONS[id];
 if(!me||!item)return;
 const ammo=me.ammo[id];
 if(item.slot==='knife'||(ammo&&ammo.mag===item.mag)){window.HW_inspect?.();return}
 reloadActor(me,id);
});
byId('crouch').addEventListener('click',()=>{
 crouched=!crouched;byId('crouch').style.background=crouched?'#7b8648':'';
});
byId('aim').addEventListener('click',toggleScope);
byId('weapons').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>setSlot(b.dataset.slot)));
byId('grenade').addEventListener('click',()=>{
 if(me)addGrenade(selectedGrenade,me);
});
byId('grenadeType').addEventListener('click',()=>{
 const types=['he','flash','smoke'];
 selectedGrenade=types[(types.indexOf(selectedGrenade)+1)%types.length];
 updateHud();
});
byId('shopOpen').addEventListener('click',()=>{if(game?.phase==='buy'){byId('shop').hidden=false;buildShop()}});
byId('shopClose').addEventListener('click',()=>byId('shop').hidden=true);
byId('choose').querySelectorAll('[data-team]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.team)));
const zone=byId('joystick'),stick=byId('stick');
zone.addEventListener('pointerdown',e=>{joy.id=e.pointerId;zone.setPointerCapture(e.pointerId);moveStick(e)});
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
 lookYaw-=dx*.004;lookPitch=clamp(lookPitch-dy*.004,-1.45,1.45);
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
});
addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space')jumping=false;if(e.code==='KeyE'){holdAction=false;progress=0}});
addEventListener('resize',()=>{
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);
});
addEventListener('blur',()=>{firing=false;holdAction=false;jumping=false;keys.clear();joy.x=joy.y=0;pointers.clear()});
