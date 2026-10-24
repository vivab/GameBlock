// GameBlock · ITALIA (CS:GO Italy-inspired bomb-defusal adaptation)
// Original, lightweight geometry: no redistributed Valve assets.
// Coordinates and collision obstacles drive player movement, bullet LOS and bot routing.
export const ITALY_SITES=Object.freeze([
 {id:'A',x:39,z:15,radius:5.5,color:0xf3b876},
 {id:'B',x:-39,z:15,radius:5.5,color:0x8bcce9}
]);
export const ITALY_SPAWNS=Object.freeze({t:{x:0,z:-40},ct:{x:0,z:40}});

// Solid volumes: [centre x, centre z, width, depth, height, material type].
// Every ground-level wall, crate and kiosk is included here.
const walls=[];
const add=(x,z,w,d,h,t)=>{if(w>.09&&d>.09)walls.push([x,z,w,d,h,t]);};
const GAP=5.6,THICK=.95;
const BUILDINGS=[
 // Vino district / left long hall
 {x:-24,z:-27,w:19,d:14,h:7.2,t:0,doors:'NSEW',name:'VINO'},
 {x:-24,z:-8,w:19,d:15,h:8.1,t:1,doors:'NSEW',name:'CANTINA'},
 {x:-23,z:12,w:19,d:15,h:7.5,t:2,doors:'NSEW',name:'BOTTEGA'},
 {x:-22,z:32,w:17,d:11,h:7.1,t:0,doors:'NSEW',name:'CASA'},
 // Long street / right market and apartments
 {x:24,z:-27,w:19,d:14,h:8.3,t:2,doors:'NSEW',name:'APPARTAMENTI'},
 {x:24,z:-8,w:19,d:15,h:8.0,t:0,doors:'NSEW',name:'TRATTORIA'},
 {x:23,z:12,w:19,d:15,h:7.4,t:1,doors:'NSEW',name:'MERCATO'},
 {x:23,z:32,w:17,d:11,h:7.2,t:2,doors:'NSEW',name:'GELATERIA'}
];
// Each house has traversable indoor space with a door on every side.
for(const b of BUILDINGS){
 const x=b.x,z=b.z,w=b.w,d=b.d,h=b.h,t=b.t;
 const hPiece=(w-GAP)/2,vPiece=(d-GAP)/2;
 for(const side of [-1,1]){
  const wz=z+side*(d-THICK)/2;
  add(x-(GAP+hPiece)/2,wz,hPiece,THICK,h,t);
  add(x+(GAP+hPiece)/2,wz,hPiece,THICK,h,t);
  const wx=x+side*(w-THICK)/2;
  add(wx,z-(GAP+vPiece)/2,THICK,vPiece,h,t);
  add(wx,z+(GAP+vPiece)/2,THICK,vPiece,h,t);
 }
}
// Solid town walls, the clock tower that splits Mid, real half-height cover.
add(-49,0,2,100,8,2);add(49,0,2,100,8,2);
add(0,-49,100,2,8,2);add(0,49,100,2,8,2);
add(0,0,7.2,7.8,10.6,1); // Italy mid bell tower
// Deep alley corners / asymmetrical urban sightlines.
for(const v of [
 [-9,-26,4.5,8,6.8,0],[9,-13,5,8,7.0,2],
 [-10,14,4.4,7,6.0,1],[9,26,4.2,7,6.0,0],
 [-5,-9,2.4,2.4,1.4,3],[8,6,2.1,2.1,1.25,3],
 [-41,-11,2.3,2.2,1.35,3],[-39,-29,2,2.1,1.25,3],
 [40,-29,2.3,2.2,1.35,3],[40,-9,2.1,2.2,1.4,3],
 [-39,28,2,2.2,1.3,3],[39,28,2,2.2,1.3,3],
 [-4,28,2.1,2.1,1.15,3],[4,-29,2,2,1.25,3],
 // Interior furniture: cover, not sealed fake rooms.
 [-29,-30,2.1,1.4,1.0,4],[-29,-11,1.9,2.2,1.2,4],
 [-28,9,1.8,2.0,1.15,4],[-27,29,1.6,1.8,1.15,4],
 [29,-30,2.1,1.7,1.1,4],[29,-11,1.8,2.0,1.1,4],
 [28,10,1.7,1.7,1.1,4],[28,30,2.0,1.7,1.1,4],
 // Site defenses at edges, outside the plant circles.
 [-44,3,1.6,2.8,1.25,4],[44,4,1.8,2.8,1.25,4]
])add(...v);
export const ITALY_SOLIDS=Object.freeze(walls.map(v=>Object.freeze(v)));
export const italyBlocks=(x,z,pad=.5)=>ITALY_SOLIDS.some(([cx,cz,w,d,h])=>
 h>.8&&Math.abs(x-cx)<w/2+pad&&Math.abs(z-cz)<d/2+pad);

