import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('public/game1/terrorist-studio.html','utf8');
const src=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
test('studio has valid JavaScript, independent controls and saved custom Glock pose',()=>{
 assert.ok(src);
 assert.doesNotThrow(()=>new vm.Script(src));
 for(const id of ['freeHands','restoreGlock','skinRepair','weaponSelect','part'])assert.match(html,new RegExp('id="'+id+'"'));
 for(const key of ['RightShoulder','RightForeArm','LeftShoulder','LeftForeArm'])assert.match(src,new RegExp(key));
 assert.match(src,/rx:-86,ry:82/);
 assert.match(src,/weapon:\{x:-\.02,y:\.02,z:-\.14/);
 assert.match(src,/items\.push\(c\.both,c\.all\)/);
});
test('corrects the actual GLB joined-hands skin and deletes bridging hand faces',()=>{
 const glb=readFileSync('public/game1/terrorist-pistol-optimized.glb');
 assert.equal(glb.toString('utf8',0,4),'glTF');
 const len=glb.readUInt32LE(12);
 const doc=JSON.parse(glb.toString('utf8',20,20+len));
 const bin=20+Math.ceil(len/4)*4+8;
 const attrib=doc.meshes[0].primitives[0].attributes;
 const primitive=doc.meshes[0].primitives[0];
 const countByType={SCALAR:1,VEC3:3,VEC4:4};
 const bytes={5123:2,5125:4,5126:4};
 function accessor(n){
  const a=doc.accessors[n],v=doc.bufferViews[a.bufferView],width=countByType[a.type];
  const base=bin+(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||bytes[a.componentType]*width;
  const array=new Float64Array(a.count*width);
  for(let i=0;i<a.count;i++)for(let k=0;k<width;k++){
   const offset=base+i*stride+k*bytes[a.componentType];
   array[i*width+k]=a.componentType===5123?glb.readUInt16LE(offset):
    a.componentType===5125?glb.readUInt32LE(offset):glb.readFloatLE(offset);
  }
  const out={array,count:a.count,needsUpdate:false};
  const names=['X','Y','Z','W'];
  names.forEach((name,k)=>{
   out['get'+name]=i=>out.array[i*width+k];
   out['set'+name]=(i,v)=>{out.array[i*width+k]=v;return out};
  });
  return out;
 }
 const ji=accessor(attrib.JOINTS_0),sw=accessor(attrib.WEIGHTS_0),pos=accessor(attrib.POSITION),idx=accessor(primitive.indices);
 const names=doc.skins[0].joints.map(j=>doc.nodes[j].name);
 const L=names.map((n,i)=>n.startsWith('Left')&&/Shoulder|Arm|Hand/.test(n)?i:-1).filter(i=>i>=0);
 const R=names.map((n,i)=>n.startsWith('Right')&&/Shoulder|Arm|Hand/.test(n)?i:-1).filter(i=>i>=0);
 function crossing(){
  let n=0;
  for(let i=0;i<ji.count;i++){
   let l=0,r=0;
   for(let k=0;k<4;k++){
    const joint=ji.array[i*4+k],w=sw.array[i*4+k];
    if(L.includes(joint))l+=w;
    if(R.includes(joint))r+=w;
   }
   if(l>.05&&r>.05)n++;
  }
  return n;
 }
 const joined=crossing();
 assert.ok(joined>100,'uploaded user model should have attached hands');
 const model={traverse:fn=>fn({isSkinnedMesh:true,geometry:{
  getAttribute:name=>({skinIndex:ji,skinWeight:sw,position:pos})[name],
  getIndex:()=>idx,
  computeBoundingSphere:()=>{}
 },skeleton:{bones:names.map(name=>({name}))}})};
 const start=src.indexOf('function releaseJoinedHands(');
 const end=src.indexOf('function loadWeapon(){',start);
 assert.ok(start>=0&&end>start);
 const separate=new Function(src.slice(start,end)+'return releaseJoinedHands;')();
 const result=separate(model);
 assert.ok(result.vertices>80&&result.vertices<400,JSON.stringify(result));
 assert.ok(result.faces>50&&result.faces<200,JSON.stringify(result));
 assert.equal(crossing(),0,'no vertex should follow both hands');
 let activeJoined=0;
 for(let i=0;i<idx.count;i+=3){
  const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);
  if(a===b&&b===c)continue;
  const sides=[a,b,c].map(v=>{
   let l=0,r=0;
   for(let k=0;k<4;k++){
    const j=ji.array[v*4+k],w=sw.array[v*4+k];
    if(L.includes(j))l+=w;
    if(R.includes(j))r+=w;
   }
   return l>.5?1:r>.5?-1:0;
  });
  if(sides.includes(-1)&&sides.includes(1)&&
     Math.min(pos.getY(a),pos.getY(b),pos.getY(c))>.22&&
     Math.min(pos.getZ(a),pos.getZ(b),pos.getZ(c))>.20)activeJoined++;
 }
 assert.equal(activeJoined,0);
});