// Read-only GLB inventory: accepts local files, no proprietary GLTF library needed.
// Useful for identifying game-ready armatures and named animation actions.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export function inspectGlb(file) {
  const data=fs.readFileSync(file);
  if (data.length < 20 || data.toString('ascii',0,4) !== 'glTF'
      || data.readUInt32LE(4)!==2
      || data.readUInt32LE(8)!==data.length) throw Error('Invalid GLB 2 file');
  const length=data.readUInt32LE(12);
  if(data.toString('ascii',16,20)!=='JSON')throw Error('Expected GLB JSON chunk');
  const gltf=JSON.parse(data.toString('utf8',20,20+length));
  return {
    bytes:data.length,
    scenes:gltf.scenes?.length||0,
    skins:gltf.skins?.length||0,
    meshes:gltf.meshes?.length||0,
    nodes:gltf.nodes?.length||0,
    meshNodes:(gltf.nodes||[]).filter(n=>n.mesh!==undefined).map(n=>({
      name:n.name,mesh:n.mesh,skin:n.skin,translation:n.translation,
      rotation:n.rotation,scale:n.scale
    })),
    sceneRoots:(gltf.scenes||[]).map(s=>s.nodes),
    rootNodes:(gltf.nodes||[]).slice(0,8).map(n=>({
      name:n.name,translation:n.translation,rotation:n.rotation,
      scale:n.scale,children:n.children?.length
    })),
    animationSample:(gltf.animations||[]).slice(0,6).map((a,i)=>({
      id:i,name:a.name,channels:a.channels?.length,
      targets:(a.channels||[]).slice(0,10).map(ch=>({
        node:gltf.nodes?.[ch.target?.node]?.name,
        path:ch.target?.path
      })),
      durations:(a.samplers||[]).slice(0,3).map(sm=>{
        const ac=gltf.accessors?.[sm.input];
        return ac?{min:ac.min,max:ac.max,count:ac.count}:null;
      })
    })),
    animations:(gltf.animations||[]).map(a=>({
      name:a.name||'(unnamed)',
      channels:a.channels?.length||0,
      tracks:(a.channels||[]).map(c=>c.target?.path||'').filter(Boolean)
    })),
    skeletonNodes:(gltf.nodes||[]).filter(n=>/arm|hand|spine|pelvis|head|root|leg|thigh|foot|wrist|finger|neck|weapon|palm|mixamorig/i.test(n.name||'')).map(n=>n.name),
    externalUris:[...(gltf.buffers||[]),...(gltf.images||[])].map(x=>x.uri).filter(Boolean),
  };
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const record=inspectGlb(process.argv[2]);
  console.log(JSON.stringify(record,null,2));
}
