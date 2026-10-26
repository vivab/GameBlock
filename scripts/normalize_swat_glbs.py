import json,struct,pathlib
BASE=pathlib.Path(__file__).resolve().parents[1]
for name,height,positive in [('swat_animated',0.03153808,True),('zeal_swat_payday2',74.76350312,False)]:
 raw=(BASE/(name+'.glb')).read_bytes()
 magic,version,total=struct.unpack_from('<III',raw)
 assert (magic,version,total)==(0x46546c67,2,len(raw))
 chunks=[];off=12
 while off<len(raw):
  length,kind=struct.unpack_from('<II',raw,off);off+=8
  chunks.append((kind,raw[off:off+length]));off+=length
 data=json.loads(chunks[0][1])
 scale=1.8/height
 quat=[-0.7071067811865475,0,0,0.7071067811865476] if positive else [0.7071067811865475,0,0,0.7071067811865476]
 min_y=(-0.0000171182614 if positive else -0.22444084)*scale
 for scene in data['scenes']:
  roots=scene['nodes'][:]
  idx=len(data['nodes'])
  data['nodes'].append({'name':'GameBlock_180cm_Wrapper','children':roots,'rotation':quat,'scale':[scale]*3,'translation':[0,-min_y,0]})
  scene['nodes']=[idx]
 encoded=json.dumps(data,ensure_ascii=False,separators=(',',':')).encode()
 encoded+=b' '*((-len(encoded))%4)
 chunks[0]=(chunks[0][0],encoded)
 payload=b''.join(struct.pack('<II',len(chunk),kind)+chunk for kind,chunk in chunks)
 output=BASE/'public'/'game1'/(name+'_180cm.glb')
 output.parent.mkdir(parents=True,exist_ok=True)
 output.write_bytes(struct.pack('<III',magic,version,12+len(payload))+payload)
 print(output,len(payload))
