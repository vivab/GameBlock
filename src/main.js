import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x819fb0);
const camera = new THREE.PerspectiveCamera(72, window.innerWidth/window.innerHeight, 0.05, 150);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.domElement.style.cssText='position:fixed;inset:0;width:100%;height:100%;touch-action:none';
document.body.insertBefore(renderer.domElement,document.body.firstChild);
scene.add(new THREE.HemisphereLight(0xffffff,0x59626a,2.5));
const sunlight=new THREE.DirectionalLight(0xffffff,2);sunlight.position.set(-5,14,8);scene.add(sunlight);
const material=c=>new THREE.MeshLambertMaterial({color:c});
function cube(w,h,d,color,x,y,z,parent=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);parent.add(m);return m}
const floor=new THREE.Mesh(new THREE.PlaneGeometry(48,48),material(0x718079));
floor.rotation.x=-Math.PI/2;floor.position.y=0;scene.add(floor);
const grid=new THREE.GridHelper(48,24,0x344e55,0x53665e);grid.position.y=.012;scene.add(grid);
const walls=[];
function wall(x,z,w,d,h=4){const m=cube(w,h,d,0x9ca6a1,x,h/2,z);walls.push(m)}
wall(0,-24,48,1);wall(0,24,48,1);wall(-24,0,1,48);wall(24,0,1,48);
wall(-8,-5,5,3,2.8);wall(9,-5,4,4,2.8);wall(-11,11,5,4,2.5);wall(12,10,5,3,2.5);
const enemies=[];
function enemy(x,z){const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);const parts=[];
function part(w,h,d,y,color,zone,x=0){const m=cube(w,h,d,color,x,y,0,group);m.userData={zone,enemy:group};parts.push(m)}
part(.45,.45,.42,1.64,0xd4ac8a,'head');part(.72,.67,.4,1.09,0x34565c,'chest');part(.64,.34,.4,.6,0x4c6463,'stomach');
for(const sign of [-1,1]){part(.22,.7,.3,1.06,0x34565c,'arm',sign*.49);part(.25,.6,.3,.28,0x263e4a,'leg',sign*.19)}
group.userData={hp:100,parts};enemies.push(group)}
enemy(0,2);enemy(-4,-6);enemy(5,-10);enemy(-13,-14);enemy(12,4);
const player={x:0,z:9,y:0,yaw:0,pitch:-.12,vy:0,ground:true,crouch:false,health:100,lastJump:-10,jumps:0};
const gun=new THREE.Group();camera.add(gun);scene.add(camera);
cube(.22,.18,.72,0x272e35,.31,-.3,-.63,gun);cube(.09,.09,.43,0x13171a,.31,-.27,-1.16,gun);cube(.14,.26,.17,0x534333,.31,-.47,-.46,gun);
cube(.18,.17,.34,0xb38e72,.1,-.44,-.56,gun);cube(.18,.17,.34,0xb38e72,.48,-.44,-.56,gun);
const knife=new THREE.Group();camera.add(knife);knife.visible=false;
cube(.095,.14,.35,0x514333,.35,-.42,-.58,knife);
cube(.065,.045,.62,0xbcc5c9,.35,-.32,-.98,knife);
const weaponWheel=document.getElementById('weaponWheel'),weaponLabel=document.getElementById('weaponLabel');
let weapon='pistol',lastKnife=0;
function selectWeapon(name){weapon=name;gun.visible=name==='pistol';knife.visible=name==='knife';weaponLabel.textContent=name==='pistol'?'Пистолет':'Нож';weaponWheel.classList.remove('open');if(name==='knife')reloading=false;}
document.getElementById('weaponToggle').addEventListener('pointerdown',e=>{e.preventDefault();weaponWheel.classList.toggle('open')});
document.getElementById('choosePistol').addEventListener('pointerdown',e=>{e.preventDefault();selectWeapon('pistol')});
document.getElementById('chooseKnife').addEventListener('pointerdown',e=>{e.preventDefault();selectWeapon('knife')});
const bulletMarks=[];
const markGeometry=new THREE.CircleGeometry(.055,10),markMaterial=new THREE.MeshBasicMaterial({color:0x242424,side:THREE.DoubleSide,depthWrite:false});
function addBulletMark(hit,now){
 const mark=new THREE.Mesh(markGeometry,markMaterial);
 mark.position.copy(hit.point).addScaledVector(hit.face.normal.clone().transformDirection(hit.object.matrixWorld),.018);
 mark.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),hit.face.normal.clone().transformDirection(hit.object.matrixWorld));
 scene.add(mark);bulletMarks.push({mesh:mark,expires:now+3000});
}
const stats=document.getElementById('stats'),cross=document.getElementById('cross'),hitmarker=document.getElementById('hitmarker'),radar=document.getElementById('radar'),ctx=radar.getContext('2d');
let ammo=30,reserve=90,reloading=false,firing=false,lastShot=0,recoil=0,shots=0,jumpHeld=false,lastLanding=-10,airPenalty=0;
const move={x:0,y:0},keys=new Set(),ray=new THREE.Raycaster(),dir=new THREE.Vector3();
const damage={head:100,chest:35,stomach:40,arm:25,leg:20};
let hitTimer=0;
function showHitmarker(killed){
 hitmarker.style.color=killed?'#ff3c45':'#ffffff';
 hitmarker.classList.remove('show');void hitmarker.offsetWidth;hitmarker.classList.add('show');
 clearTimeout(hitTimer);hitTimer=setTimeout(()=>hitmarker.classList.remove('show'),killed?240:130);
}
function reload(){if(weapon!=='pistol'||reloading||ammo===30||reserve===0)return;reloading=true;setTimeout(()=>{const n=Math.min(30-ammo,reserve);ammo+=n;reserve-=n;reloading=false},1700)}
function shoot(now){
if(weapon==='knife'){
 if(now-lastKnife<550)return;lastKnife=now;recoil=.08;
 dir.set(0,0,-1).applyQuaternion(camera.quaternion);ray.set(camera.position,dir);ray.far=2.4;
 const hit=ray.intersectObjects(enemies.filter(e=>e.visible).flatMap(e=>e.userData.parts),false)[0];
 if(hit){const e=hit.object.userData.enemy;e.userData.hp-=65;showHitmarker(e.userData.hp<=0);if(e.userData.hp<=0){e.visible=false;setTimeout(()=>{e.userData.hp=100;e.visible=true},2500)}}
 return;
}
if(reloading||ammo<=0||now-lastShot<105)return;
const gap=now-lastShot;if(gap>360)shots=0;
lastShot=now;ammo--;shots++;
// Predictable upward kick with horizontal spray; touch look remains independent.
const phase=Math.min(shots,26);
const horizontal=Math.sin(phase*.63)*.0035+Math.sin(phase*.27)*.0025;
const kick=.009+Math.min(phase,12)*.0011;
player.pitch=Math.min(1.2,player.pitch+kick);
player.yaw+=horizontal;
recoil=Math.min(.09,recoil+.022);
const moving=Math.min(1,Math.hypot(move.x,move.y)+(keys.has('KeyW')||keys.has('KeyA')||keys.has('KeyS')||keys.has('KeyD')?1:0));
const crouched=player.crouch||keys.has('ControlLeft');
const baseSpread=!player.ground?.042:moving>.15?.024:crouched?.0035:.009;
const spread=baseSpread+Math.min(phase,18)*.0008;
dir.set((Math.random()-.5)*spread*2,(Math.random()-.5)*spread*2,-1).normalize().applyQuaternion(camera.quaternion);
ray.set(camera.position,dir);ray.far=80;
const hit=ray.intersectObjects([floor,...walls,...enemies.filter(e=>e.visible).flatMap(e=>e.userData.parts)],false)[0];
if(hit&&!hit.object.userData.enemy)addBulletMark(hit,now);
if(hit?.object.userData.enemy){const e=hit.object.userData.enemy;e.userData.hp-=damage[hit.object.userData.zone]||20;showHitmarker(e.userData.hp<=0);if(e.userData.hp<=0){e.visible=false;setTimeout(()=>{e.userData.hp=100;e.visible=true},2500)}}}
function jump(now=performance.now()/1000){
if(!player.ground||now-player.lastJump<.24)return;
player.jumps=now-player.lastJump<1.15?Math.min(player.jumps+1,6):0;
player.lastJump=now;player.vy=5.8;player.ground=false;
}
function bind(id,down,up){const el=document.getElementById(id);el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);down()});el.addEventListener('pointerup',()=>up?.());el.addEventListener('pointercancel',()=>up?.())}
bind('fire',()=>firing=true,()=>firing=false);bind('jump',()=>{jumpHeld=true;jump()},()=>jumpHeld=false);bind('crouch',()=>{player.crouch=!player.crouch;document.getElementById('crouch').style.background=player.crouch?'#4b7796':'#253b52db'});bind('reload',reload);
const joy=document.getElementById('joy'),knob=document.getElementById('knob');let joyId=null;
function updateJoy(e){const r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.max(1,Math.hypot(dx,dy)),scale=Math.min(1,len/48);move.x=dx/len*scale;move.y=dy/len*scale;knob.style.transform='translate('+move.x*38+'px,'+move.y*38+'px)'}
joy.addEventListener('pointerdown',e=>{e.preventDefault();joyId=e.pointerId;joy.setPointerCapture(joyId);updateJoy(e)});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)updateJoy(e)});
function joyEnd(e){if(e.pointerId!==joyId)return;joyId=null;move.x=move.y=0;knob.style.transform=''}
joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);
// Any free touch, including one moving off the fire/jump/crouch buttons,
// can steer the camera. Joystick is reserved for movement.
const lookPointers=new Map();
function isJoystickTouch(e){return e.target===joy||joy.contains(e.target)}
document.addEventListener('pointerdown',e=>{
 if(isJoystickTouch(e))return;
 lookPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
},{capture:true});
document.addEventListener('pointermove',e=>{
 const p=lookPointers.get(e.pointerId);if(!p)return;
 const dx=e.clientX-p.x,dy=e.clientY-p.y;
 p.x=e.clientX;p.y=e.clientY;
 player.yaw-=dx*.004;
 player.pitch=Math.max(-1.2,Math.min(1.2,player.pitch-dy*.004));
},{capture:true});
function endLook(e){lookPointers.delete(e.pointerId)}
document.addEventListener('pointerup',endLook,{capture:true});
document.addEventListener('pointercancel',endLook,{capture:true});
addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='Space'&&!e.repeat)jump();if(e.code==='KeyR')reload()});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
function collides(x,z){if(Math.abs(x)>23.2||Math.abs(z)>23.2)return true;return walls.some(w=>Math.abs(x-w.position.x)<w.geometry.parameters.width/2+.35&&Math.abs(z-w.position.z)<w.geometry.parameters.depth/2+.35)}
function drawRadar(){ctx.clearRect(0,0,150,150);ctx.save();ctx.translate(75,75);ctx.beginPath();ctx.arc(0,0,73,0,Math.PI*2);ctx.clip();ctx.fillStyle='#182b32';ctx.fillRect(-75,-75,150,150);ctx.rotate(-player.yaw);const k=2.3;ctx.fillStyle='#80918e';for(const w of walls)ctx.fillRect((w.position.x-player.x)*k-w.geometry.parameters.width*k/2,(w.position.z-player.z)*k-w.geometry.parameters.depth*k/2,w.geometry.parameters.width*k,w.geometry.parameters.depth*k);ctx.fillStyle='#ff675e';for(const e of enemies)if(e.visible&&Math.hypot(e.position.x-player.x,e.position.z-player.z)<22){ctx.beginPath();ctx.arc((e.position.x-player.x)*k,(e.position.z-player.z)*k,3.4,0,Math.PI*2);ctx.fill()}ctx.restore();ctx.fillStyle='#7ce6ff';ctx.beginPath();ctx.moveTo(75,65);ctx.lineTo(69,82);ctx.lineTo(81,82);ctx.fill()}
let prev=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-prev)/1000,.04);prev=now;
const mx=move.x+(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),mz=move.y+(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0),len=Math.max(1,Math.hypot(mx,mz)),crouched=player.crouch||keys.has('ControlLeft'),speed=(crouched?2:4.2)*(player.jumps>1?Math.max(.72,1-player.jumps*.055):1);
const dx=(mx*Math.cos(player.yaw)+mz*Math.sin(player.yaw))/len*speed*dt,dz=(-mx*Math.sin(player.yaw)+mz*Math.cos(player.yaw))/len*speed*dt;
if(!collides(player.x+dx,player.z))player.x+=dx;if(!collides(player.x,player.z+dz))player.z+=dz;
player.vy-=14*dt;player.y+=player.vy*dt;if(player.y<=0){player.y=0;player.vy=0;player.ground=true}if(player.ground&&(jumpHeld||keys.has('Space')))jump(now/1000);
camera.position.set(player.x,player.y+(crouched?1.05:1.65),player.z);
camera.rotation.set(player.pitch,player.yaw,0,'YXZ');
recoil=Math.max(0,recoil-dt*.25);
for(let i=bulletMarks.length-1;i>=0;i--)if(now>=bulletMarks[i].expires){scene.remove(bulletMarks[i].mesh);bulletMarks.splice(i,1)}
gun.position.set(Math.sin(now*.008)*.006,-Math.abs(Math.sin(now*.008))*.006-recoil*.18,recoil*.35);
if(firing)shoot(now);if(now-lastShot>420)shots=0;
knife.rotation.z=-recoil*2;
stats.textContent='♥ '+player.health+(weapon==='pistol'?'   ▣ '+ammo+' / '+reserve+(reloading?'  ↻':''):'   🔪 Нож');
drawRadar();renderer.render(scene,camera)}
requestAnimationFrame(frame);
