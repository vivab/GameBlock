#!/usr/bin/env python3
"""Build an original Counter Flame SWAT 2.0, inspired by classic tactical shooters.

Source geometry is modular so individual equipment pieces can be redesigned.
The exported, Y-up GLB is batched into one mesh for efficient mobile rendering.
There is NO gun in the hands; both gloves are posed to grip an imaginary rifle.
Requires numpy and trimesh only.
"""
from pathlib import Path
import math
import numpy as np
import trimesh
from trimesh.transformations import rotation_matrix

rng = np.random.default_rng(20261015)
scene = trimesh.Scene()
COLORS = {
    "olive": (102, 108, 72), "olive_dark": (76, 86, 57),
    "olive_light": (125, 130, 88), "cloth_shadow": (63, 71, 52),
    "vest": (91, 101, 65), "vest_light": (124, 129, 88),
    "helmet": (81, 85, 56), "helmet_dark": (51, 57, 39),
    "mask": (26, 29, 30), "mask_light": (44, 46, 45),
    "glove": (36, 40, 37), "knuckle": (61, 63, 56),
    "goggle": (22, 32, 34), "goggle_frame": (120, 121, 78),
    "skin": (153, 113, 94), "eye": (43, 40, 36), "brow": (69, 53, 46),
    "stitch": (148, 145, 111), "webbing": (64, 69, 46),
    "buckle": (43, 45, 41), "rubber": (35, 37, 33),
    "boot": (81, 65, 49), "boot_light": (112, 88, 61),
    "sole": (32, 32, 29), "kneepad": (110, 113, 75),
    "metal": (92, 97, 85), "radio": (28, 32, 29),
}

def add(mesh, name, material, noise=3.1):
    rgb = np.array(COLORS[material], dtype=float)
    shade = rng.normal(0, noise, (len(mesh.vertices), 1))
    if material in ("goggle", "eye", "mask", "buckle"):
        shade *= .4
    cols = np.clip(rgb + shade, 0, 255).astype(np.uint8)
    mesh.visual.vertex_colors = np.concatenate(
        [cols, np.full((len(cols), 1), 255, dtype=np.uint8)], axis=1
    )
    scene.add_geometry(mesh, geom_name=name)
    return mesh

def blob(name, pos, scale, color, quality=2):
    m = trimesh.creation.icosphere(subdivisions=quality, radius=1)
    m.apply_scale(scale)
    m.apply_translation(pos)
    return add(m, name, color)

def block(name, pos, extents, color, angle=0, axis=(0, 0, 1)):
    m = trimesh.creation.box(extents=extents)
    if angle:
        m.apply_transform(rotation_matrix(angle, axis))
    m.apply_translation(pos)
    return add(m, name, color, 1.2)

def band(name, a, b, radius, color, sides=9):
    a, b = np.array(a, float), np.array(b, float)
    axis = b - a
    length = np.linalg.norm(axis)
    if length < .0001:
        return
    m = trimesh.creation.cylinder(radius=radius, height=length, sections=sides)
    m.apply_transform(trimesh.geometry.align_vectors([0, 0, 1], axis))
    m.apply_translation((a + b) * .5)
    return add(m, name, color)

def polyline(name, coords, radius, color, sides=7):
    for i, (a, b) in enumerate(zip(coords[:-1], coords[1:])):
        band(f"{name}_{i}", a, b, radius, color, sides)

def eyelet(name, pos, radius=.01, color="buckle"):
    blob(name, pos, (radius, .004, radius), color, 1)

# Organic human body: ~1.9 m, helmet + face + balaclava.
blob("CF2_pelvis_fabric", (0, .008, 1.03), (.255, .165, .188), "olive", 3)
blob("CF2_undershirt", (0, .017, 1.353), (.315, .19, .345), "olive", 3)
blob("CF2_jacket_collar", (0, -.015, 1.635), (.13, .132, .105), "olive_dark")
blob("CF2_neck_balaclava", (0, -.012, 1.681), (.098, .108, .116), "mask")
blob("CF2_head_anatomical", (0, -.014, 1.772), (.112, .106, .147), "skin", 3)
blob("CF2_balaclava_head", (0, .008, 1.774), (.121, .117, .155), "mask", 3)
blob("CF2_eye_opening", (0, -.112, 1.794), (.095, .021, .049), "skin", 3)
for side in (-1, 1):
    sx = side * .044
    blob(f"CF2_eye_{side}", (sx, -.132, 1.801), (.027, .0065, .013), "eye")
    band(f"CF2_brow_{side}", (sx - side * .024, -.136, 1.832),
         (sx + side * .020, -.135, 1.827), .008, "brow")
