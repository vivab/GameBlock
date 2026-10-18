import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCastingManifest} from '../src/castingManifest.js';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
test('CT ten and T fifteen real rigged GLB manifests both load without a hardcoded 10 model ceiling',()=>{
  const ct=read('public/casting/realistic/manifest.json');
  const t=read('public/casting/terrorists/manifest.json');
  assert.equal(validateCastingManifest(ct,10).length,10);
  assert.equal(validateCastingManifest(t,15).length,15);
  assert.equal(new Set(t.models.map(x=>x.sourceId)).size,15);
  const masked=read('public/casting/masked/manifest.json');
  assert.equal(validateCastingManifest(masked,10).length,10);
  assert.ok(masked.models.every(x=>x.masked));
  const invalid=structuredClone(masked);
  invalid.models[0].masked=false;
  assert.throws(()=>validateCastingManifest(invalid,10),/mask/i);
});
test('a 15-model gallery rejects duplicate sources without rejecting correct fifteen',()=>{
  const real=read('public/casting/terrorists/manifest.json');
  const duplicate=structuredClone(real);
  duplicate.models[14].name=duplicate.models[0].name;
  assert.throws(()=>validateCastingManifest(duplicate,15),/unique/);
  assert.throws(()=>validateCastingManifest(real,10),/Expected 10/);
});
test('both live galleries validate model counts using shared CT and masked T rules',()=>{
  const js=readFileSync(new URL('../src/casting.js',import.meta.url),'utf8');
  assert.match(js,/const count=forT\?T_COUNT:10/);
  assert.match(js,/validateCastingManifest\(source,count\)/);
  assert.doesNotMatch(js,/new Set\(entries.map\(e=>e.name\)\).size!==10/);
});
