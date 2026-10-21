import * as THREE from 'three';
import {createBlockFighter} from './blockFighter.js';
import {createThirdPersonLoadout} from './thirdPersonGrip.js';

// All five actions use OUR controllable rig — no Rocketbox GLBs or T-poses.
const specs=[
 {id:'run',mode:'run',team:'ct'},
 {id:'shoot',mode:'shoot',team:'t'},
 {id:'reload',mode:'reload',team:'ct'},
 {id:'jump',mode:'jump',team:'t'},
 {id:'crouch',mode:'crouch',team:'ct'},
];
const byId=id=>document.querySelector('[data-scene="'+id+'"]');
const renderer=new THREE.WebGLRenderer({antialias:false,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.2));
renderer.setSize(innerWidth,innerHeight,false);
renderer.setClearColor(0,0);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.4;
renderer.domElement.id='stage-canvas';
renderer.domElement.style.pointerEvents='none';
document.body.appendChild(renderer.domElement);
renderer.setScissorTest(true);
const actionScenes=[];
const materials={};
const mat=(name,color)=>materials[name] ||= new THREE.MeshStandardMaterial({
 color,metalness:0,roughness:.7,flatShading:true
});
function box(parent,name,color,pos,size){
 const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat(name,color));
 m.name=name;m.position.set(...pos);parent.add(m);return m;
}
function rifleForFighter(fighter){
 const controller=createThirdPersonLoadout(fighter,{kind:'rifle'});
 const weapon=controller.weapons.rifle;
 const gun=weapon.root;
 const mag=gun.getObjectByName('AK curved magazine');
 if(!mag)throw Error('Missing detachable AK magazine prop');
 return {controller,gun,mag,flash:weapon.flash,magBase:mag.position.clone()};
}
function stageFor(s){
 const scene=new THREE.Scene();
 scene.add(new THREE.HemisphereLight(0xf5f6ff,0x6d7e90,2.45));
 const sun=new THREE.DirectionalLight(0xffe2ba,2.65);sun.position.set(-3,5,4);scene.add(sun);
 const side=new THREE.DirectionalLight(0x79b0ef,1.5);side.position.set(3,3,-3);scene.add(side);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.96,1.02,.13,40),
  new THREE.MeshStandardMaterial({color:0x334658,roughness:.56,metalness:.35}));
 base.position.y=-.055;scene.add(base);
 const camera=new THREE.PerspectiveCamera(38,1,.08,40);
 camera.position.set(2.05,1.94,3.3);
 camera.lookAt(0,1.06,0);
 const palette=s.team==='t'?{
  cloth:'#57644b',clothDark:'#374238',armor:'#29352f',
  armorTrim:'#42513e',balaclava:'#262a28',balaclavaDetail:'#343c32',
  pouch:'#414a35',pouchFlap:'#515b43'
 }:{};
 const fighter=createBlockFighter(palette);
 scene.add(fighter.root);
 const gun=s.id!=='run'&&s.id!=='jump'?rifleForFighter(fighter):null;
 const preview=byId(s.id);
 return {id:s.id,scene,camera,fighter,gun,preview};
}
for(const s of specs)actionScenes.push(stageFor(s));
const status=document.querySelector('#progress');
status.classList.add('ready');
status.textContent='✓ Новый боевой хват AK-47 работает и в полигоне: правая на рукоятке, левая на цевье. Все 5 движений одновременно.';
const pause=document.querySelector('#pause');
let paused=false,speed=1,time=0,last=0,focus=null;
pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'▶ Продолжить':'⏸ Пауза';pause.classList.toggle('active',paused)});
document.querySelector('#speed').addEventListener('input',event=>{
 speed=Number(event.target.value);
 document.querySelector('#speed-value').textContent=speed.toFixed(1)+'×';
});
document.querySelectorAll('.motion-card .expand').forEach(b=>{
 b.addEventListener('click',()=>{
  const c=b.closest('.motion-card');
  const expand=focus!==c;
  if(focus){focus.classList.remove('expanded');focus.querySelector('.expand').textContent='Крупно ⤢'}
  focus=expand?c:null;
  if(focus){focus.classList.add('expanded');b.textContent='Закрыть ×'}
  document.body.classList.toggle('has-focus',!!focus);
 });
});
const closeFocus=()=>{
 if(!focus)return;
 focus.classList.remove('expanded');
 focus.querySelector('.expand').textContent='Крупно ⤢';
 focus=null;document.body.classList.remove('has-focus');
};
document.querySelector('#veil').addEventListener('click',closeFocus);
addEventListener('keydown',event=>{if(event.key==='Escape')closeFocus()});
addEventListener('resize',()=>renderer.setSize(innerWidth,innerHeight,false));
const update=(a,t)=>{
 a.fighter.update(t,a.id);
 if(!a.gun)return;
 a.gun.mag.position.copy(a.gun.magBase);
 a.gun.controller.update({kind:'rifle',mode:a.id,time:t,fire:false});
 a.gun.flash.visible=false;
 if(a.id==='shoot'||a.id==='crouch'){
  const beat=(t*.95)%1.3;
  if(beat<.72 && beat%.15<.069){
   a.gun.controller.update({kind:'rifle',mode:a.id,time:t,fire:true});
  }
 }
 if(a.id==='reload'){
  const phase=(t%2.3)/2.3;
  const drop=Math.sin(Math.PI*THREE.MathUtils.smoothstep(phase,.25,.72));
  a.gun.mag.position.y-=.16*Math.max(0,drop);
  a.gun.gun.rotation.x+=.08*Math.sin(phase*Math.PI);
 }
};
function renderCell(a){
 const bounds=a.preview.getBoundingClientRect();
 if(bounds.width<1||bounds.height<1)return;
 const left=Math.max(0,Math.floor(bounds.left));
 const bottom=Math.max(0,Math.floor(innerHeight-bounds.bottom));
 const right=Math.min(innerWidth,Math.ceil(bounds.right));
 const top=Math.min(innerHeight,Math.ceil(innerHeight-bounds.top));
 if(right<=left||top<=bottom)return;
 renderer.setViewport(bounds.left,innerHeight-bounds.bottom,bounds.width,bounds.height);
 renderer.setScissor(left,bottom,right-left,top-bottom);
 a.camera.aspect=bounds.width/bounds.height;
 a.camera.updateProjectionMatrix();
 renderer.render(a.scene,a.camera);
}
function tick(timestamp){
 requestAnimationFrame(tick);
 const dt=last?THREE.MathUtils.clamp((timestamp-last)/1000,0,.05):.016;
 last=timestamp;
 if(!paused)time+=dt*speed;
 for(const a of actionScenes)update(a,time);
 // Wipe the full transparent canvas before applying per-card scissor boxes.
 // Otherwise opening/closing a fullscreen card leaves stale silhouettes.
 renderer.setScissor(0,0,innerWidth,innerHeight);
 renderer.clear();
 for(const a of actionScenes){
  if(focus&&a.preview.closest('.motion-card')!==focus)continue;
  renderCell(a);
 }
}
requestAnimationFrame(tick);