// Pathfinding shares the same blocked spaces as the player's horizontal collision.
const STEP=2,MIN=-46,SIZE=47;
const gridValue=n=>MIN+STEP*n;
const gridIndex=n=>Math.max(0,Math.min(SIZE-1,Math.round((n-MIN)/STEP)));
const walkable=(x,z)=>Math.abs(x)<47&&Math.abs(z)<47&&!italyBlocks(x,z,.76);
const NAV_OPEN=new Uint8Array(SIZE*SIZE);
for(let z=0;z<SIZE;z++)for(let x=0;x<SIZE;x++)
 NAV_OPEN[z*SIZE+x]=walkable(gridValue(x),gridValue(z))?1:0;
function clearSegment(a,b){
 const distance=Math.hypot(b.x-a.x,b.z-a.z);
 for(let t=0;t<=distance;t+=.20){
  const v=distance?t/distance:0;
  if(!walkable(a.x+(b.x-a.x)*v,a.z+(b.z-a.z)*v))return false;
 }
 return walkable(b.x,b.z);
}
export function findItalyPath(start,goal){
 if(!Number.isFinite(start.x+start.z+goal.x+goal.z))return [];
 if(clearSegment(start,goal))return [goal];
 const N=SIZE*SIZE,open=NAV_OPEN;
 const nearest=(px,pz)=>{
  const gx=gridIndex(px),gz=gridIndex(pz);
  if(open[gz*SIZE+gx])return gz*SIZE+gx;
  for(let r=1;r<12;r++)
   for(let dz=-r;dz<=r;dz++)
    for(let dx=-r;dx<=r;dx++){
     const nx=gx+dx,nz=gz+dz;
     if(nx>=0&&nz>=0&&nx<SIZE&&nz<SIZE&&open[nz*SIZE+nx])
      return nz*SIZE+nx;
    }
  return -1;
 };
 const from=nearest(start.x,start.z),to=nearest(goal.x,goal.z);
 if(from<0||to<0)return [];
 const previous=new Int16Array(N);previous.fill(-1);
 const queue=new Int16Array(N);let head=0,tail=0;
 queue[tail++]=from;previous[from]=from;
 const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
 while(head<tail&&previous[to]===-1){
  const cell=queue[head++],cx=cell%SIZE,cz=Math.floor(cell/SIZE);
  for(const [dx,dz] of dirs){
   const x=cx+dx,z=cz+dz;
   if(x<0||z<0||x>=SIZE||z>=SIZE)continue;
   const next=z*SIZE+x;
   if(!open[next]||previous[next]!==-1)continue;
   if(dx&&dz&&(!open[cz*SIZE+x]||!open[z*SIZE+cx]))continue;
   previous[next]=cell;queue[tail++]=next;
  }
 }
 if(previous[to]===-1)return [];
 const route=[];let p=to;
 while(p!==from){
  route.push({x:gridValue(p%SIZE),z:gridValue(Math.floor(p/SIZE))});
  p=previous[p];
 }
 route.reverse();
 const full=[start,...route,goal],out=[];
 let index=0;
 while(index<full.length-1&&out.length<70){
  let next=index+1;
  for(let j=full.length-1;j>next;j--)
   if(clearSegment(full[index],full[j])){next=j;break;}
  out.push(full[next]);index=next;
 }
 return out;
}
function makeTexture(THREE,kind){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const c=canvas.getContext('2d');if(!c)return null;
 let seed=kind==='stone'?9982:kind==='roof'?3391:881;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 if(kind==='stone'){
  c.fillStyle='#9e9990';c.fillRect(0,0,256,256);
  for(let row=0;row<16;row++)for(let col=0;col<12;col++){
   const x=col*23-12+(row%2)*11,y=row*16;
   c.fillStyle=['#aba69b','#b7b0a2','#8f8b83','#c3baaa'][Math.floor(rand()*4)];
   c.fillRect(x+1,y+1,21,14);
  }
 }else if(kind==='roof'){
  c.fillStyle='#935039';c.fillRect(0,0,256,256);
  for(let y=0;y<256;y+=18)for(let x=0;x<256;x+=33){
   c.fillStyle=['#a85f43','#b46f50','#8a4735','#ba7954'][Math.floor(rand()*4)];
   c.fillRect(x+(y%36?16:0),y,31,16);
  }
 }else{
  c.fillStyle='#c1b091';c.fillRect(0,0,256,256);
  for(let k=0;k<2600;k++){
   c.fillStyle=rand()>.48?'#725e4120':'#ffecd122';
   c.fillRect(rand()*256,rand()*256,1+rand()*6,1+rand()*5);
  }
 }
 for(let n=0;n<800;n++){
  c.fillStyle=rand()>.5?'#ffffff11':'#16100b0b';
  c.fillRect(rand()*256,rand()*256,2,2);
 }
 const tx=new THREE.CanvasTexture(canvas);tx.wrapS=tx.wrapT=THREE.RepeatWrapping;
 tx.repeat.set(kind==='stone'?24:kind==='roof'?1:2,kind==='stone'?24:kind==='roof'?1:2);
 return tx;
}
export function buildItalyMap(THREE,root){
 const stone=makeTexture(THREE,'stone'),roofTex=makeTexture(THREE,'roof'),plaster=makeTexture(THREE,'plaster');
 const mat=color=>new THREE.MeshLambertMaterial({color});
 const facades=[
  new THREE.MeshLambertMaterial({color:0xe6cfac,map:plaster}),
  new THREE.MeshLambertMaterial({color:0xd5bf9e,map:plaster}),
  new THREE.MeshLambertMaterial({color:0xe4d8bf,map:plaster})
 ];
 const roofMat=new THREE.MeshLambertMaterial({color:0xe9b99e,map:roofTex});
 const paving=new THREE.MeshLambertMaterial({color:0xffffff,map:stone});
 if(!stone)paving.color.setHex(0x9e9990);
 const wood=mat(0x594b3c),shutters=mat(0x4d6759),otherShutter=mat(0x526f80);
 const dark=mat(0x292f30),trim=mat(0xc5b18e),metal=mat(0x333a3b);
 const crate=mat(0x806346),glass=mat(0x3c4c48),wine=mat(0x51372e);
 const ivy=mat(0x687742),tiles=mat(0xcdb796),red=mat(0xa44740),blue=mat(0x41647a);
 const floor=new THREE.Mesh(new THREE.BoxGeometry(100,.4,100),paving);
 floor.position.y=-.2;floor.receiveShadow=true;floor.name='Italy ground at Y=0';root.add(floor);
 const obstacles=[];
 function box(x,y,z,w,h,d,m,parent=root){
  const a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);a.position.set(x,y,z);parent.add(a);return a;
 }
 // Everything that occupies a walkable player's space is a collision / bullet blocker.
 for(let i=0;i<ITALY_SOLIDS.length;i++){
  const [x,z,w,d,h,type]=ITALY_SOLIDS[i];
  const surface=type===3?crate:type===4?wood:facades[type];
  const solid=box(x,h/2,z,w,h,d,surface);
  solid.name='Italy solid '+i;obstacles.push(solid);
  if(type===3||type===4){
   box(x,h+.055,z,w+.04,.10,d+.04,crate);
   for(const offs of [-.25,.25])if(w>1.8)
    box(x+offs*w,h*.48,z+d/2+.025,.035,h*.9,.025,dark);
  }else{
   box(x,h+.06,z,w+.15,.13,d+.15,trim);
  }
 }
 // Italian townhouses: walkable interiors, overhead roofs, arches, shutters, shopfronts.
 for(let i=0;i<BUILDINGS.length;i++){
  const b=BUILDINGS[i];
  // Slab above head level, and a raised terracotta border.
  box(b.x,b.h+.21,b.z,b.w+.60,.34,b.d+.55,roofMat);
  for(const s of [-1,1]){
   box(b.x+s*b.w/2,b.h+.46,b.z,.18,.55,b.d+.4,roofMat);
   box(b.x,b.h+.46,b.z+s*b.d/2,b.w+.5,.55,.18,roofMat);
  }
  // Stone floor indoors (just above ground to avoid z-fighting).
  box(b.x,.015,b.z,b.w-2,.027,b.d-2,tiles);
  // Open arches over each of the real 5.6-m doors. All decorative pieces above the player.
  for(const side of [-1,1]){
   const ez=b.z+side*(b.d-THICK)/2;
   const ex=b.x+side*(b.w-THICK)/2;
   box(b.x,3.35,ez,GAP,.57,.8,trim);
   box(ex,3.35,b.z,.8,.57,GAP,trim);
   // Simple lanterns at actual entrance jambs.
   box(b.x-GAP/2-.35,2.65,ez,.24,.4,.25,metal);
   box(ex,2.65,b.z+GAP/2+.35,.26,.4,.24,metal);
  }
  for(const side of [-1,1]){
   const z=b.z+side*(b.d/2+.05);
   for(const shift of [-b.w*.28,b.w*.28]){
    const x=b.x+shift;
    box(x,5.14,z,1.46,1.65,.07,glass);
    box(x-.87,5.12,z,.39,1.8,.09,i%2?shutters:otherShutter);
    box(x+.87,5.12,z,.39,1.8,.09,i%2?shutters:otherShutter);
    box(x,6.05,z,1.7,.13,.23,trim);
    box(x,4.32,z,1.8,.12,.23,trim);
   }
  }
  // Decorative interior beams never block player movement.
  for(const zz of [b.z-b.d*.26,b.z+b.d*.26])
   box(b.x,b.h-.38,zz,b.w-2,.18,.22,wood);
  // Rooftop chimneys against the sky.
  box(b.x+b.w*.28,b.h+1.12,b.z-b.d*.22,.9,1.85,.9,facades[i%3]);
  box(b.x+b.w*.28,b.h+2.07,b.z-b.d*.22,1.1,.18,1.1,trim);
 }
 // Campanile in Mid: dramatic landmark, COLLIDING below and visible above.
 box(0,10.8,0,8.0,.55,8.6,trim);
 for(const side of [-1,1]){
  box(0,8.0,side*4,4.3,2.0,.12,dark);
  box(side*3.85,8.0,0,.12,2.0,4.4,dark);
 }
 box(0,13.6,0,8.6,.6,8.6,roofMat);
 const bell=new THREE.Mesh(new THREE.ConeGeometry(4.8,3,4),roofMat);
 bell.position.set(0,15.4,0);bell.rotation.y=Math.PI/4;root.add(bell);
 // Market A: stalls, retractable awnings, baskets. They are overhead or inside existing solid crates.
 function canopy(x,z,width,depth,m){
  box(x,3.55,z,width,.14,depth,m);
  for(const dx of [-width/2,width/2])
   box(x+dx,2.32,z,.11,2.3,.11,wood);
 }
 canopy(40,8,7,3.8,red);
 canopy(40,23,7,3.8,blue);
 // Wine cellar B: vineyard colours and rows of bottles inside an accessible room.
 for(let k=0;k<5;k++){
  const z=-12+k*2.2;
  box(-31.4,1.55,z,.16,2.5,.75,wine);
  for(let j=0;j<3;j++)
   box(-31.15,.52+j*.62,z,.22,.14,.55,glass);
 }
 canopy(-41,22,5.5,3.3,ivy);
 // Awnings hang off actual building walls, no fake floor-level obstruction.
 for(const [x,z,w,d,c] of [
  [33.3,-7,3.0,5,red],[-33.5,-8,3,4.5,blue],
  [33.0,13,3,5,ivy],[-33.2,12,3,5,red],
  [23,38,4.5,3.1,blue],[-22,38,4.6,3.1,ivy]
 ])box(x,3.52,z,w,.12,d,c);
 // Hanging banners, overhead clotheslines, balcony silhouettes.
 for(const [x,z,c] of [[-18,-15,red],[19,-16,blue],[-14,22,ivy],[14,20,red]]){
  box(x,4.1,z,.10,1.4,1.1,c);
  box(x,4.88,z,.15,.12,1.5,wood);
 }
 // Balconies are cosmetic high above combat height; their supports touch house facades.
 for(const [x,z,dir] of [
  [-24,-34,1],[-24,-.4,-1],[24,-20,1],[23,19,-1],
  [-22,37.5,1],[23,37.5,-1]
 ]){
  box(x,4.18,z,4.7,.19,1.25,trim);
  for(const xx of [-1.8,-.6,.6,1.8])
   box(x+xx,4.63,z+dir*.58,.08,.78,.08,metal);
  box(x,5.05,z+dir*.58,4.8,.10,.10,metal);
 }
 // Safe background skyline; same collision perimeter at ground level.
 for(let k=0;k<13;k++){
  const x=-45+k*7.5;
  box(x,5.4,-49,6,2.3,1.1,facades[k%3]);
  box(x,6.62,-49,6.2,.2,1.3,roofMat);
 }
 function sign(name,x,y,z,rot=0){
  if(typeof document==='undefined')return;
  const c=document.createElement('canvas');c.width=512;c.height=112;
  const t=c.getContext('2d');if(!t)return;
  t.fillStyle='#453b31';t.fillRect(0,0,512,112);
  t.strokeStyle='#dbc8a7';t.lineWidth=6;t.strokeRect(3,3,506,106);
  t.fillStyle='#f1dfc2';t.textAlign='center';
  t.font='bold '+(name.length>11?'47px':'60px')+' sans-serif';
  t.fillText(name,256,77);
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(4.5,.99),
   new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),side:THREE.DoubleSide}));
  mesh.position.set(x,y,z);mesh.rotation.y=rot;root.add(mesh);
 }
 sign('CANTINA',-31.8,3.4,-10.3,Math.PI/2);
 sign('MERCATO',33.7,3.4,13,Math.PI/2);
 sign('GELATERIA',23,4.1,38.2);
 sign('TRATTORIA',24,4.1,-15.7);
 sign('PIAZZA',0,4.1,31);
 // Plent letters painted on stone, no mesh column to trap a player or the bomb.
 for(const site of ITALY_SITES){
  if(typeof document==='undefined')continue;
  const c=document.createElement('canvas');c.width=c.height=256;
  const g=c.getContext('2d');g.fillStyle=site.id==='A'?'#ad5534':'#3e7893';
  g.font='900 180px sans-serif';g.textAlign='center';g.fillText(site.id,128,198);
  const mark=new THREE.Mesh(new THREE.PlaneGeometry(4,4),
   new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));
  mark.rotation.x=-Math.PI/2;mark.position.set(site.x,.045,site.z);root.add(mark);
 }
 return {floor,obstacles};
}
