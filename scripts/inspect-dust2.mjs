// Lightweight metadata inspection for the original Game1 Dust2 GLB.
// No GL/WebGL required; used to calibrate bomb sites and mobile map bounds.
import {readFileSync} from 'node:fs';
const b=readFileSync(new URL('../public/game1/de_dust2_-_cs_map.glb',import.meta.url));
if(b.toString('ascii',0,4)!=='glTF')throw Error('Not a binary glTF');
const jsonLen=b.readUInt32LE(12),tag=b.toString('ascii',16,20);
if(tag!=='JSON')throw Error('Expected GLTF JSON chunk');
const root=JSON.parse(b.toString('utf8',20,20+jsonLen));
const acc=root.accessors||[];
const bounds=acc.filter(x=>x.type==='VEC3'&&x.min&&x.max);
const global={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
for(const a of bounds)for(let i=0;i<3;i++){
 global.min[i]=Math.min(global.min[i],a.min[i]);
 global.max[i]=Math.max(global.max[i],a.max[i]);
}
console.log('DUST2 metadata',JSON.stringify({
 nodes:(root.nodes||[]).length,meshes:(root.meshes||[]).length,
 mapNodes:(root.nodes||[]).filter(x=>/a|b|site|bomb|spawn|plant/i.test(x.name||'')).slice(0,35).map(x=>x.name),
 topNames:(root.nodes||[]).slice(0,35).map(x=>x.name),
 accessorBounds:global,
 roots:(root.scenes||[]).map(x=>x.nodes)
}));
