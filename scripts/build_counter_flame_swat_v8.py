#!/usr/bin/env python3
"""Counter Flame SWAT V8 Urban: rugged original tactical character mesh.

Rebuilds V7's anatomical shoulders and additionally replaces the whole
old cartoon-simple head with a correctly fitted hard-edge helmet, separate
exposed eyes, brows, cheeks, balaclava nose bridge, goggles and chin straps.
Modelled magazine pouches, knees, boot laces and seams sharpen the silhouette.
Source: named original procedural V2 components, NOT copyright game assets.
Static empty-handed inspection model, with no fictional bone rig.
"""
from pathlib import Path
import math
import runpy
import numpy as np
import trimesh
from swat_v8_details import add_v8_head, add_v8_equipment

ROOT = Path(__file__).resolve().parents[1]
V2_SCRIPT = ROOT / "scripts/build_counter_flame_swat_v2.py"
OUTPUT = ROOT / "public/models/counter_flame_swat_v8.glb"

PALETTE = {
    "uniform": (79, 95, 106),
    "uniform_dark": (60, 73, 81),
    "trousers": (76, 90, 102),
    "vest": (47, 61, 70),
    "vest_light": (71, 82, 89),
    "helmet": (63, 78, 89),
    "strap": (72, 76, 70),
    "pouch": (66, 74, 77),
    "mask": (24, 29, 34),
    "glove": (29, 33, 37),
    "glass": (21, 35, 39),
    "boots": (64, 55, 48),
    "sole": (29, 30, 31),
    "kneepad": (64, 75, 82),
    "metal": (102, 109, 111),
    "skin": (143, 109, 94),
    "eye_white": (166, 169, 156),
    "eye_socket": (37, 35, 34),
    "iris": (62, 77, 79),
    "pupil": (14, 16, 17),
    "brow": (51, 44, 40),
    "fabric_stitch": (104, 111, 114),
    "goggle_frame": (85, 91, 84),
    "id_patch": (47, 58, 67),
}


def material_for(name):
    """Part names (rather than rough height bands) keep authentic equipment colors."""
    n = name.lower()
    if n.startswith("cf8_"):
        if "pupil" in n: return "pupil"
        if "iris" in n: return "iris"
        if "eye_white" in n: return "eye_white"
        if "eye_socket" in n: return "eye_socket"
        if "brow_heavy" in n: return "brow"
        if any(t in n for t in ("eyelid","cheek","nose_bridge","skin_visible")):
            return "skin" if not "eyelid" in n else "brow"
        if "goggle_lens" in n or "radio_screen" in n: return "glass"
        if "goggle_frame" in n or "helmet_nvg" in n: return "goggle_frame"
        if "goggle" in n or "chinstrap" in n: return "strap"
        if "helmet" in n or "earcup" in n: return "helmet"
        if any(t in n for t in ("mask","balaclava","throat","face_wrap")):
            return "mask"
        if "magazine" in n or "utility" in n: return "pouch"
        if "eye" in n: return "skin"
        if "plate" in n or "molle" in n or "vest" in n: return "vest"
        if "buckle" in n or "clasp" in n or "radio" in n: return "metal"
        if "kneepad" in n or "elbow" in n: return "kneepad"
        if "boot" in n: return "boots"
        if "trouser" in n: return "trousers"
        if any(t in n for t in ("stitch","seam","lacing")): return "fabric_stitch"
        if "chest_id" in n: return "id_patch"
        if "webbing" in n or "strap" in n: return "strap"
        return "uniform"
    if "glove" in n or "finger" in n or "thumb" in n or "knuckle" in n:
        return "glove"
    if "eye_opening" in n or "head_anatomical" in n:
        return "skin"
    if "goggle" in n or ("eye_" in n and "brow" not in n):
        return "glass"
    if "balaclava" in n or "face_mask" in n or "mask_stitch" in n:
        return "mask"
    if "helmet" in n or "chinstrap" in n:
        return "helmet"
    if "knee" in n and ("pad" in n or "guard" in n):
        return "kneepad"
    if "boot" in n and "sole" in n:
        return "sole"
    if "boot" in n:
        return "boots"
    if "magazine" in n or "mag_" in n or "waist_pouch" in n:
        return "pouch"
    if "buckle" in n or "clip" in n or "metal" in n or "radio" in n:
        return "metal"
    if "vest" in n or "plate_carrier" in n or "molle" in n:
        return "vest"
    if "harness" in n or "webbing" in n or "shoulder_carry" in n:
        return "strap"
    if "pants" in n or "cargo" in n or "thigh" in n:
        return "trousers"
    if "fold" in n or "elbow" in n:
        return "uniform_dark"
    return "uniform"


