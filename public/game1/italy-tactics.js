// GameBlock Italy — mobile-friendly tactical squad planner.
// Uses the actual rasterized walkable GLB surface. Never targets blocked geometry.
import {italyBlocks,italyGround,findItalyPath,ITALY_SPAWNS,italyReachable} from './italy-import-map.js?v=italy-nav-halfmeter-20261024';

export const CT_ROLES=Object.freeze(['anchorA','anchorB','push','rotate','ambush']);
export const T_ROLES=Object.freeze(['entry','escort','flank','lurk','support']);
export function italyRole(side,index,round=1,teamSeed=0){
 const roles=side==='ct'?CT_ROLES:T_ROLES;
 return roles[((index+round+teamSeed)%roles.length+roles.length)%roles.length];
}
export function italySafePoint(x,z,maxRadius=12){
 if(!Number.isFinite(x+z))return null;
 if(!italyBlocks(x,z,.15)&&italyReachable(x,z))return {x,z};
 const bx=Math.round(x*2)/2,bz=Math.round(z*2)/2;
 for(let ring=1;ring<=maxRadius*2;ring++){
  let best=null,score=Infinity;
  for(let dz=-ring;dz<=ring;dz++)for(let dx=-ring;dx<=ring;dx++){
   if(Math.max(Math.abs(dx),Math.abs(dz))!==ring)continue;
   const nx=bx+dx*.5,nz=bz+dz*.5;
   if(italyBlocks(nx,nz,.12)||!italyReachable(nx,nz))continue;
   const d=(nx-x)**2+(nz-z)**2;
   if(d<score){best={x:nx,z:nz};score=d}
  }
  if(best)return best;
 }
 return null;
}
// Opposite-sided gates form alternate routes through Italy's real alleys.
const ROUTE_GATES=Object.freeze({
 // CT begin at the former T end of Italy; T advance from the old CT end.
 ct:Object.freeze({
  west:[[-17,31],[-16,11],[-23,-12]],
  middle:[[-11,29],[-10,10],[-2,-15]],
  east:[[-11,32],[-2,12],[14,-8]]
 }),
 t:Object.freeze({
  west:[[-16,-44],[-23,-28],[-23,-12]],
  middle:[[-11,-42],[-7,-27],[0,-14]],
  east:[[2,-44],[16,-32],[17,-11]]
 })
});
export function italyRouteGates(side,lane,goal=null){
 const hints=ROUTE_GATES[side]?.[lane]||ROUTE_GATES[side]?.middle||[];
 const points=hints.map(([x,z])=>italySafePoint(x,z)).filter(Boolean);
 if(goal){
  const end=italySafePoint(goal.x,goal.z);
  if(end)points.push(end);
 }
 return points.filter((p,i)=>i===0||Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z)>1.5);
}
export function italyRouteReachable(start,points){
 let last=start;
 for(const point of points){
  const path=findItalyPath(last,point);
  if(!path.length)return false;
  last=point;
 }
 return true;
}
// Select cover behind real buildings, with a nearby retreat route.
// canSee(a,b) is supplied by the game's actual mesh raycaster.
export function italyPickCover(site,threat,rank=0,canSee=()=>false,occupied=[]){
 const candidates=[],seen=new Set();
 const siteY=italyGround(site.x,site.z);
 for(const radius of [4.5,6.5,9,11.5]){
  for(let angle=0;angle<16;angle++){
   const theta=angle*Math.PI/8+rank*.13;
   const point=italySafePoint(site.x+Math.cos(theta)*radius,site.z+Math.sin(theta)*radius,2);
   if(!point)continue;
   const key=Math.round(point.x)+','+Math.round(point.z);
   const distance=Math.hypot(point.x-site.x,point.z-site.z);
   if(seen.has(key)||distance<3.3||distance>14||Math.abs(italyGround(point.x,point.z)-siteY)>1.25)continue;
   seen.add(key);
   const nearWall=[[1.3,0],[-1.3,0],[0,1.3],[0,-1.3]].some(([dx,dz])=>italyBlocks(point.x+dx,point.z+dz,.05));
   const separation=occupied.length?Math.min(...occupied.map(q=>Math.hypot(q.x-point.x,q.z-point.z))):10;
   const score=(nearWall?2.2:0)+Math.min(4,separation)*.7-
    Math.abs(distance-7)*.18+Math.sin(angle*13.1+rank*4.7)*.55;
   candidates.push({point,score});
  }
 }
 candidates.sort((a,b)=>b.score-a.score);
 let best=null,bestScore=-Infinity;
 for(const item of candidates.slice(0,9)){
  const {point}=item;
  const hidden=threat&&!canSee(threat,point);
  const canGuard=canSee(point,site);
  const score=item.score+(hidden?5:0)+(canGuard?1.1:0);
  if(score>bestScore){best=point;bestScore=score;}
 }
 return best||italySafePoint(site.x,site.z);
}
export function italyLeadThreat(side){return ITALY_SPAWNS[side==='ct'?'t':'ct'];}