blob("CF2_face_mask", (0, -.112, 1.743), (.108, .026, .087), "mask", 3)
for i in range(6):
    band(f"CF2_mask_stitch_{i}", (-.090 + i * .036, -.135, 1.718),
         (-.090 + i * .036, -.131, 1.759), .0018, "mask_light", 6)

# Ballistic helmet and stowed goggles, exposing actual eyes.
blob("CF2_ballistic_helmet", (0, .005, 1.865), (.158, .144, .099), "helmet", 3)
blob("CF2_helmet_top", (0, .009, 1.913), (.139, .125, .045), "helmet_dark")
block("CF2_helmet_front_brim", (0, -.119, 1.857), (.262, .057, .025), "helmet")
for side in (-1, 1):
    blob(f"CF2_helmet_earcup_{side}", (side * .142, -.007, 1.765),
         (.035, .066, .071), "helmet_dark")
    block(f"CF2_helmet_rail_{side}", (side * .142, -.025, 1.832),
          (.017, .116, .025), "helmet_dark")
    band(f"CF2_chinstrap_{side}", (side * .13, -.018, 1.788),
         (side * .057, -.096, 1.687), .009, "webbing")
blob("CF2_goggle_dark_lens", (0, -.126, 1.883), (.120, .026, .049), "goggle", 3)
for side in (-1, 1):
    blob(f"CF2_goggle_rim_{side}", (side * .071, -.145, 1.884),
         (.058, .011, .055), "goggle_frame")
    blob(f"CF2_goggle_glass_{side}", (side * .071, -.154, 1.884),
         (.048, .009, .044), "goggle")
band("CF2_goggle_bridge", (-.025, -.150, 1.881),
     (.025, -.150, 1.881), .012, "goggle_frame")
for side in (-1, 1):
    polyline(f"CF2_goggle_strap_{side}", [(side * .124, -.125, 1.895),
             (side * .157, -.045, 1.885), (side * .147, .070, 1.877)],
             .012, "webbing")

# Fitted tactical vest with MOLLE straps and individual magazine pouches.
blob("CF2_plate_carrier_front", (0, -.183, 1.387),
     (.265, .073, .251), "vest", 3)
blob("CF2_plate_carrier_back", (0, .184, 1.400),
     (.267, .059, .248), "vest", 3)
for side in (-1, 1):
    blob(f"CF2_vest_side_panel_{side}", (side * .270, .006, 1.392),
         (.047, .141, .209), "vest")
    polyline(f"CF2_shoulder_carry_{side}", [(side * .21, -.15, 1.57),
             (side * .25, -.06, 1.664), (side * .24, .100, 1.62)],
             .029, "vest_light", 8)
    block(f"CF2_side_kit_{side}", (side * .299, -.029, 1.31),
          (.069, .123, .160), "olive_dark")
    for row in range(3):
        block(f"CF2_molle_side_{side}_{row}",
              (side * .312, -.075, 1.27 + row * .061),
              (.022, .008, .011), "webbing")
for row, z in enumerate((1.298, 1.368, 1.439, 1.508)):
    for col, x in enumerate((-.184, -.099, 0, .099, .184)):
        block(f"CF2_molle_{row}_{col}",
              (x, -.258, z), (.057, .012, .014), "webbing")
for j, x in enumerate((-.177, -.059, .059, .177)):
    blob(f"CF2_magazine_pouch_{j}", (x, -.276, 1.303),
         (.059, .050, .101), "vest_light")
    block(f"CF2_mag_pouch_flap_{j}", (x, -.319, 1.368),
          (.095, .018, .043), "olive_dark")
    block(f"CF2_mag_strap_{j}", (x, -.337, 1.315),
          (.021, .014, .112), "webbing")
    block(f"CF2_mag_clip_{j}", (x, -.347, 1.304),
          (.033, .015, .036), "buckle")
