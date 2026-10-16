import * as THREE from 'three';
import {createStaticSwatOperator} from './counterFlameSwat.js';

// Twenty original CT loadouts. V7-01 is the upgraded Urban SWAT with rebuilt shoulders. They share one
// downloaded base body GLB; each has its own palette, geometry and accessories.
// No paid assets, no imported CS characters, no weapon held in either hand.
const v = (name, colors, helmet, armor, face, magazines, pack, detail) =>
  Object.freeze({name, ...colors, helmet, armor, face, magazines, pack, detail});
const C = (cloth, vest, helmet, trousers, trim, mask, boots, pads) =>
  ({cloth, vest, helmetColor:helmet, trousers, trim, maskColor:mask, boots, pads});
export const SWAT_V6_VARIANTS = Object.freeze([
  v('Классический штурм', C(0x6c7863,0x424f40,0x424b3c,0x646f5c,0x30372f,0x202424,0x493c31,0x424b42), 'classic','plate','balaclava',3,false,'straps'),
  v('Ночной рейд', C(0x444b4b,0x272d2e,0x373f40,0x3f4748,0x1d2224,0x171b1e,0x313334,0x2c3234), 'highcut','heavy','goggles',4,true,'radio'),
  v('Лесной дозор', C(0x56694b,0x69704f,0x4e5840,0x586449,0x353e30,0x292d25,0x534d39,0x4e5840), 'field','rig','scarf',3,false,'shoulder'),
  v('Пустынная группа', C(0x9c967c,0x7b7459,0x8c8062,0x8f886d,0x443f33,0x34312a,0x756249,0x666349), 'classic','rig','wrap',4,true,'thigh'),
  v('Тяжёлый заслон', C(0x626d6b,0x353d3c,0x40494b,0x596565,0x1f2729,0x151b1e,0x363a37,0x343d3c), 'full','heavy','respirator',4,true,'reinforced'),
  v('Городской спецназ', C(0x59656b,0x313b42,0x45515b,0x53606a,0x222931,0x1d252c,0x323337,0x3b4852), 'highcut','plate','balaclava',3,false,'radio'),
  v('Северный патруль', C(0x7e8580,0x525952,0x585f61,0x707974,0x343c3a,0x282e32,0x4e4b43,0x58605b), 'field','rig','wrap',3,true,'straps'),
  v('Чёрный отряд', C(0x34383a,0x1c2123,0x30373a,0x33383a,0x111619,0x101416,0x272b2b,0x1c2529), 'full','heavy','goggles',4,false,'reinforced'),
  v('Горный стрелок', C(0x777666,0x5d634b,0x676957,0x6c705a,0x34382e,0x292b25,0x5f5544,0x616553), 'field','light','scarf',2,true,'thigh'),
  v('Сапёрный штурм', C(0x687078,0x383e41,0x465058,0x59616a,0x242b31,0x1e2427,0x434039,0x41494b), 'full','plate','respirator',3,true,'radio'),
  v('Зелёный берет', C(0x596949,0x4d543b,0x394336,0x576346,0x30392b,0x252924,0x4d493a,0x3c4535), 'ranger','rig','balaclava',3,false,'shoulder'),
  v('Антитеррор 90-х', C(0x52616b,0x252e37,0x354451,0x4f6069,0x182530,0x151e24,0x353538,0x2c3840), 'classic','plate','goggles',4,false,'straps'),
  v('Рекон 6', C(0x787e6e,0x565d4b,0x646d56,0x717a65,0x373c34,0x292d29,0x554f3f,0x666956), 'highcut','light','wrap',2,false,'thigh'),
  v('Теневой дозор', C(0x4e5359,0x2c3036,0x343940,0x484c53,0x1b2028,0x111821,0x303134,0x3a4044), 'ranger','plate','balaclava',3,true,'radio'),
  v('Бурый волк', C(0x827761,0x5c5245,0x5a5446,0x786b54,0x39322c,0x292522,0x544433,0x5f5948), 'field','rig','scarf',4,true,'shoulder'),
  v('Морской отряд', C(0x526e71,0x334b50,0x405c64,0x4b6269,0x20343c,0x18272e,0x343b3c,0x3a5056), 'highcut','heavy','respirator',3,false,'reinforced'),
  v('Разведка / Сухой', C(0x878c72,0x62694e,0x727358,0x7e8065,0x3c412f,0x272c25,0x615540,0x585d47), 'ranger','light','wrap',2,false,'straps'),
  v('Штурмовой серый', C(0x70706c,0x474845,0x50534d,0x666863,0x292b29,0x232526,0x45413b,0x484c48), 'classic','heavy','goggles',4,true,'thigh'),
  v('Пограничный', C(0x667759,0x445a43,0x4d624b,0x607150,0x253c30,0x202b28,0x494638,0x455844), 'full','plate','scarf',3,true,'radio'),
  v('Ветеран 1.6', C(0x676f60,0x3b4340,0x4d5750,0x626b60,0x262d2e,0x1b2225,0x453d33,0x515952), 'classic','rig','balaclava',3,false,'reinforced'),
].map((preset,index)=>Object.freeze({...preset, index, id:index===5?'V7-01':'V6-'+String(index+1).padStart(2,'0')})));

