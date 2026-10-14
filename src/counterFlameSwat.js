import * as THREE from 'three';

// Our own Counter Flame SWAT V1: static prototype with 60 separate body/equipment parts.
// No armature is included yet. Never send this model to the skinned rig animator.
export function createStaticSwatOperator(gltf) {
  if (!gltf?.scene) return null;
  const root = new THREE.Group();
  root.name = 'Counter Flame / SWAT V1';
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
  return {root, visual, mode: 'static-swat', team: 'ct'};
}
