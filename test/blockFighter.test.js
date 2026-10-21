import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBlockFighter,FIGHTER_ACTIONS} from '../src/blockFighter.js';

test('Block Fighter v1 is a genuinely rigged single skinned mesh',()=>{
 const fighter=createBlockFighter();
 assert.equal(fighter.mesh.isSkinnedMesh,true);
 assert.ok(fighter.skeleton.bones.length>=25);
 assert.equal(fighter.mesh.geometry.getAttribute('skinIndex').itemSize,4);
 assert.ok(fighter.triangles<4000);
 assert.ok(fighter.triangles>200);
 assert.equal(fighter.parts.filter(p=>p.name.startsWith('ThighPouch')&&!p.name.includes('Flap')).length,2);
 assert.equal(fighter.parts.some(p=>/knife/i.test(p.name)),false);
 for(const name of [
  'Head','Spine_01','Spine_02','Pelvis',
  'UpperArm_R','Forearm_R','Hand_R','UpperArm_L','Forearm_L','Hand_L',
  'Thigh_R','Calf_R','Foot_R','Thigh_L','Calf_L','Foot_L',
  'WeaponSocket_R','WeaponSupport_L'
 ])assert.ok(fighter.bones[name],name);
 fighter.dispose();
});
test('All modes produce independent controllable joint motion, never T-pose',()=>{
 const f=createBlockFighter();
 for(const action of FIGHTER_ACTIONS){
  f.update(.22,action);
  f.root.updateMatrixWorld(true);
  for(const key of ['Hand_R','Hand_L','Foot_R','Foot_L']){
   const p=f.bones[key].getWorldPosition(new THREE.Vector3());
   assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z),key+' '+action);
  }
 }
 f.update(0,'run');const first=f.bones.Thigh_L.rotation.x;
 f.update(.26,'run');const second=f.bones.Thigh_L.rotation.x;
 assert.ok(Math.abs(first-second)>.15,'leg swings visibly when running');
 f.update(.15,'aim');
 assert.ok(f.bones.UpperArm_R.rotation.x<-.55,'weapon arm raised to aim');
 f.update(.1,'crouch');
 assert.ok(f.bones.Root.position.y<-.1,'crouch lowers body');
 f.update(.5,'jump');
 assert.ok(f.bones.Root.position.y>.4,'jump lifts character');
 f.setManual('Head','y',35);f.update(.3,'idle');
 assert.ok(f.bones.Head.rotation.y>.4);
 f.resetManual();f.update(.3,'idle');
 assert.ok(Math.abs(f.bones.Head.rotation.y)<.1);
 f.dispose();
});
test('Rigged GLB exporter retains skinning and bone hierarchy',async()=>{
 // Node 22 has Blob but not FileReader; the official three.js exporter uses it.
 class FileReaderShim{
  async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.()}
  async readAsDataURL(blob){
   const bytes=Buffer.from(await blob.arrayBuffer());
   this.result='data:'+(blob.type||'application/octet-stream')+';base64,'+bytes.toString('base64');
   this.onloadend?.();
  }
 }
 globalThis.FileReader??=FileReaderShim;
 const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
 const model=createBlockFighter();
 model.update(0,'idle');
 const result=await new GLTFExporter().parseAsync(model.root,{binary:true,trs:true});
 assert.ok(result instanceof ArrayBuffer);
 const view=new DataView(result);
 assert.equal(view.getUint32(0,true),0x46546c67,'GLB magic');
 assert.ok(result.byteLength>4000);
 model.dispose();
});


test('Skinned vertices actually follow their thigh and forearm bones',()=>{
 const fighter=createBlockFighter();
 const vertices=fighter.verticesByPart;
 for(const [part,mode0,mode1,t0,t1] of [
  ['ThighPantsL','idle','run',0,.25],
  ['SleeveUpperR','idle','aim',0,.18],
 ]){
  const begin=vertices[part]?.[0];
  assert.ok(Number.isInteger(begin),'vertex range for '+part);
  const idx=begin+4;
  const pos=fighter.mesh.geometry.getAttribute('position');
  const restVertex=new THREE.Vector3().fromBufferAttribute(pos,idx);
  fighter.update(t0,mode0);
  fighter.root.updateMatrixWorld(true);
  fighter.mesh.updateMatrixWorld(true);
  const before=fighter.mesh.applyBoneTransform(idx,restVertex.clone());
  fighter.update(t1,mode1);
  fighter.root.updateMatrixWorld(true);
  fighter.mesh.updateMatrixWorld(true);
  const after=fighter.mesh.applyBoneTransform(idx,restVertex.clone());
  assert.ok(before.distanceTo(after)>.012,part+' should visibly deform with the bone pose');
 }
 fighter.dispose();
});
