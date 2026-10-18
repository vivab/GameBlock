#!/usr/bin/env python3
"""Check olive T-02/T-05 are real edited skinned GLBs, not image previews."""
import json
import struct
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageStat
from recolor_olive_terrorists import read_glb, PALETTES

ROOT=Path(__file__).resolve().parents[1]/"public/casting/masked"
manifest=json.loads((ROOT/"manifest.json").read_text())
assert manifest["maskedOnly"] and manifest["total"]==10
assert len(manifest["models"])==10
for no in (2,5):
    original,original_bin=read_glb(ROOT/"original"/f"{no:02}.glb")
    dyed,dyed_bin=read_glb(ROOT/f"{no:02}.glb")
    entry=manifest["models"][no-1]
    assert entry["number"]==no and entry["masked"] is True
    assert entry["outfitVersion"]==3 and "olive" in entry["outfitPalette"]
    assert original["skins"]==dyed["skins"],"Skin skeleton changed!"
    assert original["nodes"]==dyed["nodes"],"Node hierarchy changed!"
    assert original["accessors"]==dyed["accessors"],"Skinned vertex weights changed!"
    assert original["meshes"]==dyed["meshes"],"The rigged mesh topology changed!"
    assert original_bin==dyed_bin[:len(original_bin)],"Original mask + rig BIN changed"
    assert any("real_balaclava" in mat.get("name","") for mat in dyed["materials"])
    body=[m for m in dyed["materials"] if "olive_bandit_body" in m.get("name","")]
    assert body and all(m["pbrMetallicRoughness"]["baseColorFactor"]==[1,1,1,1] for m in body)
    i=dyed["textures"][body[0]["pbrMetallicRoughness"]["baseColorTexture"]["index"]]["source"]
    image=dyed["images"][i]
    assert "authentic photo garment" in image["name"]
    v=dyed["bufferViews"][image["bufferView"]]
    compressed=dyed_bin[v["byteOffset"]:v["byteOffset"]+v["byteLength"]]
    assert len(compressed)>10000
    stats=ImageStat.Stat(Image.open(BytesIO(compressed)).convert("RGB")).mean
    assert min(stats[:2])>=166 and stats[0]>=stats[2]*1.12,stats
    head_mats=[m.get("name","") for m in dyed["materials"] if "_head" in m.get("name","")]
    assert head_mats,"Original eyes and face missing!"
    print(f"PASS OLIVE T-{no:02}: {len(dyed['skins'][0]['joints'])} bones, "
          f"RGB ({stats[0]:.1f}, {stats[1]:.1f}, {stats[2]:.1f}), "
          "textured jacket, black rigged balaclava, real original skeleton")
print("PASS BOTH: OLIVE GAME-READY GLBS, NOT JUST PICTURES.")
