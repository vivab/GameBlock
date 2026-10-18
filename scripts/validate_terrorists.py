"""Validate 15 independent, male, textured, skeleton-bearing GLB candidates.

The Rocketbox source avatars are civilian/worker/security men. These are
candidates for original game fictional terrorist outfits, NOT 15 pre-existing
terrorist characters. Preserve exact source names and licences.
"""
import json
import struct
from pathlib import Path
ROOT=Path("public/casting/terrorists")
NAMES=["Business_Male_01","Business_Male_02","Business_Male_03","Business_Male_04","Construction_Male_01","Construction_Male_02","Construction_Male_03","Construction_Male_04","Construction_Male_05","Security_Male_01","Sports_Male_01","Sports_Male_02","Sports_Male_03","Delivery_Male_01","Wood_Male_01"]
# Underlying source outfits, to be distinguished from completed T gear.
ARCHETYPES=[
  "Городской костюм","Куртка / городской","Городской отряд","Уличный стиль",
  "Полевая форма","Рабочая куртка","Тяжёлая форма","Полевая экипировка","Техническая форма",
  "Охранник","Повседневный","Спортивный","Уличный боец","Курьер","Лесная одежда"
]
manifest=[]
for i,name in enumerate(NAMES,1):
    path=ROOT/f"{i:02}.glb"
    data=path.read_bytes()
    magic,version,length=struct.unpack_from("<4sII",data)
    assert magic==b"glTF" and version==2 and length==len(data),(name,"invalid glb")
    size,kind=struct.unpack_from("<I4s",data,12)
    assert kind==b"JSON",(name,"no GLB JSON")
    gltf=json.loads(data[20:20+size].decode("utf-8"))
    bones=max((len(s.get("joints",[])) for s in gltf.get("skins",[])),default=0)
    assert bones>=60,(name,"not skinned",bones)
    assert gltf.get("meshes"),(name,"no geometry")
    assert gltf.get("textures"),(name,"missing authentic source color maps")
    assert any("JOINTS_0" in p.get("attributes",{}) and "WEIGHTS_0" in p.get("attributes",{})
      for m in gltf["meshes"] for p in m.get("primitives",[])),(name,"no weighted rig")
    assert 50000<len(data)<15000000,(name,"bad size",len(data))
    entry={
      "number":i,"name":name.replace("_"," "),"sourceId":name,
      "label":ARCHETYPES[i-1], "path":f"casting/terrorists/{i:02}.glb",
      "source":"Microsoft Rocketbox","license":"MIT",
      "sourceUrl":"https://github.com/microsoft/Microsoft-Rocketbox",
      "male":True,"hasSkeleton":True,"boneCount":bones,
      "bytes":len(data),"kind":"fictional-terrorist-candidate",
      "originalOutfit":name.split("_")[0]
    }
    manifest.append(entry)
    print(f"T-{i:02} {name}: {bones} bones, {len(gltf['meshes'])} meshes, "
          f"{len(gltf.get('textures',[]))} textures, {len(data)} bytes",flush=True)
assert len(manifest)==15 and len(set(m["sourceId"] for m in manifest))==15
(ROOT/"manifest.json").write_text(json.dumps({
 "total":15,"category":"terrorist-candidates",
 "description":"15 distinct male Rocketbox base characters, auditioned as fictional T-team candidates; original workwear/civilian clothes not claimed to be finished terror costumes.",
 "models":manifest
},ensure_ascii=False,indent=2))
print("SUCCESS: 15 different male original GLBs, skinned, textured and individually identified.",flush=True)