export const SWAT_V6_KEY = 'gameblock:swat-v6-variant';
export function safeVariantIndex(index) {
  return Number.isInteger(index) && index >= 0 && index < SWAT_V6_VARIANTS.length ? index : 0;
}
export function loadSwatSelection(storage = typeof localStorage === 'undefined' ? null : localStorage) {
  try {
    const saved=storage?.getItem(SWAT_V6_KEY);
    if(saved===null||saved===undefined||saved==='')return 5; // V7 Urban default.
    return safeVariantIndex(Number(saved));
  } catch { return 5; }
}
export function saveSwatSelection(index, storage = typeof localStorage === 'undefined' ? null : localStorage) {
  const safe = safeVariantIndex(index);
  try { storage?.setItem(SWAT_V6_KEY, String(safe)); } catch {}
  return safe;
}
const paletteColor = (hex) => new THREE.Color(hex);
function mat(hex) {
  return new THREE.MeshStandardMaterial({
    color:hex, roughness:.99, metalness:0, flatShading:true,
  });
}
function part(parent,name,geometry,m,x=0,y=0,z=0,rotation=0) {
  const part = new THREE.Mesh(geometry,m);
  part.name = name;
  part.position.set(x,y,z);
  part.rotation.z = rotation;
  part.receiveShadow = true;
  parent.add(part);
  return part;
}
function cube(parent,name,dimensions,material,x,y,z,rot=0) {
  return part(parent,name,new THREE.BoxGeometry(...dimensions),material,x,y,z,rot);
}
function strap(parent,name,a,b,width,depth,material) {
  const center=new THREE.Vector3().addVectors(new THREE.Vector3(...a),new THREE.Vector3(...b)).multiplyScalar(.5);
  const length=new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b));
  const result=cube(parent,name,[width,length,depth],material,center.x,center.y,center.z);
  result.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),
    new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize());
  return result;
}
function taperedPlate(parent,name,center,w,h,d,material,taper=.07) {
  const x=w/2,y=h/2,z=d/2;
  const v=[
    [-x+taper,-y,-z], [x-taper,-y,-z], [x,y,-z],[-x,y,-z],
    [-x+taper,-y,z], [x-taper,-y,z], [x,y,z],[-x,y,z]
  ];
  const faces=[0,1,2,0,2,3,5,4,7,5,7,6,4,0,3,4,3,7,1,5,6,1,6,2,3,2,6,3,6,7,4,5,1,4,1,0];
  const arr=[];
  for(const i of faces)arr.push(...v[i]);
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));
  geom.computeVertexNormals();
  return part(parent,name,geom,material,...center);
}

