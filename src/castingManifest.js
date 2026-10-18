// A shared validator for the two independently downloaded Rocketbox galleries.
// CT and NEW masked T gallery are both 10; original 15 remain archived.
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
  if(models.some(m=>!/^casting\/(?:realistic|terrorists|masked)\/\d{2}\.glb$/.test(m.path)))
    throw Error('Gallery model file path is invalid');
  if(manifest.maskedOnly && (requiredCount!==10 || models.some(m=>m.masked!==true)))
    throw Error('Mask-only gallery must have ten real masked characters');
  return models;
}
