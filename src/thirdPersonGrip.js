import * as THREE from 'three';

// Hand-ready weapon sockets for our own Block Fighter rig (+Z = forward).
// Lightweight proxy meshes deliberately remain replaceable when the player
// supplies final weapon GLBs. The fighter itself contains NO gun geometry.
export const THIRD_PERSON_GRIPS=Object.freeze({
 rifle:Object.freeze({
  root:[-.18,1.30,.28], pitch:-.015,
  right:[-.045,-.145,.06], left:[.15,-.065,.15],
  stock:[-.17,.005,-.315], muzzle:[0,.05,.60]
 }),
 pistol:Object.freeze({
  root:[-.025,1.27,.42],pitch:-.04,
  right:[-.086,-.105,-.035],left:[.084,-.095,.005],
  stock:[-.07,-.045,-.06],muzzle:[0,.05,.25]
 })
});
export const WEAPON_MOUNT_STORAGE='gameblock:third-person-weapon-editor-v1';
export const GRIP_EDITOR_STORAGE='gameblock:grip-pose-editor-v2';
export const GRIP_EDITOR_TARGETS=Object.freeze(['weapon','right','left','all']);
export const WEAPON_MOUNT_FIELDS=Object.freeze(['x','y','z','rx','ry','rz','scale']);
const defaultMount=()=>({x:0,y:0,z:0,rx:0,ry:0,rz:0,scale:1});
const cleanMount=(data={})=>{
 const result=defaultMount();
 for(const key of WEAPON_MOUNT_FIELDS){
  const v=data[key];
  if(typeof v!=='number'||!Number.isFinite(v))continue;
  const bound=key==='scale'?[.35,2.3]:key.startsWith('r')?[-180,180]:[-.85,.85];
  result[key]=THREE.MathUtils.clamp(v,bound[0],bound[1]);
 }
 return result;
};
const mats=new Map();
const geo=new THREE.BoxGeometry(1,1,1);
function mat(color){
 if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({
  color,flatShading:true,roughness:.8,metalness:.1
 }));
 return mats.get(color);
}
function block(parent,name,size,position,color){
 const mesh=new THREE.Mesh(geo,mat(color));
 mesh.name=name;
 mesh.scale.set(...size);
 mesh.position.set(...position);
 parent.add(mesh);
 return mesh;
}
export function createWeaponProxy(kind){
 if(!THIRD_PERSON_GRIPS[kind])throw Error('Unsupported proxy '+kind);
 const root=new THREE.Group();root.name=kind+' / detachable firearm';
 if(kind==='rifle'){
  block(root,'AK receiver',[.14,.12,.40],[0,.028,.045],0x262c34);
  block(root,'AK handguard wood',[.154,.113,.22],[0,.035,.295],0x72533a);
  block(root,'AK barrel',[.043,.047,.35],[0,.052,.51],0x42484e);
  block(root,'AK front sight',[.065,.095,.034],[0,.09,.595],0x242c35);
  block(root,'AK pistol grip',[.085,.22,.10],[-.012,-.135,-.015],0x57402b);
  block(root,'AK trigger guard',[.085,.028,.13],[0,-.095,.045],0x111820);
  block(root,'AK curved magazine',[.113,.215,.125],[0,-.151,.158],0x23272b).rotation.x=-.25;
  const stock=block(root,'AK stock',[.14,.12,.36],[-.12,.012,-.27],0x67462e);
  stock.rotation.y=-.16;
  block(root,'AK sight',[.065,.032,.055],[0,.107,.026],0x3b4047);
 } else {
  block(root,'Pistol slide',[.116,.093,.32],[0,.067,.08],0x222a35);
  block(root,'Pistol barrel',[.062,.063,.092],[0,.048,.215],0x49505a);
  block(root,'Pistol grip',[.106,.198,.108],[0,-.102,-.036],0x303943).rotation.x=-.16;
  block(root,'Pistol trigger guard',[.07,.027,.087],[0,-.071,.048],0x171e26);
  block(root,'Pistol sight',[.044,.038,.042],[0,.132,.196],0x606b73);
 }
 // A short-lived muzzle flash toggled by the render controller.
 const flash=new THREE.Group();
 const core=new THREE.Mesh(new THREE.SphereGeometry(kind==='rifle'?.06:.044,6,5),
  new THREE.MeshBasicMaterial({color:0xfff2b8,depthWrite:false}));
 const cone=new THREE.Mesh(new THREE.ConeGeometry(kind==='rifle'?.075:.052,.21,6),
  new THREE.MeshBasicMaterial({color:0xffa32b,transparent:true,opacity:.9,depthWrite:false}));
 cone.rotation.x=Math.PI/2;cone.position.z=.09;
 flash.add(core,cone);
 flash.position.set(...THIRD_PERSON_GRIPS[kind].muzzle);
 flash.visible=false;root.add(flash);
 return {root,flash};
}
const tmpA=new THREE.Vector3(),tmpB=new THREE.Vector3(),tmpC=new THREE.Vector3(),tmpD=new THREE.Vector3();
const tmpQuat=new THREE.Quaternion(),tmpParent=new THREE.Quaternion();
function aimJoint(joint,tip,target,fraction=1){
 if(!joint||!tip)return;
 joint.updateWorldMatrix(true,false);
 tip.updateWorldMatrix(true,false);
 joint.getWorldPosition(tmpA);tip.getWorldPosition(tmpB);
 tmpC.subVectors(tmpB,tmpA);tmpD.subVectors(target,tmpA);
 if(tmpC.lengthSq()<1e-10||tmpD.lengthSq()<1e-10)return;
 tmpQuat.setFromUnitVectors(tmpC.normalize(),tmpD.normalize());
 if(fraction<1)tmpQuat.slerp(new THREE.Quaternion(),1-fraction);
 joint.parent.getWorldQuaternion(tmpParent);
 tmpQuat.premultiply(tmpParent.clone().invert()).multiply(tmpParent);
 joint.quaternion.premultiply(tmpQuat).normalize();
 joint.updateMatrixWorld(true);
}
function armTo(fighter,side,target,contact){
 const bones=fighter.bones;
 const upper=bones['UpperArm_'+side];
 const elbow=bones['Forearm_'+side];
 const hand=bones['Hand_'+side];
 if(!upper||!elbow||!hand)return false;
 const tip=contact||hand;
 fighter.root.updateWorldMatrix(true,true);
 const shoulder=upper.getWorldPosition(new THREE.Vector3());
 const joint=elbow.getWorldPosition(new THREE.Vector3());
 const wrist=tip.getWorldPosition(new THREE.Vector3());
 const a=shoulder.distanceTo(joint),b=joint.distanceTo(wrist);
 let direction=target.clone().sub(shoulder);
 let d=direction.length();
 if(a<.02||b<.02||d<.001)return false;
 direction.divideScalar(d);
 d=Math.min(d,a+b-.001);
 const along=(a*a-b*b+d*d)/(2*d);
 const height=Math.sqrt(Math.max(0,a*a-along*along));
 const outward=new THREE.Vector3(side==='R'?-1:1,-.85,.11);
 outward.transformDirection(fighter.root.matrixWorld);
 outward.addScaledVector(direction,-outward.dot(direction));
 if(outward.lengthSq()<.0001)outward.set(1,0,0);
 outward.normalize();
 const bend=shoulder.clone().addScaledVector(direction,along).addScaledVector(outward,height);
 for(let k=0;k<9;k++){
  aimJoint(upper,elbow,bend,.86);
  aimJoint(elbow,tip,target,.93);
 }
 fighter.root.updateWorldMatrix(true,true);
 return true;
}
export function createThirdPersonLoadout(fighter,{kind='rifle'}={}){
 if(!fighter?.bones?.Hand_R||!fighter?.bones?.Hand_L)throw Error('Block Fighter rig required');
 const base=new THREE.Group();
 base.name='Third-person external weapons';
 fighter.root.add(base);
 const weapons={};
 for(const name of ['rifle','pistol']){
  weapons[name]=createWeaponProxy(name);
  const item=weapons[name];
  item.proxyParts=item.root.children.filter(part=>part!==item.flash);
  item.importHolder=new THREE.Group();
  item.importHolder.name='Swappable imported GLB / '+name;
  item.root.add(item.importHolder);
  base.add(item.root);
 }
 // Future user-provided weapon models replace ONLY render geometry.
 // The anatomical trigger, stock and support-hand sockets remain untouched.
 function setModel(name,source=null,{forwardSign=1}={}){
  const item=weapons[name];
  if(!item)throw Error('Unknown weapon model '+name);
  const holder=item.importHolder;
  holder.clear();
  if(source===null){
   for(const part of item.proxyParts)part.visible=true;
   return {imported:false};
  }
  const object=source.scene||source;
  if(!object?.isObject3D)throw Error('Expected THREE.Object3D or GLTF scene');
  if(forwardSign!==1&&forwardSign!==-1)throw Error('Forward sign must be 1 or -1');
  const model=object.clone(true);
  const staging=new THREE.Group();
  staging.add(model);
  model.updateMatrixWorld(true);
  const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  const max=Math.max(size.x,size.y,size.z);
  if(!Number.isFinite(max)||max<.0001)throw Error('Empty weapon model');
  if(size.x===max)model.rotation.y+=-Math.PI/2*forwardSign;
  else if(size.y===max)model.rotation.x+=Math.PI/2*forwardSign;
  else if(forwardSign<0)model.rotation.y+=Math.PI;
  model.updateMatrixWorld(true);
  const oriented=new THREE.Box3().setFromObject(model);
  const orientedLength=oriented.getSize(new THREE.Vector3()).z;
  const desired=name==='rifle'?.96:.34;
  model.scale.multiplyScalar(desired/Math.max(.001,orientedLength));
  model.updateMatrixWorld(true);
  const centroid=new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
  model.position.sub(centroid);
  model.position.z+=name==='rifle'?.11:.055;
  holder.add(model);
  for(const part of item.proxyParts)part.visible=false;
  return {imported:true,length:desired};
 }
 const mounts={rifle:defaultMount(),pistol:defaultMount()};
 const gripEdits={
  rifle:{right:defaultMount(),left:defaultMount(),all:defaultMount()},
  pistol:{right:defaultMount(),left:defaultMount(),all:defaultMount()}
 };
 try{
  const saved=JSON.parse(localStorage.getItem(GRIP_EDITOR_STORAGE)||'{}');
  for(const name of ['rifle','pistol'])
   for(const target of ['right','left','all'])
    if(saved?.[name]?.[target])gripEdits[name][target]=cleanMount(saved[name][target]);
 }catch{}
 function getGripEdit(name,target){
  if(!gripEdits[name]?.[target])throw Error('Unknown grip target '+name+'/'+target);
  return {...gripEdits[name][target]};
 }
 function setGripEdit(name,target,values={},persist=true){
  if(!gripEdits[name]?.[target])throw Error('Unknown grip target '+name+'/'+target);
  gripEdits[name][target]=cleanMount({...gripEdits[name][target],...values});
  if(persist)try{localStorage.setItem(GRIP_EDITOR_STORAGE,JSON.stringify(gripEdits))}catch{}
  return getGripEdit(name,target);
 }
 function resetGripEdit(name,target){return setGripEdit(name,target,defaultMount())}
 // Browser-local calibration applies to both showroom and live matches.
 // Node builds are deterministic and do not require localStorage.
 try{
  const saved=JSON.parse(localStorage.getItem(WEAPON_MOUNT_STORAGE)||'{}');
  for(const kind of Object.keys(mounts))if(saved?.[kind])mounts[kind]=cleanMount(saved[kind]);
 }catch{}
 function saveMounts(){
  try{localStorage.setItem(WEAPON_MOUNT_STORAGE,JSON.stringify(mounts))}catch{}
 }
 function getMount(name){if(!mounts[name])throw Error('Unknown mount '+name);return {...mounts[name]}}
 function setMount(name,values={},persist=true){
  if(!mounts[name])throw Error('Unknown mount '+name);
  mounts[name]=cleanMount({...mounts[name],...values});
  if(persist)saveMounts();
  return getMount(name);
 }
 function resetMount(name){
  if(!mounts[name])throw Error('Unknown mount '+name);
  mounts[name]=defaultMount();saveMounts();return getMount(name);
 }
 let selected=null;
 const palm={};
 for(const side of ['R','L']){
  const anchor=new THREE.Object3D();
  anchor.name='Gloved '+side+' palm / IK contact';
  anchor.position.set(0,-.077,.039);
  fighter.bones['Hand_'+side].add(anchor);
  palm[side]=anchor;
 }
 let lastError={right:0,left:0};
 function setKind(next){
  if(!THIRD_PERSON_GRIPS[next])throw Error('Unknown firearm '+next);
  selected=next;
  for(const [name,item] of Object.entries(weapons))item.root.visible=name===selected;
 }
 function update({kind=selected||'rifle',mode='aim',time=0,fire=false}={}){
  if(kind!==selected)setKind(kind);
  const profile=THIRD_PERSON_GRIPS[selected];
  const item=weapons[selected];
  const gun=item.root;
  const mount=mounts[selected];
  gun.position.set(profile.root[0]+mount.x,profile.root[1]+mount.y,profile.root[2]+mount.z);
  // Crouched chest is lower; follow it partially, but DON'T inherit the
  // big up-and-down jump arc or running bob from the animated Root bone.
  // Hands are re-targeted against this stable, unparented weapon every frame.
  if(mode==='crouch')gun.position.y+=fighter.bones.Root.position.y*.72;
  gun.rotation.set(
    profile.pitch+THREE.MathUtils.degToRad(mount.rx),
    THREE.MathUtils.degToRad(mount.ry),
    THREE.MathUtils.degToRad(mount.rz),'XYZ');
  gun.scale.setScalar(mount.scale);
  if(fire){
   // Short view kick, constrained so the rifle never leaves the shoulder.
   gun.rotation.x-=.065;
   gun.position.z-=.018;
  }
  gun.updateWorldMatrix(true,true);
  fighter.root.updateWorldMatrix(true,true);
  // All: move both contact points together, WITHOUT shifting the gun itself.
  // Right / Left: independent contact position and wrist angle; weapon stays put.
  const all=gripEdits[selected].all;
  const targets={};
  for(const [side,point,targetName] of [['R',profile.right,'right'],['L',profile.left,'left']]){
   const edit=gripEdits[selected][targetName];
   const offset=new THREE.Vector3(
    edit.x+all.x,edit.y+all.y,edit.z+all.z);
   const center=new THREE.Vector3(...profile.right).add(new THREE.Vector3(...profile.left)).multiplyScalar(.5);
   const p=new THREE.Vector3(...point).sub(center)
    .multiplyScalar(all.scale*edit.scale).add(center).add(offset);
   targets[side]=gun.localToWorld(p);
  }
  const right=targets.R,left=targets.L;
  const rightOk=armTo(fighter,'R',right,palm.R);
  const leftOk=armTo(fighter,'L',left,palm.L);
  for(const [side,ok] of [['R',rightOk],['L',leftOk]]){
   if(ok){
    const wrist=fighter.bones['Hand_'+side];
    // Curl fingertips onto the grip without modifying the immutable bind pose.
    for(let i=0;i<3;i++)fighter.bones['Finger_'+side+'_'+i].rotation.x+=selected==='rifle'?.45:.32;
    const edit=gripEdits[selected][side==='R'?'right':'left'];
    const together=gripEdits[selected].all;
    wrist.rotation.x+=THREE.MathUtils.degToRad(edit.rx+together.rx);
    wrist.rotation.y+=THREE.MathUtils.degToRad(edit.ry+together.ry);
    wrist.rotation.z+=(side==='L'?-.025:.025)+THREE.MathUtils.degToRad(edit.rz+together.rz);
   }
  }
  fighter.root.updateWorldMatrix(true,true);
  lastError={
   right:palm.R.getWorldPosition(new THREE.Vector3()).distanceTo(right),
   left:palm.L.getWorldPosition(new THREE.Vector3()).distanceTo(left)
  };
  item.flash.visible=!!fire;
  if(fire)item.flash.scale.setScalar(1+.13*Math.sin(time*130));
  return {...lastError};
 }
 setKind(kind);
 return {root:base,palm,weapons,setKind,setModel,getMount,setMount,resetMount,getGripEdit,setGripEdit,resetGripEdit,update,
  get kind(){return selected},
  get gripErrors(){return {...lastError}}};
}
