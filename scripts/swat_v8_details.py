"""Geometrically original V8 Urban special-forces character details.

All coordinates are in metres, Three.js world frame: Y vertical, -Z front.
Everything is real polygon geometry (not a rendered concept image).
"""
import math
import numpy as np
import trimesh


def face_box(size, center):
    mesh=trimesh.creation.box(extents=size)
    mesh.apply_translation(center)
    return mesh


def lowpoly_ellipsoid(center, radii, subdivisions=1):
    mesh=trimesh.creation.icosphere(subdivisions=subdivisions,radius=1.0)
    mesh.apply_scale(radii)
    mesh.apply_translation(center)
    return mesh


def rod(a,b,radius,sides=7):
    a,b=np.asarray(a,float),np.asarray(b,float)
    distance=np.linalg.norm(b-a)
    axis=(b-a)/max(.00001,distance)
    mesh=trimesh.creation.cylinder(radius=radius,height=distance,sections=sides)
    mesh.apply_transform(trimesh.geometry.align_vectors([0,0,1],axis))
    mesh.apply_translation((a+b)*.5)
    return mesh


def quad(name, points):
    """Subtle 3D angular facial panels, not spherical toys."""
    pts=np.asarray(points,float)
    center=np.mean(pts,axis=0)
    # two-sided faceted patch with thin depth toward front
    front=pts.copy()
    back=pts.copy()
    back[:,2]+=.0035
    verts=np.concatenate([front,back])
    faces=[]
    for i in range(1,len(pts)-1):
        faces.extend([[0,i,i+1],[len(pts),len(pts)+i+1,len(pts)+i]])
    for i in range(len(pts)):
        j=(i+1)%len(pts)
        faces.extend([[i,j,len(pts)+j],[i,len(pts)+j,len(pts)+i]])
    return trimesh.Trimesh(vertices=verts,faces=faces,process=False)


def add_v8_head(add, loft):
    # Anatomical cranium: faceted shape under fitted high-cut helmet, with
    # clean human jaw, visible eyes, nose bridge and a covered mouth.
    add("CF8_mask_full_head",loft("head",[
        (1.634,.074,.069,-.004),
        (1.678,.091,.098,-.005),
        (1.728,.105,.110,-.003),
        (1.787,.112,.112,-.003),
        (1.837,.111,.111,.001),
        (1.887,.092,.097,.009),
        (1.911,.059,.073,.013),
    ],16))
    # Skin is ONLY exposed inside the cutout around the eyes; this surface is
    # narrow and recessed behind the dark fabric eyelids.
    add("CF8_skin_visible_eye_bridge",quad("skin",[
        (-.096,1.840,-.115),(.096,1.840,-.115),
        (.104,1.786,-.122),(.075,1.770,-.119),
        (-.075,1.770,-.119),(-.104,1.786,-.122)
    ]))
    # Heavy brows and eyes set back: two independent openings, corners, eyelids.
    for side in (-1,1):
        eye_x=side*.049
        add(f"CF8_eye_socket_{side}",face_box((.087,.035,.006),
                                             (eye_x,1.809,-.128)))
        add(f"CF8_eye_white_{side}",quad("white",[
            (eye_x-.034,1.810,-.136),
            (eye_x-.018,1.824,-.138),
            (eye_x+.023,1.821,-.138),
            (eye_x+.039,1.809,-.136),
            (eye_x+.020,1.800,-.138),
            (eye_x-.017,1.799,-.138)
        ]))
        add(f"CF8_iris_{side}",lowpoly_ellipsoid(
            (eye_x+side*.005,1.810,-.142),(.011,.014,.0045),1))
        add(f"CF8_pupil_{side}",lowpoly_ellipsoid(
            (eye_x+side*.006,1.811,-.145),(.005,.008,.003),1))
        add(f"CF8_upper_eyelid_{side}",rod(
            (eye_x-.040,1.820,-.142),(eye_x+.039,1.816,-.142),.0045,6))
        add(f"CF8_lower_eyelid_{side}",rod(
            (eye_x-.033,1.797,-.142),(eye_x+.032,1.798,-.142),.003,6))
        # Downward slope toward center creates a purposeful stern expression.
        add(f"CF8_brow_heavy_{side}",rod(
            (eye_x-side*.045,1.843,-.139),
            (eye_x+side*.035,1.849,-.133),.008,7))
        add(f"CF8_angular_cheek_{side}",quad("cheek",[
            (side*.040,1.767,-.124),
            (side*.101,1.775,-.088),
            (side*.106,1.726,-.091),
            (side*.041,1.730,-.128)
        ]))
        add(f"CF8_balaclava_side_seam_{side}",rod(
            (side*.104,1.816,-.090),(side*.103,1.703,-.091),.0025))
        add(f"CF8_helmet_chinstrap_{side}",rod(
            (side*.131,1.799,-.006),
            (side*.058,1.675,-.086),.008))
        add(f"CF8_helmet_chinstrap_buckle_{side}",face_box(
            (.019,.018,.014),(side*.084,1.721,-.072)))
    # Nose has a genuine bridge instead of black featureless sphere.
    add("CF8_nose_bridge",quad("nose",[
        (-.012,1.819,-.139),(.012,1.819,-.139),
        (.018,1.778,-.150),(-.018,1.778,-.150)
    ]))
    add("CF8_balaclava_nose_cover",quad("nosecover",[
        (-.040,1.782,-.132),(.040,1.782,-.132),
        (.073,1.759,-.126),(0,1.747,-.158),
        (-.073,1.759,-.126)
    ]))
    # Three subtle textile creases around mouth/cheeks, not a plastic ball.
    for sign in (-1,1):
        add(f"CF8_mask_mouth_crease_{sign}",rod(
            (sign*.016,1.715,-.124),
            (sign*.076,1.701,-.108),.0027,6))
        add(f"CF8_mask_lower_stitch_{sign}",rod(
            (sign*.017,1.677,-.104),
            (sign*.075,1.697,-.093),.0025,6))
    add("CF8_angular_throat_gaiter",loft("neck",[
        (1.603,.093,.095,.010),(1.649,.087,.084,.003),
        (1.692,.098,.101,-.004)
    ],12))
    # Helmet: faceted rigid shell with proper front brim, straps and rails.
    add("CF8_highcut_helmet_shell",loft("helmet",[
        (1.834,.123,.124,.011),
        (1.871,.147,.130,.007),
        (1.907,.144,.135,.014),
        (1.937,.120,.117,.017),
        (1.958,.076,.085,.023),
        (1.963,.035,.043,.029)
    ],14))
    add("CF8_helmet_front_brow",face_box(
        (.252,.028,.056),(0,1.865,-.121)))
    add("CF8_helmet_velcro_panel",face_box(
        (.084,.046,.009),(0,1.925,-.111)))
    add("CF8_helmet_nvg_mount",face_box(
        (.045,.055,.030),(0,1.887,-.161)))
    for side in (-1,1):
        add(f"CF8_highcut_helmet_side_rail_{side}",face_box(
            (.016,.035,.123),(side*.141,1.866,.004)))
        for dz in (-.039,.041):
            add(f"CF8_helmet_rail_rivet_{side}_{dz}",face_box(
                (.022,.010,.013),(side*.153,1.868,dz)))
        add(f"CF8_earcup_armor_{side}",face_box(
            (.038,.090,.099),(side*.141,1.767,.016)))
        add(f"CF8_goggle_frame_{side}",face_box(
            (.102,.051,.016),(side*.062,1.892,-.147)))
        add(f"CF8_goggle_lens_{side}",face_box(
            (.082,.036,.010),(side*.062,1.892,-.157)))
        add(f"CF8_goggle_temple_webbing_{side}",rod(
            (side*.120,1.899,-.131),(side*.155,1.890,.016),.008))
    add("CF8_goggle_center_bridge",face_box(
        (.027,.022,.018),(0,1.894,-.161)))
    add("CF8_helmet_rear_band",face_box(
        (.225,.020,.018),(0,1.880,.129)))


