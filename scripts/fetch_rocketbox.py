#!/usr/bin/env python3
"""Download ten DIFFERENT, rigged MALE military/police Rocketbox avatars.

The original Microsoft-Rocketbox MIT licence applies.  Only GitHub source
assets are read; no assets from a game are copied.  Original FBX has a full
skeleton and 1024-2048 texture maps.  Convert TGA color maps to web-friendly
512px JPG before handing them to Blender.  This is an OFFLINE build step.
"""
import concurrent.futures
import io
import json
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from PIL import Image

COMMIT="0943055db6ec570bcef9f2c8b41c9e5467c808f9"
BASE=f"https://raw.githubusercontent.com/microsoft/Microsoft-Rocketbox/{COMMIT}"
MODELS=[*(f"Military_Male_{i:02}" for i in range(1,7)),
        *(f"Police_Male_{i:02}" for i in range(1,5))]
ROOT=Path("rocketbox_sources")
OUTPUT=Path("public/casting/realistic")
HEADERS={"User-Agent":"GameBlock-asset-porter/1.0 (MIT credited)"}

def fetch(path, retries=3):
    import time
    url=BASE+"/"+"/".join(quote(p) for p in path.split("/"))
    for attempt in range(retries):
        try:
            with urlopen(Request(url,headers=HEADERS),timeout=120) as response:
                return response.read()
        except Exception as exc:
            if attempt==retries-1:
                raise RuntimeError(f"Could not download {path}: {exc}") from exc
            time.sleep(2+attempt*2)

def main():
    ROOT.mkdir(exist_ok=True)
    OUTPUT.mkdir(parents=True,exist_ok=True)
    tree_url=f"https://api.github.com/repos/microsoft/Microsoft-Rocketbox/git/trees/{COMMIT}?recursive=1"
    with urlopen(Request(tree_url,headers=HEADERS),timeout=120) as res:
        tree=json.load(res)["tree"]
    paths={item["path"] for item in tree if item["type"]=="blob"}
    choices=[]
    for n,name in enumerate(MODELS,1):
        prefix=f"Assets/Avatars/Professions/{name}"
        fbx=f"{prefix}/Export/{name}.fbx"
        assert fbx in paths,fbx
        textures=[p for p in paths if p.startswith(prefix+"/Textures/") and
                  p.lower().endswith(".tga") and "_color" in p.lower()]
        textures.sort()
        assert len(textures)>=2,f"No usable color texture for {name}"
        choices.append({"number":n,"name":name,"fbx":fbx,"textures":textures})
    jobs=[(model,item) for model in choices
          for item in [model["fbx"],*model["textures"]]]
    def download(job):
        model,path=job
        number=model["number"]
        root=ROOT/f"{number:02}"
        root.mkdir(parents=True,exist_ok=True)
        basename=path.split("/")[-1]
        if path.lower().endswith(".fbx"):
            out=root/basename
            data=fetch(path)
            assert data[:21].startswith(b"Kaydara FBX Binary"),path
            out.write_bytes(data)
        else:
            out=root/(Path(basename).stem+".jpg")
            data=fetch(path)
            with Image.open(io.BytesIO(data)) as img:
                img.convert("RGB").resize((512,512),Image.Resampling.LANCZOS).save(
                    out,format="JPEG",quality=86,optimize=True)
        return number,out.name,out.stat().st_size
    print("Downloading ten separate male, skinned source avatars from Microsoft Rocketbox.",flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for result in pool.map(download,jobs):
            print(*result,flush=True)
    (ROOT/"build.json").write_text(json.dumps(choices,ensure_ascii=False,indent=2))
    print(f"Loaded {len(choices)} male rigged avatars with {len(jobs)-10} color maps.",flush=True)

if __name__=="__main__":
    main()
