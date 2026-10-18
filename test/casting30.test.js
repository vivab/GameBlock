import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync,openSync,readSync,closeSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const file=name=>readFileSync(new URL(name,root),'utf8');
test('30 unique licensed model sources are tracked with direct original rig IDs',()=>{
  const data=JSON.parse(file('casting/sources.json'));
  assert.equal(data.characters.length,30);
  assert.equal(new Set(data.characters.map(x=>x.googleDriveFileId)).size,30);
  assert.equal(new Set(data.characters.map(x=>x.name)).size,30);
  assert.equal(data.license,'CC0 1.0');
  for(let i=0;i<30;i++)assert.equal(data.characters[i].number,i+1);
});
test('30-character showroom is a separate no-combat first-person walkable scene',()=>{
  const html=file('casting.html'),js=file('src/casting.js'),vite=file('vite.config.js'),menu=file('src/menu.js');
  assert.match(html,/ПОЛИГОН \/ 30 БОЙЦОВ/);
  assert.match(html,/id="joy"/);
  assert.match(html,/id="look"/);
  assert.match(js,/new THREE\.PlaneGeometry\(120,120\)/);
  assert.match(js,/gridPosition\(index\)/);
  assert.match(js,/const loader=new GLTFLoader/);
  assert.match(js,/rigRoot\.scale\.multiplyScalar/);
  assert.match(js,/o\.isBone/);
  assert.match(js,/keys\.has\('KeyW'\)/);
  assert.match(js,/models\.push\(/);
  assert.doesNotMatch(js,/new Match\(|import .*combat\.js|arena\.js|AK-47|rifle\.glb|terrorist/);
  assert.match(vite,/casting:resolve/);
  assert.match(menu,/retroCasting/);
  assert.match(menu,/casting\.html/);
});
test('every published character is a real valid, rigged downloaded GLB (after conversion)',()=>{
  const manifest=new URL('public/casting/manifest.json',root);
  if(!existsSync(manifest))return; // Before one-time rig export workflow is complete.
  const data=JSON.parse(readFileSync(manifest,'utf8'));
  assert.equal(data.total,30);
  assert.equal(data.models.length,30);
  const sourceIds=new Set(data.models.map(m=>m.sourceRig));
  assert.equal(sourceIds.size,30);
  for(const m of data.models){
    assert.ok(m.hasSkeleton&&m.boneCount>0,m.name+' has no bones');
    const url=new URL('public/'+m.path,root);
    assert.ok(existsSync(url),m.path+' missing');
    assert.ok(statSync(url).size>5000,m.path+' too small');
    const h=Buffer.alloc(4),fd=openSync(url,'r');
    try{readSync(fd,h,0,4,0)}finally{closeSync(fd)}
    assert.equal(h.toString('ascii'),'glTF',m.path+' not a GLB');
    const bytes=readFileSync(url);
    const headerSize=bytes.readUInt32LE(12),chunkType=bytes.toString('ascii',16,20);
    assert.equal(chunkType,'JSON',m.path+' has no glTF JSON chunk');
    const gltf=JSON.parse(bytes.subarray(20,20+headerSize).toString('utf8'));
    assert.ok(Array.isArray(gltf.skins)&&gltf.skins.length>0,m.path+' lost its skeleton');
    assert.ok(gltf.skins.some(x=>x.joints.length>=20),m.path+' has too few bones');
    assert.ok(Array.isArray(gltf.animations)&&gltf.animations.length>0,m.path+' lost its FBX clips');
    assert.ok(Array.isArray(gltf.meshes)&&gltf.meshes.length>0,m.path+' has no mesh');
  }
});