def add_v8_equipment(add):
    # Hard rather than rounded magazine pouches and realistic waist equipment.
    for index,x in enumerate((-.150,-.050,.050,.150)):
        add(f"CF8_magazine_pouch_{index}",face_box(
            (.085,.143,.047),(x,1.307,-.289)))
        add(f"CF8_magazine_pouch_flap_{index}",face_box(
            (.083,.025,.053),(x,1.369,-.308)))
        add(f"CF8_magazine_pouch_clasp_{index}",face_box(
            (.018,.027,.012),(x,1.346,-.341)))
    # Vertical plate stitches and an identification patch.
    for sign in (-1,1):
        add(f"CF8_plate_vertical_seam_{sign}",face_box(
            (.007,.270,.007),(sign*.206,1.432,-.233)))
        add(f"CF8_plate_angled_collar_{sign}",face_box(
            (.124,.036,.037),(sign*.124,1.578,-.178)))
        add(f"CF8_belt_utility_case_{sign}",face_box(
            (.071,.093,.060),(sign*.248,1.136,-.073)))
        add(f"CF8_shoulder_stitch_{sign}",rod(
            (sign*.240,1.530,-.071),(sign*.279,1.469,-.122),.003))
        add(f"CF8_elbow_fabric_seam_{sign}",rod(
            (sign*.285,1.344,-.230),(sign*.318,1.289,-.208),.003))
        add(f"CF8_trouser_side_pocket_{sign}",face_box(
            (.028,.160,.108),(sign*.238,.790,-.004)))
        add(f"CF8_kneepad_rim_{sign}",face_box(
            (.142,.159,.020),(sign*.209,.596,-.122)))
        add(f"CF8_kneepad_inner_{sign}",face_box(
            (.092,.105,.012),(sign*.209,.594,-.140)))
        for z in (-.064,-.021):
            add(f"CF8_boot_lacing_{sign}_{z}",rod(
                (sign*.248,.131,z-.085),
                (sign*.248,.155,z-.044),.0025,6))
    # Ballistic vest side clips and MOLLE rows.
    for y in (1.31,1.385,1.46):
        add(f"CF8_center_vest_webbing_{int(y*1000)}",face_box(
            (.258,.009,.008),(0,y,-.235)))
    add("CF8_chest_id_patch",face_box(
        (.123,.046,.009),(-.115,1.534,-.239)))
    add("CF8_chest_id_trim",face_box(
        (.127,.008,.012),(-.115,1.511,-.249)))
    # Radio with cable, backed by fabric webbing.
    add("CF8_radio_transceiver",face_box(
        (.065,.123,.052),(-.247,1.491,-.042)))
    add("CF8_radio_screen",face_box(
        (.038,.033,.007),(-.250,1.519,-.069)))
    add("CF8_radio_antenna",rod(
        (-.251,1.548,-.038),(-.267,1.691,-.015),.004,6))
    # Flat webbing on compact pack.
    for x in (-.159,-.090,-.018):
        add(f"CF8_backpack_strap_{x}",face_box(
            (.012,.245,.009),(x,1.403,.299)))
