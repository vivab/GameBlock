#!/usr/bin/env python3
"""Validate ten face-covered distinct skinned male Rocketbox characters.

We add original geometrically fitted masks to ten authentic MIT male
characters. Do not imply 10 originally masked source downloads.
"""
import json,struct
from pathlib import Path

ROOT=Path("public/casting/masked")
SOURCE_CHOICES=[["casting/realistic/01.glb","Military Male 01","Чёрная балаклава / городской"],["casting/realistic/02.glb","Military Male 02","Угольная маска / штурм"],["casting/realistic/03.glb","Military Male 03","Олива / полевая"],["casting/realistic/04.glb","Military Male 04","Коричневая ткань / пустыня"],["casting/realistic/05.glb","Military Male 05","Полное затемнение / ночной"],["casting/realistic/06.glb","Military Male 06","Песочный шарф / разведчик"],["casting/realistic/07.glb","Police Male 01","Серо-синяя балаклава / городской"],["casting/realistic/09.glb","Police Male 03","Лесной / тактический"],["casting/realistic/10.glb","Police Male 04","Пепельная ткань / оперативник"],["casting/terrorists/10.glb","Security Male 01","Тёмно-синяя балаклава / охрана"]]
STYLES=[
 "Чёрная балаклава / городской",
 "Угольная маска / штурм",
 "Олива / полевая",
 "Коричневая ткань / пустыня",
 "Полное затемнение / ночной",
 "Песочный шарф / разведчик",
 "Серо-синяя балаклава / городской",
 "Лесной / тактический",
 "Пепельная ткань / оперативник",
 "Тёмно-синяя балаклава / охрана",
]
models=[]
for index,(source,name,description) in enumerate(SOURCE_CHOICES,1):
    path=ROOT/f"{index:02}.glb"
    data=path.read_bytes()
    assert data[:4]==b'glTF' and len(data)>120000,(path,"invalid GLB header/size")
    version,total=struct.unpack_from("<II",data,4)
    assert version==2 and total==len(data),(path,"invalid GLB structure")
    jsonlength,chunktype=struct.unpack_from("<I4s",data,12)
    assert chunktype==b'JSON'
    obj=json.loads(data[20:20+jsonlength].decode("utf8"))
    bones=max((len(s.get("joints",[])) for s in obj.get("skins",[])),default=0)
    assert bones>=70,(name,"missing skeleton",bones)
    mats=[x.get("name","") for x in obj.get("materials",[])]
    masks=[x for x in mats if "real_balaclava" in x]
    assert len(masks)>=1,(name,"mask material missing")
    assert obj.get("textures"),(name,"real garment texture absent")
    assert any("mask" in x.get("name","").lower() or "balaclava" in x.get("name","").lower()
      for x in obj.get("meshes",[])),(name,"mask geometry absent")
    assert any("JOINTS_0" in p.get("attributes",{}) and "WEIGHTS_0" in p.get("attributes",{})
      for m in obj.get("meshes",[]) for p in m.get("primitives",[])),(name,"skin weights missing")
    entry=dict(number=index,name=f"Masked T-{index:02} · {name}",sourceId=name.replace(" ","_"),
      label=description,kind="masked-terrorist-candidate",
      path=f"casting/masked/{index:02}.glb",sourcePath=source,
      source="Microsoft Rocketbox original body (MIT) + GameBlock original fitted 3D mask",
      licence="MIT",license="MIT",male=True,masked=True,hasSkeleton=True,
      boneCount=bones,bytes=len(data),maskMaterial=masks[0],
      note="Unique real anatomical rigged original male body, mask is an in-project fitted anatomical addition, not a separately downloaded masked character.")
    models.append(entry)
    print("PASS MASKED",index,name,bones,"bones,",len(masks),"textile masks,",
          len(data),"bytes",flush=True)
assert len({m["sourceId"] for m in models})==10
ROOT.mkdir(parents=True,exist_ok=True)
(ROOT/"manifest.json").write_text(json.dumps(dict(total=10,category="masked-terrorist-candidates",
 description="Ten different male skeletal source models, wearing 10 fitted masked styles added in GameBlock. Their base bodies come from Microsoft Rocketbox MIT; masks are original in-project geometry.",
 maskedOnly=True,models=models),ensure_ascii=False,indent=2))
print("ALL TEN VALID: SKINNED AND FACE MASKS EMBEDDED IN GLB.",flush=True)
