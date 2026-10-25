import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const model=readFileSync('public/game1/terrorist-pistol-optimized.glb');
const html=readFileSync('public/game1/terrorist-studio.html','utf8');
test('User-supplied terrorist model is a valid glTF 2.0 binary',()=>{
 assert.equal(model.toString('utf8',0,4),'glTF');
 assert.equal(model.readUInt32LE(4),2);
 assert.equal(model.readUInt32LE(8),model.length);
 const jsonLen=model.readUInt32LE(12);
 assert.equal(model.toString('utf8',16,20),'JSON');
 const doc=JSON.parse(model.toString('utf8',20,20+jsonLen));
 assert.equal(doc.skins.length,1);
 assert.equal(doc.skins[0].joints.length,23);
 assert.equal(doc.images.length,3);
 assert.ok(doc.nodes.some(n=>/^RightHand/.test(n.name)));
 assert.ok(doc.nodes.some(n=>/^LeftHand/.test(n.name)));
 assert.ok(doc.nodes.some(n=>/^LeftUpLeg/.test(n.name)));
 assert.ok(doc.nodes.some(n=>/^RightUpLeg/.test(n.name)));
 assert.equal(doc.animations?.length||0,0);
});
test('Studio loads the real new model, and preexisting weapon assets',()=>{
 assert.match(html,/terrorist-pistol-optimized\.glb/);
 assert.match(html,/models\/g18\.glb/);
 assert.match(html,/models\/ak47\.glb/);
 assert.match(html,/knife_default_t__cs2\.glb/);
});
test('Six independent adjustment groups and saved poses are available',()=>{
 for(const section of ['right','left','both','weapon','all','legs'])
  assert.match(html,new RegExp('data-tab="'+section+'"'));
 for(const name of ['modelFile','part','speed','timeline','save','export','import','pause','resetPart','resetWeapon'])
  assert.match(html,new RegExp('id="'+name+'"'));
 for(const action of ['idle','walk','run','jump','crouch','shoot'])
  assert.match(html,new RegExp('value="'+action+'"'));
 assert.match(html,/RightForeArm/);
 assert.match(html,/LeftForeArm/);
 assert.match(html,/RightUpLeg/);
 assert.match(html,/LeftLeg/);
 assert.match(html,/localStorage\.setItem/);
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>=3);
 assert.doesNotThrow(()=>new vm.Script(scripts.at(-1)[1]));
});
