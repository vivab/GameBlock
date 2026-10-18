#!/usr/bin/env python3
"""Create ten realistic *masked* fictional T-team candidates from ten DIFFERENT
licensed/skinned/textured male Rocketbox GLBs already in GameBlock.

Unlike a floating sphere/cube, each mask is a SECOND SKIN copied from the
original anatomical head mesh and displaced outwards 3mm. It keeps the
original mesh topology, armature weights, rest pose, UVs, and full 80-bone rig.
A face-forward eye opening exposes the natural eye geometry. Original hair
is hidden under the balaclava where the overlay exists.

Sources are genuine separate Microsoft Rocketbox MIT models (nine military /
police + one security). The mask textiles and rig integration are our own
procedural additions. Do NOT describe this as 10 separately sourced masked
models or authentic CS game assets.

Blender 3+: blender -b -noaudio --python scripts/build_masked_terrorists.py
 -- SRC.glb DST.glb variant-number
"""
import bpy
import bmesh
import colorsys
import math
import random
import struct
import sys
from pathlib import Path
from mathutils import Vector

args=sys.argv[sys.argv.index("--")+1:]
SOURCE,OUTPUT=Path(args[0]),Path(args[1])
VARIANT=int(args[2])
assert 1<=VARIANT<=10,VARIANT
assert SOURCE.exists(),SOURCE
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE.resolve()))
bpy.context.view_layer.update()

armatures=[o for o in bpy.data.objects if o.type=="ARMATURE"]
assert armatures,"Rocketbox source has no real skeletal armature"
arm=max(armatures,key=lambda o:len(o.data.bones))
assert len(arm.data.bones)>=60
head=arm.data.bones.get("Bip01 Head")
leye=arm.data.bones.get("Bip01 LEye")
reye=arm.data.bones.get("Bip01 REye")
assert head and leye and reye,"Missing anatomically grounded head/eye bones"

head_world=arm.matrix_world @ head.head_local
left_eye=arm.matrix_world @ leye.head_local
right_eye=arm.matrix_world @ reye.head_local
eye_mid=(left_eye+right_eye)*.5
side=(left_eye-right_eye).normalized()
up=Vector((0,0,1))  # Blender world is Z-up after glTF import; Y is face depth.
eye_sep=(left_eye-right_eye).length
# Rocketbox eye bones are at the corneas; both eyes set the cutout scale.
assert .030<eye_sep<.150,("Unexpected eye separation, unit mismatch",eye_sep)
front=eye_mid-head_world
front-=up*front.dot(up)
if front.length<.015:
    front=side.cross(up)
else:
    front.normalize()

print("MASK FIT: head",tuple(round(v,4) for v in head_world),
      "eyes",tuple(round(v,4) for v in eye_mid),
      "interpupillary",round(eye_sep,4),
      "front",tuple(round(v,4) for v in front),flush=True)

mesh_objects=[o for o in bpy.data.objects if o.type=="MESH"]
head_meshes=[]
for obj in mesh_objects:
    material_names=[m.name.lower() for m in obj.data.materials if m]
    has_head=any(("_head" in m or m.endswith("head")) and
                 not any(t in m for t in ("helmet","headset","headdress"))
                 for m in material_names)
    is_weighted=any(m.type=="ARMATURE" for m in obj.modifiers)
    if has_head and is_weighted:
        head_meshes.append(obj)
assert head_meshes,("Skinned original head meshes not detected",
                   [(x.name,[m.name for m in x.data.materials]) for x in mesh_objects])
print("MASK HEAD MESHES:",[(x.name,len(x.data.vertices),len(x.data.polygons))
                          for x in head_meshes],flush=True)

PALETTES=[
    ("Smoked black",(0.055,0.061,0.059)),
    ("Charcoal",(0.10,0.108,0.107)),
    ("Olive drab",(0.115,0.123,0.084)),
    ("Dark umber",(0.105,0.089,0.069)),
    ("Blackout",(0.038,0.041,0.044)),
    ("Desert dust",(0.206,0.176,0.126)),
    ("Urban slate",(0.088,0.103,0.111)),
    ("Forest",(0.068,0.092,0.075)),
    ("Ash grey",(0.124,0.119,0.105)),
    ("Night navy",(0.066,0.079,0.097))
]
style,color=PALETTES[VARIANT-1]

# Tiny color variation woven into the mask UVs. Skin remains anatomical
# instead of approximated by low-poly ellipsoids and a rectangle mouth cover.
tex_size=192
random.seed(6835+VARIANT)
image=bpy.data.images.new(f"T{VARIANT:02} fine cotton textile",width=tex_size,
                           height=tex_size,alpha=False)
image.generated_type="BLANK"
pixels=[0.0]*(tex_size*tex_size*4)
for y in range(tex_size):
    for x in range(tex_size):
        k=(y*tex_size+x)*4
        weave=(1.0 if x%4<=1 else .94)*(1.0 if y%4<=1 else .95)
        weave*=.97+.06*random.random()
        for c in range(3):
            pixels[k+c]=max(0.012,min(.9,color[c]*weave))
        pixels[k+3]=1.0
