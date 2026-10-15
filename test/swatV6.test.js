import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {
  SWAT_V6_VARIANTS, SWAT_V6_KEY, safeVariantIndex,
  loadSwatSelection, saveSwatSelection, createSwatV6Operator,
} from '../src/swatV6.js';

test('SWAT V6 has exactly 20 original, distinct named tactical loadouts',()=>{
  assert.equal(SWAT_V6_VARIANTS.length,20);
  assert.equal(new Set(SWAT_V6_VARIANTS.map(x=>x.id)).size,20);
  assert.equal(new Set(SWAT_V6_VARIANTS.map(x=>x.name)).size,20);
  assert.ok(new Set(SWAT_V6_VARIANTS.map(x=>x.helmet)).size>=5);
  assert.ok(new Set(SWAT_V6_VARIANTS.map(x=>x.armor)).size>=4);
  assert.ok(new Set(SWAT_V6_VARIANTS.map(x=>x.face)).size>=5);
  for(const [i,preset] of SWAT_V6_VARIANTS.entries()){
    assert.equal(preset.id,'V6-'+String(i+1).padStart(2,'0'));
    assert.ok(Number.isInteger(preset.cloth));
    assert.ok(Number.isInteger(preset.vest));
    assert.notEqual(preset.cloth,preset.maskColor);
    assert.ok(preset.magazines>=2&&preset.magazines<=4);
  }
});

test('V6 selection persists and safely resets invalid saved numbers',()=>{
  const data=new Map();
  const storage={
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>data.set(key,value),
  };
  assert.equal(SWAT_V6_KEY,'gameblock:swat-v6-variant');
  assert.equal(loadSwatSelection(storage),0);
  assert.equal(saveSwatSelection(17,storage),17);
  assert.equal(loadSwatSelection(storage),17);
  data.set(SWAT_V6_KEY,'999');
  assert.equal(loadSwatSelection(storage),0);
  assert.equal(safeVariantIndex(-3),0);
  assert.equal(safeVariantIndex(20),0);
  assert.equal(safeVariantIndex(19),19);
  assert.equal(loadSwatSelection({getItem(){throw Error('blocked');}}),0);
});

test('two V6 variants create different real 3D meshes and empty-handed tactical accessories',()=>{
  const scene=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(.5,1.88,.29),
    new THREE.MeshStandardMaterial({color:0x777777}));
  body.position.y=.94;
  scene.add(body);
  const gltf={scene};
  const classic=createSwatV6Operator(gltf,0);
  const heavy=createSwatV6Operator(gltf,4);
  assert.ok(classic&&heavy);
  assert.equal(classic.version,6);
  assert.equal(heavy.variant,4);
  const meshesA=[],meshesB=[];
  classic.root.traverse(x=>{if(x.isMesh)meshesA.push(x);});
  heavy.root.traverse(x=>{if(x.isMesh)meshesB.push(x);});
  assert.ok(meshesA.length>=18,'Actual gear meshes, not recolored screenshots');
  assert.ok(meshesB.length>meshesA.length,'Heavy armor has separate hard plates');
  assert.ok(meshesA.some(m=>m.name==='V6 angular chest armour'));
  assert.ok(meshesB.some(m=>m.name==='V6 reinforcing upper plate'));
  assert.notEqual(meshesA[0].geometry,meshesB[0].geometry);
  assert.notEqual(meshesA[0].material,meshesB[0].material);
  assert.ok(meshesA[0].geometry.getAttribute('color'));
  assert.equal(meshesA.every(m=>!/rifle|weapon|gun/i.test(m.name)),true);
  assert.equal(meshesB.every(m=>!/rifle|weapon|gun/i.test(m.name)),true);
  classic.release();
  heavy.release();
});

test('main game has 20-operator live 3D gallery and selected CT NPC variant',()=>{
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const menu=readFileSync(new URL('../src/menu.js',import.meta.url),'utf8');
  const gallery=readFileSync(new URL('../src/swatV6Gallery.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(main,/createSwatV6Operator\(gltf,selectedSwatIndex\)/);
  assert.match(main,/showGalleryPage\(page,pageSize\)/);
  assert.match(main,/renderer\.render\(galleryScene,galleryCamera\)/);
  assert.match(main,/staticBots: true/);
  assert.match(main,/swat:'counter_flame_swat_v5'/);
  assert.match(main,/saveSwatSelection\(index\)/);
  assert.match(menu,/retroGallery/);
  assert.match(gallery,/v6Choices/);
  assert.match(gallery,/v6Strip/);
  assert.match(html,/openSwatGallery/);
});
