import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function glbJson(name) {
  const file = fs.readFileSync(path.join(process.cwd(), 'public/models', name));
  assert.equal(file.toString('ascii',0,4),'glTF','GLB magic');
  assert.equal(file.readUInt32LE(4),2,'GLB version');
  assert.equal(file.readUInt32LE(8),file.length,'GLB length');
  const length = file.readUInt32LE(12);
  assert.equal(file.toString('ascii',16,20),'JSON','First chunk must be JSON');
  return JSON.parse(file.toString('utf8',20,20+length));
}
function allNodeNames(model) {
  return model.nodes.map(node => node.name || '');
}
function boneNamed(nodes, expression) {
  return nodes.some(name => expression.test(name));
}

test('real uploaded CS Source terrorist includes both arms and hand/wrist bones', () => {
  const gltf = glbJson('operator_t.glb');
  assert.ok(gltf.skins?.length > 0);
  const names = allNodeNames(gltf);
  for(const bone of [/arm left shoulder 2/i,/arm right shoulder 2/i,
    /arm left elbow/i,/arm right elbow/i,/arm left wrist/i,/arm right wrist/i])
    assert.ok(boneNamed(names,bone),String(bone));
});
test('real uploaded CS2 SAS includes all arm and hand bones', () => {
  const gltf = glbJson('operator_ct.glb');
  assert.ok(gltf.skins?.length > 0);
  const names=allNodeNames(gltf);
  for(const bone of [/arm_upper_l/i,/arm_upper_r/i,/arm_lower_l/i,
    /arm_lower_r/i,/hand_l_/i,/hand_r_/i])
    assert.ok(boneNamed(names,bone),String(bone));
});
test('real Source viewmodel hands include both shoulder and wrist chains', () => {
  const gltf = glbJson('viewmodel_hands.glb');
  assert.ok(gltf.skins?.length > 0);
  const names=allNodeNames(gltf);
  for(const bone of [/Left_Arm_/i,/Right_Arm_/i,/Left_Hand_/i,/Right_Hand_/i])
    assert.ok(boneNamed(names,bone),String(bone));
});
