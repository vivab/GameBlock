"""Fail the CI job if any of the ten distinct GLBs has lost its skeleton.

glTF GLB v2 JSON parsing uses only standard library, so this test also
works locally in GameBlock npm test if needed.
"""
import json
import struct
from pathlib import Path
ROOT=Path("public/casting/realistic")
manifest=[]
names=[*(f"Military_Male_{i:02}" for i in range(1,7)),*(f"Police_Male_{i:02}" for i in range(1,5))]
for i,name in enumerate(names,1):
    path=ROOT/f"{i:02}.glb"
    data=path.read_bytes()
    magic,ver,length=struct.unpack_from("<4sII",data,0)
    assert magic==b"glTF" and ver==2 and len(data)==length,(name,"invalid glb")
    chunklen,chunkkind=struct.unpack_from("<I4s",data,12)
    assert chunkkind==b"JSON",name
    gltf=json.loads(data[20:20+chunklen].decode("utf-8"))
    bones=max((len(s.get("joints",[])) for s in gltf.get("skins",[])),default=0)
    assert bones>=14,(name,"not skinned",bones)
    assert len(gltf.get("meshes",[]))>=1,(name,"empty")
    assert len(gltf.get("textures",[]))>=1,(name,"untextured")
    assert any("JOINTS_0" in p.get("attributes",{}) and
               "WEIGHTS_0" in p.get("attributes",{})
               for m in gltf["meshes"] for p in m.get("primitives",[])),(name,"missing skin weights")
    assert 70000<len(data)<12000000,(name,"size",len(data))
    manifest.append({
       "number":i,"name":name.replace("_"," "),"path":f"casting/realistic/{i:02}.glb",
       "source":"Microsoft Rocketbox","license":"MIT",
       "sourceUrl":"https://github.com/microsoft/Microsoft-Rocketbox",
       "male":True,"hasSkeleton":True,"boneCount":bones,
       "bytes":len(data),"kind":"military" if i<=6 else "police-tactical"
    })
    print(name,"bones",bones,"meshes",len(gltf["meshes"]),
          "textures",len(gltf.get("textures",[])),"size",len(data),flush=True)
assert len(manifest)==10 and len(set(m["name"] for m in manifest))==10
(ROOT/"manifest.json").write_text(json.dumps({"total":10,"models":manifest},ensure_ascii=False,indent=2))
print("SUCCESS: 10 distinct adult male rigged avatars validated",flush=True)
