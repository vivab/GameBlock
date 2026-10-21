// Build-time export of the original Block Tactical Fighter v1.0 as a real,
 // skinned GLB with named bones. Called by npm run build before Vite copies
 // public/ into GitHub Pages.
import {mkdir,writeFile} from 'node:fs/promises';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createBlockFighter} from '../src/blockFighter.js';

if(typeof globalThis.FileReader==='undefined'){
 class NodeFileReader {
  async readAsArrayBuffer(blob){
   try{this.result=await blob.arrayBuffer();this.onloadend?.({target:this})}
   catch(error){this.error=error;this.onerror?.({target:this})}
  }
  async readAsDataURL(blob){
   try{
    const bytes=Buffer.from(await blob.arrayBuffer());
    this.result='data:'+(blob.type||'application/octet-stream')+';base64,'+bytes.toString('base64');
    this.onloadend?.({target:this});
   }catch(error){this.error=error;this.onerror?.({target:this})}
  }
 }
 globalThis.FileReader=NodeFileReader;
}
const model=createBlockFighter({mode:'idle'});
model.update(0,'idle');
model.root.updateMatrixWorld(true);
const exporter=new GLTFExporter();
const result=await exporter.parseAsync(model.root,{binary:true,trs:true,onlyVisible:true,animations:[]});
if(!(result instanceof ArrayBuffer))throw Error('GLTFExporter did not produce binary GLB');
const bytes=Buffer.from(result);
if(bytes.subarray(0,4).toString('ascii')!=='glTF')throw Error('Incorrect GLB signature');
const filename='public/models/block_fighter_v1.glb';
await mkdir('public/models',{recursive:true});
await writeFile(filename,bytes);
console.log('Block Fighter: '+filename+', '+bytes.byteLength+' bytes, '+model.joints.length+' bones, '+model.triangles+' triangles');
model.dispose();
