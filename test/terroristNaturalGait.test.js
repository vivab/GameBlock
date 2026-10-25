import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync('public/game1/terrorist-studio.html','utf8');
const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
const start=script.indexOf('function sampleMotion('),end=script.indexOf('function animate(dt){',start);
assert.ok(start>=0&&end>start);
const {sampleMotion,blendGait}=new Function(script.slice(start,end)+'return {sampleMotion,blendGait}')();
const close=(a,b,delta=.0005)=>assert.ok(Math.abs(a-b)<delta,'Expected '+a+' about '+b);

test('step is planted then swings forward with natural knee recovery',()=>{
 for(const action of ['walk','run']){
  const support=action==='run'?.60:.65;
  const planted=sampleMotion(action,0,true,support*.45);
  const recovery=sampleMotion(action,0,true,support+(1-support)*.50);
  assert.ok(Math.abs(recovery.motion.LeftLeg.rx)>Math.abs(planted.motion.LeftLeg.rx)*2,
   'knee should bend mainly when the foot is airborne: '+action);
  assert.ok(recovery.motion.LeftLeg.rx<0);
  assert.equal(planted.jumpHeight,0);
  assert.equal(recovery.jumpHeight,0);
  assert.equal(planted.groundFeet,true);
  assert.equal(recovery.groundFeet,true);
 }
});
test('walk and run loops have continuous hips, knees, heels and toes',()=>{
 for(const action of ['walk','run']){
  const support=action==='run'?.60:.65;
  for(const [a,b] of [[support-1e-6,support+1e-6],[0,1]]){
   const x=sampleMotion(action,0,true,a),y=sampleMotion(action,0,true,b);
   for(const bone of ['LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase'])
    close(x.motion[bone].rx,y.motion[bone].rx,.0007);
  }
  const front=sampleMotion(action,0,true,0),half=sampleMotion(action,0,true,.5);
  close(front.motion.LeftUpLeg.rx,half.motion.RightUpLeg.rx);
  close(front.motion.LeftLeg.rx,half.motion.RightLeg.rx);
 }
});
test('feet participate in gait but arms and weapon never swing',()=>{
 for(const action of ['walk','run'])for(let i=0;i<=240;i++){
  const frame=sampleMotion(action,0,true,i/240);
  for(const bone of Object.keys(frame.motion)){
   assert.ok(!/Arm|Hand|Shoulder/.test(bone),'Weapon grip incorrectly animated by gait: '+bone);
   assert.ok(!bone.startsWith('Hips'),'No hopping up and down');
  }
  for(const side of ['Left','Right']){
   const foot=frame.motion[side+'Foot'],toe=frame.motion[side+'ToeBase'],knee=frame.motion[side+'Leg'];
   assert.ok(foot&&toe&&knee);
   assert.ok(knee.rx<0,'knees must bend backwards');
   assert.ok(Math.abs(foot.rx)<.55,'ankle rotation limit');
   assert.ok(Math.abs(toe.rx)<.2,'toe pivot limit');
  }
  assert.equal(frame.recoil,0);
 }
});
test('running is quicker and its steps are restrained, not hopping',()=>{
 for(const action of ['walk','run']){
  let thigh=0,knee=0;
  for(let i=0;i<=400;i++){
   const frame=sampleMotion(action,0,true,i/400);
   thigh=Math.max(thigh,Math.abs(frame.motion.LeftUpLeg.rx));
   knee=Math.max(knee,Math.abs(frame.motion.LeftLeg.rx));
   assert.equal(frame.jumpHeight,0);
  }
  assert.ok(thigh<.30);
  assert.ok(knee<.50);
 }
 const mid=sampleMotion('run',0,true,.5);
 assert.ok(Math.abs(mid.motion.Spine.rz)<.013);
 assert.ok(Math.abs(mid.motion.Spine1.rz)<.013);
 assert.match(script,/action==='run'\?7\.5:5\.0/);
});
test('switching gait actions interpolates rather than snaps',()=>{
 const from=sampleMotion('walk',0,true,.3),to=sampleMotion('run',0,true,.3);
 const a=blendGait(from,to,0),b=blendGait(from,to,1);
 close(a.motion.LeftUpLeg.rx,from.motion.LeftUpLeg.rx);
 close(b.motion.LeftUpLeg.rx,to.motion.LeftUpLeg.rx);
 const halfway=blendGait(from,to,.5);
 assert.ok(halfway.motion.LeftUpLeg.rx>=Math.min(from.motion.LeftUpLeg.rx,to.motion.LeftUpLeg.rx));
 assert.ok(halfway.motion.LeftUpLeg.rx<=Math.max(from.motion.LeftUpLeg.rx,to.motion.LeftUpLeg.rx));
 assert.match(script,/fadeElapsed\/\.24/);
 assert.match(script,/footGroundOffset\+=\(groundTarget-footGroundOffset\)\*groundBlend/);
 assert.doesNotThrow(()=>new vm.Script(script));
});