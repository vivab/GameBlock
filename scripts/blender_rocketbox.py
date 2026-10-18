"""Convert the source *skeletal* Rocketbox FBX into a web-safe rigged GLB.

Blender command:
 blender --background -noaudio --python scripts/blender_rocketbox.py -- SOURCE.fbx OUTPUT.glb
"""
import bpy
import sys
from pathlib import Path

args=sys.argv[sys.argv.index("--")+1:]
SOURCE,DEST=map(Path,args[:2])
assert SOURCE.is_file(),SOURCE
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.fbx(filepath=str(SOURCE),use_anim=False,
                         use_custom_normals=True,automatic_bone_orientation=False)
from mathutils import Vector

armatures=[o for o in bpy.data.objects if o.type=="ARMATURE"]
meshes=[o for o in bpy.data.objects if o.type=="MESH"]
if not armatures or not meshes:
    raise ValueError("Input needs skinned mesh AND real armature")
print("Imported rig bones:",[(x.name,len(x.data.bones)) for x in armatures],flush=True)
if max(len(a.data.bones) for a in armatures)<14:
    raise ValueError("Not a genuine useful male skeletal model")
if not any(any(m.type=="ARMATURE" for m in x.modifiers) for x in meshes):
    raise ValueError("Avatar geometry has no working armature skin modifier")
textures=list(SOURCE.parent.glob("*.jpg"))
assert len(textures)>=2,"Source textures missing"
def best_texture(name,inputs):
    # Legacy Rocketbox FBXs often refer to local Windows .tga paths.
    text=name.lower().replace(" ","_").replace(".001","")
    scores=[]
    for tex in inputs:
        stem=tex.stem.lower()
        prefix=stem.split("_")[0]
        score=0
        if prefix in text: score+=3
        for term in ("body","head","helmet","equipment","pistol","knife","opacity"):
            if term in text and term in stem: score+=10
        for part in text.split("_"):
            if len(part)>3 and part in stem: score+=1
        scores.append(score)
    match=max(range(len(inputs)),key=lambda i:scores[i])
    return inputs[match] if scores[match]>=4 else None

for mat in bpy.data.materials:
    imgpath=best_texture(mat.name,textures)
    if imgpath is None:
        for x in mat.node_tree.nodes if mat.use_nodes else []:
            if x.type=="TEX_IMAGE" and x.image:
                imgpath=best_texture(Path(x.image.filepath).stem,textures)
                if imgpath: break
    mat.use_nodes=True
    nodes=mat.node_tree.nodes
    nodes.clear()
    output=nodes.new("ShaderNodeOutputMaterial")
    bsdf=nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value=.90
    bsdf.inputs["Metallic"].default_value=0
    mat.node_tree.links.new(bsdf.outputs["BSDF"],output.inputs["Surface"])
    if imgpath:
        tex=nodes.new("ShaderNodeTexImage")
        tex.image=bpy.data.images.load(str(imgpath.resolve()),check_existing=True)
        mat.node_tree.links.new(tex.outputs["Color"],bsdf.inputs["Base Color"])
        tex.image.pack()
        print("texture:",mat.name,"->",imgpath.name,flush=True)
    else:
        print("WARNING: untextured material:",mat.name,flush=True)
        bsdf.inputs["Base Color"].default_value=(.17,.19,.20,1)
    mat.diffuse_color=(.8,.8,.8,1)

# Drop object meshes that are hand-held guns: inspection scene is unarmed.
for obj in list(meshes):
    if any(key in obj.name.lower() for key in ("pistol","knife","weapon","gun_")):
        bpy.data.objects.remove(obj,do_unlink=True)

DEST.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(DEST.resolve()),export_format='GLB',
    export_texcoords=True,export_normals=True,export_materials='EXPORT',
    export_animations=False,export_yup=True,export_cameras=False,
    export_lights=False,export_skins=True,
    export_all_influences=False,export_image_format='AUTO'
)
if DEST.stat().st_size<50000: raise ValueError("Output suspiciously small")
print("Saved rigged male tactical avatar:",DEST,DEST.stat().st_size,flush=True)
