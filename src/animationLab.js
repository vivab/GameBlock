import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

// Five independent Bip01 skeletons share one WebGL canvas. This avoids
// creating five WebGL contexts on a phone.
const ACTIONS=['run','shoot','reload','jump','crouch'];
const loader=new GLTFLoader();
const status=document.querySelector('#progress');
const canvasRenderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'high-performance'});
canvasRenderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.2));
canvasRenderer.setSize(innerWidth,innerHeight,false);
canvasRenderer.setClearColor(0,0);
canvasRenderer.outputColorSpace=THREE.SRGBColorSpace;
canvasRenderer.toneMapping=THREE.ACESFilmicToneMapping;
canvasRenderer.toneMappingExposure=1.3;
canvasRenderer.domElement.id='stage-canvas';
document.body.appendChild(canvasRenderer.domElement);
canvasRenderer.domElement.addEventListener('webglcontextlost',event=>{
 event.preventDefault();status.textContent='Потеряно соединение с 3D-графикой. Обнови страницу.';
});
const actors=[];
let ready=false,paused=false,speed=1,simulationTime=0,lastTime=0,focused=null;
const config=[
 {id:'run',team:'ct',name:'Бег'},
 {id:'shoot',team:'t',name:'Стрельба'},
 {id:'reload',team:'ct',name:'Перезарядка'},
 {id:'jump',team:'t',name:'Прыжок'},
 {id:'crouch',team:'ct',name:'Стрельба сидя'}
];
const boneNames={
 rightUpper:'Bip01 R UpperArm',rightFore:'Bip01 R Forearm',rightHand:'Bip01 R Hand',
 leftUpper:'Bip01 L UpperArm',leftFore:'Bip01 L Forearm',leftHand:'Bip01 L Hand',
 rightThigh:'Bip01 R Thigh',rightCalf:'Bip01 R Calf',rightFoot:'Bip01 R Foot',
 leftThigh:'Bip01 L Thigh',leftCalf:'Bip01 L Calf',leftFoot:'Bip01 L Foot',
 spine:'Bip01 Spine',spine1:'Bip01 Spine1',spine2:'Bip01 Spine2',head:'Bip01 Head'
};
const AXIS_X=new THREE.Vector3(1,0,0);
const AXIS_Z=new THREE.Vector3(0,0,1);
const tempA=new THREE.Vector3(),tempB=new THREE.Vector3();
const tempC=new THREE.Vector3(),tempD=new THREE.Vector3();
const tempQ=new THREE.Quaternion(),tempParent=new THREE.Quaternion();
const directionMatrix=new THREE.Matrix3();
const clamp=THREE.MathUtils.clamp;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};

