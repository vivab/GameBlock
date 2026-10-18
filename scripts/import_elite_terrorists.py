#!/usr/bin/env python3
"""Read-only import of four original skinned game-ready masked T operators.

Upstream: StarKnightt/counter-strike-in-browser (MIT project + Three.js
Soldier skeleton, third-party notices). Four genuine authored outfits:
balaclava, balaclava+cap, scarf wrap, scarf+goggles.
Fifth outfit is a *labelled derivative* of cap version, recolored olive.
No map, guns or copyrighted Valve assets are copied.
"""
from __future__ import annotations
import io
import json
import struct
import urllib.request
from pathlib import Path

from PIL import Image, ImageChops, ImageOps

UPSTREAM_SHA = "92f3e6ddee40c6b531c0788c2cf3db4c56853a37"
BASE = (
    "https://raw.githubusercontent.com/StarKnightt/"
    "counter-strike-in-browser/" + UPSTREAM_SHA + "/public/models/"
)
OUT = Path("public/casting/elite")
SOURCES = [
    ("bot_mask.glb", "Балаклава / городской боец", "masked-street", "Тёмно-оливковая форма"),
    ("bot_mask_cap.glb", "Балаклава и кепка / налётчик", "masked-cap", "Песочно-коричневая"),
    ("bot_wrap.glb", "Платок / полевой боец", "wrapped", "Выцветшая олива"),
    ("bot_wrap_goggles.glb", "Платок и очки / разведчик", "wrapped-goggles", "Хаки / серо-оливковая"),
]


def parse_glb(raw: bytes):
    assert raw[:4] == b"glTF" and struct.unpack_from("<I", raw, 4)[0] == 2
    assert struct.unpack_from("<I", raw, 8)[0] == len(raw)
    i, chunks = 12, []
    while i < len(raw):
        length, kind = struct.unpack_from("<I4s", raw, i)
        i += 8
        chunks.append((kind, raw[i:i + length]))
        i += length
    assert chunks[0][0] == b"JSON" and chunks[1][0] == b"BIN\x00"
    return json.loads(chunks[0][1].decode("utf8").strip(" \x00")), chunks[1][1]


def pack_glb(data, binary):
    raw = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode()
    raw += b" " * ((-len(raw)) % 4)
    binary += b"\0" * ((-len(binary)) % 4)
    return (struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(raw) + 8 + len(binary))
            + struct.pack("<I4s", len(raw), b"JSON") + raw
            + struct.pack("<I4s", len(binary), b"BIN\0") + binary)


def validate(data, path):
    body = data.get("meshes", [])
    skins = data.get("skins", [])
    assert body and skins, f"{path}: missing rigged body"
    bones = max(len(s.get("joints", [])) for s in skins)
    assert bones >= 45, f"{path}: weak skeleton: {bones}"
    assert any(
        "JOINTS_0" in p.get("attributes", {})
        and "WEIGHTS_0" in p.get("attributes", {})
        for mesh in body for p in mesh.get("primitives", [])
    ), f"{path}: cannot animate (no weights)"
    assert data.get("materials"), f"{path}: missing materials"
    assert data.get("images"), f"{path}: missing photographic garment textures"
    return bones


