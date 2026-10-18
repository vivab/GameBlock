// A shared validator for the two independently downloaded Rocketbox galleries.
// Keep the required number dynamic: CT=10, T=15.
export function validateCastingManifest(manifest, requiredCount) {
  if(!Number.isInteger(requiredCount)||requiredCount<1)
    throw Error('Invalid character count');
  if(!manifest || manifest.total!==requiredCount ||
      !Array.isArray(manifest.models) || manifest.models.length!==requiredCount)
    throw Error('Expected '+requiredCount+' different adult male source characters');
  const models=manifest.models;
  const names=new Set(models.map(m=>m.name));
  const ids=new Set(models.map(m=>m.sourceId||m.name));
  const paths=new Set(models.map(m=>m.path));
  if(names.size!==requiredCount || ids.size!==requiredCount || paths.size!==requiredCount)
    throw Error('Expected '+requiredCount+' unique model names, IDs and GLB paths');
  if(models.some(m=>!m.male||!m.hasSkeleton||m.boneCount<20))
    throw Error('Gallery contains an unrigged or non-male character');
  if(models.some(m=>!/^casting\/(?:realistic|terrorists)\/\d{2}\.glb$/.test(m.path)))
    throw Error('Gallery model file path is invalid');
  return models;
}
