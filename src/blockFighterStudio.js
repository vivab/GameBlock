import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createBlockFighter,FIGHTER_ACTIONS,FIGHTER_VERSION} from './blockFighter.js';

const $=selector=>document.querySelector(selector);
const status=$('#status'),message=$('#message'),canvas=$('#canvas');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x1b2d40);
scene.fog=new THREE.Fog(0x1b2d40,9,19);
const camera=new THREE.PerspectiveCamera(39,1,.08,90);
camera.position.set(2.45,1.92,3.35);
const renderer=new THREE.WebGLRenderer({
 canvas, antialias:true,powerPreference:'high-performance',alpha:false
});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.35;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,1.05,0);
controls.minDistance=1.55;controls.maxDistance=7.5;
controls.maxPolarAngle=Math.PI*.54;
controls.enableDamping=true;controls.enablePan=false;
controls.update();
scene.add(new THREE.HemisphereLight(0xf3f6ff,0x62768b,2.15));
const key=new THREE.DirectionalLight(0xffe1b2,2.65);
key.position.set(-3,6,4);
key.castShadow=true;
key.shadow.mapSize.set(1024,1024);
key.shadow.camera.left=-3;
key.shadow.camera.right=3;
key.shadow.camera.top=5;
key.shadow.camera.bottom=-3;
key.shadow.bias=-.0005;
scene.add(key);
const rim=new THREE.DirectionalLight(0x78b3ff,2);
rim.position.set(3,3.5,-3);scene.add(rim);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),
 new THREE.MeshStandardMaterial({color:0x172534,roughness:1}));
floor.rotation.x=-Math.PI/2;
floor.position.y=-.055;floor.receiveShadow=true;scene.add(floor);
const platform=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.12,.12,48),
 new THREE.MeshStandardMaterial({color:0x304357,metalness:.42,roughness:.55}));
platform.position.y=-.075;platform.receiveShadow=true;scene.add(platform);
const ring=new THREE.Mesh(new THREE.TorusGeometry(.94,.012,5,80),
 new THREE.MeshBasicMaterial({color:0x7ca6c6,transparent:true,opacity:.65}));
ring.rotation.x=-Math.PI/2;ring.position.y=-.012;scene.add(ring);

let fighter,helper,clockStart=performance.now();
try{
 fighter=createBlockFighter();
 scene.add(fighter.root);
 status.textContent='ГОТОВО · RIG '+FIGHTER_VERSION;
 $('#tris').textContent=fighter.triangles.toLocaleString('ru-RU');
 $('#bones-count').textContent=fighter.joints.length;
 const select=$('#bone');
 select.innerHTML='';
 const list=fighter.joints.filter(name=>!name.startsWith('Finger')&&!name.startsWith('Thumb')&&
  !name.startsWith('Toe')&&!name.startsWith('Weapon')&&!name.startsWith('HeadLook'));
 for(const name of list){
  const option=document.createElement('option');option.value=name;option.textContent=name;
  select.appendChild(option);
 }
 select.value='UpperArm_R';
 helper=new THREE.SkeletonHelper(fighter.root);
 helper.material.color.setHex(0xf3c26d);
 helper.visible=false;
 helper.material.depthTest=false;
 scene.add(helper);
}catch(err){
 status.textContent='Ошибка создания модели: '+err.message;
 console.error(err);
}

