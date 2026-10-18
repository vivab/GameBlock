import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const $=id=>document.getElementById(id);
const BASE=import.meta.env.BASE_URL;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x919da0);
scene.fog=new THREE.Fog(0x919da0,38,100);
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,150);
camera.rotation.order='YXZ';
camera.position.set(0,1.73,21);
const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.45));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.42;
document.body.insertBefore(renderer.domElement,$('hud'));
const ambient=new THREE.HemisphereLight(0xeef5f5,0x4a5359,2.25);
scene.add(ambient);
const sun=new THREE.DirectionalLight(0xfff2db,3.1);
sun.position.set(-8,15,8);scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(120,120),
  new THREE.MeshStandardMaterial({color:0x656c6e,roughness:1,metalness:0,side:THREE.DoubleSide}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.045;scene.add(floor);

const models=[],labels=[], mixers=[];
const material=(color,roughness=1)=>new THREE.MeshStandardMaterial({
  color,roughness,metalness:0,flatShading:true
});
const labelTexture=(number,name)=>{
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const c=canvas.getContext('2d');c.fillStyle='#14242bd9';c.fillRect(0,0,512,128);
  c.fillStyle='#dfc8a1';c.font='900 60px system-ui';c.fillText(String(number).padStart(2,'0'),17,82);
  c.fillStyle='#f0f0ec';c.font='600 24px system-ui';
  c.fillText(name.replaceAll('_',' ').slice(0,27),110,78);
  const t=new THREE.CanvasTexture(canvas);
  t.colorSpace=THREE.SRGBColorSpace;return t;
};
function addName(stand,entry){
  const tex=labelTexture(entry.number,entry.name);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));
  sprite.position.set(0,2.40,0);
  sprite.scale.set(2.15,.54,1);stand.add(sprite);
  labels.push(sprite);
}
const makeBox=(w,h,d,mat,x,y,z,parent)=>{
  const obj=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  obj.position.set(x,y,z);parent.add(obj);return obj;
};
function addTacticalGear(stand,index){
  // These are removable preview-only protective accessories. The 30 underlying
  // human meshes have 30 genuinely different skeletons and source geometry.
  // Attach functional gear to bones when a final model is selected.
  const cloth=[0x394c56,0x484f47,0x44535c,0x616150,0x44474c,0x4d5042];
  const vest=[0x253137,0x343c39,0x343d48,0x3c3e35,0x2d343c];
  const base=material(cloth[index%cloth.length]);
  const armor=material(vest[index%vest.length]);
  const edge=material(0x232b30);
  const accent=material([0x737167,0x505c57,0x787566,0x47545a][index%4]);
  const gear=new THREE.Group();
  gear.name='Removable tactical gear / test fit';stand.add(gear);
  // no weapons. Uncovered fingers can be inspected on the real imported mesh.
  const torso=makeBox(.46,.41,.27,armor,0,1.35,0,gear);
  torso.rotation.x=.035;
  makeBox(.49,.085,.28,accent,0,1.525,0,gear);
  for(const side of [-1,1]){
    makeBox(.09,.27,.22,base,side*.245,1.36,0,gear);
    const pouch=makeBox(.125,.15,.095,accent,side*.16,1.212,.184,gear);
    pouch.rotation.y=side*.11;
    makeBox(.125,.025,.101,edge,side*.16,1.278,.239,gear);
    makeBox(.13,.12,.04,armor,side*.115,.58,.17,gear);
    makeBox(.11,.025,.045,accent,side*.115,.63,.196,gear);
  }
  for(const y of [1.29,1.365,1.425]){
    makeBox(.41,.013,.018,edge,0,y,.144,gear);
  }
  const helmets=[
    new THREE.CylinderGeometry(.118,.145,.17,10),
    new THREE.CylinderGeometry(.130,.147,.15,8),
    new THREE.CylinderGeometry(.117,.140,.20,12),
    new THREE.CylinderGeometry(.13,.145,.16,9),
  ];
  const helmet=new THREE.Mesh(helmets[index%helmets.length],armor);
  helmet.position.set(0,1.8,0);gear.add(helmet);
  makeBox(.27,.034,.075,armor,0,1.748,.088,gear);
  if(index%3===0)makeBox(.065,.051,.035,edge,0,1.786,.159,gear);
  if(index%4===0){
    makeBox(.25,.046,.042,edge,0,1.73,.10,gear);
    makeBox(.175,.031,.018,material(0x657676,.42),0,1.728,.132,gear);
  }
  // low-profile backpack is varied but never round or toy-like.
  if(index%3!==1)makeBox(.25,.32,.10,armor,0,1.39,-.18,gear);
  for(let i=0;i<2+(index%3);i++){
    makeBox(.077,.082,.067,accent,(-.135+i*.093),1.10,.15,gear);
  }
  return gear;
}
function gridPosition(index){
  const col=index%6,row=Math.floor(index/6);
  return {x:(col-2.5)*3.45,z:11-row*5.05};
}
function animatedAimSetup(root){
  const bones=[];root.traverse(o=>{if(o.isBone)bones.push(o)});
  const isArm=s=>/upperarm|shoulder|forearm|lowerarm/i.test(s);
  const pose=[];
  for(const bone of bones){
    const name=bone.name.replace(/mixamorig[:_]?/ig,'').replace(/\d+/g,'');
    if(!isArm(name))continue;
    const left=/left|_l$|\.l$/i.test(name);
    const right=/right|_r$|\.r$/i.test(name);
    if(!left&&!right)continue;
    const forearm=/forearm|lowerarm/i.test(name);
    const angle=new THREE.Euler(forearm?-.18:-.21,
      forearm?(left?-.14:.14):(left?-.11:.11),
      forearm?0:(left?.12:-.12));
    const offset=new THREE.Quaternion().setFromEuler(angle);
    pose.push({bone,offset,neutral:bone.quaternion.clone()});
  }
  return {bones:bones.length,pose};
}
const showProgress=(n,total)=>{
  $('counter').textContent=n+'/'+total+' разных 3D-моделей · свободный осмотр';
  $('loadbar').firstElementChild.style.width=(n/total*100)+'%';
  if(n===total) $('loading').hidden=true;
};
function spawn(entry,gltf){
  const index=entry.number-1;
  const stand=new THREE.Group();
  stand.name='Кандидат '+entry.number+' / '+entry.name;
  const {x,z}=gridPosition(index);stand.position.set(x,0,z);
  scene.add(stand);
  const rigRoot=gltf.scene;
  rigRoot.updateMatrixWorld(true);
  const bb0=new THREE.Box3().setFromObject(rigRoot);
  const h=bb0.getSize(new THREE.Vector3()).y;
  if(!Number.isFinite(h)||h<.02)throw Error('Invalid GLB character height');
  rigRoot.scale.multiplyScalar(1.83/h);
  rigRoot.updateMatrixWorld(true);
  const bb=new THREE.Box3().setFromObject(rigRoot);
  const ctr=bb.getCenter(new THREE.Vector3());
  rigRoot.position.x-=ctr.x;
  rigRoot.position.z-=ctr.z;
  rigRoot.position.y-=bb.min.y;
  rigRoot.rotation.y=Math.PI;
  stand.add(rigRoot);
  const actualSkins=[];
  rigRoot.traverse(o=>{
    if(!o.isMesh)return;
    o.frustumCulled=false;
    if(o.isSkinnedMesh)actualSkins.push(o);
    // Restore a muted tactical palette while preserving source silhouette
    // and the skinning attributes. No source bone structure is deleted.
    const pal=[0x57676b,0x4d5d54,0x6f746a,0x4b555d,0x6d6c5f,0x596762];
    const mats=Array.isArray(o.material)?o.material:[o.material];
    o.material=mats.map(m=>{
      const copy=m.clone();
      copy.roughness=Math.max(.82,copy.roughness??.85);
      copy.metalness=0;
      if(copy.color)copy.color.multiply(new THREE.Color(pal[index%pal.length]));
      return copy;
    });
    if(!Array.isArray(mats === o.material)){} // base compatibility
    if(o.material.length===1)o.material=o.material[0];
  });
  const posing=animatedAimSetup(rigRoot);
  const possible=/aim|rifle|combat|hold|idle|stand|ready/i;
  const clip=gltf.animations?.find(c=>possible.test(c.name))||gltf.animations?.[0];
  let mixer=null;
  if(clip){
    mixer=new THREE.AnimationMixer(rigRoot);
    const action=mixer.clipAction(clip);
    action.play();action.timeScale=0;
    mixer.update(0);
    mixers.push(mixer);
  }
  const poseBones=animatedAimSetup(rigRoot).pose;
  const visual=addTacticalGear(stand,index);
  addName(stand,entry);
  models.push({entry,stand,visual,rigRoot,mixer,poseBones,
    bones:posing.bones,skins:actualSkins.length,animations:gltf.animations?.length||0});
  // Index for click to inspect. Originals are still all on the same map.
  stand.traverse(o=>{if(o.isMesh)o.userData.candidate=entry.number});
}
function showSelection(i){
  const item=models.find(m=>m.entry.number===i);if(!item)return;
  const d=$('selected');d.style.display='block';
  d.replaceChildren();
  const a=document.createElement('b');a.textContent=String(i).padStart(2,'0')+' / '+item.entry.name.replaceAll('_',' ');
  const b=document.createElement('div');
  b.textContent=item.skins+' skinned meshes · '+item.bones+' костей · '+item.animations+' анимаций';
  d.append(a,b);
  setTimeout(()=>{if(d.firstChild===a)d.style.display='none'},6000);
}
const loader=new GLTFLoader();
async function loadAll(){
  let entries;
  try {
    const response=await fetch(BASE+'casting/manifest.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('Missing exported GLB manifest');
    const json=await response.json();entries=json.models;
    if(!Array.isArray(entries)||entries.length!==30)throw new Error('Requires exactly 30 imported GLB characters');
  }catch(err){
    $('loading').textContent='Модели ещё загружаются в GitHub. Повтори позже.';
    console.error(err);return;
  }
  const limit=3;let current=0,loaded=0,errors=0;
  async function work(){
    while(current<entries.length){
      const entry=entries[current++];
      try{
        const gltf=await loader.loadAsync(BASE+entry.path);
        spawn(entry,gltf);loaded++;
      }catch(e){
        errors++;console.error('Rigged GLB failed',entry.number,e);
      }
      showProgress(loaded+errors,entries.length);
    }
  }
  await Promise.all(Array.from({length:limit},work));
  if(errors){
    $('loading').hidden=false;
    $('loading').textContent='Загружено '+loaded+'/30. '+errors+' файлов не открылись.';
  }
  $('counter').textContent=loaded+' разных моделей · с костями и возможностью осмотра';
}
loadAll();

let yaw=0,pitch=0,velocityY=0,walk=0;
const keys=new Set(),joy={x:0,y:0},look={id:null,x:0,y:0},joyState={id:null,x:0,y:0};
const down=e=>{
  if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;
  keys.add(e.code);
};
window.addEventListener('keydown',down);
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();joy.x=joy.y=0});
const canvas=renderer.domElement;
canvas.addEventListener('click',()=>{
  if(matchMedia('(pointer:fine)').matches && document.pointerLockElement!==canvas)
    canvas.requestPointerLock?.();
});
window.addEventListener('mousemove',e=>{
  if(document.pointerLockElement===canvas){
    yaw-=e.movementX*.0028;
    pitch=THREE.MathUtils.clamp(pitch-e.movementY*.0025,-1.26,1.26);
  }
});
const joyPad=$('joy'),thumb=$('stick');
const joyReset=()=>{
  joyState.id=null;joy.x=joy.y=0;thumb.style.transform='';
};
joyPad.addEventListener('pointerdown',e=>{
  if(joyState.id!==null)return;
  joyState.id=e.pointerId;joyPad.setPointerCapture(e.pointerId);
  const r=joyPad.getBoundingClientRect();
  joyState.x=r.left+r.width/2;joyState.y=r.top+r.height/2;
  updateJoystick(e);
});
function updateJoystick(e){
  const dx=e.clientX-joyState.x,dy=e.clientY-joyState.y;
  const radius=42,len=Math.max(1,Math.hypot(dx,dy));
  joy.x=dx/radius*Math.min(1,radius/len);
  joy.y=dy/radius*Math.min(1,radius/len);
  thumb.style.transform='translate('+(joy.x*radius)+'px,'+(joy.y*radius)+'px)';
}
joyPad.addEventListener('pointermove',e=>{if(e.pointerId===joyState.id)updateJoystick(e)});
for(const type of ['pointerup','pointercancel','lostpointercapture'])
  joyPad.addEventListener(type,e=>{if(e.pointerId===joyState.id)joyReset()});
