import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {saveEliteTChoice,ELITE_T_KEY} from './operatorChoices.js';

// Five authored tactical *outfit variants* on rigged human skeletons.
// Four MIT-licensed sources from StarKnightt and one GameBlock olive
// derivative. Never flatten black masks or import CS/Valve assets.
const BASE=import.meta.env.BASE_URL;
const VERSION='five-masked-t-v1';
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xb0aba0);
scene.fog=new THREE.Fog(0xb0aba0,28,75);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.07,105);
camera.rotation.order='YXZ';
camera.position.set(0,1.69,10.2);
const renderer=new THREE.WebGLRenderer({
  antialias:false, powerPreference:'high-performance'
});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.4));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.35;
document.body.insertBefore(renderer.domElement,$('hud'));
scene.add(new THREE.HemisphereLight(0xf5f5e9,0x5a534a,2.5));
const sun=new THREE.DirectionalLight(0xffeed0,2.65);
sun.position.set(-7,12,10);scene.add(sun);
const fill=new THREE.DirectionalLight(0xdbe8e8,1.4);
fill.position.set(8,7,-8);scene.add(fill);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(48,48),
  new THREE.MeshStandardMaterial({color:0xc3bba5,roughness:1,metalness:0}));
ground.rotation.x=-Math.PI/2;
ground.position.y=-.025;
scene.add(ground);
const positions=[-6.4,-3.2,0,3.2,6.4];
const loader=new GLTFLoader();
const entries=new Map();
const loaded=[];

function label(number){
  const canvas=document.createElement('canvas');
  canvas.width=384;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#18272add';ctx.fillRect(0,0,384,128);
  ctx.fillStyle='#c8b887';ctx.fillRect(0,0,6,128);
  ctx.font='bold 70px system-ui';ctx.fillStyle='#f5f0dc';
  ctx.fillText('T-'+String(number).padStart(2,'0'),26,85);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({
    map:texture,transparent:true,depthWrite:false
  }));
  sprite.scale.set(.98,.32,1);
  sprite.position.set(0,2.18,0);
  return sprite;
}
function createStanding(entry,gltf){
  const position=entry.number-1;
  const root=new THREE.Group();
  root.name='Fictional T-'+String(entry.number).padStart(2,'0');
  root.position.set(positions[position],0,-.3);
  const body=gltf.scene;
  body.updateMatrixWorld(true);
  const base=new THREE.Box3().setFromObject(body);
  const height=base.getSize(new THREE.Vector3()).y;
  if(!Number.isFinite(height)||height<.2)throw Error('Invalid size of T-'+entry.number);
  body.scale.multiplyScalar(1.82/height);
  body.updateMatrixWorld(true);
  const aligned=new THREE.Box3().setFromObject(body);
  const center=aligned.getCenter(new THREE.Vector3());
  body.position.set(-center.x,-aligned.min.y,-center.z);
  body.rotation.y=Math.PI;
  let bones=0,skinMeshes=0,textureCount=0;
  body.traverse(mesh=>{
    if(mesh.isBone)bones++;
    if(!mesh.isMesh)return;
    mesh.frustumCulled=false;
    if(mesh.isSkinnedMesh)skinMeshes++;
    mesh.userData.eliteNumber=entry.number;
    (Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>{
      if(m?.map)textureCount++;
    });
  });
  if(bones<45||skinMeshes===0)throw Error('No rig or skinned mesh on T-'+entry.number);
  root.add(body,label(entry.number));
  scene.add(root);
  entries.set(entry.number,{entry,root,body,bones,skinMeshes,textureCount});
}

function updateSelected(num){
  const found=entries.get(num);
  if(!found)return;
  document.querySelectorAll('#detail button').forEach(b=>b.remove());
  const detail=$('detail');
  const e=found.entry;
  detail.hidden=false;
  $('modelName').textContent='T-'+String(num).padStart(2,'0')+' · '+e.name;
  $('modelInfo').textContent=e.palette+' · '+found.bones+' костей'+
    (e.derivative?' · вариант цвета':' · отдельный вариант экипировки');
  let saved=0;
  try{saved=Number(localStorage.getItem(ELITE_T_KEY)||0)}catch{}
  const button=document.createElement('button');
  button.textContent=saved===num?'✓ ВЫБРАН В КОМАНДУ T':'ВЫБРАТЬ T-'+String(num).padStart(2,'0');
  button.onclick=()=>{
    saveEliteTChoice(num);
    button.textContent='✓ ВЫБРАН В КОМАНДУ T';
    $('selectedStatus').textContent='Выбран T-'+String(num).padStart(2,'0')+' · для следующего матча';
  };
  detail.append(button);
  $('selectedStatus').textContent='Нажми «ВЫБРАТЬ», чтобы сохранить бойца';
}

