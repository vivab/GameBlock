#!/usr/bin/env python3
"""Blender headless: convert 30 independently authored Quaternius CC0 FBX
character meshes into GLB, KEEP their skeletons and animations.
No fake duplicates and no procedural placeholder figures.
The web showroom dresses imported humanoid sources in tactical inspection gear.
"""
import bpy, json, os, pathlib, sys, re, traceback
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCES=json.loads((ROOT/"casting/sources.json").read_text())["characters"]
SRC=ROOT/"casting/downloads"
DEST=ROOT/"public/casting/models"
DEST.mkdir(parents=True,exist_ok=True)
report=[]
for row in SOURCES:
    number=row["number"]
    filename=row["name"]+".fbx"
    source=SRC/filename
    target=DEST/f"{number:02}.glb"
    print("CANDIDATE_BEGIN",number,filename,flush=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if not source.is_file() or source.stat().st_size<25000:
        print("CANDIDATE_FAILED",number,"missing FBX",flush=True)
        continue
    try:
        bpy.ops.import_scene.fbx(filepath=str(source),use_anim=True)
        armatures=[o for o in bpy.context.scene.objects if o.type=="ARMATURE"]
        meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
        if not meshes or not armatures:
            raise ValueError(f"Non-rigged model: {len(meshes)} mesh, {len(armatures)} armatures")
        # Keep the skeleton and its existing animations; model remains fully
        # animatable for later run/jump/aim animation retargeting.
        for obj in bpy.context.scene.objects:
            obj.select_set(obj.type in ("MESH","ARMATURE","EMPTY"))
        # Select a human-ready pose if an action contains "idle"/"hold"; keep
        # all armatures and meshes with original bind matrices.
        actions=list(bpy.data.actions)
        preferred=next((a for a in actions if re.search(r"aim|rifle|combat|idle",a.name,re.I)),None)
        if preferred:
            for arm in armatures:
                if arm.animation_data is None: arm.animation_data_create()
                arm.animation_data.action=preferred
        bpy.context.scene.frame_set(1)
        bpy.ops.export_scene.gltf(filepath=str(target),
           export_format='GLB',use_selection=True,
           export_animations=True,export_nla_strips=False,
           export_current_frame=True,export_apply=False)
        if not target.exists() or target.stat().st_size<5000:
            raise ValueError("Empty GLB export")
        glb=target.read_bytes()[:4]
        if glb!=b'glTF': raise ValueError("Export is not glTF binary")
        bones=sum(len(a.data.bones) for a in armatures)
        info={
          "number":number,"name":row["name"],"path":f"casting/models/{number:02}.glb",
          "source":"Quaternius / Ultimate Animated Character Pack","license":"CC0 1.0",
          "licenseUrl":"https://creativecommons.org/publicdomain/zero/1.0/",
          "sourceUrl":"https://quaternius.com/packs/ultimatedanimatedcharacter",
          "hasSkeleton":True,"boneCount":bones,"meshCount":len(meshes),
          "sourceRig":row["name"],"sourceKind":row["theme"],
          "bytes":target.stat().st_size,"exportedAnimations":len(actions),
        }
        report.append(info)
        print("CANDIDATE_OK",number,"bytes",info["bytes"],
          "meshes",info["meshCount"],"bones",bones,"actions",len(actions),flush=True)
    except Exception as exc:
        print("CANDIDATE_FAILED",number,type(exc).__name__,str(exc)[:250],flush=True)
        traceback.print_exc()
        target.unlink(missing_ok=True)
out=ROOT/"public/casting/manifest.json"
out.write_text(json.dumps({"total":len(report),"expected":30,
   "note":"30 distinct open-licensed source FBX meshes converted to rigged GLB. Several originate as non-military humans dressed for an inspection scene; do not treat all as independently sourced photorealistic SWAT.",
   "models":report},ensure_ascii=False,indent=2)+"\n")
print("CASTING_COMPLETE",len(report),"of",len(SOURCES),flush=True)
if len(report)!=len(SOURCES):
   raise RuntimeError(f"Required 30 rigged candidates; only {len(report)} successful GLB exports")