const lookArea=$('look');
lookArea.addEventListener('pointerdown',e=>{
  if(look.id!==null)return;
  look.id=e.pointerId;look.x=e.clientX;look.y=e.clientY;
  lookArea.setPointerCapture(e.pointerId);
});
lookArea.addEventListener('pointermove',e=>{
  if(e.pointerId!==look.id)return;
  yaw-=(e.clientX-look.x)*.005;
  pitch=THREE.MathUtils.clamp(pitch-(e.clientY-look.y)*.005,-1.25,1.25);
  look.x=e.clientX;look.y=e.clientY;
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])
  lookArea.addEventListener(type,e=>{if(look.id===e.pointerId)look.id=null});
const clock=new THREE.Clock();
const forward=new THREE.Vector3(),right=new THREE.Vector3();
function draw(){
  requestAnimationFrame(draw);
  const dt=Math.min(.06,clock.getDelta());
  const vx=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+joy.x;
  const vz=(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0)+joy.y;
  let x=vx,z=vz;const len=Math.hypot(x,z);
  if(len>1){x/=len;z/=len}
  const speed=(keys.has('ShiftLeft')?6.5:3.9)*dt;
  camera.position.x+=(Math.cos(yaw)*x+Math.sin(yaw)*z)*speed;
  camera.position.z+=(-Math.sin(yaw)*x+Math.cos(yaw)*z)*speed;
  camera.position.x=THREE.MathUtils.clamp(camera.position.x,-13.2,13.2);
  camera.position.z=THREE.MathUtils.clamp(camera.position.z,-18.5,20);
  if(len>.02)walk+=dt*13;
  camera.position.y=1.73+(len>.02?Math.sin(walk)*.018:0);
  camera.rotation.set(pitch,yaw,0,'YXZ');
  for(const m of models){
    // Small deterministic combat-ready shoulder bend. Rig remains preserved.
    // No copied arm animations can damage another model's skeleton.
    for(const b of m.poseBones)b.bone.quaternion.copy(b.neutral).multiply(b.offset);
  }
  renderer.render(scene,camera);
}
draw();
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.45));
});
