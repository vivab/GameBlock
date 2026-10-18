#!/usr/bin/env python3
"""Dye the REAL skinned GameBlock T-02/T-05 GLB clothing textures olive.

Reads stable, untouched black-uniform originals from masked/original/.
Changes ONLY the original BODY photo-texture and body PBR factor, never
the eyes/head, dark skinned balaclava, bones, indices, pose or skin weights.
Saves complete game-ready GLB files at masked/02.glb and masked/05.glb.
No Blender needed; Pillow is used only by the GitHub Action at build time.

A picture/concept-sheet is NOT used as a 3D mesh. This is a real,
reversible body-texture edit with photographic wear preserved.
"""
import json
import struct
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageOps, ImageStat

ROOT = Path(__file__).resolve().parents[1] / "public/casting/masked"
PALETTES = {
    2: {
        "name": "Very light olive raider V4",
        "name_ru": "T-02 · ПОЧТИ СВЕТЛАЯ ОЛИВА · бандитская куртка",
        # Cloth creases stay green, not black, on a mobile screen.
        "shadow": (192, 199, 145),
        "mid": (222, 228, 176),
        "light": (246, 245, 204),
        "emissive": (0.14, 0.17, 0.095),
        "label": "T-02 · СВЕТЛАЯ ОЛИВА",
    },
    5: {
        "name": "Pale khaki olive bandit V4",
        "name_ru": "T-05 · СВЕТЛЫЙ ХАКИ-ОЛИВА · бандитская форма",
        "shadow": (191, 190, 147),
        "mid": (226, 221, 176),
        "light": (248, 241, 205),
        "emissive": (0.16, 0.15, 0.10),
        "label": "T-05 · СВЕТЛЫЙ ХАКИ",
    },
}


def read_glb(path):
    raw = path.read_bytes()
    magic, version, total = struct.unpack_from("<4sII", raw)
    assert magic == b"glTF" and version == 2 and total == len(raw), path
    pos = 12
    chunks = []
    while pos < len(raw):
        length, typ = struct.unpack_from("<I4s", raw, pos)
        pos += 8
        chunks.append((typ, raw[pos:pos + length]))
        pos += length
    assert len(chunks) == 2 and chunks[0][0] == b"JSON" and chunks[1][0] == b"BIN\x00", path
    obj = json.loads(chunks[0][1].decode("utf-8").rstrip(" \x00"))
    return obj, chunks[1][1]


def encode_glb(obj, binary):
    json_body = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode("utf8")
    json_body += b" " * ((-len(json_body)) % 4)
    binary += b"\x00" * ((-len(binary)) % 4)
    total = 12 + 8 + len(json_body) + 8 + len(binary)
    return (struct.pack("<4sII", b"glTF", 2, total)
            + struct.pack("<I4s", len(json_body), b"JSON") + json_body
            + struct.pack("<I4s", len(binary), b"BIN\x00") + binary)


def lerp(start, finish, fraction):
    return int(round(start + (finish - start) * fraction))


def olive_photo_texture(blob, palette):
    """Turn even nearly-black source clothing into detailed warm olive/khaki.

    Contrast-normalized L channel preserves the source photo's creases,
    straps, shadows and dirt. Never affects the face or black balaclava.
    """
    original = Image.open(BytesIO(blob)).convert("RGB")
    # 2 percent clipped histogram stretches very dark source photographs.
    value = ImageOps.autocontrast(ImageOps.grayscale(original), cutoff=2)
    colors = []
    for channel in range(3):
        lookup = []
        for value_byte in range(256):
            shade = value_byte / 255.0
            if shade < .50:
                channel_value = lerp(palette["shadow"][channel],
                                     palette["mid"][channel], shade * 2)
            else:
                channel_value = lerp(palette["mid"][channel],
                                     palette["light"][channel], (shade - .5) * 2)
            lookup.append(channel_value)
        colors.append(value.point(lookup))
    dyed = Image.merge("RGB", tuple(colors))
    stream = BytesIO()
    dyed.save(stream, format="JPEG", quality=92, subsampling=0, optimize=True)
    stats = tuple(round(s, 1) for s in ImageStat.Stat(dyed).mean)
    # Reject black result: user must see real olive clothing on mobile.
    assert min(stats[:2]) >= 198 and stats[0] > stats[2] * 1.08, stats
    assert min(palette["shadow"][:2]) >= 190, "Too-dark clothing shadows"
    return stream.getvalue(), stats, original.size