async function load(){
  let models;
  try{
    const response=await fetch(BASE+'casting/elite/manifest.json?v='+VERSION,{cache:'no-store'});
    if(!response.ok)throw Error('HTTP '+response.status+' при загрузке списка');
    const data=await response.json();
    models=data.models;
    if(data.total!==5||!data.maskedOnly||models.length!==5)
      throw Error('Ожидалось ровно пять бойцов в масках');
    if(new Set(models.map(m=>m.path)).size!==5)
      throw Error('Повторяющиеся файлы моделей');
    if(models.some(m=>!m.male||!m.masked||!m.hasSkeleton||m.boneCount<45))
      throw Error('Модель не соответствует требованиям');
  }catch(e){
    console.error(e);$('loading').textContent='Не получилось загрузить список: '+e.message;
    return;
  }
  let next=0,done=0;
  const errors=[];
  async function worker(){
    while(next<models.length){
      const e=models[next++];
      try{
        const gltf=await loader.loadAsync(BASE+e.path+'?v='+VERSION);
        createStanding(e,gltf);
      }catch(error){
        console.error('T candidate failed',e,error);
        errors.push('T-'+e.number+': '+(error?.message||error));
      }
      done++;
      $('status').textContent=done+'/5 · бойцы с закрытыми лицами';
      $('progressBar').style.width=Math.round(done/5*100)+'%';
    }
  }
  await Promise.all([worker(),worker()]);
  $('loading').hidden=errors.length===0;
  if(errors.length)$('loading').textContent='Ошибки моделей: '+errors.join('; ');
  $('status').textContent=entries.size+'/5 · тактические бойцы / готовые скелеты';
}
load();

const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
function pick(x,y){
  pointer.set(2*x/innerWidth-1,1-2*y/innerHeight);
  ray.setFromCamera(pointer,camera);
  const hits=ray.intersectObjects(loaded.length?loaded:[...entries.values()].map(v=>v.body),true);
  for(const hit of hits){
    let o=hit.object;
    while(o){
      if(o.userData?.eliteNumber){updateSelected(o.userData.eliteNumber);return;}
      o=o.parent;
    }
  }
}

const buttons=new Set(),movement={x:0,y:0},joy={id:null,x:0,y:0};
const look={id:null,x:0,y:0,dist:0};
let yaw=0,pitch=0;
window.addEventListener('keydown',e=>{buttons.add(e.code);if(e.code.startsWith('Arrow'))e.preventDefault()});
window.addEventListener('keyup',e=>buttons.delete(e.code));
window.addEventListener('blur',()=>{buttons.clear();movement.x=movement.y=0});
const pad=$('joystick'),thumb=$('thumb');
function moveJoy(e){
  const x=e.clientX-joy.x,y=e.clientY-joy.y;
  const n=Math.max(1,Math.hypot(x,y)),r=Math.min(1,n/42);
  movement.x=x/n*r;movement.y=y/n*r;
  thumb.style.transform='translate('+movement.x*42+'px,'+movement.y*42+'px)';
}
pad.addEventListener('pointerdown',e=>{
  joy.id=e.pointerId;pad.setPointerCapture(e.pointerId);
  const b=pad.getBoundingClientRect();
  joy.x=b.left+b.width/2;joy.y=b.top+b.height/2;moveJoy(e);
});
pad.addEventListener('pointermove',e=>{if(e.pointerId===joy.id)moveJoy(e)});
function resetJoy(e){if(e.pointerId!==joy.id)return;
  joy.id=null;movement.x=movement.y=0;thumb.style.transform='';
}
for(const n of ['pointerup','pointercancel','lostpointercapture'])
  pad.addEventListener(n,resetJoy);
const drag=$('drag');
drag.addEventListener('pointerdown',e=>{
  look.id=e.pointerId;look.x=e.clientX;look.y=e.clientY;look.dist=0;
  drag.setPointerCapture(e.pointerId);
});
drag.addEventListener('pointermove',e=>{
  if(e.pointerId!==look.id)return;
  const dx=e.clientX-look.x,dy=e.clientY-look.y;
  look.dist+=Math.hypot(dx,dy);yaw-=dx*.0042;
  pitch=THREE.MathUtils.clamp(pitch-dy*.004,-1.25,1.25);
  look.x=e.clientX;look.y=e.clientY;
});
for(const n of ['pointerup','pointercancel','lostpointercapture'])
  drag.addEventListener(n,e=>{
    if(e.pointerId!==look.id)return;
    if(n==='pointerup'&&look.dist<10)pick(e.clientX,e.clientY);
    look.id=null;
  });
const canvas=renderer.domElement;
canvas.addEventListener('click',e=>{
  if(!matchMedia('(pointer:coarse)').matches)pick(e.clientX,e.clientY);
});
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
const clock=new THREE.Clock();
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,clock.getDelta());
  const mx=(Number(buttons.has('KeyD')||buttons.has('ArrowRight'))-
      Number(buttons.has('KeyA')||buttons.has('ArrowLeft')))+movement.x;
  const mz=(Number(buttons.has('KeyS')||buttons.has('ArrowDown'))-
      Number(buttons.has('KeyW')||buttons.has('ArrowUp')))+movement.y;
  const speed=3.7*dt/Math.max(1,Math.hypot(mx,mz));
  camera.position.x+=(Math.cos(yaw)*mx+Math.sin(yaw)*mz)*speed;
  camera.position.z+=(-Math.sin(yaw)*mx+Math.cos(yaw)*mz)*speed;
  camera.position.x=THREE.MathUtils.clamp(camera.position.x,-10,10);
  camera.position.z=THREE.MathUtils.clamp(camera.position.z,-8,15);
  camera.rotation.set(pitch,yaw,0);
  renderer.render(scene,camera);
}
frame();
