import * as THREE from 'three';

/**
 * Original controllable Block Fighter v1.0.
 * Mesh is GPU-skinned with one weight per vertex: deliberately rigid,
 * clean block segments, NO accidental T-pose and NO weapon geometry.
 * +Z is forward, +Y is up; unit scale: body height approximately 1.89 m.
 */
export const FIGHTER_VERSION='1.0.0';
export const FIGHTER_ACTIONS=['idle','walk','run','aim','shoot','reload','jump','crouch'];

const PALETTE={
  cloth:'#18395c',
  clothDark:'#122b49',
  seam:'#284d70',
  balaclava:'#101f37',
  balaclavaDetail:'#23374b',
  eyeWindow:'#987057',
  eye:'#101315',
  brows:'#1b1b22',
  armor:'#14283e',
  armorTrim:'#2b4055',
  pants:'#202631',
  pantsEdge:'#303a47',
  boot:'#141922',
  glove:'#293541',
  glovePalm:'#1b252f',
  pouch:'#273746',
  pouchFlap:'#35485b',
  buckle:'#77818d',
};
function material(name,hex){
 return new THREE.MeshStandardMaterial({
  name, color:new THREE.Color(hex),flatShading:true,roughness:.92,metalness:0,
 });
}
function makeBone(name,parent,x=0,y=0,z=0){
 const bone=new THREE.Bone();bone.name=name;bone.position.set(x,y,z);
 parent.add(bone);return bone;
}
const EULER_ORDER='XYZ';