def recolor_fifth(original: bytes):
    """Create derivative desert/olive bandit; keep mask, face and full rig."""
    data, blob = parse_glb(original)
    original_skins = json.dumps(data["skins"], sort_keys=True)
    original_nodes = json.dumps(data["nodes"], sort_keys=True)
    # Texture selection supports ordinary GLB and EXT_texture_webp.
    images = set()
    for mat in data.get("materials", []):
        texture = mat.get("pbrMetallicRoughness", {}).get("baseColorTexture")
        if not texture:
            continue
        tex = data["textures"][texture["index"]]
        source = tex.get("extensions", {}).get("EXT_texture_webp", {}).get(
            "source", tex.get("source")
        )
        if source is not None:
            images.add(source)
    assert images, "No editable clothing texture atlases in fifth model"
    for image_index in sorted(images):
        image = data["images"][image_index]
        view = data["bufferViews"][image["bufferView"]]
        offset = view.get("byteOffset", 0)
        pic = blob[offset:offset + view["byteLength"]]
        original_image = Image.open(io.BytesIO(pic)).convert("RGB")
        # Preserve near-black knit masks and the natural warm skin pixels.
        r, g, b = original_image.split()
        luminosity = ImageOps.autocontrast(ImageOps.grayscale(original_image), cutoff=1)
        # Olive variation is light enough to distinguish from the black CT.
        olive = Image.merge("RGB", (
            luminosity.point(lambda v: int(78 + v * 0.47)),
            luminosity.point(lambda v: int(88 + v * 0.47)),
            luminosity.point(lambda v: int(52 + v * 0.40)),
        ))
        dark = ImageOps.grayscale(original_image).point(
            lambda v: 0 if v < 42 else min(232, (v - 42) * 7)
        )
        # Existing masks stay charcoal; reddish skin and brown skin tone
        # remain the same as the original photographic source.
        skin_r = ImageChops.subtract(r, g).point(lambda x: 255 if x > 17 else 0)
        skin_b = ImageChops.subtract(g, b).point(lambda x: 255 if x > 8 else 0)
        skin_mask = ImageChops.multiply(skin_r, skin_b)
        dye_mask = ImageChops.subtract(dark, skin_mask)
        dyed = Image.composite(olive, original_image, dye_mask)
        fmt = "WEBP" if image.get("mimeType") == "image/webp" else "PNG"
        stream = io.BytesIO()
        dyed.save(stream, format=fmt, quality=94)
        payload = stream.getvalue()
        aligned = blob + b"\0" * ((-len(blob)) % 4)
        new_offset = len(aligned)
        data["bufferViews"].append({
            "buffer": 0, "byteOffset": new_offset, "byteLength": len(payload)
        })
        image["bufferView"] = len(data["bufferViews"]) - 1
        image["mimeType"] = "image/webp" if fmt == "WEBP" else "image/png"
        image["name"] = "GameBlock / Desert Olive Raider / edited atlas"
        blob = aligned + payload
    data["buffers"][0]["byteLength"] = len(blob)
    data.setdefault("extras", {})["gameblockEliteVariant"] = {
        "from": "bot_mask_cap.glb",
        "derived": True,
        "colors": "desert-olive",
        "blackFaceCoveringPreserved": True,
        "rigPreserved": True,
    }
    assert json.dumps(data["skins"], sort_keys=True) == original_skins
    assert json.dumps(data["nodes"], sort_keys=True) == original_nodes
    result = pack_glb(data, blob)
    assert validate(parse_glb(result)[0], "Elite derivative") >= 45
    return result


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    originals = {}
    for index, (name, title, style, tone) in enumerate(SOURCES, start=1):
        url = BASE + name
        print(f"Downloading {index}/4 {name} from pinned MIT source...", flush=True)
        request = urllib.request.Request(url, headers={"User-Agent": "GameBlock/1.0"})
        with urllib.request.urlopen(request, timeout=110) as response:
            content = response.read()
        assert 400_000 < len(content) < 18_000_000
        gltf, _ = parse_glb(content)
        bones = validate(gltf, name)
        output = OUT / f"{index:02}.glb"
        output.write_bytes(content)
        originals[name] = content
        manifest.append({
            "number": index, "name": title, "kind": style, "masked": True,
            "male": True, "hasSkeleton": True, "boneCount": bones,
            "path": f"casting/elite/{index:02}.glb",
            "palette": tone, "source": name,
            "license": "MIT; third-party Three.js Soldier skeleton",
            "derivative": False, "bytes": len(content),
        })
        print(f"Verified T-{index:02}: {len(content)} bytes, {bones} bones", flush=True)
    fifth = recolor_fifth(originals["bot_mask_cap.glb"])
    gltf, _ = parse_glb(fifth)
    bones = validate(gltf, "olive variant")
    (OUT / "05.glb").write_bytes(fifth)
    manifest.append({
        "number": 5, "name": "Оливковый налётчик / кепка и балаклава",
        "kind": "desert-olive-cap", "masked": True, "male": True,
        "hasSkeleton": True, "boneCount": bones,
        "path": "casting/elite/05.glb",
        "palette": "Светлая олива и хаки, тёмная балаклава",
        "source": "bot_mask_cap.glb", "derivative": True,
        "license": "MIT; third-party Three.js Soldier skeleton",
        "bytes": len(fifth),
    })
    (OUT / "manifest.json").write_text(json.dumps({
        "total": 5, "category": "elite-masked-terrorists",
        "maskedOnly": True, "readyForRiggedAnimation": True,
        "sourceRepository": "StarKnightt/counter-strike-in-browser",
        "sourceCommit": UPSTREAM_SHA,
        "note": "Four licensed source outfit variants plus one original recolor "
                "of the cap variant; not five independently sourced bodies.",
        "models": manifest
    }, indent=2, ensure_ascii=False) + "\n")
    print("PASS: Five separately playable masked/rigged T outfit variants.", flush=True)


if __name__ == "__main__":
    main()
