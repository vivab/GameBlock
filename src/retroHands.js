import * as THREE from 'three';

// Original, low-poly FPS glove mesh. Unlike imported Source arms every palm,
// finger and forearm is built under our own joints, so reload/inspect and
// independent right/left hand calibration are entirely controllable.
const rad=Math.PI/180;
const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.83,flatShading:true});
const glove=mat(0x272e34), fingers=mat(0x343c43), knuckle=mat(0x48525c),
  band=mat(0x151d24), skin=mat(0xc48c68),
  ctSleeve=mat(0x354c60),tSleeve=mat(0x756a50);
const POSES={
  fist:  { f:[[-75,-72,-48],[-90,-87,-60],[-90,-87,-60],[-83,-82,-55]], th:[-32,-34] },
  pistol:{ f:[[-16,-28,-15],[-84,-74,-50],[-88,-80,-54],[-84,-78,-51]], th:[-34,-42] },
  cup:   { f:[[-46,-52,-30],[-53,-60,-35],[-57,-60,-37],[-60,-60,-33]], th:[-25,-35] },
  open:  { f:[[-9,-10,-6],[-11,-12,-7],[-11,-12,-7],[-11,-12,-7]], th:[-12,-18] }
};
const sphere=(parent,material,w,h,d,x=0,y=0,z=0)=>{
  const p=new THREE.Mesh(new THREE.SphereGeometry(1,9,6),material);
  p.position.set(x,y,z);p.scale.set(w,h,d);parent.add(p);return p;
};
function finger(root,side,x,z,lengths,angles,thick,k,digit) {
  const pivot=new THREE.Group();pivot.position.set(x,0,z);root.add(pivot);
  let parent=pivot;
  lengths.forEach((length,i)=>{
    const joint=new THREE.Group();
    if(i)joint.position.z=-lengths[i-1]*.94;
    joint.rotation.x=angles[i]*k*rad;
    parent.add(joint);
    const body=sphere(joint,i===0?fingers:glove,thick*.50,thick*.48,
      length*.51,0,0,-length*.51);
    body.userData.finger=digit;body.userData.segment=i;
    if(i===0 && digit<4)sphere(joint,knuckle,thick*.53,thick*.23,
      thick*.34,0,thick*.20,-length*.08);
    parent=joint;
  });
  return pivot;
}
export function makeHand(side,pose='fist',u=.105,k=1,team='ct') {
  const p=POSES[pose];
  if(!p)throw Error('Unknown glove pose: '+pose);
  const sign=side==='R'?-1:1;
  const root=new THREE.Group();
  const hand=new THREE.Group(),arm=new THREE.Group();
  // Matrices are kept neutral so the knife can animate ONLY the wrist pivot.
  hand.matrixAutoUpdate=false;
  arm.matrixAutoUpdate=false;
  root.add(hand,arm);
  const palm=sphere(hand,glove,.48*u,.27*u,.63*u,0,0,-.08*u);
  sphere(hand,knuckle,.37*u,.105*u,.23*u,0,.20*u,-.32*u);
  sphere(hand,band,.49*u,.31*u,.26*u,0,0,.45*u);
  const widths=[.18,.19,.18,.165].map(n=>n*u);
  for(let i=0;i<4;i++){
    const x=sign*(.32-i*.21)*u;
    const lens=[[.52,.37,.29],[.58,.41,.31],[.53,.38,.27],[.44,.33,.25]][i].map(n=>n*u);
    finger(hand,side,x,-.55*u,lens,p.f[i],widths[i],k,i);
  }
  const thumb=finger(hand,side,sign*.49*u,.18*u,[.53*u,.36*u],
    p.th,.25*u,k,4);
  thumb.rotation.y=-sign*.85;
  // Widen the glove's wrist into a tapered, rounded tactical sleeve.
  const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.47*u,.43*u,.93*u,9),
    band);
  cuff.rotation.x=Math.PI/2;
  cuff.position.z=1.10*u;arm.add(cuff);
  const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.45*u,.39*u,5.9*u,10),
    team==='t'?tSleeve:ctSleeve);
  sleeve.rotation.x=Math.PI/2;
  sleeve.position.z=4.4*u;arm.add(sleeve);
  sphere(arm,team==='t'?tSleeve:ctSleeve,.44*u,.38*u,.34*u,
    0,0,7.0*u);
  root.userData.hand=hand;root.userData.arm=arm;
  root.userData.wr=new THREE.Vector3(0,0,.5*u);
  root.userData.el=new THREE.Vector3(0,0,7*u);
  root.userData.pose=pose;root.userData.side=side;
  return root;
}
