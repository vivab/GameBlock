// SUNDOWN — original Dust2-inspired 5v5 bomb map for GameBlock.
// All solid geometry is created exactly once and shared with movement, bullets and bot LOS.
// The rendered reference image is concept art, not collision or level geometry.
export const SUNDOWN_SITES = Object.freeze([
  {id:'A',x:32,z:18,radius:6.5,color:0xffbb77},
  {id:'B',x:-32,z:18,radius:6.5,color:0x90c9ee}
]);
export const SUNDOWN_SPAWNS = Object.freeze({
  t:{x:0,z:-37},ct:{x:0,z:38}
});
// x,z,width,depth,height,material index. Lanes: left B tunnels, central Mid,
// right A Long, Mid->A Short and Mid->B Connector.
// Buildings are deliberately separated: no sealed courtyards or invisible gates.
export const SUNDOWN_SOLIDS = Object.freeze([
  [-49,0,2,100,7,2],[49,0,2,100,7,2],[0,-49,100,2,7,2],[0,49,100,2,7,2],
  [-23,-22,19,13,6.5,0],[-23,0,17,18,7,1],[-15,26,9,11,6.3,0],
  [-6,-27,7,10,5.5,1],[-8,-7,10,10,6.8,0],[-7,13,8,9,5.8,1],
  [-11,35,13,7,6,0],
  [22,-23,17,14,6.6,0],[24,0,16,19,7.4,1],[13,16,8,12,6.4,0],
  [13,34,14,7,5.8,1],[8,-7,10,10,6.7,0],[6,7,7,8,6,1],
  [0,27,8,7,6.1,0],
  // Waist-high boxes. Do not put props in the exact plant markers or spawns.
  [-39,24,2.5,2.5,1.45,3],[-25,10,2.1,2.1,1.65,3],
  [-39,4,2,2.2,1.3,3],[-37,-14,2.3,2.3,1.55,3],
  [-40,-32,2.2,2.2,1.4,3],
  [40,24,2.4,2.5,1.45,3],[39,8,2.3,2.3,1.5,3],
  [37,-12,2.2,2.3,1.4,3],[38,-32,2.3,2.3,1.45,3],
  [24,12,2.1,2.1,1.5,3],
  [0,-17,2.2,2.2,1.5,3],[0,15,2.2,2.2,1.5,3],
  [-33,-4,2.1,2.1,1.45,3],[33,-3,2.1,2.1,1.5,3]
]);
const GRID_STEP=2.5,GRID_MIN=-45,GRID_SIZE=37;
const clearance=.62;
const solidAt=(x,z,pad=clearance)=>SUNDOWN_SOLIDS.some(([cx,cz,w,d,h])=>
  h>1&&Math.abs(x-cx)<w/2+pad&&Math.abs(z-cz)<d/2+pad);
