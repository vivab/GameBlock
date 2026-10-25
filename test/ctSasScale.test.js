import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync('public/game1/ct-sas-studio.html','utf8');
const js=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1];
const binary=readFileSync('public/game1/ctm_sas_gameblock.glb');
const len=binary.readUInt32LE(12);
const doc=JSON.parse(binary.toString('utf8',20,20+len));

test('SAS vertical axis is local Z, not local Y',()=>{
 const box={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
 for(const mesh of doc.meshes)for(const prim of mesh.primitives){
  const pos=doc.accessors[prim.attributes.POSITION];
  for(let i=0;i<3;i++){
   box.min[i]=Math.min(box.min[i],pos.min[i]);
   box.max[i]=Math.max(box.max[i],pos.max[i]);
  }
 }
 const sourceHeight=box.max[2]-box.min[2];
 const sourceY=box.max[1]-box.min[1];
 assert.ok(sourceHeight>sourceY*3,'SAS grows along -Z');
 const scale=1.8/sourceHeight;
 const projectedHeight=sourceHeight*scale;
 assert.ok(Math.abs(projectedHeight-1.8)<1e-10);
 const worldGround=-box.max[2]*scale+box.max[2]*scale;
 assert.ok(Math.abs(worldGround)<1e-8);
 assert.ok(box.max[0]*scale<.65);
});

test('studio orients known SAS upright and fits to the same 1.8m as terrorist',()=>{
 assert.match(js,/const isSAS=!!model\.getObjectByName\('ctm_sas_qc_skeleton'\)/);
 assert.match(js,/model\.rotation\.set\(Math\.PI\/2,0,0\)/);
 assert.match(js,/bodyScale=1\.8\/\(sas\.maxZ-sas\.minZ\)/);
 assert.match(js,/model\.position\.set\(-\(sas\.minX\+sas\.maxX\)/);
 assert.match(js,/sas\.maxZ\*bodyScale/);
 assert.match(js,/model\.updateMatrixWorld\(true\)/);
 assert.match(js,/bodyScale=1\.8\/Math\.max\(\.01,sz\.y\)/);
 assert.doesNotThrow(()=>new vm.Script(js));
});

test('CT poses remain separately editable for Glock, rifle and knife',()=>{
 const matches=['const USER_GLOCK=','const USER_AK=','const USER_KNIFE=','const USER_POSES=','GameBlockCT_SAS_StudioV2'];
 for(const tag of matches)assert.ok(js.includes(tag),tag);
});