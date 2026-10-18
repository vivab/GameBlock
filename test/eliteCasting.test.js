import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {
  ELITE_T_KEY,saveEliteTChoice,readTChoice,terroristAssetPath,CHOSEN_CT
} from '../src/operatorChoices.js';

const root=new URL('../',import.meta.url);
const file=p=>readFileSync(new URL(p,root),'utf8');

test('five-choice MIT masked T showroom appears in GameBlock navigation',()=>{
  const html=file('terrorists-five.html'),engine=file('src/eliteCasting.js');
  const menu=file('src/menu.js'),vite=file('vite.config.js');
  assert.match(html,/НОВАЯ ПЯТЁРКА · T/);
  assert.match(html,/src\/eliteCasting\.js/);
  assert.match(menu,/retroEliteT/);
  assert.match(menu,/terrorists-five\.html/);
  assert.match(vite,/elite:resolve/);
  assert.match(engine,/casting\/elite\/manifest\.json/);
  assert.match(engine,/loader\.loadAsync/);
  assert.match(engine,/JOYSTICK|joystick/i);
  assert.match(engine,/saveEliteTChoice/);
  assert.match(file('public/casting/elite/SOURCE_LICENSE.md'),/StarKnightt/);
  assert.match(file('public/casting/elite/SOURCE_LICENSE.md'),/MIT License/);
});

test('chosen new T variant overrides older gallery and preserves CT 08',()=>{
  const data=new Map([['gameblock:selected-masked-terrorist','2']]);
  const storage={
    setItem(key,v){data.set(key,String(v));},
    getItem(key){return data.get(key)||null;}
  };
  assert.equal(readTChoice(storage),2);
  assert.equal(saveEliteTChoice(5,storage),105);
  assert.equal(storage.getItem(ELITE_T_KEY),'5');
  assert.equal(readTChoice(storage),105);
  assert.equal(terroristAssetPath(readTChoice(storage)),'casting/elite/05.glb');
  assert.equal(terroristAssetPath(102),'casting/elite/02.glb');
  assert.equal(terroristAssetPath(2),'casting/masked/02.glb');
  assert.throws(()=>saveEliteTChoice(6,storage));
  assert.equal(CHOSEN_CT.number,8);
  assert.equal(CHOSEN_CT.path,'casting/realistic/08.glb');
});

test('five published GLBs are independent skinned outfit assets with valid textures',()=>{
  const p='public/casting/elite/manifest.json';
  if(!existsSync(new URL(p,root))){
    // First commit triggers download in GitHub Actions, which pushes GLBs later.
    assert.match(file('scripts/import_elite_terrorists.py'),/SOURCES =/);
    return;
  }
  const manifest=JSON.parse(file(p));
  assert.equal(manifest.total,5);
  assert.equal(manifest.maskedOnly,true);
  assert.equal(manifest.models.length,5);
  assert.equal(new Set(manifest.models.map(x=>x.path)).size,5);
  for(const m of manifest.models){
    assert.equal(m.male,true);
    assert.equal(m.masked,true);
    assert.ok(m.boneCount>=45);
    assert.match(m.path,/^casting\/elite\/0[1-5]\.glb$/);
    const url=new URL('public/'+m.path,root);
    assert.ok(existsSync(url),m.path+' missing after import');
    const bytes=readFileSync(url);
    assert.equal(bytes.toString('ascii',0,4),'glTF');
    assert.equal(bytes.readUInt32LE(8),bytes.length);
    const jsonlen=bytes.readUInt32LE(12);
    const data=JSON.parse(bytes.subarray(20,20+jsonlen).toString('utf8'));
    assert.ok(data.skins.some(s=>s.joints.length>=45),m.path+' lost bones');
    assert.ok(data.images?.length>=1,m.path+' lost original outfit textures');
    assert.ok(data.meshes.some(mesh=>mesh.primitives.some(pr=>
      pr.attributes.JOINTS_0!==undefined && pr.attributes.WEIGHTS_0!==undefined
    )),m.path+' no skeletal weights');
    if(m.number===5){
      assert.equal(m.derivative,true);
      assert.equal(data.extras?.gameblockEliteVariant?.rigPreserved,true);
      assert.equal(data.extras?.gameblockEliteVariant?.blackFaceCoveringPreserved,true);
    }
  }
});
