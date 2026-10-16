import {ARENA_WALLS} from '../src/combat.js';
import {writeFileSync,mkdirSync} from 'node:fs';
const dir=new URL('../public/game1/',import.meta.url);
mkdirSync(dir,{recursive:true});
if(!Array.isArray(ARENA_WALLS)||ARENA_WALLS.length<8)throw Error('Missing native GameBlock map');
writeFileSync(new URL('gameblock-arena-data.js',dir),
  '// Generated from GameBlock/src/combat.js; never imported from Game1.\n' +
  'window.GAMEBLOCK_ARENA_WALLS = Object.freeze('+JSON.stringify(ARENA_WALLS)+');\n');
console.log('Game1 mode: '+ARENA_WALLS.length+' original GameBlock collision walls');