export function createBlockFighter(options={}){
 const group=new THREE.Group();
 group.name='GameBlock Block Tactical Fighter v1.0';
 const bones={},order=[];
 function joint(name,parent,x=0,y=0,z=0){
  const b=makeBone(name,parent,x,y,z);bones[name]=b;order.push(b);return b;
 }
 const root=joint('Root',group);
 const hips=joint('Pelvis',root,0,.93,0);
 const spine=joint('Spine_01',hips,0,.11,0);
 const chest=joint('Spine_02',spine,0,.23,0);
 const neck=joint('Neck',chest,0,.245,0);
 const head=joint('Head',neck,0,.10,0);

 for(const side of ['L','R']){
  const s=side==='L'?1:-1;
  const clavicle=joint('Clavicle_'+side,chest,s*.325,.13,0);
  const upper=joint('UpperArm_'+side,clavicle,s*.073,-.035,0);
  const fore=joint('Forearm_'+side,upper,s*.018,-.31,0);
  const hand=joint('Hand_'+side,fore,0,-.27,0);
  const thigh=joint('Thigh_'+side,hips,s*.17,-.08,0);
  const calf=joint('Calf_'+side,thigh,0,-.37,0);
  const foot=joint('Foot_'+side,calf,0,-.37,0);
  joint('Toe_'+side,foot,0,-.036,.145);
  // Independent fingers are joints rather than painted detail.
  for(let i=0;i<3;i++){
   const finger=joint('Finger_'+side+'_'+i,hand,(i-1)*.047,-.085,.05);
   joint('FingerTip_'+side+'_'+i,finger,0,-.055,0);
  }
  joint('Thumb_'+side,hand,-s*.096,-.02,.064);
 }
 const socketR=joint('WeaponSocket_R',bones.Hand_R,0,-.045,.085);
 joint('WeaponSupport_L',bones.Hand_L,0,-.045,.09);
 joint('HeadLookTarget',head,0,.11,.38);

 const mats=Object.fromEntries(Object.entries(PALETTE).map(([k,v])=>[k,material(k,options[k]||v)]));
 const matList=Object.values(mats),matIds=Object.keys(mats);
 // Keep mesh-part metadata so individual armour/pouch materials may be
 // recoloured independently without rebuilding the character.
 const parts=[];
 function box(name,boneName,matName,pos,size){
  if(!bones[boneName])throw Error('Missing rig bone: '+boneName);
  parts.push({name,boneName,matName,pos,size});
 }
 box('PelvisShell','Pelvis','clothDark',[0,-.06,0],[.52,.22,.31]);
 box('WaistBelt','Pelvis','armorTrim',[0,-.137,.02],[.55,.047,.324]);
 box('TorsoLower','Spine_01','cloth',[0,.105,0],[.60,.28,.32]);
 box('TorsoUpper','Spine_02','cloth',[0,.09,0],[.65,.30,.34]);
 box('VestFront','Spine_02','armor',[0,.092,.186],[.57,.255,.045]);
 box('VestBack','Spine_02','armor',[0,.092,-.185],[.57,.245,.042]);
 box('VestPlate','Spine_02','armorTrim',[0,.122,.212],[.345,.16,.014]);
 box('PlateInset','Spine_02','armor',[0,.134,.221],[.29,.116,.005]);
 box('VestHem','Spine_02','armorTrim',[0,-.024,.193],[.575,.027,.051]);
 box('VestShoulderL','Spine_02','armorTrim',[.258,.234,.086],[.065,.073,.30]);
 box('VestShoulderR','Spine_02','armorTrim',[-.258,.234,.086],[.065,.073,.30]);
 box('VestStrapL','Spine_02','armorTrim',[.265,.10,.214],[.052,.195,.024]);
 box('VestStrapR','Spine_02','armorTrim',[-.265,.10,.214],[.052,.195,.024]);
 box('VestLatchL','Spine_02','buckle',[.26,.051,.230],[.047,.034,.012]);
 box('VestLatchR','Spine_02','buckle',[-.26,.051,.230],[.047,.034,.012]);
 box('ShirtCollar','Neck','clothDark',[0,-.04,0],[.29,.13,.285]);
 // Head + balaclava: dark navy covers everything except small eye slot.
 box('MaskedHead','Head','balaclava',[0,.085,0],[.40,.37,.35]);
 box('MaskCrown','Head','balaclavaDetail',[0,.251,.009],[.398,.053,.355]);
 box('MaskFaceBand','Head','balaclava',[0,.029,.183],[.39,.085,.015]);
 box('MaskFrontUpper','Head','balaclava',[0,.182,.18],[.40,.103,.016]);
 box('FaceEyeWindow','Head','eyeWindow',[0,.104,.183],[.276,.092,.014]);
 box('LeftEye','Head','eye',[.076,.116,.193],[.038,.026,.012]);
 box('RightEye','Head','eye',[-.076,.116,.193],[.038,.026,.012]);
 box('LeftBrow','Head','brows',[.078,.151,.195],[.082,.023,.012]);
 box('RightBrow','Head','brows',[-.078,.151,.195],[.082,.023,.012]);
 box('MaskNoseSeam','Head','balaclavaDetail',[0,.018,.194],[.085,.043,.014]);
 box('MaskSideL','Head','balaclavaDetail',[.193,.092,.025],[.013,.16,.20]);
 box('MaskSideR','Head','balaclavaDetail',[-.193,.092,.025],[.013,.16,.20]);
 for(const side of ['L','R']){
  const s=side==='L'?1:-1;
  const up='UpperArm_'+side,lo='Forearm_'+side,hand='Hand_'+side;
  const thigh='Thigh_'+side,calf='Calf_'+side,foot='Foot_'+side,toe='Toe_'+side;
  box('SleeveUpper'+side,up,'cloth',[0,-.154,0],[.255,.316,.272]);
  box('ElbowInset'+side,lo,'clothDark',[0,-.019,.015],[.217,.085,.230]);
  box('SleeveLower'+side,lo,'cloth',[0,-.142,.011],[.232,.291,.24]);
  box('WristCuff'+side,hand,'clothDark',[0,.006,0],[.224,.082,.218]);
  box('Glove'+side,hand,'glove',[0,-.054,.009],[.196,.147,.191]);
  box('PalmGrip'+side,hand,'glovePalm',[0,-.083,.101],[.136,.060,.012]);
  for(let i=0;i<3;i++){
   box('FingerSegment'+side+i,'Finger_'+side+'_'+i,'glove',[(i-1)*.004,-.026,.005],[.044,.076,.065]);
   box('FingerTip'+side+i,'FingerTip_'+side+'_'+i,'glovePalm',[0,-.024,.005],[.041,.049,.055]);
  }
  box('ThumbBlock'+side,'Thumb_'+side,'glove',[-s*.018,-.025,.004],[.058,.095,.068]);
  box('ThighPants'+side,thigh,'pants',[0,-.173,0],[.249,.366,.28]);
  box('KneeBrace'+side,calf,'pantsEdge',[0,-.012,.063],[.232,.085,.208]);
  box('ShinPants'+side,calf,'pants',[0,-.182,0],[.222,.36,.25]);
  box('BootAnkle'+side,foot,'boot',[0,-.025,.02],[.229,.145,.242]);
  box('BootToe'+side,toe,'boot',[0,-.012,.038],[.246,.100,.255]);
  box('BootToeTrim'+side,toe,'pantsEdge',[0,-.005,.154],[.219,.018,.024]);
  // Exactly one thin utility pouch per thigh, on the OUTSIDE seam.
  box('ThighPouch'+side,thigh,'pouch',[s*.172,-.162,.028],[.105,.174,.168]);
  box('PouchFlap'+side,thigh,'pouchFlap',[s*.226,-.092,.041],[.022,.055,.147]);
  box('PouchClasp'+side,thigh,'buckle',[s*.24,-.099,.044],[.019,.026,.034]);
  box('PouchStrap'+side,thigh,'armorTrim',[s*.12,-.188,.025],[.044,.037,.268]);
 }

 group.updateMatrixWorld(true);
 const positions=[],normals=[],uvs=[],indices=[],weights=[],groups=[];
 const boxGeo=new THREE.BoxGeometry(1,1,1).toNonIndexed();
 const cubePosition=boxGeo.getAttribute('position');
 const cubeNormal=boxGeo.getAttribute('normal');
 const cubeUV=boxGeo.getAttribute('uv');
 let count=0;
 const verticesByPart={};
 for(const part of parts){
  const bone=bones[part.boneName],index=order.indexOf(bone);
  const matrix=new THREE.Matrix4().copy(bone.matrixWorld);
  const local=new THREE.Matrix4().compose(
   new THREE.Vector3(...part.pos),
   new THREE.Quaternion(),
   new THREE.Vector3(...part.size)
  );
  matrix.multiply(local);
  const normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix);
  for(let i=0;i<cubePosition.count;i++){
   const p=new THREE.Vector3().fromBufferAttribute(cubePosition,i).applyMatrix4(matrix);
   const n=new THREE.Vector3().fromBufferAttribute(cubeNormal,i).applyMatrix3(normalMatrix).normalize();
   positions.push(p.x,p.y,p.z);
   normals.push(n.x,n.y,n.z);
   uvs.push(cubeUV.getX(i),cubeUV.getY(i));
   indices.push(index,0,0,0);
   weights.push(1,0,0,0);
  }
  const vertexCount=cubePosition.count;
  groups.push({start:count,count:vertexCount,material:matIds.indexOf(part.matName)});
  verticesByPart[part.name]=[count,count+vertexCount];
  count+=vertexCount;
 }
 boxGeo.dispose();
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
 geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
 for(const span of groups)geometry.addGroup(span.start,span.count,span.material);
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const mesh=new THREE.SkinnedMesh(geometry,matList);
 mesh.name='BlockFighter_SkinnedMesh';
 mesh.frustumCulled=false;
 mesh.castShadow=true;mesh.receiveShadow=true;
 group.add(mesh);
 const skeleton=new THREE.Skeleton(order);
 mesh.bind(skeleton);
 const base=Object.fromEntries(order.map(b=>[b.name,{
  q:b.quaternion.clone(),p:b.position.clone()
 }]));
 const manual=new Map();
 const ROT=(name,x=0,y=0,z=0)=>{
  const b=bones[name];if(b)b.rotation.set(x,y,z,EULER_ORDER);
 };
 const zoom=options.mode||'idle';
 let defaultMode=FIGHTER_ACTIONS.includes(zoom)?zoom:'idle';
 const setManual=(name,axis,degrees)=>{
  if(!bones[name]||!['x','y','z'].includes(axis))return false;
  let rec=manual.get(name);if(!rec){rec={x:0,y:0,z:0};manual.set(name,rec);}
  rec[axis]=THREE.MathUtils.degToRad(degrees);return true;
 };
 function update(time=0,mode=defaultMode){
  const t=Number.isFinite(time)?time:0;
  for(const b of order){
   b.position.copy(base[b.name].p);
   b.quaternion.copy(base[b.name].q);
  }
  const action=FIGHTER_ACTIONS.includes(mode)?mode:'idle';
  const breath=Math.sin(t*2.35);
  ROT('Spine_01',-.025-.014*breath,0,0);
  ROT('Spine_02',-.026+.01*breath,0,0);
  ROT('Head',.032+.018*breath,.02*Math.sin(t*.7),0);
  for(const side of ['L','R']){
   const s=side==='L'?1:-1;
   ROT('Clavicle_'+side,-.08,0,s*.03);
   ROT('UpperArm_'+side,-.22,0,s*.15);
   ROT('Forearm_'+side,-.31,0,0);
   ROT('Hand_'+side,-.05,0,0);
   ROT('Thigh_'+side,-.035,0,s*.07);
   ROT('Calf_'+side,.08,0,0);
   ROT('Foot_'+side,-.042,0,0);
   for(let i=0;i<3;i++){
    ROT('Finger_'+side+'_'+i,.18,0,0);
    ROT('FingerTip_'+side+'_'+i,.23,0,0);
   }
   ROT('Thumb_'+side,-.14,0,s*.13);
  }
  const aim=()=>{
   ROT('Spine_01',-.105+.012*breath,0,0);
   ROT('Spine_02',-.078,0,0);
   ROT('Head',.11,0,0);
   ROT('Clavicle_R',-.22,0,-.06);
   ROT('UpperArm_R',-.95,0,-.10);
   ROT('Forearm_R',-.73,0,0);
   ROT('Hand_R',-.06,0,-.08);
   ROT('Clavicle_L',-.24,0,.07);
   ROT('UpperArm_L',-1.03,0,.12);
   ROT('Forearm_L',-.91,0,.10);
   ROT('Hand_L',.18,0,.05);
   ROT('Thigh_L',-.105,0,.08);
   ROT('Thigh_R',-.025,0,-.08);
   ROT('Calf_L',.17,0,0);
   ROT('Calf_R',.13,0,0);
  };
  if(action==='walk'||action==='run'){
   const fast=action==='run',stride=t*(fast?9.5:5.2),s=Math.sin(stride);
   const amp=fast?.56:.31;
   ROT('Thigh_L',-.07+amp*s,0,.06);
   ROT('Thigh_R',-.07-amp*s,0,-.06);
   ROT('Calf_L',.13+Math.max(0,-s)*(fast?.68:.32),0,0);
   ROT('Calf_R',.13+Math.max(0,s)*(fast?.68:.32),0,0);
   ROT('UpperArm_L',-.12-amp*s*.75,0,.13);
   ROT('UpperArm_R',-.12+amp*s*.75,0,-.13);
   ROT('Forearm_L',-.42,0,0);
   ROT('Forearm_R',-.42,0,0);
   ROT('Spine_01',fast?-.14:-.055,0,.045*s);
   bones.Root.position.y=Math.abs(s)*(fast?.052:.025);
   bones.Root.position.z=.025*Math.sin(t*(fast?4.2:2.1));
  }
  if(action==='aim'||action==='shoot'||action==='reload')aim();
  if(action==='shoot'){
   const recoil=Math.exp(-((t*.9)%1)*11);
   ROT('UpperArm_R',-.95-.11*recoil,0,-.10);
   ROT('UpperArm_L',-1.03-.075*recoil,0,.12);
   ROT('Spine_02',-.078+.022*recoil,0,0);
  }
  if(action==='reload'){
   const cycle=(t%2.3)/2.3;
   const phase=Math.sin(Math.PI*Math.min(1,cycle/.78));
   ROT('UpperArm_L',-1.03+.61*phase,0,.22);
   ROT('Forearm_L',-.91-.56*phase,0,.10);
   ROT('Hand_L',.18+.32*phase,0,.05);
  }
  if(action==='jump'){
   const phase=(t%2.0)/2.0;
   bones.Root.position.y=.56*Math.max(0,Math.sin(Math.PI*phase));
   const flying=Math.max(0,Math.sin(Math.PI*phase));
   ROT('UpperArm_L',-.45-.4*flying,0,.26);
   ROT('UpperArm_R',-.45-.4*flying,0,-.26);
   ROT('Thigh_L',-.11-.37*flying,0,.13);
   ROT('Thigh_R',-.10-.49*flying,0,-.13);
   ROT('Calf_L',.12+.82*flying,0,0);
   ROT('Calf_R',.12+.72*flying,0,0);
  }
  if(action==='crouch'){
   aim();
   bones.Root.position.y=-.305;
   ROT('Thigh_L',-.89,0,.19);
   ROT('Thigh_R',-.86,0,-.19);
   ROT('Calf_L',1.24,0,0);
   ROT('Calf_R',1.26,0,0);
   ROT('Foot_L',-.32,0,0);
   ROT('Foot_R',-.32,0,0);
   ROT('Spine_01',-.19,0,0);
   ROT('Spine_02',-.17,0,0);
  }
  for(const [name,axes] of manual){
   const b=bones[name];
   if(b){
    b.rotation.x+=axes.x;
    b.rotation.y+=axes.y;
    b.rotation.z+=axes.z;
   }
  }
  group.updateMatrixWorld(true);
  return action;
 }
 update(0,defaultMode);
 return {
  root:group,mesh,bones,materials:mats,parts,verticesByPart,skeleton,
  joints:Object.keys(bones),triangles:count/3,
  get mode(){return defaultMode},
  setMode(mode){if(FIGHTER_ACTIONS.includes(mode))defaultMode=mode},
  update,setManual,
  getManual(name,axis){return THREE.MathUtils.radToDeg(manual.get(name)?.[axis]||0)},
  resetManual(){manual.clear()},
  getSocketWorld(name){return bones[name]?.getWorldPosition(new THREE.Vector3())||null},
  dispose(){
   geometry.dispose();
   for(const m of Object.values(mats))m.dispose();
   group.parent?.remove(group);
  }
 };
}
