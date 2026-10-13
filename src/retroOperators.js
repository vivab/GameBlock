import * as THREE from 'three';

// Original GameBlock 1.6-inspired operators. No downloaded skins, skeletons,
// Mixamo dependency or imported copyrighted character geometry.
// The upper/lower arm and leg pivots are owned by us: every pose is editable.
const outfits = {
  ct: { cloth: 0x344759, clothDark: 0x213344, plates: 0x1b2734,
    vest: 0x35414b, trim: 0x131e29, highlights: 0x526a7d,
    skin: 0xc08f72, lens: 0x263743, boot: 0x161d24 },
  t: { cloth: 0x74684d, clothDark: 0x504d3c, plates: 0x4a4333,
    vest: 0x665b44, trim: 0x322c24, highlights: 0x9a8963,
    skin: 0xc5926b, lens: 0x302f2a, boot: 0x2a2925 }
};
const mat = (color, roughness = 0.9) =>
  new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
function mesh(parent, geometry, material, x=0,y=0,z=0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x,y,z); m.castShadow = false; m.receiveShadow = true;
  parent.add(m); return m;
}
function block(parent,m,w,h,d,x,y,z) {
  return mesh(parent,new THREE.BoxGeometry(w,h,d),m,x,y,z);
}
function ellipsoid(parent,m,w,h,d,x,y,z) {
  const part = mesh(parent,new THREE.SphereGeometry(1,10,6),m,x,y,z);
  part.scale.set(w,h,d); return part;
}
function tapered(parent,m,r1,r2,len,x,y,z) {
  return mesh(parent,new THREE.CylinderGeometry(r1,r2,len,8,1),m,x,y,z);
}
function segment(parent,m1,m2,x,y,z,len,upper=true) {
  const joint = new THREE.Group();
  joint.position.set(x,y,z); parent.add(joint);
  tapered(joint,m1,upper?0.133:0.122,upper?0.148:0.102,len,0,-len/2,0);
  ellipsoid(joint,m2,.14,.11,.15,0,-len,0);
  return joint;
}
export function buildRetroOperator(team) {
  if (!outfits[team]) throw Error('Unknown operator team '+team);
  const colors=outfits[team];
  const m=Object.fromEntries(Object.entries(colors)
    .map(([name,color])=>[name,mat(color,name==='lens'?0.35:0.88)]));
  const root=new THREE.Group();
  root.name=team==='ct'?'GB Sentinel / Counter-Terrorist':'GB Nomad / Terrorist';
  root.scale.setScalar(.93);
  const torso=new THREE.Group(); root.add(torso);
  torso.position.y=1.11;
  // Torso: tapered uniform with armor over it, not an untextured block.
  tapered(torso,m.cloth,.31,.27,.64,0,.17,0);
  block(torso,m.vest,.64,.49,.40,0,.19,-.005);
  block(torso,m.plates,.52,.37,.12,0,.18,-.23);
  block(torso,m.plates,.50,.37,.095,0,.2,.235);
  for(const side of [-1,1]) {
    block(torso,m.trim,.09,.55,.15,side*.245,.18,-.12);
    block(torso,m.highlights,.10,.11,.18,side*.29,.40,-.045);
  }
  // Magazines, pouches and straps on the tactical vest.
  for(let i=-1;i<=1;i++) {
    block(torso,m.trim,.15,.17,.10,i*.17,-.03,-.29);
    block(torso,m.highlights,.12,.028,.10,i*.17,.03,-.35);
  }
  block(torso,m.trim,.59,.095,.39,0,-.16,.01);
  block(torso,m.plates,.21,.27,.13,-.32,.04,.26);
  block(torso,m.trim,.16,.27,.11,.33,.05,.24);
  const neck=tapered(torso,m.skin,.10,.095,.14,0,.56,0);
  const head=new THREE.Group();head.position.set(0,.68,0);torso.add(head);
  ellipsoid(head,m.skin,.205,.245,.19,0,0,0);
  if(team==='ct') {
    ellipsoid(head,m.plates,.231,.18,.23,0,.165,0);
    block(head,m.trim,.45,.07,.41,0,.105,-.07);
    ellipsoid(head,m.trim,.21,.145,.17,0,-.035,-.025);
    block(head,m.lens,.34,.105,.045,0,.038,-.19);
    for(const sign of [-1,1]) {
      block(head,m.plates,.11,.19,.20,sign*.22,-.01,.03);
      block(head,m.highlights,.065,.11,.06,sign*.237,.01,-.018);
    }
    block(head,m.trim,.085,.11,.08,0,-.104,-.165);
  } else {
    // Nomad wrap, goggles and desert scarf distinguish the T silhouette.
    ellipsoid(head,m.clothDark,.22,.16,.21,0,.135,0);
    block(head,m.clothDark,.37,.14,.06,0,-.115,-.159);
    block(head,m.lens,.36,.075,.045,0,.035,-.188);
    block(head,m.highlights,.43,.042,.23,0,.125,-.035);
    ellipsoid(torso,m.clothDark,.29,.13,.30,0,.48,0);
  }
  const arms=[],legs=[];
  for(const sign of [-1,1]) {
    const shoulder=segment(torso,m.cloth,m.plates,sign*.36,.44,0,.31);
    const elbow=segment(shoulder,m.clothDark,m.trim,0,-.31,0,.30,false);
    ellipsoid(elbow,m.trim,.108,.115,.135,0,-.31,0);
    block(shoulder,m.plates,.215,.13,.25,0,-.06,-.017);
    const glove=ellipsoid(elbow,m.trim,.125,.108,.13,0,-.32,-.023);
    arms.push({shoulder,elbow,glove,sign});
    const hip=segment(root,m.cloth,m.clothDark,sign*.165,.93,0,.43);
    const knee=segment(hip,m.clothDark,m.plates,0,-.43,0,.40,false);
    block(hip,m.plates,.245,.19,.20,0,-.38,-.09);
    block(knee,m.boot,.245,.23,.29,0,-.35,-.083);
    block(knee,m.boot,.255,.105,.385,0,-.405,-.087);
    legs.push({hip,knee,sign});
  }
  const gun=new THREE.Group();
  gun.position.set(0,1.255,-.49);
  root.add(gun);
  // Shared low-poly rifle, always aligned with hands and never floating.
  block(gun,m.trim,.145,.14,.56,0,.01,-.085);
  block(gun,m.plates,.075,.065,.39,0,.065,-.49);
  block(gun,m.clothDark,.135,.15,.26,0,.02,-.26);
  block(gun,m.highlights,.11,.12,.23,0,-.01,-.24);
  block(gun,m.plates,.11,.24,.11,0,-.16,.03);
  block(gun,m.clothDark,.12,.145,.30,0,-.005,.29);
  block(gun,m.trim,.025,.038,.31,0,.125,-.185);
  // Chest weapon harness and backpack.
  block(torso,m.clothDark,.39,.38,.18,0,.14,.31);
  block(torso,m.highlights,.35,.045,.20,0,.27,.38);
  const actor={root,torso,head,arms,legs,gun,team,mode:'retro'};
  animateRetroOperator(actor,{lastShotAt:-100},0,0,0);
  return actor;
}
export function animateRetroOperator(model,actor,time,dt,movement) {
  const speed=THREE.MathUtils.clamp(movement/3.5,0,1);
  const stride=Math.sin(time*10.5)*speed;
  const fire=actor.lastShotAt!=null&&time-actor.lastShotAt<.13;
  const crouched=!!(actor.crouch||actor.keyboardCrouch);
  model.torso.position.y=1.11 + Math.sin(time*20)*speed*.014;
  model.torso.rotation.z=stride*.025;
  model.head.rotation.y=Math.sin(time*.65)*.035;
  for(const limb of model.arms) {
    // Positive shoulder X rotates the arm forward toward the weapon.
    // Both elbows angle inward so the gloves meet the receiver/foregrip,
    // rather than floating to the sides of the actor's chest.
    limb.shoulder.rotation.set(1.07 + stride*limb.sign*.045,
      limb.sign*.07,-limb.sign*.55);
    limb.elbow.rotation.x=.32+(fire?.07:0);
    limb.elbow.rotation.z=-limb.sign*.12;
  }
  for(const limb of model.legs) {
    limb.hip.rotation.x=stride*limb.sign*.54;
    limb.knee.rotation.x=Math.max(0,-stride*limb.sign)*.36;
  }
  model.gun.rotation.x=fire?.10:0;
  model.gun.position.y=1.255+Math.sin(time*20)*speed*.014;
  if(crouched)model.head.rotation.x=.06;
  else model.head.rotation.x=0;
}