def paint(mesh, name):
    base=np.asarray(PALETTE[material_for(name)], dtype=float)
    verts=np.asarray(mesh.vertices)
    # Worn fabric, seams and creases, not shiny plastic or uniform neon color.
    wave=np.sin(verts[:,0]*39 + verts[:,1]*16 + verts[:,2]*26)
    weave=np.cos(verts[:,0]*77 - verts[:,1]*35 + verts[:,2]*19)
    jitter=(wave*.62+weave*.38)[:,None]*np.array([5.8,5.6,5.3])
    rgb=np.clip(base+jitter,0,255).astype(np.uint8)
    mesh.visual.vertex_colors=np.column_stack(
        [rgb,np.full(len(rgb),255,dtype=np.uint8)])


def loft(name, sections, sides=12):
    """Angular close-fitting torso: sloped shoulders taper into collar, not a ball."""
    vertices=[]
    for y, rx, depth, center_z in sections:
        for i in range(sides):
            angle=i*2*math.pi/sides
            vertices.append([rx*math.cos(angle),y,center_z+depth*math.sin(angle)])
    faces=[]
    for ring in range(len(sections)-1):
        for k in range(sides):
            n=(k+1)%sides
            a=ring*sides+k
            b=ring*sides+n
            c=(ring+1)*sides+n
            d=(ring+1)*sides+k
            faces.extend([[a,c,b],[a,d,c]])
    for k in range(1,sides-1):
        faces.append([0,k,k+1])
        last=(len(sections)-1)*sides
        faces.append([last,last+k+1,last+k])
    return trimesh.Trimesh(vertices=vertices,faces=faces,process=False)


def tapered_sleeve(a,b,top_radius,bottom_radius,sides=10):
    """Anatomically tapered polygon sleeve with NO spherical caps."""
    a,b=np.asarray(a,dtype=float),np.asarray(b,dtype=float)
    axis=(b-a)/np.linalg.norm(b-a)
    side=np.cross(axis,[0,0,1])
    if np.linalg.norm(side)<.05:
        side=np.cross(axis,[0,1,0])
    side=side/np.linalg.norm(side)
    up=np.cross(axis,side)
    verts=[]
    for p,rad in ((a,top_radius),(b,bottom_radius)):
        for k in range(sides):
            angle=k*2*math.pi/sides
            verts.append(p+rad*(side*math.cos(angle)+up*math.sin(angle)*.88))
    faces=[]
    for k in range(sides):
        n=(k+1)%sides
        faces.extend([[k,n,sides+n],[k,sides+n,sides+k]])
    for k in range(1,sides-1):
        faces.extend([[0,k+1,k],[sides,sides+k,sides+k+1]])
    return trimesh.Trimesh(vertices=verts,faces=faces,process=False)


def box(size, center):
    mesh=trimesh.creation.box(extents=size)
    mesh.apply_translation(center)
    return mesh