blob("CF2_belt", (0, .006, 1.102), (.267, .182, .067), "webbing")
block("CF2_center_buckle", (0, -.180, 1.105),
      (.07, .018, .057), "buckle")
for side in (-1, 1):
    blob(f"CF2_waist_pouch_{side}", (side * .27, -.076, 1.129),
         (.060, .087, .100), "vest")
    block(f"CF2_waist_pouch_clip_{side}", (side * .265, -.170, 1.139),
          (.043, .018, .036), "buckle")
blob("CF2_radio_backpack", (-.13, .221, 1.358),
     (.194, .116, .266), "olive_dark", 3)
blob("CF2_small_back_utility", (.186, .208, 1.317),
     (.082, .112, .127), "vest")
block("CF2_radio", (-.295, .155, 1.481),
      (.056, .084, .142), "radio")
polyline("CF2_radio_antenna", [(-.294, .16, 1.52),
         (-.303, .18, 1.68), (-.315, .19, 1.79)],
         .0055, "radio")

# Battle-ready EMPTY HANDS. An invisible rifle would lie between these grips.
shoulders = {"right": (.310, -.004, 1.551),
             "left": (-.310, -.004, 1.551)}
elbows = {"right": (.325, -.153, 1.296),
          "left": (-.376, -.223, 1.310)}
wrists = {"right": (.177, -.422, 1.353),
          "left": (-.168, -.665, 1.348)}
for label, sign in (("right", 1), ("left", -1)):
    shoulder, elbow, wrist = shoulders[label], elbows[label], wrists[label]
    blob(f"CF2_{label}_shoulder_jacket", shoulder,
         (.139, .133, .145), "olive", 3)
    band(f"CF2_{label}_bicep", shoulder, elbow, .113, "olive", 12)
    blob(f"CF2_{label}_elbow_fabric", elbow,
         (.106, .116, .106), "olive_dark")
    band(f"CF2_{label}_forearm", elbow, wrist, .082, "olive", 12)
    for j, t in enumerate((.28, .57, .85)):
        p = np.array(shoulder) * (1-t) + np.array(elbow) * t
        blob(f"CF2_{label}_sleeve_fold_{j}", p,
             (.098, .083, .019), "olive_light", 1)
    blob(f"CF2_{label}_glove_palm", wrist,
         (.068, .079, .048), "glove")
    block(f"CF2_{label}_knuckle_armor",
          (wrist[0], wrist[1]-.038, wrist[2]+.028),
          (.104, .063, .017), "knuckle")
    for finger in range(4):
        offset = (finger - 1.5) * .028
        start = (wrist[0]+offset, wrist[1]-.060, wrist[2]-.007)
        end = (wrist[0]+offset, wrist[1]-.094, wrist[2]-.055)
        curl = (wrist[0]+offset, wrist[1]-.070, wrist[2]-.085)
        polyline(f"CF2_{label}_finger_{finger}", [start, end, curl],
                 .012, "glove", 8)
        blob(f"CF2_{label}_knuckle_{finger}", start,
             (.015, .016, .015), "knuckle", 1)
    t0 = (wrist[0]-sign*.049, wrist[1]-.005, wrist[2]+.003)
    t1 = (wrist[0]-sign*.085, wrist[1]-.060, wrist[2]-.012)
    t2 = (wrist[0]-sign*.065, wrist[1]-.094, wrist[2]-.024)
    polyline(f"CF2_{label}_thumb", [t0,t1,t2], .017, "glove", 9)
    band(f"CF2_{label}_cuff",
         (wrist[0], wrist[1]+.063, wrist[2]-.003),
         (wrist[0], wrist[1]+.088, wrist[2]-.008),
         .079, "olive_dark")
    block(f"CF2_{label}_shoulder_patch",
          (sign*.405, -.058, 1.514),
          (.021, .083, .065), "olive_dark")

