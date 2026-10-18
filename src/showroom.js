import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createSwatV6Operator} from './swatV6.js';
// SWAT inspection: ten original human-proportioned urban tactical operators.
// No cartoon Soldier model, doctors, ninjas or fantasy character assets.
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x8a969c);
scene.fog=new THREE.Fog(0x8a969c,24,85);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.07,120);
camera.rotation.order='YXZ';camera.position.set(0,1.65,12);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight);document.body.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x465260,2.25));
const sun=new THREE.DirectionalLight(0xffe8ce,2.8);sun.position.set(-9,16,8);scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshStandardMaterial({color:0x898b87,roughness:1}));
floor.rotation.x=-Math.PI/2;scene.add(floor);
const variants=[5,7,1,4,0,12,17,14,9,18];
const names=['ГОРОДСКОЙ SWAT','ЧЁРНЫЙ ШТУРМ','НОЧНОЙ РЕЙД','ТЯЖЁЛЫЙ ЩИТ','КЛАССИКА CT','РАЗВЕДКА','СЕРЫЙ ШТУРМ','ТЁМНЫЙ ОТРЯД','САПЁР','ПОГРАНИЧНЫЙ'];
const load=document.querySelector('#load');
const base=import.meta.env.BASE_URL+'models/counter_flame_swat_v8.glb';
const labels=[];
function makeLabel(number,name,x,z){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#162127';ctx.fillRect(0,0,512,128);
 ctx.strokeStyle='#b9a47a';ctx.lineWidth=5;ctx.strokeRect(4,4,504,120);
 ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font='bold 46px sans-serif';
 ctx.fillText(String(number).padStart(2,'0')+'  '+name,256,79);
 const texture=new THREE.CanvasTexture(canvas);
 const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));
 label.position.set(x,2.3,z);label.scale.set(1.85,.47,1);scene.add(label);labels.push(label);
}
new GLTFLoader().load(base,gltf=>{
 try{
  for(let i=0;i<10;i++){
   const model=createSwatV6Operator(gltf,variants[i]);
   if(!model)throw Error('SWAT V8 model missing '+i);
   const x=(i%5-2)*3.45,z=Math.floor(i/5)*-6.2;
   model.root.position.set(x,0,z);
   model.root.rotation.y=0;
   scene.add(model.root);
   makeLabel(i+1,names[i],x,z);
  }
  load.hidden=true;
  document.querySelector('#count').textContent='10 взрослых бойцов SWAT · городские тактические комплекты';
 }catch(error){console.error(error);load.textContent='Ошибка при создании бойцов: '+error.message}
},undefined,error=>{console.error(error);load.textContent='Не загрузилась модель SWAT V8. Проверь GitHub Pages.'});
const joy=document.querySelector('#joy'),knob=document.querySelector('#knob');
let joystick={x:0,y:0},joyId=null,lookId=null,last={x:0,y:0},yaw=0,pitch=0;
const keys=new Set();
joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture(e.pointerId);joyMove(e)});
function joyMove(e){const b=joy.getBoundingClientRect(),x=e.clientX-(b.left+b.width/2),y=e.clientY-(b.top+b.height/2),r=Math.max(1,Math.hypot(x,y)),f=Math.min(1,49/r);joystick={x:x*f/49,y:y*f/49};knob.style.transform='translate('+joystick.x*43+'px,'+joystick.y*43+'px)'}
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyMove(e)});
for(const name of ['pointerup','pointercancel'])joy.addEventListener(name,e=>{if(e.pointerId!==joyId)return;joyId=null;joystick={x:0,y:0};knob.style.transform=''});
renderer.domElement.addEventListener('pointerdown',e=>{if(lookId!==null)return;lookId=e.pointerId;last={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId)});
renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;yaw-=(e.clientX-last.x)*.004;pitch=Math.max(-1.3,Math.min(1.3,pitch-(e.clientY-last.y)*.004));last={x:e.clientX,y:e.clientY}});
for(const name of ['pointerup','pointercancel'])renderer.domElement.addEventListener(name,e=>{if(e.pointerId===lookId)lookId=null});
window.addEventListener('keydown',e=>{keys.add(e.code);if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault()});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
const clock=new THREE.Clock();
function frame(){
 requestAnimationFrame(frame);
 const dt=Math.min(.05,clock.getDelta());

 const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'))-joystick.y;
 const right=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+joystick.x;
 const norm=Math.max(1,Math.hypot(forward,right)),speed=5*dt/norm;
 camera.position.x+=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*speed;
 camera.position.z+=(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*speed;
 camera.position.x=THREE.MathUtils.clamp(camera.position.x,-33,33);
 camera.position.z=THREE.MathUtils.clamp(camera.position.z,-33,33);
 camera.rotation.set(pitch,yaw,0);
 renderer.render(scene,camera);
}frame();