def main():
    # V2 creates named, independent original anatomy/gear components. Its
    # merged output remains available to older models, V7 is independently rebuilt.
    data=runpy.run_path(str(V2_SCRIPT))
    source=data["scene"]
    assert len(source.geometry)>150, "Expected full modular V2 source"
    kept=trimesh.Scene()
    removed=[]
    for name,mesh in source.geometry.items():
        skip=(
            "undershirt" in name or
            "plate_carrier_front" in name or
            "plate_carrier_back" in name or
            "vest_side_panel" in name or
            "radio_backpack" in name or
            "small_back_utility" in name or
            "shoulder_jacket" in name or
            "_bicep" in name or
            "_elbow_fabric" in name or
            "_forearm" in name or
            "_sleeve_fold_" in name or
            "_shoulder_patch" in name or
            "_arm_shoulder_cord" in name or
            # V8 physically rebuilds the head instead of hiding it with a texture.
            any(token in name.lower() for token in (
                "head_anatomical", "balaclava_head", "neck_balaclava",
                "eye_opening", "cf2_eye_", "cf2_brow_",
                "face_mask", "mask_stitch", "ballistic_helmet",
                "helmet_top", "helmet_front_brim", "helmet_earcup",
                "helmet_rail", "chinstrap", "goggle_",
                # The old oval pouches looked like toys: new angular pouches.
                "magazine_pouch", "mag_pouch", "mag_strap", "mag_clip"
            ))
        )
        if skip:
            removed.append(name)
            continue
        # Baked scene transform converts V2's Z-up source to game-world Y-up.
        # All transforms are applied once via node transform in the V2 source.
        # Flattened per-node copies let us keep geometry names for recoloring.
        nodes=source.graph.geometry_nodes.get(name,[])
        for j,node_name in enumerate(nodes):
            transform,geom=source.graph[node_name]
            out=mesh.copy()
            out.apply_transform(transform)
            paint(out,name)
            kept.add_geometry(out,geom_name=f"{name}_{j}")
    if len(removed)<12:
        raise ValueError("Original rounded shoulder parts were not removed")

    def add(name, mesh):
        paint(mesh,name)
        kept.add_geometry(mesh,geom_name=name)

    add("CF7_anatomical_tailored_jacket",
        loft("torso",[
            (1.095,.210,.139,.004),
            (1.180,.237,.148,.010),
            (1.345,.254,.157,.014),
            (1.463,.260,.148,.017),
            (1.532,.233,.131,.020),
            (1.610,.114,.100,.010),
        ],12))
    add("CF7_hard_front_plate",
        box((.456,.392,.080),(0,1.410,-.188)))
    add("CF7_hard_back_plate",
        box((.420,.370,.066),(0,1.403,.191)))
    for sign in [-1,1]:
        add(f"CF7_vest_side_panel_{sign}",
            box((.045,.260,.120),(sign*.236,1.409,.010)))

    # The old arm positions are carried over to the original empty gloves.
    arm_specs=[
        ("right",-1,(-.269,1.525,-.018),(-.301,1.300,-.161),
         (-.177,1.353,-.422)),
        ("left",1,(.269,1.525,-.018),(.336,1.310,-.220),
         (.168,1.348,-.665)),
    ]
    for label,sign,shoulder,elbow,wrist in arm_specs:
        add(f"CF7_{label}_anatomical_upper_sleeve",
            tapered_sleeve(shoulder,elbow,.101,.081,11))
        add(f"CF7_{label}_tapered_forearm",
            tapered_sleeve(elbow,wrist,.079,.068,10))
        add(f"CF7_{label}_flat_shoulder_seam",
            box((.018,.055,.070),(sign*.276,1.500,-.075)))
        add(f"CF7_{label}_elbow_sewn_panel",
            box((.070,.048,.024),(elbow[0],elbow[1]-.011,elbow[2]-.056)))
        add(f"CF7_{label}_upper_arm_fabric_patch",
            box((.020,.064,.080),(sign*.299,1.439,-.088)))
        for i,t in enumerate((.38,.74)):
            center=np.asarray(shoulder)*(1-t)+np.asarray(elbow)*t
            center[2]-=.070
            add(f"CF7_{label}_angular_sleeve_fold_{i}",
                box((.075,.014,.021),center))

    # Boxy, flat backpack replaces the inflated oval visible in the screenshot.
    add("CF7_low_profile_rectangular_pack",
        box((.268,.303,.082),(-.080,1.390,.242)))
    for sign in [-1,1]:
        add(f"CF7_pack_flat_seam_{sign}",
            box((.008,.265,.010),(sign*.085,1.385,.290)))

    # Front face, helmet and equipment have their own polygon details.
    add_v8_head(add,loft)
    add_v8_equipment(add)

    pieces=kept.dump()
    merged=trimesh.util.concatenate(pieces)
    # Hard polygon seams (not the toy-like smooth normals of the earlier models).
    merged.unmerge_vertices()
    if not np.isfinite(merged.vertices).all():
        raise ValueError("Invalid vertex coordinates")
    if not 1.80 < (merged.bounds[1,1]-merged.bounds[0,1]) < 2.10:
        raise ValueError("Wrong soldier height")
    print(f"V8 mesh verification: {len(merged.faces)} real triangles; "
          f"{len(removed)} discarded legacy parts; {len(kept.geometry)} preserved/rebuilt parts")
    # The old high-subdivision spherical head and bulging pouches are removed.
    # Triangle count is expected to decrease, not stay at the V7 baseline.
    if len(merged.faces)<11000 or len(kept.geometry)<120:
        raise ValueError("Incomplete V8 geometry")
    output=trimesh.Scene()
    output.add_geometry(merged,geom_name="CF8_URBAN_detailed_face_helmet_empty_hands")
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_bytes(output.export(file_type="glb"))
    print(f"Counter Flame SWAT V8 Urban: replaced {len(removed)} outdated parts, "
          f"now {len(merged.faces)} hard triangles, "
          f"width {merged.bounds[1,0]-merged.bounds[0,0]:.3f}m, "
          f"{OUTPUT.stat().st_size:,} bytes at {OUTPUT}")


if __name__=="__main__":
    main()
