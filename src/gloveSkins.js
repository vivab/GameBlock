import * as THREE from 'three';

// Viewmodel cosmetic slots, independent from weapons, player team and pose.
// Textures can later be assigned to the "glove" material without changing
// the animated fingers or the FPS weapon sockets.
export const GLOVE_PRESETS=Object.freeze({
 midnight:Object.freeze({name:'Ночной спецназ',glove:0x202936,fingers:0x2a3544,palm:0x323e50,trim:0x111d2a}),
 charcoal:Object.freeze({name:'Чёрные тактические',glove:0x161b20,fingers:0x20252b,palm:0x303842,trim:0x090d12}),
 olive:Object.freeze({name:'Оливковые',glove:0x464f35,fingers:0x586345,palm:0x747c5a,trim:0x2a3324}),
 crimson:Object.freeze({name:'Красные',glove:0x672735,fingers:0x873b4c,palm:0xa85464,trim:0x35151d}),
 sand:Object.freeze({name:'Песочные',glove:0x977556,fingers:0xa88964,palm:0xc6a583,trim:0x554636})
});
export const SLEEVE_MODES=Object.freeze(['uniform','bare']);
const DEFAULT='midnight';
const toMat=(color,name)=>new THREE.MeshStandardMaterial({
 name, color,roughness:.85,metalness:0,flatShading:true
});

function partCategory(mesh){
 if(mesh.userData.glovePart)return mesh.userData.glovePart;
 const color=mesh.material?.color?.getHex();
 // Kept for older GameBlock hands created before the tagged slots.
 const mapping={
  0x272e34:'glove',0x343c43:'fingers',0x48525c:'palm',
  0x151d24:'trim',0x354c60:'sleeve',0x756a50:'sleeve',
  0xc48c68:'skin',
 };
 return mapping[color]||null;
}
export function recolorModularHand(root,{
 preset=DEFAULT,sleeveMode='uniform',team='ct',skinTone=0xba896b
}={}){
 if(!GLOVE_PRESETS[preset])throw Error('Unknown glove skin '+preset);
 if(!SLEEVE_MODES.includes(sleeveMode))throw Error('Unknown sleeve mode '+sleeveMode);
 const colors=GLOVE_PRESETS[preset];
 const palette={
  glove:colors.glove,fingers:colors.fingers,palm:colors.palm,trim:colors.trim,
  sleeve:sleeveMode==='bare'?skinTone:(team==='t'?0x575b47:0x193759),
  skin:skinTone
 };
 const materials={};
 let count=0;
 root.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const part=partCategory(mesh);
  if(!part||!(part in palette))return;
  if(!materials[part])materials[part]=toMat(palette[part],'glove-skin:'+preset+':'+part);
  mesh.material=materials[part];
  mesh.userData.glovePart=part;
  count++;
 });
 root.userData.modularGlove={preset,sleeveMode,team,skinTone,materials};
 return {preset,sleeveMode,parts:count};
}
export function updateModularGlove(root,opts={}){
 const current=root.userData.modularGlove||{};
 const old=current.materials||{};
 const result=recolorModularHand(root,{...current,...opts});
 // Dispose old owned materials only. Keep shared retroHand originals alive.
 for(const material of Object.values(old))material.dispose();
 return result;
}
export function listGlovePresets(){
 return Object.entries(GLOVE_PRESETS).map(([id,spec])=>({id,name:spec.name}));
}
