import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const code=readFileSync('public/game1/bomb-desert-v2.js','utf8');
const definition=code.match(/const damp=[^\n]+;/)?.[0];
if(!definition)throw new Error('Missing frame-rate independent smoothing function');
const damp=new Function(definition+';return damp;')();

test('turning and movement have framerate-independent interpolation',()=>{
 const integrate=(rate,fps)=>{
  let value=0;
  for(let i=0;i<fps;i++)value=damp(value,1,rate,1/fps);
  return value;
 };
 for(const rate of [12,18,20,24])
  assert.ok(Math.abs(integrate(rate,30)-integrate(rate,120))<1e-9,'fps drift for rate '+rate);
 assert.ok(damp(0,1,24,1/60)>damp(0,1,12,1/60),'look should respond faster than running');
});
test('joystick, camera and velocity have distinct easing states',()=>{
 assert.match(code,/smoothJoy\.x=damp\(smoothJoy\.x,joy\.x,18,dt\)/);
 assert.match(code,/lookYaw=damp\(lookYaw,targetLookYaw,24,dt\)/);
 assert.match(code,/moveVelocity\.x=damp\(moveVelocity\.x,dir\.x\*speed,easeRate,dt\)/);
 assert.match(code,/targetLookYaw-=dx\*\.004/);
 assert.match(code,/smoothJoy\.x=smoothJoy\.y=0;moveVelocity\.x=moveVelocity\.z=0/);
});
test('mobile movement still slides on walls and does not pause for reload',()=>{
 assert.match(code,/const canWalk=\(x,z\)=>!italyBlocks\(x,z,\.38\)/);
 assert.match(code,/function reloadOrInspect\(\)/);
 assert.match(code,/reloadButton\.addEventListener\('pointerdown'/);
 assert.doesNotMatch(code,/if\(!actor\.reloadingUntil\).*?updatePlayer\(/s);
});