def dye_one(number, palette):
    source = ROOT / "original" / f"{number:02}.glb"
    target = ROOT / f"{number:02}.glb"
    model, binary = read_glb(source)
    originals = tuple(model.get("skins", []))
    original_nodes = tuple(model.get("nodes", []))
    original_accessors = tuple(model.get("accessors", []))
    mats = model["materials"]
    body_indices = [i for i, m in enumerate(mats)
                    if "_body" in m.get("name", "").lower()]
    assert len(body_indices) >= 1, (number, "body not found")
    source_images = set()
    for index in body_indices:
        m = mats[index]
        body = m.get("pbrMetallicRoughness", {})
        assert "baseColorTexture" in body, (number, "photo texture absent")
        tex_num = body["baseColorTexture"]["index"]
        img_num = model["textures"][tex_num]["source"]
        source_images.add(img_num)
    assert len(source_images) == 1, (number, "unusual body texture atlas")
    img_num = next(iter(source_images))
    pic = model["images"][img_num]
    assert pic["mimeType"] in ("image/jpeg", "image/png"), pic
    bv = model["bufferViews"][pic["bufferView"]]
    assert bv.get("buffer", 0) == 0
    src_bytes = binary[bv["byteOffset"]:bv["byteOffset"] + bv["byteLength"]]
    changed_image, mean, size = olive_photo_texture(src_bytes, palette)

    # Add a new photograph at the END of GLB BIN. This guarantees the
    # original armature, animation, UV, vertex and mask buffer offsets remain
    # byte-for-byte identical, irrespective of PNG/JPEG image compression.
    aligned = binary + b"\x00" * ((-len(binary)) % 4)
    new_offset = len(aligned)
    model["bufferViews"].append({
        "buffer": 0, "byteOffset": new_offset,
        "byteLength": len(changed_image),
    })
    pic["bufferView"] = len(model["bufferViews"]) - 1
    pic["mimeType"] = "image/jpeg"
    pic["name"] = f"T{number:02} authentic photo garment / {palette['name']}"
    for index in body_indices:
        body = mats[index]["pbrMetallicRoughness"]
        # Old file multiplied the garment by ~0.29, making it black.
        # White PBR factor lets the newly dyed olive PHOTO texture appear.
        body["baseColorFactor"] = [1., 1., 1., 1.]
        mats[index]["name"] = f"T{number:02}_olive_bandit_body_{palette['name'].replace(' ', '_')}"
        body["roughnessFactor"] = .98
        body["metallicFactor"] = 0.
        # A very subtle woven-fabric fill keeps these clothes readable on
        # mobile screens even when physically based scene lighting is dim.
        # Mask and head are separate materials and remain completely dark.
        mats[index]["emissiveFactor"] = list(palette["emissive"])
    model["buffers"][0]["byteLength"] = new_offset + len(changed_image)
    model.setdefault("extras", {})["gameblockOliveBandit"] = {
        "variant": number, "name": palette["name"],
        "bodyTexture": "re-dyed original photo texture",
        "maskPreserved": True, "skeletonPreserved": True,
        "outfitVersion": 4,
        "rendering": "bright-photo-plus-subtle-olive-emissive",
        "generatedBy": "scripts/recolor_olive_terrorists.py",
    }
    assert tuple(model["skins"]) == originals
    assert tuple(model["nodes"]) == original_nodes
    assert tuple(model["accessors"]) == original_accessors
    out = encode_glb(model, aligned + changed_image)
    target.write_bytes(out)
    again, new_binary = read_glb(target)
    assert again["skins"] == model["skins"] and len(new_binary) > len(binary)
    assert len(out) > 150000
    print(f"RECOLORED T-{number:02}: {size[0]}x{size[1]}, "
          f"olive body RGB mean {mean}, GLB {len(out):,} bytes; "
          "black mask/head and all skeleton data preserved", flush=True)
    return len(out), mean


def main():
    manifest_path = ROOT / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    assert manifest["total"] == 10 and manifest["maskedOnly"]
    for number, palette in PALETTES.items():
        size, mean = dye_one(number, palette)
        entry = manifest["models"][number - 1]
        assert entry["number"] == number and entry["masked"] and entry["boneCount"] >= 70
        entry["bytes"] = size
        entry["label"] = palette["name_ru"]
        entry["outfitPalette"] = "olive" if number == 2 else "khaki-olive"
        entry["outfitVersion"] = 4
        entry["outfitDescription"] = (
            "VERY LIGHT olive/khaki baked into original 3D body photo "
            "texture, including brighter folds. Black mask, head, weights "
            "and original 80-bone skeleton remain unchanged."
        )
        entry["measuredBodyRGB"] = list(mean)
    manifest["description"] = (
        "Ten individual skinned adult male models with fitted balaclavas; "
        "T-02 is VERY PALE LIGHT OLIVE and T-05 is LIGHT KHAKI OLIVE (v4). "
        "These are genuine edited GLB body textures, not concept renders."
    )
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print("FINISHED: T-02 and T-05 PALE OLIVE V4 game GLBs + manifest.", flush=True)


if __name__ == "__main__":
    main()