function resize(){
 const bounds=canvas.getBoundingClientRect();
 const width=Math.max(1,Math.round(bounds.width)),height=Math.max(1,Math.round(bounds.height));
 if(canvas.width!==Math.round(width*renderer.getPixelRatio())||
  canvas.height!==Math.round(height*renderer.getPixelRatio())){
  renderer.setSize(width,height,false);
  camera.aspect=width/height;
  camera.updateProjectionMatrix();
 }
}
const resizeObserver=new ResizeObserver(resize);
resizeObserver.observe(canvas);
addEventListener('resize',resize);
resize();
function notify(text,isError=false){
 message.style.color=isError?'#efab98':'#aee8c4';
 message.textContent=text;
}
function refreshSliders(){
 if(!fighter)return;
 const boneName=$('#bone').value;
 for(const [field,axis] of [['pitch','x'],['yaw','y'],['roll','z']]){
  const slider=$('#'+field);
  const current=Math.round(fighter.getManual(boneName,axis));
  slider.value=String(current);
  $('#'+field+'-value').textContent=current+'°';
 }
}
$('#bone').addEventListener('change',refreshSliders);
for(const [field,axis] of [['pitch','x'],['yaw','y'],['roll','z']]){
 $('#'+field).addEventListener('input',event=>{
  if(!fighter)return;
  const value=Number(event.target.value);
  fighter.setManual($('#bone').value,axis,value);
  $('#'+field+'-value').textContent=value+'°';
 });
}
refreshSliders();
let mode='idle';
for(const button of document.querySelectorAll('[data-mode]')){
 button.addEventListener('click',()=>{
  if(!fighter)return;
  const desired=button.dataset.mode;
  if(!FIGHTER_ACTIONS.includes(desired))return;
  mode=desired;
  fighter.setMode(mode);
  for(const b of document.querySelectorAll('[data-mode]')){
   b.classList.toggle('selected',b===button);
  }
  notify('Режим: '+button.textContent.trim());
 });
}
$('#reset').addEventListener('click',()=>{
 if(!fighter)return;
 fighter.resetManual();
 fighter.setMode('idle');
 mode='idle';
 for(const b of document.querySelectorAll('[data-mode]')){
  b.classList.toggle('selected',b.dataset.mode==='idle');
 }
 refreshSliders();
 notify('Суставы возвращены к исходной стойке');
});
$('#bones').addEventListener('click',()=>{
 if(!helper)return;
 helper.visible=!helper.visible;
 $('#bones').textContent=helper.visible?'♧ Скрыть кости':'♧ Показать кости';
 notify(helper.visible?'Показан весь управляемый скелет':'Скелет скрыт');
});
$('#copy').addEventListener('click',async()=>{
 if(!fighter)return;
 const data={
  asset:'Block Fighter v1.0',mode,
  joints:Object.fromEntries(fighter.joints.map(name=>[
   name,Object.fromEntries(['x','y','z'].map(axis=>[axis,Math.round(fighter.getManual(name,axis))]))
  ]))
 };
 try{
  await navigator.clipboard.writeText(JSON.stringify(data,null,2));
  notify('Поза скопирована в буфер обмена');
 }catch(error){notify('Не удалось скопировать: '+error.message,true)}
});
$('#export').addEventListener('click',async()=>{
 if(!fighter)return;
 const button=$('#export');
 button.disabled=true;
 button.textContent='Экспортирую…';
 try{
  // Export the current rigged pose, not the animation timeline.
  fighter.update(0,mode);
  fighter.root.updateMatrixWorld(true);
  const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
  const exporter=new GLTFExporter();
  const buffer=await new Promise((resolve,reject)=>{
   exporter.parse(fighter.root,resolve,reject,
    {binary:true,trs:true,onlyVisible:true,animations:[]});
  });
  if(!(buffer instanceof ArrayBuffer))throw Error('Экспорт не создал бинарный GLB');
  const blob=new Blob([buffer],{type:'model/gltf-binary'});
  const href=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=href;
  link.download='gameblock-block-fighter-v1.glb';
  document.body.appendChild(link);
  link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(href),5000);
  notify('GLB готов — модель, материалы и скелет экспортированы');
 }catch(error){
  console.error(error);
  notify('Экспорт GLB: '+error.message,true);
 }finally{
  button.disabled=false;
  button.textContent='↓ Скачать GLB';
 }
});
let lastFrame=0;
function animate(now){
 requestAnimationFrame(animate);
 if(now-lastFrame<1000/60)return;
 lastFrame=now;
 if(fighter){
  fighter.update((now-clockStart)*.001,mode);
  helper?.updateMatrixWorld(true);
 }
 controls.update();
 renderer.render(scene,camera);
}
requestAnimationFrame(animate);
