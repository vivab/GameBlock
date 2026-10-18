import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {validateCastingManifest} from './castingManifest.js';
import {T_KEY,T_COUNT,saveTChoice} from './operatorChoices.js';

// Ten DIFFERENT source rigged/textured Rocketbox adult MALE military/police
// characters (MIT). No ninjas, civilian doctors, procedural cubic armor,
// repeated V8 meshes, artificial color filters, firearms or combat systems.
const BASE=import.meta.env.BASE_URL;
const CACHE_VERSION='20261018-full-outfit-olive-v7';
const forT=document.body.dataset.role==='terrorists';
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x919ba0);
scene.fog=new THREE.Fog(0x919ba0,32,76);
const camera=new THREE.PerspectiveCamera(71,innerWidth/innerHeight,.06,110);
camera.rotation.order='YXZ';
camera.position.set(0,1.71,forT?13.9:12.8);
const renderer=new THREE.WebGLRenderer({
  antialias:false,alpha:false,powerPreference:'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=forT?1.25:1.12;
document.body.insertBefore(renderer.domElement,$('hud'));

scene.add(new THREE.HemisphereLight(0xe9eef1,0x45494b,2.0));
const sunlight=new THREE.DirectionalLight(0xffe8c9,2.35);
sunlight.position.set(-7,14,9);scene.add(sunlight);
const fill=new THREE.DirectionalLight(0xb2c9d3,.85);
fill.position.set(8,8,-9);scene.add(fill);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(55,55),
  new THREE.MeshStandardMaterial({color:0x8f918c,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.025;
ground.receiveShadow=true;scene.add(ground);

const operators=[];
const raycaster=new THREE.Raycaster();
const mouse=new THREE.Vector2();
const loader=new GLTFLoader();
let missing=0;

function makeLabel(number,name){
  const canvas=document.createElement('canvas');
  canvas.width=512;canvas.height=112;
  const g=canvas.getContext('2d');
  g.fillStyle='#15252ceb';g.fillRect(0,0,512,112);
  g.fillStyle='#d9bea0';g.fillRect(0,0,6,112);
  g.fillStyle='#f4e2bf';g.font='900 57px system-ui';
  g.fillText(String(number).padStart(2,'0'),20,77);
  g.fillStyle='#eaf0f0';g.font='600 26px system-ui';
  g.fillText(name.slice(0,23),119,71);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({
    map:texture,transparent:true,depthWrite:false
  }));
  sprite.scale.set(1.88,.41,1);
  sprite.position.set(0,2.31,0);
  return sprite;
}
function gridPosition(i){
  return {x:(i%5-2)*3.55,
    z:forT?3.7-Math.floor(i/5)*5.40:3.15-Math.floor(i/5)*5.15};
}

function placeOperator(entry,gltf){
  const i=entry.number-1;
  const stand=new THREE.Group();
  stand.name=entry.name;
  const pos=gridPosition(i);
  stand.position.set(pos.x,0,pos.z);
  scene.add(stand);
  const body=gltf.scene;
  // Source-authentic physique and surface textures: do NOT recolor skin,
  // mask, uniform, or make an animated soldier look like a Lego character.
  body.updateMatrixWorld(true);
  const bbox=new THREE.Box3().setFromObject(body);
  const size=bbox.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<.02)throw Error('Invalid model bounds: '+entry.name);
  body.scale.multiplyScalar(1.82/size.y);
  body.updateMatrixWorld(true);
  const scaled=new THREE.Box3().setFromObject(body);
  const center=scaled.getCenter(new THREE.Vector3());
  body.position.x-=center.x;
  body.position.z-=center.z;
  body.position.y-=scaled.min.y;
  body.rotation.y=Math.PI; // Characters face the walking gallery.
  let bones=0,skinMeshes=0,textured=0;
  body.traverse(node=>{
    if(node.isBone)bones++;
    if(!node.isMesh)return;
    node.frustumCulled=false;
    if(node.isSkinnedMesh)skinMeshes++;
    // Retain the ORIGINAL photographs/textures, skin color, geometry and
    // weighted vertices. No fake box helmets or floating square pouches.
    const original=Array.isArray(node.material)?node.material:[node.material];
    const mats=original.map(m=>{
      if(!m)return m;
      const material=m.clone();
      // Mobile visibility fix: the source GLB still contains several
      // separate nearly-black cloth materials. Brighten the actual
      // clothing material in the renderer, never the fitted balaclava,
      // head, eyes, hair or skin. This is independent of texture caching.
      if(forT && (entry.number===2 || entry.number===5)){
        const name=(material.name||'').toLowerCase();
        // Clothes use multiple independent materials: jacket, trousers,
        // boots and accessories. Never dye the head, face or balaclava.
        const protectedPart=/(balaclava|_head|head$|face|skin|hair|eye|iris|mouth|teeth|mask|helmet)/.test(name);
        const pants=/(leg|pant|trouser|jean|bottom)/.test(name);
        const leather=/(boot|shoe|foot|glove|belt|strap|pouch)/.test(name);
        const clothing=/(body|olive_bandit|jacket|shirt|cloth|uniform|coat|vest|torso|arm|sleeve|pant|trouser|leg|jean|boot|shoe|foot|glove|belt|strap|pouch)/.test(name);
        if(clothing && !protectedPart){
          const shade=leather?0x726e50:pants
            ?(entry.number===2?0xaeb78b:0xc3b995)
            :(entry.number===2?0xc1ce95:0xd8d0a9);
          // Remove the original dark map only from clothing: it otherwise
          // multiplies the light olive factor back down to black.
          material.color?.setHex(shade);
          material.map=null;
          material.emissive?.setHex(leather?0x17170d:0x272d1c);
          material.emissiveIntensity=.55;
          material.roughness=.97;
          material.metalness=0;
          material.needsUpdate=true;
        }
      }
      if(material.map)textured++;
      if('roughness' in material)material.roughness=Math.max(.65,material.roughness??.8);
      if('metalness' in material)material.metalness=Math.min(.22,material.metalness??0);
      return material;
    });
    node.material=Array.isArray(node.material)?mats:mats[0];
    node.userData.operator=entry.number;
  });
  if(bones<14 || skinMeshes<1)throw Error('Missing rig/skin: '+entry.name);
  stand.add(body);
  const label=forT?(entry.outfitPalette?'T · ОЛИВА':'T · МАСКА'):entry.kind==='military'?'Военный':'Полицейский';
  stand.add(makeLabel(entry.number,label+' '+String(entry.number).padStart(2,'0')));
  operators.push({entry,stand,body,bones,skinMeshes,textured});
}

function progress(done,total){
  $('counter').textContent=done+' / '+total+' · реальные мужские модели с костями';
  $('loadbar').firstElementChild.style.width=(100*done/total)+'%';
}

async function loadModels(){
  let entries;
  try{
    const manifestPath=forT?'casting/masked/manifest.json':'casting/realistic/manifest.json';
    const response=await fetch(BASE+manifestPath+'?v='+CACHE_VERSION,{cache:'no-store'});
    if(!response.ok)throw Error('Cannot load character manifest (HTTP '+response.status+')');
    const source=await response.json();
    const count=forT?T_COUNT:10;
    entries=validateCastingManifest(source,count);
    if(forT && !source.maskedOnly)throw Error('Need 10 face-covered characters, not civilians');
  }catch(error){
    console.error(error);
    $('loading').textContent='Не загружен список персонажей: '+error.message+' · проверь URL '+BASE;
    return;
  }
  let next=0,finished=0;
  const failed=[];
  async function worker(){
    while(next<entries.length){
      const entry=entries[next++];
      try{
        const gltf=await loader.loadAsync(BASE+entry.path+'?v='+CACHE_VERSION);
        placeOperator(entry,gltf);
      }catch(error){
        console.error('Cannot load character '+entry.number,error);missing++;
        failed.push(String(entry.number).padStart(2,'0')+': '+(error?.message||String(error)));
      }
      finished++;progress(finished,entries.length);
    }
  }
  await Promise.all(Array.from({length:3},worker));
  const count=forT?T_COUNT:10;
  $('loading').hidden=missing===0;
  if(missing){
    $('loading').textContent='Загружено '+(count-missing)+'/'+count+' · ошибки: '+failed.slice(0,3).join(' | ');
  }
  $('counter').textContent=(count-missing)+' / '+count+
    (forT?' · все с балаклавами · скелеты готовы':' · военные / полиция · скелеты готовы');
}
loadModels();

function showInfo(operator){
  const d=$('selected');if(!d)return;
  const source=operator.entry;
  d.hidden=false;
  d.replaceChildren();
  const title=document.createElement('b');
  title.textContent=String(source.number).padStart(2,'0')+' · '+source.name;
  const meta=document.createElement('div');
  meta.textContent=operator.bones+' костей · '+operator.skinMeshes+
    ' skinned meshes · '+operator.textured+' текстурированных материалов';
  const sourceLine=document.createElement('small');
  sourceLine.textContent=forT
    ?(source.label||'Балаклава')+' · маска подогнана под форму головы'
    :'Источник: Microsoft Rocketbox (MIT)';
  d.append(title,meta,sourceLine);
  if(forT){
    const b=document.createElement('button');
    b.type='button';b.id='chooseT';
    let selected=0;
    try{selected=Number(localStorage.getItem(T_KEY)||0)}catch{}
    b.textContent=selected===source.number?'✓ ВЫБРАН В МАСКЕ T-'+String(source.number).padStart(2,'0')
      :'ВЫБРАТЬ БОЙЦА T-'+String(source.number).padStart(2,'0');
    b.addEventListener('click',()=>{
      try{saveTChoice(source.number);}catch(e){console.warn('Selection not saved',e)}
      b.textContent='✓ ВЫБРАН В МАСКЕ T-'+String(source.number).padStart(2,'0');
      const badge=$('selectionText');
      if(badge)badge.textContent='Выбран T-'+String(source.number).padStart(2,'0');
    });
    d.append(b);
  }
}

function pick(clientX,clientY){
  mouse.set(clientX/innerWidth*2-1,-clientY/innerHeight*2+1);
  raycaster.setFromCamera(mouse,camera);
  const hits=raycaster.intersectObjects(operators.map(o=>o.body),true);
  for(const hit of hits){
    let node=hit.object;
    while(node){
      const number=node.userData?.operator;
      if(number){
        const found=operators.find(o=>o.entry.number===number);
        if(found){showInfo(found);return;}
      }
      node=node.parent;
    }
  }
}

let yaw=0,pitch=0,walk=0;
const keys=new Set();
const move={x:0,y:0},look={id:null,x:0,y:0,moved:0},joy={id:null,x:0,y:0};
window.addEventListener('keydown',e=>{
  keys.add(e.code);
  if(e.code.startsWith('Arrow'))e.preventDefault();
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();move.x=move.y=0});
const canvas=renderer.domElement;
canvas.addEventListener('click',e=>{
  if(matchMedia('(pointer:fine)').matches && document.pointerLockElement!==canvas)
    canvas.requestPointerLock?.();
  pick(e.clientX,e.clientY);
});
window.addEventListener('mousemove',e=>{
  if(document.pointerLockElement!==canvas)return;
  yaw-=e.movementX*.0028;
  pitch=THREE.MathUtils.clamp(pitch-e.movementY*.0025,-1.25,1.25);
});
const pad=$('joy'),thumb=$('stick');
const resetJoy=()=>{joy.id=null;move.x=move.y=0;thumb.style.transform=''};
pad.addEventListener('pointerdown',e=>{
  if(joy.id!==null)return;
  joy.id=e.pointerId;pad.setPointerCapture(e.pointerId);
  const r=pad.getBoundingClientRect();
  joy.x=r.left+r.width/2;joy.y=r.top+r.height/2;setJoy(e);
});
function setJoy(e){
  const dx=e.clientX-joy.x,dy=e.clientY-joy.y;
  const radius=42,n=Math.hypot(dx,dy),amount=Math.min(1,n/radius);
  move.x=n>1?dx/n*amount:0;move.y=n>1?dy/n*amount:0;
  thumb.style.transform='translate('+move.x*radius+'px,'+move.y*radius+'px)';
}
pad.addEventListener('pointermove',e=>{if(e.pointerId===joy.id)setJoy(e)});
for(const event of ['pointerup','pointercancel','lostpointercapture'])
  pad.addEventListener(event,e=>{if(e.pointerId===joy.id)resetJoy()});
const area=$('look');
area.addEventListener('pointerdown',e=>{
  if(look.id!==null)return;
  look.id=e.pointerId;look.x=e.clientX;look.y=e.clientY;
  look.moved=0;area.setPointerCapture(e.pointerId);
});
area.addEventListener('pointermove',e=>{
  if(e.pointerId!==look.id)return;
  const dx=e.clientX-look.x,dy=e.clientY-look.y;
  look.moved+=Math.hypot(dx,dy);
  yaw-=dx*.0045;
  pitch=THREE.MathUtils.clamp(pitch-dy*.0045,-1.2,1.2);
  look.x=e.clientX;look.y=e.clientY;
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])
  area.addEventListener(event,e=>{
    if(e.pointerId!==look.id)return;
    if(event==='pointerup'&&look.moved<13)pick(e.clientX,e.clientY);
    look.id=null;
  });
const clock=new THREE.Clock();
function draw(){
  requestAnimationFrame(draw);
  const dt=Math.min(.06,clock.getDelta());
  const x=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+move.x;
  const z=(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0)+move.y;
  const n=Math.max(1,Math.hypot(x,z));
  const speed=(keys.has('ShiftLeft')?6:3.7)*dt/n;
  camera.position.x+=(Math.cos(yaw)*x+Math.sin(yaw)*z)*speed;
  camera.position.z+=(-Math.sin(yaw)*x+Math.cos(yaw)*z)*speed;
  camera.position.x=THREE.MathUtils.clamp(camera.position.x,-12,12);
  camera.position.z=THREE.MathUtils.clamp(camera.position.z,forT?-9:-7.5,forT?18:13.2);
  if(Math.hypot(x,z)>.05)walk+=dt*13;
  camera.position.y=1.71+(Math.hypot(x,z)>.05?Math.sin(walk)*.013:0);
  camera.rotation.set(pitch,yaw,0,'YXZ');
  renderer.render(scene,camera);
}
draw();
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));
});
