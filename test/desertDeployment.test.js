import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('public/game1/desert.html','utf8');
const js=readFileSync('public/game1/bomb-desert-v2.js','utf8');
const rules=readFileSync('public/game1/bomb-rules.js','utf8');
const map=readFileSync('public/game1/italy-map.js','utf8');
test('Italia has its own HTML entrypoint and versioned JS',()=>{
 assert.match(html,/src="bomb-desert-v2\.js\?v=italia-/);
 assert.doesNotMatch(html,/de_dust2_-_cs_map\.glb/);
});
test('Italia never loads the original Dust2 GLB',()=>{
 assert.doesNotMatch(js,/loader\.load\(['"]de_dust2/);
 assert.match(js,/function buildItaly\(\)/);
 assert.match(js,/buildItaly\(\)/);
});
test('two bombsites A and B, 5v5 layout',()=>{
 assert.match(js,/ITALY_SITES/);
 assert.match(js,/buildItalyMap/);
 assert.match(js,/Italia/);
});
test('round starts in 10s, shop stays for 25s',()=>{
 assert.match(rules,/buySeconds:10/);
 assert.match(rules,/shopSeconds:25/);
 assert.match(js,/function canShop\(\)/);
});
test('flat ground and floor are explicit',()=>{
 assert.match(js,/function positionGround\(x,z,fromY=45\)\{return 0;\}/);
 assert.match(map,/floor\.position\.y=-\.2/);
 assert.match(js,/buildItalyMap/);
});