// Move local body vertices (not whole objects) to harden the rounded shoulders.
function remodelBody(geometry,index) {
  const pos=geometry.getAttribute('position');
  const style=SWAT_V6_VARIANTS[index];
  // V7 asset already has reconstructed shoulder sleeves; only micro-taper here.
  const pull=style.armor==='heavy'?.009:style.armor==='light'?.018:.013;
  const slender=style.armor==='light'?.978:style.armor==='heavy'?1.016:1.0;
  for(let i=0;i<pos.count;i++){
    let x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const shoulder=Math.max(0,1-Math.abs(y-1.54)/.17);
    const outer=Math.min(1,Math.max(0,(Math.abs(x)-.18)/.18));
    x-=Math.sign(x)*shoulder*outer*pull;
    y-=shoulder*outer*.018;
    if(y>1.14&&y<1.58)x*=slender;
    // Taper the chest, rather than leaving the spherical bulky silhouette.
    if(y>1.20&&y<1.54&&Math.abs(x)<.29&&z<-.10)z+=.012;
    pos.setXYZ(i,x,y,z);
  }
  pos.needsUpdate=true;
  geometry.computeVertexNormals();
}
function recolorBody(geometry,variant) {
  const c=Object.fromEntries(Object.entries({
    cloth:variant.cloth, vest:variant.vest, helmet:variant.helmetColor,
    trousers:variant.trousers, trim:variant.trim, mask:variant.maskColor,
    boots:variant.boots, pads:variant.pads, skin:0x957a67,
    glass:0x1a272a
  }).map(([key,hex])=>[key,paletteColor(hex)]));
  const position=geometry.getAttribute('position');
  const colors=new Float32Array(position.count*3);
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i),ax=Math.abs(x);
    let tag='cloth';
    if(y<.24)tag='boots';
    else if(y<1.05)tag='trousers';
    else if(y<1.20)tag='trim';
    else if(y<1.61) {
      if(z<-.34&&ax<.24)tag='vest';
      else if(z> .10&&ax<.27)tag='vest';
      else if(ax<.26&&z<-.13)tag='vest';
      else if(ax>.32&&z<-.31)tag='mask'; // Gloves in the raised weapon-ready pose.
    } else if(y<1.835) {
      if(z<-.11&&y>1.765&&y<1.83&&ax<.102)tag='skin';
      else tag='mask';
    } else {
      tag=(z<-.12&&y<1.918)?'glass':'helmet';
    }
    if(y>.51&&y<.66&&z<-.075&&ax>.07)tag='pads';
    const base=c[tag];
    const weather=Math.sin(x*54+y*27+z*31)*Math.sin(z*63-y*16);
    const shade=.87+weather*.075+Math.sin(y*87+z*35)*.035;
    colors[i*3]=Math.max(0,base.r*shade);
    colors[i*3+1]=Math.max(0,base.g*shade);
    colors[i*3+2]=Math.max(0,base.b*shade);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
}

