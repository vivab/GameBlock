import * as THREE from 'three';

// Sandstone Crossing: original compact three-lane tactical arena inspired by
// classic desert FPS maps. All visible solid walls are sourced from the same
// ARENA_WALLS used for ballistics, AI pathfinding and player collision.
const palette={
  sand:0xc4ac79, plaster:0xd2b88a, limestone:0xb1986b, wall:0xcdb387,
  dark:0x665b4c, brick:0x9c8265, blue:0x3a6375, red:0xa6533f
};
const material=(color,roughness=.98)=>new THREE.MeshStandardMaterial({
  color,roughness,flatShading:true
});
const wallsM=[material(palette.wall),material(palette.limestone),
  material(0xd7c49d),material(0xba9970)];
const mortar=material(palette.dark), blue=material(palette.blue),
  red=material(palette.red),wood=material(0x78553a),metal=material(0x4c5353);
const shape=(parent,g,m,x,y,z)=>{
  const obj=new THREE.Mesh(g,m);obj.position.set(x,y,z);
  obj.receiveShadow=true;parent.add(obj);return obj;
};
const box=(parent,m,w,h,d,x,y,z)=>shape(parent,
  new THREE.BoxGeometry(w,h,d),m,x,y,z);
function patternTexture(){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const c=canvas.getContext('2d');
  c.fillStyle='#bfa977';c.fillRect(0,0,256,256);
  let seed=6839;
  const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
  for(let i=0;i<3000;i++){
    const v=rnd()*.15;
    c.fillStyle=rnd()>.45?'rgba(255,240,204,'+v+')':'rgba(86,62,38,'+v+')';
    c.fillRect(rnd()*256,rnd()*256,1+rnd()*4,1+rnd()*4);
  }
  c.strokeStyle='rgba(91,74,54,.14)';c.lineWidth=2;
  for(let x=0;x<=256;x+=64){
    c.beginPath();c.moveTo(x,0);c.lineTo(x,256);c.stroke();
  }
  for(let y=0;y<=256;y+=64){
    c.beginPath();c.moveTo(0,y);c.lineTo(256,y);c.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(12,12);
  texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}
function signTexture(letter,color){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const c=canvas.getContext('2d');
  c.fillStyle=color;c.fillRect(0,0,256,256);
  c.strokeStyle='#e2c8a5';c.lineWidth=10;c.strokeRect(13,13,230,230);
  c.fillStyle='#fff3d3';c.textAlign='center';c.textBaseline='middle';
  c.font='bold 180px sans-serif';c.fillText(letter,128,137);
  const tx=new THREE.CanvasTexture(canvas);tx.colorSpace=THREE.SRGBColorSpace;return tx;
}
function tower(scene,x,z,color) {
  box(scene,wallsM[1],2.25,4.8,2.25,x,2.4,z);
  box(scene,wallsM[2],2.7,.23,2.7,x,4.76,z);
  box(scene,mortar,1.0,1.24,.09,x,2.96,z<0?z+1.175:z-1.175);
  for(const dx of [-.86,.86])
    box(scene,color,.16,2.7,.17,x+dx,2.0,z);
}
function archedGate(scene,x,z){
  // Arch and lintel stand just beyond the playable map, without invisible
  // collision walls in the middle of a road.
  box(scene,wallsM[1],.75,4.9,1.15,x-2.1,2.45,z);
  box(scene,wallsM[1],.75,4.9,1.15,x+2.1,2.45,z);
  box(scene,wallsM[2],5.2,.72,1.15,x,4.55,z);
  const top=shape(scene,new THREE.TorusGeometry(2.0,.20,8,18,Math.PI),
    wallsM[3],x,3.55,z+.62);
  top.rotation.z=Math.PI;
  box(scene,mortar,3.15,3.2,.08,x,1.6,z);
  box(scene,wood,1.45,3.0,.13,x-.77,1.5,z+.06);
  box(scene,wood,1.45,3.0,.13,x+.77,1.5,z+.06);
}
function flag(scene,x,z,color){
  box(scene,metal,.07,3.45,.07,x,1.73,z);
  box(scene,color,1.20,.68,.085,x+.58,2.87,z);
  box(scene,mortar,.22,.1,.13,x,3.47,z);
}
function marketAwning(scene,x,z){
  for(const dx of [-1.3,1.3])
    for(const dz of [-1.0,1.0])
      box(scene,wood,.12,2.7,.12,x+dx,1.35,z+dz);
  const awning=box(scene,material(0x9c6546),2.9,.07,2.3,x,2.75,z);
  awning.rotation.z=.035;
  for(let i=-2;i<=2;i++)
    box(scene,material(i%2?0xa27c59:0xe0c798),.54,.04,2.28,
      x+i*.56,2.81,z);
}
function borderBackdrop(scene) {
  const far=material(0x9d9179),near=material(0xbca179);
  // Silhouette buildings outside the arena add density but zero gameplay cost.
  for(let i=0;i<13;i++){
    const x=-33+i*5.5;
    const h=5+(i*7%4);
    box(scene,i%3?near:far,4.6,h,4.5,x,h/2,-31);
    box(scene,far,4.6,h-.5,4.5,x,(h-.5)/2,31);
  }
  for(let i=0;i<9;i++){
    const z=-25+i*6;
    const h=4.5+i%3;
    box(scene,i%2?near:far,5.2,h,4.7,-31,h/2,z);
    box(scene,i%2?far:near,5.2,h+1,4.7,31,(h+1)/2,z);
  }
}
export function buildSandstoneArena(scene,ARENA_WALLS,TEAMS) {
  scene.background=new THREE.Color(0x9fc0cb);
  scene.fog=new THREE.FogExp2(0xb2bdaf,.010);
  scene.add(new THREE.HemisphereLight(0xfff7dd,0x81725b,2.1));
  const sun=new THREE.DirectionalLight(0xffedc2,2.25);
  sun.position.set(-17,28,12);scene.add(sun);
  const groundMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1});
  const texture=patternTexture();
  if(texture)groundMaterial.map=texture;
  const ground=shape(scene,new THREE.PlaneGeometry(64,64),
    groundMaterial,0,-.015,0);ground.rotation.x=-Math.PI/2;
  // Narrow stone walkways lead toward the center from both spawn directions.
  const road=material(0xb39d75);
  for(const x of [-15,15]){
    const strip=box(scene,road,3,.025,35,x,.008,0);
    strip.material.depthWrite=true;
  }
  const center=box(scene,material(0xb29d78),31,.021,3,0,.008,0);
  // Distinct masonry cover at every simulation wall; no mismatch in hitboxes.
  ARENA_WALLS.forEach((wall,index)=>{
    const exterior=index<4;
    const m=exterior?wallsM[index%4]:wallsM[(index+2)%4];
    box(scene,m,wall.w,wall.h,wall.d,wall.x,wall.h/2,wall.z);
    const thick=Math.min(wall.w,wall.d);
    if(!exterior){
      box(scene,wallsM[2],wall.w+.22,.17,wall.d+.22,wall.x,wall.h+.07,wall.z);
      // Roof crenellation placed INSIDE the collision footprint.
      if(thick>1.5){
        const front=wall.z-wall.d/2+.04;
        for(let x=wall.x-wall.w/2+.55;x<wall.x+wall.w/2-.3;x+=.85)
          box(scene,wallsM[1],.35,.25,.25,x,wall.h+.26,front+.17);
      }
      const face=wall.z + (wall.z<0?wall.d/2+.055:-wall.d/2-.055);
      if(wall.w>2.5)
        box(scene,mortar,.50,.62,.035,wall.x,wall.h*.68,face);
    }else{
      // Raised battlements along the exterior map wall.
      if(wall.w>wall.d)for(let x=-22;x<=22;x+=3.5)
        box(scene,wallsM[2],1.7,.38,.7,x,wall.h+.19,wall.z);
      if(wall.d>wall.w)for(let z=-22;z<=22;z+=3.5)
        box(scene,wallsM[2],.7,.38,1.7,wall.x,wall.h+.19,z);
    }
  });
  borderBackdrop(scene);
  tower(scene,-21,-21,red);tower(scene,21,21,blue);
  archedGate(scene,0,-28.5);archedGate(scene,0,28.5);
  marketAwning(scene,-19,0);
  marketAwning(scene,19,-1);
  flag(scene,-10,-18,red);flag(scene,10,18,blue);
  const markers=[{x:-17,z:-15,letter:'A',color:'#a44d3c'},
    {x:17,z:15,letter:'B',color:'#476d76'}];
  for(const point of markers){
    const sprite=new THREE.Mesh(new THREE.PlaneGeometry(2.4,2.4),
      new THREE.MeshBasicMaterial({map:signTexture(point.letter,point.color),
        transparent:true,depthWrite:false,side:THREE.DoubleSide}));
    sprite.position.set(point.x,.033,point.z);sprite.rotation.x=-Math.PI/2;
    scene.add(sprite);
  }
  for(const team of Object.values(TEAMS)) {
    const pad=new THREE.Mesh(new THREE.PlaneGeometry(12,3.5),
      new THREE.MeshBasicMaterial({color:team.color,transparent:true,opacity:.12,
        depthWrite:false}));
    pad.rotation.x=-Math.PI/2;pad.position.set(0,.043,team.spawnZ);
    scene.add(pad);
  }
}
