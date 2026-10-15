import * as THREE from 'three';

// Counter Flame SWAT V3: original human-proportioned tactical NPC.
// The source generator creates independent equipment/body pieces, then batches
// them as one render mesh so multiple SWAT fighters run smoothly on phones.
// Both hands are empty and shaped as though gripping an invisible rifle.
// This is a static inspection model: no fake animation or skinned-rig claims.
export function createStaticSwatOperator(gltf) {
  if (!gltf?.scene) return null;
  const root = new THREE.Group();
  root.name = 'Counter Flame / SWAT V3';
  const visual = gltf.scene.clone(true);
  root.add(visual);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(visual);
  const height = bounds.max.y - bounds.min.y;
  if (!Number.isFinite(height) || height < 0.1) return null;
  const scale = 1.88 / height;
  visual.scale.setScalar(scale);
  visual.position.set(
    -(bounds.min.x + bounds.max.x) * scale / 2,
    -bounds.min.y * scale,
    -(bounds.min.z + bounds.max.z) * scale / 2,
  );
  visual.traverse(node => {
    if (node.isMesh) {
      node.castShadow = false;
      node.receiveShadow = true;
    }
  });
  return {root, visual, mode: 'static-swat', team: 'ct', version: 3};
}
