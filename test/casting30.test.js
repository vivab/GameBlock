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
test('ten imported male soldier models are shown in an unarmed first-person walkable scene',()=>{
  const html=file('casting.html'),js=file('src/casting.js'),vite=file('vite.config.js'),menu=file('src/menu.js');
  assert.match(html,/ПОЛИГОН \/ 10 РЕАЛИСТИЧНЫХ БОЙЦОВ/);
  assert.match(html,/id="joy"/);
  assert.match(html,/id="look"/);
  assert.match(js,/new THREE\.PlaneGeometry\(55,55\)/);
  assert.match(js,/gridPosition\(i\)/);
  assert.match(js,/const loader=new GLTFLoader/);
  assert.match(js,/body\.scale\.multiplyScalar/);
  assert.match(js,/node\.isBone/);
  assert.match(js,/keys\.has\('KeyW'\)/);
  assert.match(js,/operators\.push\(/);
  assert.doesNotMatch(js,/new Match\(|import .*combat\.js|arena\.js|AK-47|rifle\.glb/);
  assert.match(vite,/casting:resolve/);
  assert.match(menu,/retroCasting/);
  assert.match(menu,/НАШ СПЕЦНАЗ №08/);
  assert.doesNotMatch(js,/addTacticalGear|new THREE\.BoxGeometry|createSwatV6Operator/);
  assert.match(js,/casting\/realistic\/manifest\.json/);
  assert.match(file('showroom.html'),/location\.replace\('\.\/casting\.html'\)/);
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

test('ten genuinely different male military and police FBX imports preserve skins and textures',()=>{
  const manifest=JSON.parse(file('public/casting/realistic/manifest.json'));
  assert.equal(manifest.total,10);
  assert.equal(manifest.models.length,10);
  assert.equal(new Set(manifest.models.map(m=>m.name)).size,10);
  assert.equal(manifest.models.filter(m=>m.kind==='military').length,6);
  assert.equal(manifest.models.filter(m=>m.kind==='police-tactical').length,4);
  for(const m of manifest.models){
    assert.equal(m.male,true);
    assert.equal(m.hasSkeleton,true);
    assert.ok(m.boneCount>=60,m.name+' has no usable full-body bones');
    assert.equal(m.license,'MIT');
    assert.match(m.path,/^casting\/realistic\/\d\d\.glb$/);
    const loc=new URL('public/'+m.path,root);
    assert.ok(existsSync(loc),m.path+' not checked into GameBlock');
    assert.ok(statSync(loc).size>200000,m.path+' appears empty');
    const bytes=readFileSync(loc);
    assert.equal(bytes.toString('ascii',0,4),'glTF',m.name+' not GLB');
    const length=bytes.readUInt32LE(12);
    const json=JSON.parse(bytes.subarray(20,20+length).toString('utf8'));
    assert.ok(json.skins?.some(x=>x.joints.length>=60),m.name+' rig missing');
    assert.ok(json.textures?.length>=1,m.name+' texture missing');
    assert.ok(json.meshes?.some(mesh=>mesh.primitives?.some(p=>
      p.attributes?.JOINTS_0!==undefined && p.attributes?.WEIGHTS_0!==undefined
    )),m.name+' geometry not skinned');
  }
});

test('T gallery is now ten skinned MALE characters with fitting face masks',()=>{
  const html=file('terrorists.html'),js=file('src/casting.js');
  const config=file('src/operatorChoices.js'),vite=file('vite.config.js');
  assert.match(html,/data-role="terrorists"/);
  assert.match(html,/10 БОЙЦОВ В МАСКАХ/);
  assert.match(js,/forT\?T_COUNT:10/);
  assert.match(js,/casting\/masked\/manifest\.json/);
  assert.match(config,/gameblock:selected-masked-terrorist/);
  assert.match(config,/casting\/masked\//);
  assert.match(vite,/terrorists:resolve/);
  assert.match(file('src/menu.js'),/10 БОЙЦОВ T · В МАСКАХ/);
  assert.match(config,/Police Male 02/);
  assert.match(config,/casting\/realistic\/08\.glb/);
  assert.match(file('src/main.js'),/createRocketboxOperator\(preferred,actor\.team\)/);
});
test('all ten masks are attached to actual skin-weighted human meshes, not hovering boxes',()=>{
  const m=JSON.parse(file('public/casting/masked/manifest.json'));
  assert.equal(m.total,10);
  assert.equal(m.maskedOnly,true);
  assert.equal(m.models.length,10);
  assert.equal(new Set(m.models.map(e=>e.sourceId)).size,10);
  for(const person of m.models){
    assert.equal(person.male,true);
    assert.equal(person.masked,true);
    assert.ok(person.boneCount>=70);
    const f=new URL('public/'+person.path,root);
    assert.ok(existsSync(f),person.path+' missing from git');
    const raw=readFileSync(f);
    assert.ok(raw.length>120000);
    assert.equal(raw.toString('ascii',0,4),'glTF');
    const len=raw.readUInt32LE(12);
    const gltf=JSON.parse(raw.subarray(20,20+len).toString('utf8'));
    assert.ok(gltf.skins.some(s=>s.joints.length>=70));
    const masks=new Set(gltf.materials.map((x,i)=>x.name?.includes('real_balaclava')?i:-1).filter(i=>i>=0));
    assert.ok(masks.size>=1,'missing mask material: '+person.name);
    assert.ok(gltf.meshes.some(mesh=>mesh.primitives.some(p=>
      masks.has(p.material) && 'JOINTS_0' in p.attributes && 'WEIGHTS_0' in p.attributes
    )),'balaclava floats instead of being skinned: '+person.name);
  }
});

test('terrorist gallery preserves fabric textures and excludes masks from recoloring',()=>{
  const js=file('src/casting.js');
  assert.match(js,/recolorFabric\(material\.map/);
  assert.match(js,/canvas\.getContext/);
  assert.match(js,/ctx\.putImageData/);
  assert.match(js,/balaclava\|head\|face/);
  assert.match(js,/material\.map=tinted/);
});
test('gallery and match preserve masked heads and distinct clothing palettes',()=>{
  const gallery=file('src/casting.js');
  const inMatch=file('src/rocketboxOperator.js');
  assert.match(gallery,/balaclava\|head\|face/);
  assert.match(gallery,/pant\|trouser/);
  assert.match(gallery,/boot\|shoe/);
  assert.match(gallery,/recolorFabric/);
  assert.match(inMatch,/balaclava\|_head/);
  assert.match(inMatch,/pant\|trouser/);
  assert.match(inMatch,/boot\|shoe/);
});
