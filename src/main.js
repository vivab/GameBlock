import * as THREE from 'three';

const canvas=document.getElementById('game');
const error=document.getElementById('error');
window.addEventListener('error',e=>{error.style.display='block';error.textContent='Ошибка игры: '+e.message});
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight,false);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x8ac8f5);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,200);
camera.rotation.order='YXZ';
camera.position.set(0,1.65,7);
scene.add(camera);
scene.add(new THREE.HemisphereLight(0xffffff,0x6b8b65,2.6));
const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-3,9,5);scene.add(light);
const mat=c=>new THREE.MeshLambertMaterial({color:c});
const grass=new THREE.Mesh(new THREE.PlaneGeometry(100,100),mat(0x4f9c48));
grass.rotation.x=-Math.PI/2;grass.position.y=0;scene.add(grass);
const grid=new THREE.GridHelper(100,50,0x4b9145,0x67af59);grid.position.y=.015;scene.add(grid);
function box(w,h,d,color,x,y,z,parent=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);parent.add(m);return m}
for(let i=0;i<14;i++){const x=(i%7-3)*7,z=-18-Math.floor(i/7)*11;box(.6,2,.6,0x795539,x,1,z);const crown=new THREE.Mesh(new THREE.ConeGeometry(1.8,4,7),mat(0x267b3a));crown.position.set(x,4,z);scene.add(crown)}
const target=new THREE.Group();target.position.set(0,0,-5);scene.add(target);
const hitParts=[];
function part(w,h,d,color,x,y,zone){const m=box(w,h,d,color,x,y,0,target);m.userData.zone=zone;hitParts.push(m)}
part(.55,.5,.45,0xe2b08b,0,1.65,'head');part(.8,.8,.45,0xb44a3b,0,1.05,'body');part(.65,.34,.4,0x3a4e65,0,.48,'body');
for(const side of [-1,1]){part(.24,.7,.3,0xb44a3b,side*.54,1.02,'body');part(.28,.65,.35,0x303b4d,side*.2,.27,'body')}
let hp=100;const hpBack=box(1.2,.12,.04,0x3b2222,0,2.25,0,target);const hpBar=box(1.18,.1,.06,0x56df6e,0,2.25,.03,target);
const gun=new THREE.Group();camera.add(gun);
box(.19,.2,.68,0x34383e,.38,-.3,-.72,gun);
box(.1,.1,.36,0x15191d,.38,-.27,-1.22,gun);
box(.16,.29,.17,0x6b4b34,.38,-.49,-.55,gun);
box(.19,.15,.34,0xd5aa83,.18,-.45,-.65,gun);
const ammoUI=document.getElementById('ammo'),msg=document.getElementById('message'),cross=document.getElementById('cross');
let ammo=12,lastShot=0,shooting=false,recoil=0,yaw=0,pitch=-.08;
const ray=new THREE.Raycaster(),direction=new THREE.Vector3();
function fire(now){if(now-lastShot<230)return;lastShot=now;if(ammo<=0){ammo=12;msg.textContent='Новая обойма';return}ammo--;recoil=.075;direction.set(0,0,-1).applyQuaternion(camera.quaternion);ray.set(camera.position,direction);
const hit=ray.intersectObjects(hitParts,false)[0];if(hit){hp-=hit.object.userData.zone==='head'?100:34;cross.style.color='#ff5050';setTimeout(()=>cross.style.color='white',110);if(hp<=0){hp=100;msg.textContent='Попадание! Противник побеждён';target.visible=false;setTimeout(()=>{target.visible=true;msg.textContent='GameBlock • тест 1'},1100)}else msg.textContent='Попадание! HP: '+hp}
hpBar.scale.x=Math.max(.001,hp/100);hpBar.position.x=-(1-hp/100)*.59;
ammoUI.textContent=ammo+' / ∞'}
const button=document.getElementById('fire');
button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);shooting=true;fire(performance.now())});
button.addEventListener('pointerup',()=>shooting=false);button.addEventListener('pointercancel',()=>shooting=false);
let pointer=null,lx=0,ly=0;
canvas.addEventListener('pointerdown',e=>{if(pointer!==null)return;pointer=e.pointerId;lx=e.clientX;ly=e.clientY;canvas.setPointerCapture(pointer)});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;yaw-=(e.clientX-lx)*.004;pitch=Math.max(-1.25,Math.min(1.25,pitch-(e.clientY-ly)*.004));lx=e.clientX;ly=e.clientY});
const stop=e=>{if(e.pointerId===pointer)pointer=null};canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false)});
function animate(now){requestAnimationFrame(animate);camera.rotation.set(pitch+recoil,yaw,0,'YXZ');recoil=Math.max(0,recoil-.005);gun.position.z=recoil*.35;if(shooting)fire(now);renderer.render(scene,camera)}
requestAnimationFrame(animate);