const free=(x,z)=>Math.abs(x)<47&&Math.abs(z)<47&&!solidAt(x,z);
const coords=n=>GRID_MIN+n*GRID_STEP;
const ix=x=>Math.max(0,Math.min(GRID_SIZE-1,Math.round((x-GRID_MIN)/GRID_STEP)));
function clearSegment(a,b){
  const d=Math.hypot(a.x-b.x,a.z-b.z);
  for(let t=0;t<=d;t+=.42){
    const r=d?t/d:0;
    if(!free(a.x+(b.x-a.x)*r,a.z+(b.z-a.z)*r))return false;
  }
  return free(b.x,b.z);
}
// A bounded, cached-size grid route used only when line of sight is blocked.
// Return turn points; no pathfinder mesh downloads or nav-data build step.
export function findSundownPath(start,goal){
  if(!Number.isFinite(start.x+start.z+goal.x+goal.z))return [];
  if(clearSegment(start,goal))return [goal];
  const N=GRID_SIZE*GRID_SIZE;
  const open=new Uint8Array(N);
  for(let z=0;z<GRID_SIZE;z++)for(let x=0;x<GRID_SIZE;x++)
    open[z*GRID_SIZE+x]=free(coords(x),coords(z))?1:0;
  const nearest=(x,z)=>{
    const gx=ix(x),gz=ix(z);
    if(open[gz*GRID_SIZE+gx])return gz*GRID_SIZE+gx;
    for(let r=1;r<8;r++)for(let dz=-r;dz<=r;dz++)
      for(let dx=-r;dx<=r;dx++){
        const nx=gx+dx,nz=gz+dz;
        if(nx>=0&&nx<GRID_SIZE&&nz>=0&&nz<GRID_SIZE&&open[nz*GRID_SIZE+nx])
          return nz*GRID_SIZE+nx;
      }
    return -1;
  };
  const src=nearest(start.x,start.z),dst=nearest(goal.x,goal.z);
  if(src<0||dst<0)return [];
  const queue=new Int16Array(N),prev=new Int16Array(N);prev.fill(-1);
  let head=0,tail=0;queue[tail++]=src;prev[src]=src;
  const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  while(head<tail&&prev[dst]===-1){
    const p=queue[head++],px=p%GRID_SIZE,pz=Math.floor(p/GRID_SIZE);
    for(const [dx,dz] of dirs){
      const x=px+dx,z=pz+dz;if(x<0||z<0||x>=GRID_SIZE||z>=GRID_SIZE)continue;
      const q=z*GRID_SIZE+x;if(!open[q]||prev[q]!==-1)continue;
      if(dx&&dz&&(!open[pz*GRID_SIZE+x]||!open[z*GRID_SIZE+px]))continue;
      prev[q]=p;queue[tail++]=q;
    }
  }
  if(prev[dst]===-1)return [];
  const path=[];let p=dst;
  while(p!==src){path.push({x:coords(p%GRID_SIZE),z:coords(Math.floor(p/GRID_SIZE))});p=prev[p];}
  path.reverse();
  // Smooth the polyline while keeping safety clearance around walls/crates.
  const output=[],points=[start,...path,goal];let current=0;
  while(current<points.length-1&&output.length<50){
    let next=current+1;
    for(let j=points.length-1;j>current+1;j--)if(clearSegment(points[current],points[j])){next=j;break}
    output.push(points[next]);current=next;
  }
  return output;
}
function pavingTexture(THREE){
  if(typeof document==='undefined')return null;
  const c=document.createElement('canvas');c.width=c.height=256;
  const ctx=c.getContext('2d');if(!ctx)return null;
  ctx.fillStyle='#c4a679';ctx.fillRect(0,0,256,256);
  let seed=2026;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  for(let y=0;y<256;y+=32)for(let x=0;x<256;x+=64){
    const offset=(Math.floor(y/32)%2)*32;
    ctx.fillStyle=rand()>.5?'#cfb18a':'#b99a70';
    ctx.fillRect(x+offset,y,62,30);
  }
  for(let k=0;k<1800;k++){
    ctx.fillStyle=rand()>.5?'#fff1ca14':'#4d30131a';
    ctx.fillRect(rand()*256,rand()*256,1+rand()*5,1+rand()*3);
  }
  const tx=new THREE.CanvasTexture(c);tx.wrapS=tx.wrapT=THREE.RepeatWrapping;
  tx.repeat.set(14,14);return tx;
}
export function buildSundownMap(THREE,root){
  const masonry=[0xc6a881,0xd7b992,0xb29675,0x75573c].map(color=>
    new THREE.MeshLambertMaterial({color}));
  const roof=new THREE.MeshLambertMaterial({color:0xe6cc9d});
  const windowMat=new THREE.MeshLambertMaterial({color:0x584d44});
  const foliage=new THREE.MeshLambertMaterial({color:0x667b42,side:THREE.DoubleSide});
  const trunk=new THREE.MeshLambertMaterial({color:0x725333});
  const trim=new THREE.MeshLambertMaterial({color:0xa88762});
  const floorMat=new THREE.MeshLambertMaterial({color:0xffffff,map:pavingTexture(THREE)});
  if(!floorMat.map)floorMat.color.setHex(0xc4a679);
  const floor=new THREE.Mesh(new THREE.BoxGeometry(100,.4,100),floorMat);
  floor.position.y=-.2;floor.name='Sundown walkable ground';root.add(floor);
  const obstacles=[];
  function meshBox(x,y,z,w,h,d,mat,parent=root){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m;
  }
  // Collision and sight/bullet blockers have exactly the same geometry.
  for(let i=0;i<SUNDOWN_SOLIDS.length;i++){
    const [x,z,w,d,h,type]=SUNDOWN_SOLIDS[i];
    const wall=meshBox(x,h/2,z,w,h,d,masonry[type]);
    wall.name='Sundown collision '+i;obstacles.push(wall);
    if(type===3){
      meshBox(x,h+.06,z,w+.10,.1,d+.10,trim);
      // Wooden slats lie within the original crate's collision footprint.
      continue;
    }
    // All rooftops sit ABOVE the obstruction, never across an open street.
    meshBox(x,h+.10,z,w+.3,.20,d+.3,roof);
    if(i>=4){
      for(const side of [-1,1]){
        const face=z+side*d/2+.014;
        if(w>8){
          const count=Math.max(1,Math.floor(w/5));
          for(let q=0;q<count;q++){
            const px=x+(q-(count-1)/2)*4.4;
            meshBox(px,2.55,face,1.08,1.25,.05,windowMat);
            meshBox(px,3.24,face,1.35,.16,.14,roof);
          }
        }
      }
    }
  }
  // Pillars and overhead timber visually identify the two B-tunnel entrances.
  // Their spans are above eye height, and no decorative mesh is a hidden blocker.
  for(const z of [-9,4]){
    for(const x of [-44,-33.5]){
      meshBox(x,2.6,z,.32,5.2,.32,trim);
      meshBox(x,5.22,z,.5,.25,.50,roof);
    }
    meshBox(-38.75,5.27,z,10.8,.28,1.0,roof);
  }
  // A Short stair-inspired elevated architectural trim (the passage stays flat).
  for(let k=0;k<5;k++)
    meshBox(13+k*2.1,.02,25.8,1.6,.025,2.7,k%2?roof:trim);
  // Banners, blue CT awnings and red T market canopy stay above player height.
  function canopy(x,z,w,d,color){
    const mat=new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide});
    meshBox(x,4.9,z,w,.10,d,mat);
    for(const px of [-w/2,w/2])meshBox(x+px,3.35,z,.13,3.0,.13,trim);
  }
  canopy(-31,37,5.5,3.2,0x567886);
  canopy(26,-35,6.4,3.1,0xb16a50);
  for(const [x,z,s] of [[-44,32,1],[44,32,1],[-43,-39,.9],[43,-38,.9],
    [-2,45,.85],[46,-3,.85]]){
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.13*s,.27*s,4*s,6),trunk);
    stem.position.set(x,2*s,z);root.add(stem);
    for(let i=0;i<6;i++){
      const angle=i*Math.PI/3;
      const leaf=new THREE.Mesh(new THREE.ConeGeometry(.78*s,3.6*s,3),foliage);
      leaf.position.set(x+Math.sin(angle)*1.35*s,4.1*s,z+Math.cos(angle)*1.35*s);
      leaf.rotation.z=Math.sin(angle)*.84;leaf.rotation.x=-Math.cos(angle)*.84;
      root.add(leaf);
    }
  }
  // Painted site lettering on the floor, not vertical floating obstacles.
  for(const site of SUNDOWN_SITES){
    if(typeof document==='undefined')continue;
    const c=document.createElement('canvas');c.width=c.height=128;
    const ctx=c.getContext('2d');ctx.fillStyle='#9b4a36';ctx.font='bold 106px sans-serif';
    ctx.textAlign='center';ctx.fillText(site.id,64,106);
    const tx=new THREE.CanvasTexture(c);
    const marker=new THREE.Mesh(new THREE.PlaneGeometry(3.1,3.1),
      new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false}));
    marker.rotation.x=-Math.PI/2;marker.position.set(site.x,.015,site.z);
    root.add(marker);
  }
  return {floor,obstacles};
}
