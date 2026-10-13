import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildRetroOperator,animateRetroOperator} from '../src/retroOperators.js';
import {makeHand} from '../src/retroHands.js';

for(const team of ['ct','t']){
  test(team+' uses original controllable low-poly articulated geometry',()=>{
    const model=buildRetroOperator(team);
    assert.equal(model.mode,'retro');
    assert.equal(model.arms.length,2);
    assert.equal(model.legs.length,2);
    assert.ok(model.gun.children.length>=5);
    let meshes=0;model.root.traverse(node=>{if(node.isMesh)meshes++});
    assert.ok(meshes>42,'full armor, boots, face, gloves and gun should be modeled');
    const box=new THREE.Box3().setFromObject(model.root);
    const sz=box.getSize(new THREE.Vector3());
    assert.ok(sz.y>1.6&&sz.y<2.2,'human-sized operator');
    assert.ok(sz.x<1.8&&sz.z<2.1);
  });
  test(team+' can idle, walk and recoil without stretching the rig',()=>{
    const model=buildRetroOperator(team);
    const idle=model.legs[0].hip.rotation.x;
    animateRetroOperator(model,{lastShotAt:-10},.7,1/60,3.5);
    assert.notEqual(model.legs[0].hip.rotation.x,idle);
    assert.ok(model.arms[0].elbow.rotation.x>.1);
    animateRetroOperator(model,{lastShotAt:.8},.85,1/60,0);
    assert.ok(model.gun.rotation.x>.05);
    const box=new THREE.Box3().setFromObject(model.root);
    assert.ok(box.getSize(new THREE.Vector3()).x<2);
  });
}
test('custom FPS gloves have actual segmented fingers and tactically colored sleeves',()=>{
  for(const team of ['ct','t']){
    for(const pose of ['pistol','cup','fist','open']){
      const rig=makeHand('R',pose,.105,1,team);
      assert.ok(rig.userData.hand&&rig.userData.arm);
      assert.ok(rig.userData.pose===pose);
      const ids=new Map();
      rig.traverse(node=>{
        if(typeof node.userData.finger==='number')
          ids.set(node.userData.finger,(ids.get(node.userData.finger)||0)+1);
      });
      assert.equal(ids.size,5);
      for(let i=0;i<4;i++)assert.equal(ids.get(i),3);
      assert.equal(ids.get(4),2);
    }
  }
});
