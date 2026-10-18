import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
// Thirty different tactical loadout studies from one licensed skinned
// Soldier source. They are NOT thirty separately sourced base meshes.
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87959b);
scene.fog=new THREE.Fog(0x87959b,22,70);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.07,120);
camera.rotation.order='YXZ';camera.position.set(0,1.65,13);
const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.4));
renderer.setSize(innerWidth,innerHeight);document.body.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x54616d,2.4));
const sun=new THREE.DirectionalLight(0xffe4c0,2.8);sun.position.set(-10,20,8);scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(75,75),new THREE.MeshStandardMaterial({color:0x858078,roughness:1}));
floor.rotation.x=-Math.PI/2;scene.add(floor);
const labelTexture=(n)=>{const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#152027';ctx.fillRect(0,0,256,96);ctx.strokeStyle='#cfb885';ctx.lineWidth=4;ctx.strokeRect(3,3,250,90);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 42px system-ui';ctx.fillText(String(n).padStart(2,'0'),128,62);return new THREE.CanvasTexture(canvas)};
const cloth=[0x323e3a,0x47513e,0x515047,0x283b45,0x44463f,0x5a5949,0x303c31,0x3f444b,0x635d4d,0x283f3b];
const armor=[0x171d1f,0x252c27,0x30322c,0x182e34,0x383a33,0x1e2425];
const rigs=[];const mixers=[];
const load=document.querySelector('#load');
const url=import.meta.env.BASE_URL+'showroom/Soldier.glb';
new GLTFLoader().load(url,gltf=>{
 const bounds=new THREE.Box3().setFromObject(gltf.scene),size=bounds.getSize(new THREE.Vector3());
 const scale=1.82/Math.max(.1,size.y);
 for(let i=0;i<30;i++){
  const root=new THREE.Group(),character=clone(gltf.scene);
  const x=((i%10)-4.5)*2.35,z=(Math.floor(i/10)-1)*4.5;
  root.position.set(x,0,z);character.scale.setScalar(scale);
  const box=new THREE.Box3().setFromObject(character);
  character.position.y=-box.min.y;
  character.rotation.y=Math.PI+(i%5-2)*.09;
  const uniform=new THREE.Color(cloth[i%cloth.length]);
  const vest=new THREE.Color(armor[Math.floor(i/5)%armor.length]);
  let m=0;
  character.traverse(obj=>{
   if(!obj.isMesh)return;
   obj.castShadow=false;
   obj.material=obj.material.clone();
   if(obj.material.color){
    const c=obj.material.color;
    const l=(c.r+c.g+c.b)/3;
    c.copy(l<.25?vest:uniform).multiplyScalar(l<.25?1.0:Math.max(.65,Math.min(1.4,l*1.5)));
   }
   m++;
  });
  root.add(character);
  // Gear is attached to the character's skeleton root; loadouts vary
  // helmet, pouches, backpack, shoulder guards and vest.
  const gear=new THREE.Group();character.add(gear);
  const mk=(w,h,d,x,y,z,c)=>{
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:.95}));
   mesh.position.set(x,y,z);gear.add(mesh);
  };
  // Source Soldier is 1.82 m after normalization. Gear coordinates are in source units.
  const k=1/scale;gear.scale.setScalar(k);
  const vestColor=armor[Math.floor(i/5)%armor.length];
  mk(.42,.47,.18,0,1.18,.10,vestColor);
  for(let j=0;j<2+i%4;j++)mk(.11,.19,.10,-.16+j*.11,1.08,.22,0x202622);
  if(i%3!==0)mk(.44,.46,.15,0,1.2,-.22,vestColor);
  if(i%2===0)mk(.24,.10,.25,0,1.70,0,vestColor);
  if(i%4===0)mk(.18,.19,.12,.34,1.06,0,0x33382c);
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(.75,.29),new THREE.MeshBasicMaterial({map:labelTexture(i+1),transparent:true,side:THREE.DoubleSide}));
  plate.rotation.x=-Math.PI/2;plate.position.set(x,.016,z-1.15);scene.add(plate);
  scene.add(root);rigs.push(root);
  // Soldier has native idle/walk/run rig clips; keep a stable armed-ish idle.
  const idle=gltf.animations.find(a=>/idle/i.test(a.name));
  if(idle){const mixer=new THREE.AnimationMixer(character);mixer.clipAction(idle).play();mixers.push(mixer)}
 }
 load.hidden=true;
 document.querySelector('#count').textContent='30 тактических вариантов · одна скелетная основа';
},undefined,error=>{console.error(error);load.textContent='Не удалось загрузить Soldier.glb. Проверь сборку GitHub Pages.'});
const joy=document.querySelector('#joy'),knob=document.querySelector('#knob');
let joystick={x:0,y:0},joyId=null,lookId=null,last={x:0,y:0},yaw=0,pitch=0;
const keys=new Set();
joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture(e.pointerId);joyMove(e)});
function joyMove(e){const b=joy.getBoundingClientRect(),x=e.clientX-(b.left+b.width/2),y=e.clientY-(b.top+b.height/2),r=Math.max(1,Math.hypot(x,y)),f=Math.min(1,49/r);joystick={x:x*f/49,y:y*f/49};knob.style.transform='translate('+joystick.x*43+'px,'+joystick.y*43+'px)'}
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyMove(e)});
for(const name of ['pointerup','pointercancel'])joy.addEventListener(name,e=>{if(e.pointerId!==joyId)return;joyId=null;joystick={x:0,y:0};knob.style.transform=''});
renderer.domElement.addEventListener('pointerdown',e=>{if(lookId!==null)return;lookId=e.pointerId;last={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId)});
renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;yaw-=(e.clientX-last.x)*.004;pitch=Math.max(-1.3,Math.min(1.3,pitch-(e.clientY-last.y)*.004));last={x:e.clientX,y:e.clientY}});
for(const name of ['pointerup','pointercancel'])renderer.domElement.addEventListener(name,e=>{if(e.pointerId===lookId)lookId=null});
window.addEventListener('keydown',e=>{keys.add(e.code);if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault()});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
const clock=new THREE.Clock();
function frame(){
 requestAnimationFrame(frame);
 const dt=Math.min(.05,clock.getDelta());
 for(const m of mixers)m.update(dt);
 const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'))-joystick.y;
 const right=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+joystick.x;
 const norm=Math.max(1,Math.hypot(forward,right)),speed=5*dt/norm;
 camera.position.x+=(-Math.sin(yaw)*forward+Math.cos(yaw)*right)*speed;
 camera.position.z+=(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*speed;
 camera.position.x=THREE.MathUtils.clamp(camera.position.x,-33,33);
 camera.position.z=THREE.MathUtils.clamp(camera.position.z,-33,33);
 camera.rotation.set(pitch,yaw,0);
 renderer.render(scene,camera);
}frame();
