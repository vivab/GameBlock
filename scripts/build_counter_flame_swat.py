import numpy as np
import trimesh
from trimesh.transformations import rotation_matrix
from pathlib import Path

# Counter Flame SWAT V1: original 60-part Z-up geometry, exported Y-up.
s=trimesh.Scene()
palette={'fabric':[35,48,57,255],'armor':[24,30,35,255],'rubber':[17,21,24,255],
 'gear':[59,66,60,255],'skin':[132,103,85,255],'glass':[32,67,76,255],
 'accent':[104,111,93,255]}
def add(m,name,color):
 m.visual.vertex_colors=np.tile(palette[color],(len(m.vertices),1))
 s.add_geometry(m,geom_name=name)
def ell(name,p,scale,color,detail=2):
 m=trimesh.creation.icosphere(subdivisions=detail,radius=1)
 m.apply_scale(scale);m.apply_translation(p);add(m,name,color)
def box(name,p,size,color):
 m=trimesh.creation.box(extents=size);m.apply_translation(p);add(m,name,color)
def link(name,a,b,r,color):
 a=np.array(a,float);b=np.array(b,float);v=b-a
 m=trimesh.creation.cylinder(radius=r,height=np.linalg.norm(v),sections=16)
 m.apply_transform(trimesh.geometry.align_vectors([0,0,1],v))
 m.apply_translation((a+b)/2);add(m,name,color)

ell('pelvis',(0,0,1),(.22,.135,.16),'fabric',3)
ell('torso',(0,0,1.34),(.285,.17,.36),'fabric',3)
ell('neck',(0,-.004,1.64),(.09,.085,.105),'fabric')
ell('head',(0,-.005,1.755),(.119,.108,.145),'skin',3)
ell('balaclava',(0,.012,1.75),(.122,.112,.144),'rubber',3)
for sign in [-1,1]:
 ell('goggle_'+str(sign),(sign*.055,-.108,1.783),(.055,.022,.036),'glass')
ell('respirator',(0,-.116,1.708),(.078,.036,.055),'armor')
ell('helmet_shell',(0,.005,1.842),(.147,.135,.088),'armor',3)
box('helmet_rail',(0,-.112,1.842),(.16,.04,.035),'gear')
for sign in [-1,1]:
 ell('helmet_ear_'+str(sign),(sign*.128,.006,1.75),(.037,.065,.072),'armor')
ell('front_plate',(0,-.168,1.37),(.238,.065,.265),'armor',3)
ell('back_plate',(0,.155,1.37),(.24,.048,.265),'armor')
box('belt',(0,-.005,1.075),(.46,.31,.075),'rubber')
for sign in [-1,1]:
 box('strap_'+str(sign),(sign*.178,-.128,1.56),(.085,.105,.18),'gear')
 box('side_pouch_'+str(sign),(sign*.23,-.135,1.19),(.09,.095,.135),'gear')
for i,x in enumerate([-.115,0,.115]):
 box('mag_pouch_'+str(i),(x,-.236,1.295),(.095,.065,.165),'gear')
 box('pouch_flap_'+str(i),(x,-.272,1.365),(.09,.012,.035),'accent')
for sign in [-1,1]:
 n=str(sign)
 ell('shoulder_'+n,(sign*.291,0,1.546),(.12,.123,.135),'fabric',3)
 a=(sign*.315,0,1.52);b=(sign*.41,-.014,1.285);c=(sign*.455,-.115,1.07)
 link('upper_arm_'+n,a,b,.087,'fabric')
 ell('elbow_'+n,b,(.077,.077,.079),'fabric')
 link('forearm_'+n,b,c,.073,'fabric')
 ell('glove_'+n,(sign*.457,-.128,1.012),(.073,.049,.093),'rubber')
 for j in range(4):
  x=sign*(.408+j*.031)
  link('finger_'+n+'_'+str(j),(x,-.156,.971),(x,-.165,.912),.011,'rubber')
 link('thumb_'+n,(sign*.40,-.153,1.03),(sign*.374,-.18,.974),.015,'rubber')
 ell('thigh_'+n,(sign*.133,-.005,.783),(.122,.125,.247),'fabric',3)
 ell('kneepad_'+n,(sign*.145,-.128,.556),(.095,.041,.105),'armor')
 ell('shin_'+n,(sign*.147,-.006,.349),(.099,.103,.226),'fabric',3)
 ell('boot_ankle_'+n,(sign*.147,-.013,.135),(.096,.106,.133),'rubber')
 ell('boot_foot_'+n,(sign*.147,-.094,.065),(.105,.195,.064),'rubber',3)
 box('sole_'+n,(sign*.147,-.10,.024),(.215,.35,.036),'armor')
 box('arm_patch_'+n,(sign*.32,-.112,1.48),(.065,.012,.06),'accent')
s.apply_transform(rotation_matrix(np.pi,[0,1,0])@rotation_matrix(-np.pi/2,[1,0,0]))
output=Path('public/models/counter_flame_swat_v1.glb')
output.parent.mkdir(parents=True,exist_ok=True)
s.export(str(output))
print(output,len(s.geometry),'body parts',sum(len(g.faces) for g in s.geometry.values()),'triangles')