function load(path,label){
 const url=import.meta.env.BASE_URL+path;
 return new Promise((resolve,reject)=>{
  loader.load(url,gltf=>resolve(gltf),
   p=>{if(p.total>0)status.textContent='Загрузка '+label+': '+Math.round(p.loaded/p.total*100)+'%';},
   error=>reject(new Error(label+': '+(error.message||String(error)))));
 });
}
function bones(root){
 const names={};
 root.traverse(o=>{if(o.isBone)names[o.name]=o});
 const result={};
 for(const [alias,name] of Object.entries(boneNames))result[alias]=names[name]||null;
 return result;
}
function worldRotation(bone,axis,angle){
 if(!bone||!angle||!bone.parent)return;
 bone.parent.updateWorldMatrix(true,false);
 bone.parent.getWorldQuaternion(tempParent);
 tempQ.setFromAxisAngle(axis,angle);
 bone.quaternion.premultiply(
  tempParent.clone().invert().multiply(tempQ).multiply(tempParent)
 ).normalize();
 bone.updateMatrixWorld(true);
}
function worldOffset(parent,delta){
 parent.updateWorldMatrix(true,false);
 directionMatrix.setFromMatrix4(new THREE.Matrix4().copy(parent.matrixWorld).invert());
 return delta.clone().applyMatrix3(directionMatrix);
}
function aimJoint(joint,effector,target,amount){
 if(!joint||!effector||!joint.parent)return;
 joint.updateWorldMatrix(true,false);
 effector.updateWorldMatrix(true,false);
 joint.getWorldPosition(tempA);effector.getWorldPosition(tempB);
 tempC.subVectors(tempB,tempA);tempD.subVectors(target,tempA);
 if(tempC.lengthSq()<1e-9||tempD.lengthSq()<1e-9)return;
 const change=new THREE.Quaternion().setFromUnitVectors(tempC.normalize(),tempD.normalize());
 change.slerp(new THREE.Quaternion(),1-amount);
 joint.parent.getWorldQuaternion(tempParent);
 change.premultiply(tempParent.clone().invert()).multiply(tempParent);
 joint.quaternion.premultiply(change).normalize();
 joint.updateMatrixWorld(true);
}
function solveArm(a,side,target,effector){
 const upper=a.rig[side+'Upper'],elbow=a.rig[side+'Fore'],hand=a.rig[side+'Hand'];
 const tip=effector||hand;
 if(!upper||!elbow||!tip)return false;
 upper.updateWorldMatrix(true,false);elbow.updateWorldMatrix(true,false);tip.updateWorldMatrix(true,false);
 const hip=upper.getWorldPosition(new THREE.Vector3());
 const mid=elbow.getWorldPosition(new THREE.Vector3());
 const end=tip.getWorldPosition(new THREE.Vector3());
 const upperLen=hip.distanceTo(mid),lowerLen=mid.distanceTo(end);
 const direction=target.clone().sub(hip);
 const rawDistance=direction.length();
 if(upperLen<.05||lowerLen<.04||rawDistance<.01)return false;
 const distance=clamp(rawDistance,.01,upperLen+lowerLen-.002);
 direction.normalize();
 const projection=(upperLen*upperLen-lowerLen*lowerLen+distance*distance)/(2*distance);
 const triangle=Math.sqrt(Math.max(0.000001,upperLen*upperLen-projection*projection));
 const outward=side==='right'?-1:1;
 const pole=new THREE.Vector3(outward,-.8,.25);
 pole.addScaledVector(direction,-pole.dot(direction)).normalize();
 const elbowGoal=hip.clone().addScaledVector(direction,projection).addScaledVector(pole,triangle);
 for(let k=0;k<6;k++){
  aimJoint(upper,elbow,elbowGoal,.92);
  aimJoint(elbow,tip,target,.94);
 }
 return true;
}
function palmContact(hand){
 if(!hand)return null;
 hand.updateWorldMatrix(true,true);
 const jointPoints=[];
 hand.traverse(o=>{
  if(!o.isBone||!/finger[123]$/i.test(o.name.replace(/[^a-z0-9]/gi,'')))return;
  jointPoints.push(hand.worldToLocal(o.getWorldPosition(new THREE.Vector3())));
 });
 const contact=new THREE.Object3D();
 contact.name='Hand grip socket';
 if(jointPoints.length){
  for(const point of jointPoints)contact.position.add(point);
  contact.position.multiplyScalar(.6/jointPoints.length);
 }else contact.position.set(0,.03,0);
 hand.add(contact);
 return contact;
}
function curlFingers(hand){
 if(!hand)return;
 hand.traverse(b=>{
  if(!b.isBone)return;
  const match=b.name.replace(/[^a-z0-9]/gi,'').match(/finger([0-4])([12])?$/i);
  if(match){
   const digit=Number(match[1]);
   b.rotation.x+=(digit===0?.22:.38);
  }
 });
}
function adaptOlive(model){
 model.traverse(o=>{
  if(!o.isMesh)return;
  const mats=Array.isArray(o.material)?o.material:[o.material];
  const adjusted=mats.map(mat=>{
   if(!mat||!/olive_bandit_body|olive.*body/i.test(mat.name||''))return mat;
   const clone=mat.clone();
   clone.vertexColors=false;
   clone.color.setHex(0xffffff);
   clone.emissive.setHex(0x37452f);
   clone.emissiveIntensity=.15;
   clone.needsUpdate=true;
   return clone;
  });
  o.material=Array.isArray(o.material)?adjusted:adjusted[0];
 });
}
function normalizePerson(model,height=1.82){
 model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(model);
 const size=bounds.getSize(new THREE.Vector3());
 if(size.y<.01)throw Error('Пустая модель');
 model.scale.multiplyScalar(height/size.y);
 model.updateMatrixWorld(true);
 const finalBounds=new THREE.Box3().setFromObject(model);
 const mid=finalBounds.getCenter(new THREE.Vector3());
 model.position.x-=mid.x;
 model.position.y-=finalBounds.min.y;
 model.position.z-=mid.z;
 model.updateMatrixWorld(true);
}
function solveLeg(upper,calf,foot,target){
 if(!upper||!calf||!foot)return;
 upper.updateWorldMatrix(true,false);calf.updateWorldMatrix(true,false);foot.updateWorldMatrix(true,false);
 const hip=upper.getWorldPosition(new THREE.Vector3());
 const knee=calf.getWorldPosition(new THREE.Vector3());
 const ankle=foot.getWorldPosition(new THREE.Vector3());
 const a=hip.distanceTo(knee),b=knee.distanceTo(ankle);
 if(a<.1||b<.1)return;
 const toward=target.clone().sub(hip);
 const d=clamp(toward.length(),.015,a+b-.003);
 toward.normalize();
 const projected=(a*a-b*b+d*d)/(2*d);
 const height=Math.sqrt(Math.max(.0001,a*a-projected*projected));
 const pole=new THREE.Vector3(0,0,1);
 pole.addScaledVector(toward,-pole.dot(toward)).normalize();
 const goal=hip.clone().addScaledVector(toward,projected).addScaledVector(pole,height);
 const shoeQuat=foot.getWorldQuaternion(new THREE.Quaternion());
 for(let i=0;i<4;i++){
  aimJoint(upper,calf,goal,1);
  aimJoint(calf,foot,target,1);
 }
 foot.parent.updateWorldMatrix(true,false);
 const parentQuat=foot.parent.getWorldQuaternion(new THREE.Quaternion());
 foot.quaternion.copy(parentQuat.invert().multiply(shoeQuat));
 foot.updateMatrixWorld(true);
}
function setStanding(model,rig){
 const left=rig.leftFoot,right=rig.rightFoot;
 if(!left||!right)return;
 const l=left.getWorldPosition(new THREE.Vector3());
 const r=right.getWorldPosition(new THREE.Vector3());
 model.position.y+=.055;
 model.updateMatrixWorld(true);
 l.x+=.05;l.z+=.045;
 r.x-=.05;r.z-=.04;
 solveLeg(rig.leftThigh,rig.leftCalf,left,l);
 solveLeg(rig.rightThigh,rig.rightCalf,right,r);
}
function setCrouch(model,rig){
 if(!rig.leftFoot||!rig.rightFoot)return;
 const left=rig.leftFoot.getWorldPosition(new THREE.Vector3());
 const right=rig.rightFoot.getWorldPosition(new THREE.Vector3());
 model.position.y-=.29;
 model.updateMatrixWorld(true);
 left.x+=.075;left.z+=.08;
 right.x-=.075;right.z-=.04;
 solveLeg(rig.leftThigh,rig.leftCalf,rig.leftFoot,left);
 solveLeg(rig.rightThigh,rig.rightCalf,rig.rightFoot,right);
 worldRotation(rig.spine1,AXIS_X,.17);
 worldRotation(rig.spine2,AXIS_X,.10);
 model.updateMatrixWorld(true);
 const l=rig.leftFoot.getWorldPosition(new THREE.Vector3());
 const r=rig.rightFoot.getWorldPosition(new THREE.Vector3());
 const lowest=Math.min(l.y,r.y);
 model.position.y+=.07-lowest;
 model.updateMatrixWorld(true);
}
function createWeapon(gltf,group){
 const holder=new THREE.Group();
 group.add(holder);
 const visual=gltf.scene.clone(true);
 visual.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(visual);
 const dims=box.getSize(new THREE.Vector3());
 const axis=dims.x>=dims.y&&dims.x>=dims.z?'x':dims.y>=dims.z?'y':'z';
 const longest=Math.max(dims.x,dims.y,dims.z);
 if(!Number.isFinite(longest)||longest<.01)throw Error('Размер AK неизвестен');
 visual.scale.multiplyScalar(.96/longest);
 visual.updateMatrixWorld(true);
 const center=new THREE.Box3().setFromObject(visual).getCenter(new THREE.Vector3());
 visual.position.sub(center);
 holder.add(visual);
 if(axis==='x')holder.rotation.y=-Math.PI/2+.035;
 else if(axis==='y')holder.rotation.x=Math.PI/2;
 else holder.rotation.y=.035;
 holder.position.set(0,1.30,.28);
 const point=(length,vertical)=>{
  if(axis==='x')return new THREE.Vector3(length,vertical,0);
  if(axis==='y')return new THREE.Vector3(0,length,vertical);
  return new THREE.Vector3(0,vertical,length);
 };
 const flash=new THREE.Group();
 const core=new THREE.Mesh(new THREE.SphereGeometry(.076,8,6),
  new THREE.MeshBasicMaterial({color:0xffe6a1,transparent:true,opacity:.95,depthWrite:false}));
 const glow=new THREE.Mesh(new THREE.ConeGeometry(.06,.25,6),
  new THREE.MeshBasicMaterial({color:0xff932b,transparent:true,opacity:.88,depthWrite:false}));
 glow.rotation.z=-Math.PI/2;
 flash.add(core,glow);
 flash.position.copy(point(.49,.035));
 flash.visible=false;
 holder.add(flash);
 return {holder,flash,axis,right:point(-.105,-.11),
  left:point(.17,-.04),mag:point(-.02,-.22),stock:point(-.435,-.02)};
}
function makeStage(){
 const scene=new THREE.Scene();
 scene.add(new THREE.HemisphereLight(0xe8f2ff,0x495d76,2.4));
 const light=new THREE.DirectionalLight(0xffe7ba,3.0);
 light.position.set(-3,6,5);scene.add(light);
 const edge=new THREE.DirectionalLight(0x78aeef,1.7);
 edge.position.set(3,3,-4);scene.add(edge);
 const platform=new THREE.Mesh(new THREE.CylinderGeometry(1.02,1.08,.15,40),
  new THREE.MeshStandardMaterial({color:0x364b5d,metalness:.48,roughness:.55}));
 platform.position.y=-.04;scene.add(platform);
 const disk=new THREE.Mesh(new THREE.CircleGeometry(.77,36),
  new THREE.MeshBasicMaterial({color:0x163041,transparent:true,opacity:.65,depthWrite:false}));
 disk.rotation.x=-Math.PI/2;disk.position.y=.042;scene.add(disk);
 const halo=new THREE.Mesh(new THREE.TorusGeometry(.87,.014,4,56),
  new THREE.MeshBasicMaterial({color:0x8bbacf,transparent:true,opacity:.35}));
 halo.rotation.x=-Math.PI/2;halo.position.y=.042;scene.add(halo);
 const camera=new THREE.PerspectiveCamera(38,1,.08,40);
 camera.position.set(2.15,1.95,3.6);
 camera.lookAt(0,1.06,0);
 return {scene,camera,disk,halo};
}
function makeActor(config,ct,t,weapon){
 const stage=makeStage();
 const scene=stage.scene;
 const group=new THREE.Group();
 group.position.y=.12;
 scene.add(group);
 const model=cloneSkeleton((config.team==='ct'?ct:t).scene);
 normalizePerson(model,1.82);
 group.add(model);
 if(config.team==='t')adaptOlive(model);
 const rig=bones(model);
 if(config.id==='crouch')setCrouch(model,rig);
 else if(config.id!=='jump'&&config.id!=='run')setStanding(model,rig);
 worldRotation(rig.spine1,AXIS_X,.055);
 worldRotation(rig.spine2,AXIS_X,.035);
 group.updateWorldMatrix(true,true);
 const weaponData=createWeapon(weapon,group);
 const w=weaponData.holder;
 const shoulder=(rig.rightUpper||rig.spine2);
 if(shoulder){
  const shoulderAt=shoulder.getWorldPosition(new THREE.Vector3());
  shoulderAt.add(new THREE.Vector3(.045,-.085,.07));
  const stockWorld=w.localToWorld(weaponData.stock.clone());
  w.position.add(worldOffset(group,shoulderAt.sub(stockWorld)));
 }
 w.updateWorldMatrix(true,true);
 const rightPalm=palmContact(rig.rightHand);
 const leftPalm=palmContact(rig.leftHand);
 const actor={id:config.id,stage,group,model,rig,w,gun:weaponData,
  rightPalm,leftPalm,scene,preview:document.querySelector('[data-scene="'+config.id+'"]')};
 const rightWorld=w.localToWorld(weaponData.right.clone());
 const leftWorld=w.localToWorld(weaponData.left.clone());
 const okRight=solveArm(actor,'right',rightWorld,rightPalm);
 const okLeft=solveArm(actor,'left',leftWorld,leftPalm);
 curlFingers(rig.rightHand);curlFingers(rig.leftHand);
 model.updateWorldMatrix(true,true);
 if(okRight)rig.rightHand.attach(w);
 else console.warn('No right arm grip for',config.id);
 if(!okLeft)console.warn('No left arm grip for',config.id);
 const saved=[];
 model.traverse(o=>{if(o.isBone)saved.push({bone:o,quat:o.quaternion.clone()})});
 actor.saved=saved;
 actor.basePos=model.position.clone();
 actor.baseGunPos=w.position.clone();
 actor.baseGunQuat=w.quaternion.clone();
 actor.baseGroupPos=group.position.clone();
 const prop=new THREE.Mesh(new THREE.BoxGeometry(.085,.22,.052),
  new THREE.MeshStandardMaterial({color:0x2e3434,roughness:.6,metalness:.5}));
 prop.position.set(0,.07,0);
 if(rig.leftHand)rig.leftHand.add(prop);
 prop.visible=false;
 actor.propMagazine=prop;
 if(config.id==='reload'){
  const bar=document.createElement('div');
  bar.style.cssText='position:absolute;left:12%;right:12%;bottom:11px;height:4px;background:#243644;border-radius:3px;z-index:22;overflow:hidden';
  bar.innerHTML='<div style="width:100%;height:100%;background:#f1bd69;transform-origin:left;transform:scaleX(0)"></div>';
  actor.preview.appendChild(bar);
  actor.reloadBar=bar.firstElementChild;
 }
 return actor;
}
function resetActor(a){
 for(const item of a.saved)item.bone.quaternion.copy(item.quat);
 a.model.position.copy(a.basePos);
 a.group.position.copy(a.baseGroupPos);
 a.w.position.copy(a.baseGunPos);
 a.w.quaternion.copy(a.baseGunQuat);
 a.gun.flash.visible=false;
 a.propMagazine.visible=false;
}
function flashFire(a,time,burstLength){
 const p=time%2.0;
 if(p>burstLength)return false;
 const beat=p%.155;
 const flashing=beat<.067;
 if(flashing){
  a.gun.flash.visible=true;
  const flare=1+.18*Math.sin(time*110);
  a.gun.flash.scale.setScalar(flare);
  a.w.position.z=a.baseGunPos.z-.025;
  a.w.rotation.x-=.055;
  worldRotation(a.rig.spine2,AXIS_X,-.022);
 }
 return flashing;
}
function supportHand(a,target){
 if(!a.leftPalm||!a.rig.leftHand)return;
 const point=target||a.w.localToWorld(a.gun.left.clone());
 solveArm(a,'left',point,a.leftPalm);
}
function animationUpdate(a,t){
 resetActor(a);
 const ph=t;
 if(a.id==='run'){
  const step=ph*9.2,s=Math.sin(step),other=Math.sin(step+Math.PI);
  worldRotation(a.rig.leftThigh,AXIS_X,.57*s);
  worldRotation(a.rig.rightThigh,AXIS_X,.57*other);
  worldRotation(a.rig.leftCalf,AXIS_X,.27*Math.max(0,-s));
  worldRotation(a.rig.rightCalf,AXIS_X,.27*Math.max(0,s));
  worldRotation(a.rig.spine1,AXIS_Z,.035*Math.sin(step));
  worldRotation(a.rig.rightUpper,AXIS_X,.11*other);
  a.group.position.y=a.baseGroupPos.y+.055*Math.abs(s);
  a.group.position.z=a.baseGroupPos.z+.1*Math.sin(step*.5);
 }else if(a.id==='shoot'){
  flashFire(a,ph,1.21);
 }else if(a.id==='reload'){
  const period=3.6,progress=(ph%period)/period;
  const tilt=Math.sin(Math.PI*progress)*.13;
  a.w.rotation.x+=tilt;
  let leftTarget=a.w.localToWorld(a.gun.left.clone());
  if(progress>.15&&progress<.86){
   const magazine=a.w.localToWorld(a.gun.mag.clone());
   const belt=a.model.localToWorld(new THREE.Vector3(.24,.86,.14));
   const towardBelt=smooth(.32,.44,progress)*(1-smooth(.61,.73,progress));
   leftTarget.lerp(magazine,smooth(.15,.32,progress)*(1-smooth(.75,.86,progress)));
   leftTarget.lerp(belt,towardBelt);
   a.propMagazine.visible=progress>.40&&progress<.7;
  }
  a.reloadBar.style.transform='scaleX('+progress.toFixed(3)+')';
  supportHand(a,leftTarget);
 }else if(a.id==='jump'){
  const progress=(ph%2.9)/2.9;
  const airborne=progress<.72?Math.sin(Math.PI*progress/.72):0;
  const height=Math.max(0,airborne)*.7;
  a.group.position.y=a.baseGroupPos.y+height;
  worldRotation(a.rig.leftThigh,AXIS_X,.3*airborne);
  worldRotation(a.rig.rightThigh,AXIS_X,.43*airborne);
  worldRotation(a.rig.leftCalf,AXIS_X,-.55*airborne);
  worldRotation(a.rig.rightCalf,AXIS_X,-.45*airborne);
  worldRotation(a.rig.spine1,AXIS_X,-.08*airborne);
  a.stage.disk.material.opacity=.6-.38*airborne;
 }else if(a.id==='crouch'){
  flashFire(a,ph+.25,1.08);
  a.group.position.y=a.baseGroupPos.y+.006*Math.sin(ph*3);
 }
 if(a.id!=='reload')supportHand(a);
}
function setButtons(){
 const btn=document.querySelector('#pause');
 btn.addEventListener('click',()=>{
  paused=!paused;
  btn.textContent=paused?'▶ Продолжить':'⏸ Пауза';
  btn.classList.toggle('active',paused);
 });
 const speedEl=document.querySelector('#speed');
 speedEl.addEventListener('input',()=>{
  speed=Number(speedEl.value);
  document.querySelector('#speed-value').textContent=speed.toFixed(1)+'×';
 });
 document.querySelectorAll('.motion-card .expand').forEach(button=>{
  button.addEventListener('click',()=>{
   const card=button.closest('.motion-card');
   const toOpen=focused!==card;
   if(focused){focused.classList.remove('expanded');focused.querySelector('.expand').textContent='Крупно ⤢'}
   focused=toOpen?card:null;
   if(focused){focused.classList.add('expanded');button.textContent='Закрыть ×'}
   document.body.classList.toggle('has-focus',!!focused);
  });
 });
 document.querySelector('#veil').addEventListener('click',()=>{
  if(focused){focused.classList.remove('expanded');focused.querySelector('.expand').textContent='Крупно ⤢';focused=null;document.body.classList.remove('has-focus')}
 });
 addEventListener('keydown',e=>{
  if(e.key==='Escape'&&focused){
   focused.classList.remove('expanded');
   focused.querySelector('.expand').textContent='Крупно ⤢';
   focused=null;document.body.classList.remove('has-focus');
  }
 });
 addEventListener('resize',()=>{
  canvasRenderer.setSize(innerWidth,innerHeight,false);
 });
}
function renderActor(a){
 const r=a.preview.getBoundingClientRect();
 if(r.width<1||r.height<1||r.bottom<=0||r.top>=innerHeight)return;
 const left=Math.max(0,r.left),top=Math.max(0,innerHeight-r.bottom);
 const right=Math.min(innerWidth,r.right),high=Math.min(innerHeight,innerHeight-r.top);
 if(right<=left||high<=top)return;
 canvasRenderer.setViewport(r.left,innerHeight-r.bottom,r.width,r.height);
 canvasRenderer.setScissor(left,top,right-left,high-top);
 a.stage.camera.aspect=r.width/r.height;
 a.stage.camera.updateProjectionMatrix();
 canvasRenderer.render(a.stage.scene,a.stage.camera);
}
function startLoop(){
 let lastPaint=0;
 const loop=(now)=>{
  requestAnimationFrame(loop);
  if(now-lastPaint<1000/30)return;
  const dt=lastTime?clamp((now-lastTime)/1000,0,.085):.033;
  lastTime=now;lastPaint=now;
  if(!paused)simulationTime+=dt*speed;
  if(!ready)return;
  for(const a of actors)animationUpdate(a,simulationTime);
  canvasRenderer.setScissorTest(true);
  for(const a of actors)if(!focused||focused===a.preview.closest('.motion-card'))renderActor(a);
  canvasRenderer.setScissorTest(false);
 };
 requestAnimationFrame(loop);
}
setButtons();
startLoop();
Promise.all([
 load('casting/realistic/08.glb','спецназа'),
 load('casting/masked/02.glb','террориста'),
 load('models/ak47.glb','AK-47')
]).then(([ct,t,gun])=>{
 for(const item of config){
  status.textContent='Готовлю анимацию: '+item.name+'…';
  actors.push(makeActor(item,ct,t,gun));
 }
 ready=true;status.textContent='✓ Все 5 демонстраций запущены одновременно. Нажми «Крупно», чтобы рассмотреть.';
 status.classList.add('ready');
}).catch(error=>{
 console.error('Animation lab:',error);
 status.textContent='Ошибка загрузки: '+error.message+'. Попробуй обновить страницу.';
});
