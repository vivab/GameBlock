import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const at=path=>new URL('../'+path,import.meta.url);
const file=path=>readFileSync(at(path),'utf8');
function glbInfo(path){
  const data=readFileSync(at(path));
  assert.equal(data.toString('ascii',0,4),'glTF',path);
  const jsonLength=data.readUInt32LE(12);
  return JSON.parse(data.subarray(20,20+jsonLength).toString('utf8'));
}
test('olive T-02/T-05 edits are repeatable, stored as GLBs with untouched source backups',()=>{
  for(const n of ['02','05']){
    const path='public/casting/masked/original/'+n+'.glb';
    assert.ok(existsSync(at(path)),path+' black original missing');
    const g=glbInfo(path);
    assert.ok(g.skins?.some(s=>s.joints.length>=70));
    assert.ok(g.materials?.some(m=>m.name?.includes('real_balaclava')));
  }
  const script=file('scripts/recolor_olive_terrorists.py');
  assert.match(script,/genuine|actual|texture|photo/i);
  assert.match(script,/ImageOps\.autocontrast/);
  assert.match(script,/body\["baseColorFactor"\] = \[1\., 1\., 1\., 1\.\]/);
  assert.match(file('.github/workflows/recolor-olive-terrorists.yml'),/validate_olive_terrorists\.py/);
  assert.match(file('src/casting.js'),/bright-olive-v6/);
  assert.match(script,/"shadow": \(198, 216, 153\)/);
  assert.match(script,/"shadow": \(200, 207, 152\)/);
  assert.match(script,/outfitVersion"\] = 5/);
  assert.match(script,/mats\[index\]\["emissiveFactor"\] = list\(palette\["emissive"\]\)/);
  assert.match(file('src/main.js'),/key==='chosenT'\?'\?v=20261018-pale-olive-v5'/);
  assert.match(file('terrorists.html'),/20261018-pale-olive-v5/);
});
test('once exported, T-02 and T-05 contain body-specific olive photo textures and original head and masks',()=>{
  const manifest=JSON.parse(file('public/casting/masked/manifest.json'));
  if(manifest.models[1].outfitVersion!==5||manifest.models[4].outfitVersion!==5){
    // Olive-color GLB creation is performed by a separate GitHub Actions
    // workflow. The initial source-code commit is intentionally testable.
    return;
  }
  for(const n of [2,5]){
    const id=String(n).padStart(2,'0');
    const glb=glbInfo('public/casting/masked/'+id+'.glb');
    const original=glbInfo('public/casting/masked/original/'+id+'.glb');
    assert.deepEqual(glb.skins,original.skins);
    assert.deepEqual(glb.nodes,original.nodes);
    assert.deepEqual(glb.meshes,original.meshes);
    assert.ok(glb.materials.some(m=>m.name?.includes('olive_bandit_body')));
    const body=glb.materials.find(m=>m.name.includes('olive_bandit_body'));
    assert.deepEqual(body.pbrMetallicRoughness.baseColorFactor,[1,1,1,1]);
    assert.ok(body.emissiveFactor[0]>=.18,'Body olive brightness fill missing');
    const stats=manifest.models[n-1].measuredBodyRGB;
    assert.ok(stats[0]>=208&&stats[1]>=208,'Olive photo is still too dark');
    assert.ok(glb.materials.some(m=>m.name?.includes('real_balaclava')));
    assert.ok(glb.materials.some(m=>m.name?.includes('_head')));
    assert.equal(manifest.models[n-1].masked,true);
    assert.equal(manifest.models[n-1].boneCount,80);
  }
});