// Shared rigid details have deliberately hard edges and no smoothing.
function outfitParts(visual,v) {
  const unit={cloth:mat(v.cloth),vest:mat(v.vest),helm:mat(v.helmetColor),
    trouser:mat(v.trousers),trim:mat(v.trim),mask:mat(v.maskColor),
    boots:mat(v.boots),pads:mat(v.pads),black:mat(0x1b2020),
    metal:mat(0x555b53),stitch:mat(0x938e79)};
  const armour=v.armor==='heavy'?{w:.49,h:.39,d:.10}:v.armor==='light'?
    {w:.38,h:.25,d:.055}:v.armor==='rig'?{w:.44,h:.29,d:.064}:{w:.44,h:.32,d:.082};
  taperedPlate(visual,'V6 angular chest armour',[0,1.426,-.215],
    armour.w,armour.h,armour.d,unit.vest,.056);
  if(v.armor==='heavy') {
    taperedPlate(visual,'V6 reinforcing upper plate',[0,1.564,-.226],.37,.075,.058,unit.trim,.03);
    for(const s of [-1,1])cube(visual,'V6 side plate',[.070,.25,.18],unit.vest,s*.25,1.38,-.042);
  } else if(v.armor==='light') {
    for(const s of [-1,1])strap(visual,'V6 slim shoulder belt',[s*.19,1.57,-.12],
       [s*.20,1.30,-.23],.030,.020,unit.trim);
  }
  for(const s of [-1,1]) {
    strap(visual,'V6 webbing shoulder strap',[s*.187,1.59,-.09],
      [s*.185,1.425,-.268],.038,.025,unit.trim);
    cube(visual,'V7 fitted upper arm patch',[.018,.067,.070],unit.cloth,s*.277,1.489,-.084,s*.05);
    cube(visual,'V7 elbow cloth pad',[.067,.058,.020],unit.pads,s*.31,1.31,-.199);
  }
  const n=v.magazines;
  for(let j=0;j<n;j++){
    const x=(j-(n-1)/2)*(.44/n);
    const y=(j%2===0?1.295:1.30);
    cube(visual,'V6 magazine pouch',[.44/n-.015,.145,.075],
      j%3===1?unit.trim:unit.vest,x,y,-.337);
    cube(visual,'V6 mag flap',[.44/n-.02,.033,.026],unit.trim,x,y+.059,-.391);
    cube(visual,'V6 buckle',[.026,.031,.022],unit.metal,x,y+.041,-.404);
  }
  for(let row=0;row<3;row++) {
    for(let col=0;col<4;col++){
      cube(visual,'V6 molle loop',[.072,.010,.018],unit.trim,
        (col-1.5)*.102,1.482-row*.073,-.281);
    }
  }
  // Angular helmet fronts distinguish the classic/highcut/field/full/ranger profiles.
  const h=v.helmet;
  const brim=h==='field'?.075:h==='ranger'?.092:h==='full'?.046:.052;
  cube(visual,'V6 helmet hard brow',[.244,.030,brim],unit.helm,0,1.864,-.121);
  if(h==='ranger') {
    cube(visual,'V6 ranger brim',[.288,.019,.10],unit.helm,0,1.904,-.135);
  } else if(h==='full') {
    for(const s of [-1,1]) {
      cube(visual,'V6 reinforced cheek guard',[.052,.137,.078],unit.helm,s*.124,1.737,-.073);
    }
  } else if(h==='highcut') {
    for(const s of [-1,1]) {
      cube(visual,'V6 open helmet rail',[.020,.040,.132],unit.trim,s*.143,1.846,-.002);
      cube(visual,'V6 helmet clip',[.025,.022,.039],unit.metal,s*.155,1.86,-.07);
    }
  } else if(h==='field') {
    cube(visual,'V6 field top ridge',[.110,.017,.21],unit.trim,0,1.933,.004);
  }
  if(h==='classic')cube(visual,'V6 front NVG mount',[.056,.062,.030],unit.trim,0,1.892,-.132);
  if(v.face==='respirator'){
    taperedPlate(visual,'V6 angular respirator',[0,1.73,-.143],.132,.125,.056,unit.mask,.029);
    cube(visual,'V6 filter',[.082,.045,.037],unit.black,0,1.696,-.187);
  }else if(v.face==='goggles'){
    cube(visual,'V6 tactical visor frame',[.225,.057,.029],unit.trim,0,1.813,-.143);
    cube(visual,'V6 smoked visor',[.182,.035,.015],unit.black,0,1.814,-.164);
  }else if(v.face==='scarf'){
    taperedPlate(visual,'V6 lower face wrap',[0,1.698,-.131],.213,.090,.040,unit.trouser,.042);
    cube(visual,'V6 wrap edge',[.180,.016,.018],unit.trim,0,1.655,-.141);
  }else if(v.face==='wrap'){
    cube(visual,'V6 low face veil',[.178,.093,.033],unit.mask,0,1.714,-.151);
    for(const s of [-1,1])strap(visual,'V6 face wrap side',[s*.09,1.74,-.149],
      [s*.137,1.703,-.032],.018,.014,unit.trim);
  }else{
    cube(visual,'V6 mask seam',[.023,.107,.012],unit.trim,0,1.726,-.158);
  }
  for(const s of [-1,1]) {
    const kneeY=s===1?.56:.63;
    taperedPlate(visual,'V6 angular kneecap',[s*.205,kneeY,-.111],.136,.152,.034,
      unit.pads,.025);
    for(const delta of [-.075,.075]) {
      cube(visual,'V6 knee mount',[.014,.027,.035],unit.trim,s*.205+delta,kneeY,-.136);
    }
    // Contrast boot laces and boot cuff
    cube(visual,'V6 boot cuff',[.158,.047,.104],unit.boots,s*.25,.15,.034);
  }
  if(v.index===5){
    for(const side of [-1,1]){
      strap(visual,'V7 Urban chest restraint',
        [side*.162,1.592,-.166],[side*.102,1.297,-.334],
        .014,.011,unit.trim);
      cube(visual,'V7 Urban elbow seam',[.012,.042,.034],unit.stitch,
        side*.305,1.322,-.212);
    }
    cube(visual,'V7 Urban flat radio pouch',[.065,.125,.047],unit.black,
      -.245,1.506,-.055);
  }
  if(v.pack){
    taperedPlate(visual,'V6 square radio pack',[-.074,1.402,.24],
      .255,.32,.11,unit.vest,.027);
    strap(visual,'V6 pack strap',[-.145,1.61,.154],
      [-.152,1.275,.215],.032,.022,unit.trim);
  }
  if(v.detail==='radio') {
    cube(visual,'V6 radio case',[.072,.118,.079],unit.black,-.245,1.515,-.034);
    strap(visual,'V6 radio antenna',[-.249,1.565,-.015],
       [-.270,1.74,-.007],.011,.011,unit.black);
  }else if(v.detail==='thigh'){
    cube(visual,'V6 thigh tactical pouch',[.079,.165,.121],unit.vest,.301,.787,-.07);
    for(const y of [.72,.85])cube(visual,'V6 holster strap',[.145,.018,.024],unit.trim,.31,y,-.115);
  }else if(v.detail==='reinforced'){
    cube(visual,'V6 collar armour',[.208,.062,.070],unit.vest,0,1.616,-.108);
    for(const s of [-1,1])cube(visual,'V6 cuff armour',[.072,.039,.042],unit.trim,s*.20,1.35,-.432);
  }else if(v.detail==='shoulder'){
    for(const s of [-1,1])taperedPlate(visual,'V6 insignia shoulder patch',
      [s*.307,1.508,-.121],.080,.048,.020,unit.trim,.014);
  }else{
    for(const s of [-1,1])strap(visual,'V6 diagonal harness',[s*.165,1.56,-.19],
      [s*.116,1.23,-.313],.020,.016,unit.trim);
  }
  return Object.values(unit);
}

export function createSwatV6Operator(gltf,index=0) {
  const i=safeVariantIndex(index);
  const basic=createStaticSwatOperator(gltf);
  if(!basic)return null;
  const v=SWAT_V6_VARIANTS[i];
  basic.root.name='Counter Flame '+v.id+' / '+v.name;
  basic.version=i===5?7:6;
  basic.variant=i;
  basic.mode='static-swat';
  const materials=[];
  basic.visual.traverse(child=>{
    if(!child.isMesh)return;
    child.geometry=child.geometry.clone();
    remodelBody(child.geometry,i);
    recolorBody(child.geometry,v);
    child.material=new THREE.MeshStandardMaterial({
      color:0xffffff,vertexColors:true,roughness:1,metalness:0,flatShading:true,
    });
    materials.push(child.material);
  });
  materials.push(...outfitParts(basic.visual,v));
  basic.release=()=>{
    basic.visual.traverse(child=>{
      if(child.isMesh){child.geometry.dispose();child.material.dispose();}
    });
  };
  return basic;
}