# Two articulated-looking legs in staggered, bent-knee combat posture.
leg_joints = {
  "right": {"hip":(.136,.024,1.002),"knee":(.228,-.113,.562),
            "ankle":(.257,.039,.139),"toe":(.255,-.175,.075)},
  "left": {"hip":(-.138,.021,1.002),"knee":(-.195,.133,.630),
           "ankle":(-.288,.235,.142),"toe":(-.285,.045,.073)}
}
for label, j in leg_joints.items():
    hip,knee,ankle,toe = [j[k] for k in ("hip","knee","ankle","toe")]
    blob(f"CF2_{label}_pants_hip", hip, (.155,.155,.179), "olive")
    band(f"CF2_{label}_pants_thigh", hip, knee, .137, "olive", 13)
    blob(f"CF2_{label}_pants_knee", knee, (.127,.132,.125), "olive")
    band(f"CF2_{label}_pants_shin", knee, ankle, .110, "olive", 13)
    guard = (knee[0], knee[1]-.114, knee[2]+.004)
    blob(f"CF2_{label}_kneepad", guard, (.106,.046,.125), "kneepad", 3)
    blob(f"CF2_{label}_kneepad_center",
         (guard[0],guard[1]-.037,guard[2]),
         (.062,.015,.076), "olive_dark")
    for edge in (-1,1):
        eyelet(f"CF2_{label}_pad_rivet_{edge}",
               (guard[0]+edge*.071, guard[1]-.034,
                guard[2]+.051), .009, "metal")
    for z in (-.105,.105):
        band(f"CF2_{label}_pad_strap_{int(z*1000)}",
             (knee[0]-.105,knee[1]-.02,knee[2]+z),
             (knee[0]+.105,knee[1]-.02,knee[2]+z),
             .009,"webbing")
    for i,t in enumerate((.30,.62,.78)):
        p = np.array(knee)*(1-t)+np.array(ankle)*t
        blob(f"CF2_{label}_pants_fold_{i}", p,
             (.116,.110,.015),
             "olive_light" if i==1 else "olive_dark", 1)
    if label == "right":
        blob("CF2_right_thigh_holster_pouch",
             (hip[0]+.158,-.070,.763),
             (.056,.101,.148),"vest")
        for i,z in enumerate((.708,.824)):
            band(f"CF2_thigh_pouch_webbing_{i}",
                 (.180,-.130,z),(.334,-.126,z),
                 .011,"webbing")
            block(f"CF2_thigh_pouch_buckle_{i}",
                  (.339,-.127,z),(.030,.016,.029),"buckle")
    else:
        blob("CF2_left_cargo_leg_pocket",
             (-.312,.129,.738),(.047,.085,.115),"olive_dark")
        block("CF2_left_leg_pocket_flap",
              (-.354,.098,.803),(.024,.109,.034),"olive_light")
    blob(f"CF2_{label}_boot_collar",ankle,
         (.115,.112,.122),"boot")
    blob(f"CF2_{label}_boot_toe",toe,
         (.123,.201,.080),"boot",3)
    block(f"CF2_{label}_boot_sole",
          (toe[0],toe[1]+.006,.022),(.237,.337,.038),"sole")
    blob(f"CF2_{label}_boot_heel",
         (ankle[0],ankle[1]+.015,.066),
         (.104,.094,.063),"boot_light")
    polyline(f"CF2_{label}_boot_laces",
        [(toe[0]-.036,toe[1]-.094,.096),
         (toe[0]+.035,toe[1]-.065,.092),
         (toe[0]-.033,toe[1]-.028,.090),
         (toe[0]+.036,toe[1]+.012,.088)],
        .004,"stitch")

for side in (-1,1):
    band(f"CF2_chest_harness_diagonal_{side}",
         (side*.21,-.177,1.544),
         (side*.132,-.252,1.227),.009,"webbing")
    block(f"CF2_arm_shoulder_cord_{side}",
          (side*.338,-.059,1.570),
          (.014,.098,.020),"webbing")

# Z-up -> Three.js Y-up; original face forward (-Y) -> -Z.
scene.apply_transform(rotation_matrix(math.pi,[0,1,0]) @
                      rotation_matrix(-math.pi/2,[1,0,0]))
modular_count = len(scene.geometry)
merged = trimesh.util.concatenate(scene.dump())
optimized = trimesh.Scene()
optimized.add_geometry(merged, geom_name="CF2_optimized_fullbody")
output = Path("public/models/counter_flame_swat_v2.glb")
output.parent.mkdir(parents=True, exist_ok=True)
optimized.export(str(output))
print(f"Counter Flame SWAT V2: {modular_count} modeled pieces -> one render mesh, "
      f"{len(merged.faces)} triangles, {output.stat().st_size:,} bytes at {output}")
