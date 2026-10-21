import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBlockFighter} from '../src/blockFighter.js';
import {createWeaponView} from '../src/viewmodels.js';
import {GLOVE_PRESETS,listGlovePresets} from '../src/gloveSkins.js';
import {createThirdPersonLoadout,THIRD_PERSON_GRIPS} from '../src/thirdPersonGrip.js';

test('Every FPS weapon supports independently swappable glove skins and bare forearms',()=>{
 assert.ok(listGlovePresets().length>=4);
 for(const kind of ['rifle','pistol','knife']){
  const view=createWeaponView(kind);
  const first=view.arms.right.userData.mesh;
  const base=first.userData.hand;
  assert.ok(base);
  view.setGloveStyle({preset:'olive',sleeveMode:'bare'});
  assert.equal(view.gloveStyle.preset,'olive');
  assert.equal(view.gloveStyle.sleeveMode,'bare');
  assert.equal(view.arms.right.userData.mesh.userData.hand,base,
   'recolor must NOT rebuild animated hand pivots');
  assert.equal(view.arms.left.userData.mesh.userData.modularGlove.preset,'olive');
  let gloveParts=0,sleeveParts=0;
  first.traverse(mesh=>{
   if(mesh.userData.glovePart==='glove'){
    gloveParts++;
    assert.equal(mesh.material.color.getHex(),GLOVE_PRESETS.olive.glove);
   }
   if(mesh.userData.glovePart==='sleeve')sleeveParts++;
  });
  assert.ok(gloveParts>=1&&sleeveParts>=1);
  view.setTeam('t');
  assert.equal(view.arms.right.userData.mesh.userData.modularGlove.sleeveMode,'bare',
   'cosmetics must survive team changes and glove rebuild');
  assert.throws(()=>view.setGloveStyle({preset:'nonexistent'}),/Unknown glove/);
 }
});
test('Third-person rifle and pistol each have separate defined trigger and support grips',()=>{
 for(const kind of ['rifle','pistol']){
  const spec=THIRD_PERSON_GRIPS[kind];
  assert.ok(spec);
  assert.notDeepEqual(spec.right,spec.left);
  const fighter=createBlockFighter();
  const rig=createThirdPersonLoadout(fighter,{kind});
  fighter.update(0,'aim');
  const errors=rig.update({kind,time:0,mode:'aim'});
  console.log('Third-person IK grip residuals',kind,JSON.stringify(errors));
  for(const x of [errors.right,errors.left]){
   assert.ok(Number.isFinite(x),'IK generated an invalid grip offset');
   assert.ok(x<.025,kind+' hand must visibly touch the weapon: '+x);
  }
  assert.equal(rig.weapons[kind].root.visible,true);
  assert.equal(rig.weapons[kind==='rifle'?'pistol':'rifle'].root.visible,false);
  const gun=rig.weapons[kind].root;
  assert.ok(gun.children.some(x=>x.name.includes(kind==='rifle'?'AK':'Pistol')));
  rig.update({kind:kind==='rifle'?'pistol':'rifle',time:.2,mode:'aim',fire:true});
  assert.equal(rig.weapons[rig.kind].flash.visible,true);
  fighter.dispose();
 }
});
test('Third-person firearm has correct muzzle direction and does not embed gun in fighter mesh',()=>{
 const fighter=createBlockFighter();
 const rig=createThirdPersonLoadout(fighter,{kind:'rifle'});
 fighter.update(.5,'aim');
 rig.update({time:.5,kind:'rifle'});
 fighter.root.updateMatrixWorld(true,true);
 const gun=rig.weapons.rifle.root;
 const stock=gun.localToWorld(new THREE.Vector3(...THIRD_PERSON_GRIPS.rifle.stock));
 const muzzle=gun.localToWorld(new THREE.Vector3(...THIRD_PERSON_GRIPS.rifle.muzzle));
 const front=fighter.root.localToWorld(new THREE.Vector3(0,0,2));
 const origin=fighter.root.localToWorld(new THREE.Vector3(0,0,0));
 assert.ok(muzzle.clone().sub(stock).dot(front.sub(origin))>0,
  'AK barrel points forward relative to fighter');
 assert.equal(fighter.parts.some(x=>/rifle|pistol|knife/i.test(x.name)),false);
 fighter.dispose();
});


test('Third-person placeholder can be swapped for future X/Y/Z-axis GLB geometry',()=>{
 const f=createBlockFighter();
 const gear=createThirdPersonLoadout(f,{kind:'rifle'});
 for(const [kind,length,vector] of [
  ['rifle',2.8,[2.8,.25,.3]],
  ['pistol',.36,[.2,.36,.15]]
 ]){
  const source=new THREE.Group();
  source.add(new THREE.Mesh(new THREE.BoxGeometry(...vector),
   new THREE.MeshStandardMaterial()));
  const item=gear.weapons[kind];
  const result=gear.setModel(kind,source);
  assert.equal(result.imported,true);
  assert.equal(item.importHolder.children.length,1);
  assert.ok(item.proxyParts.every(obj=>obj.visible===false));
  gear.setKind(kind);
  f.update(.2,'aim');
  const errors=gear.update({kind,mode:'aim',time:.2});
  assert.ok(errors.right<.025&&errors.left<.025,'GLB must not alter hand grip sockets');
  const bbox=new THREE.Box3().setFromObject(item.importHolder);
  const size=bbox.getSize(new THREE.Vector3());
  assert.ok(size.length()>.15,'imported weapon must be visible');
  assert.equal(gear.setModel(kind,null).imported,false);
  assert.equal(item.importHolder.children.length,0);
  assert.ok(item.proxyParts.every(obj=>obj.visible===true));
 }
 f.dispose();
});
