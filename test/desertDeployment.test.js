import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('public/game1/desert.html','utf8');
const code=readFileSync('public/game1/bomb-desert-v2.js','utf8');
const map=readFileSync('public/game1/italy-import-map.js','utf8');
const rules=readFileSync('public/game1/bomb-rules.js','utf8');
test('Italy uses the actual uploaded GLB, not the procedural replacement',()=>{
 assert.match(html,/src="bomb-desert-v2\.js\?v=italy-glb-/);
 assert.match(code,/from '\.\/italy-import-map\.js'/);
 assert.match(map,/load\('cs_italy_with_real_light\.glb'/);
 assert.doesNotMatch(code,/from '\.\/italy-map\.js'/);
 assert.doesNotMatch(html,/de_dust2_-_cs_map\.glb/);
});
test('the map must finish loading before any player can spawn',()=>{
 assert.match(code,/buildItalyMap\(THREE,levelRoot\)\.then/);
 assert.match(code,/mapLoaded=true/);
 assert.match(code,/if\(!mapLoaded\)/);
 assert.match(code,/levelMeshes=\[floor,\.\.\.obstacles\]/);
});
test('original game mode timings and two sites stay intact',()=>{
 assert.match(rules,/buySeconds:10/);
 assert.match(rules,/shopSeconds:25/);
 assert.match(code,/ITALY_SITES/);
 assert.match(code,/function canShop\(\)/);
});
test('terrain height comes from the actual GLB floor',()=>{
 assert.match(code,/function positionGround\(x,z,fromY=45\)\{return italyGround\(x,z\);\}/);
 assert.match(code,/if\(grounded\)playerY=ground/);
 assert.match(code,/ITALY_SPAWN_POINTS/);
});
test('the 3D model creator is attributed in the UI',()=>{
 assert.match(html,/Neo_minigan/);
 assert.match(html,/CC BY 4\.0/);
});

test('glTF loader matches the r128 renderer and supports baked Italy texture atlases',()=>{
 const loader=readFileSync('public/game1/GLTFLoader.js','utf8');
 assert.match(html,/three\.js\/r128\/three\.min\.js/);
 assert.match(html,/GLTFLoader\.js\?v=italy-r128-textures-/);
 assert.match(loader,/class GLTFMaterialsUnlitExtension/);
 assert.match(loader,/THREE\.sRGBEncoding/);
 assert.doesNotMatch(loader,/class GLTFMaterialsSheenExtension/);
 assert.match(code,/Italy textured meshes:/);
 assert.match(code,/if\(textured<12\)/);
});