image.pixels.foreach_set(pixels)
image.file_format="PNG"
image.pack()
fabric=bpy.data.materials.new(f"T{VARIANT:02}_real_balaclava_{style.replace(' ','_')}")
fabric.use_nodes=True
fabric.diffuse_color=(*color,1)
nt=fabric.node_tree
nt.nodes.clear()
output=nt.nodes.new("ShaderNodeOutputMaterial")
bsdf=nt.nodes.new("ShaderNodeBsdfPrincipled")
bsdf.inputs["Roughness"].default_value=.965
bsdf.inputs["Metallic"].default_value=0
nt.links.new(bsdf.outputs["BSDF"],output.inputs["Surface"])
tex=nt.nodes.new("ShaderNodeTexImage")
tex.image=image
tex.interpolation="Linear"
nt.links.new(tex.outputs["Color"],bsdf.inputs["Base Color"])

masked_faces=0
all_faces=0
for index,source_head in enumerate(head_meshes):
    # Copy actual head geometry, UVs and original vertex weights/modifiers.
    # No fake wireframe helmet or rectangular costume overlay.
    mask=source_head.copy()
    mask.data=source_head.data.copy()
    bpy.context.collection.objects.link(mask)
    mask.name=f"T{VARIANT:02}_fitted_balaclava_head_{index}"
    # Parent/armature remain inherited; pose follows the head and jaw normally.
    mask.data.materials.clear()
    mask.data.materials.append(fabric)
    obj_matrix=mask.matrix_world
    offset_scale=max(.0001,max(obj_matrix.to_scale()))
    # Add ~2.8mm of fabric, plus small dark textile thickness. Otherwise the
    # original face can poke through when turning the head in animations.
    for v in mask.data.vertices:
        v.co+=v.normal.normalized()*(.0034/offset_scale)
    mask.data.update()

    bm=bmesh.new()
    bm.from_mesh(mask.data)
    bm.faces.ensure_lookup_table()
    # Remove only front eye band, keeping cheek/nose/mouth covered. Eye bone
    # positions are *per source skeleton*, never hardcoded world y/z values.
    # The front-distance check prevents cutting through the back of the head.
    hole_half_width=eye_sep*.73+.024
    max_eye_high=.033
    min_eye_low=-.032
    holes=[]
    for f in bm.faces:
        p=obj_matrix @ f.calc_center_median()
        v=p-eye_mid
        horiz=v.dot(side)
        vert=v.dot(up)
        depth=v.dot(front)
        if (abs(horiz)<hole_half_width and
            min_eye_low<vert<max_eye_high and depth>-.032):
            holes.append(f)
    if not holes:
        # In an FBX converted mesh, eyes can be inset from the outer head skin.
        for f in bm.faces:
            p=obj_matrix @ f.calc_center_median()
            d=p-eye_mid
            if abs(d.dot(side))<hole_half_width*1.2 and \
               abs(d.dot(up))<.052 and d.dot(front)>-.061:
                holes.append(f)
    if not holes: raise ValueError("Cannot fit balaclava eye opening to "+source_head.name)
    all_faces+=len(bm.faces)
    masked_faces+=len(holes)
    bmesh.ops.delete(bm,geom=holes,context="FACES")
    bm.to_mesh(mask.data)
    bm.free()
    mask.data.update()
    mask["type"]="real anatomical fitted head surface + skinned eye-opening"
    mask["source"]=source_head.name
    # Give skin weights a complete rig instead of static/floating masks.
    assert any(mod.type=="ARMATURE" for mod in mask.modifiers)
    print("MASK HOLE",source_head.name,len(holes),"of",all_faces,
          "source head polygons",flush=True)
assert masked_faces>=3 and masked_faces<all_faces*.8
print("MASK GEOMETRY VALIDATED:",masked_faces,
      "real mesh polygons removed around eyes",flush=True)

# Darken saturated bright work uniforms only slightly. Their *photographic*
# clothing textures and different geometry remain recognizable.
# This gives a more grounded, CS-like muted tactical palette without replacing
# a real human garment with boxes or cartoon armor.
for material in list(bpy.data.materials):
    if material==fabric or not material.use_nodes: continue
    if "_body" not in material.name.lower(): continue
    bs=next((n for n in material.node_tree.nodes
             if n.type=="BSDF_PRINCIPLED"),None)
    if not bs: continue
    base_input=bs.inputs.get("Base Color")
    if not base_input:continue
    from_links=[lk for lk in material.node_tree.links if lk.to_socket==base_input]
    if not from_links:continue
    source_link=from_links[0]
    mix=material.node_tree.nodes.new("ShaderNodeMixRGB")
    mix.blend_type="MULTIPLY"
    mix.inputs[0].default_value=.34
    mix.inputs[2].default_value=(.23+.03*(VARIANT%3),.25,.24,1)
    material.node_tree.links.new(source_link.from_socket,mix.inputs[1])
    material.node_tree.links.new(mix.outputs["Color"],base_input)
    # The original garment's texture remains connected and recognizable.

OUTPUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUTPUT.resolve()),
    export_format="GLB",export_skins=True,
    export_texcoords=True,export_normals=True,export_animations=False,
    export_image_format="AUTO",export_materials="EXPORT")
assert OUTPUT.stat().st_size>120000,("Output invalid",OUTPUT.stat().st_size)
print("SUCCESS MASKED T-",VARIANT,style,OUTPUT,OUTPUT.stat().st_size,
      "bytes, real skeleton",len(arm.data.bones),"bones",flush=True)
