/* Original GameBlock arena, not a map taken from Game1.
 * Native GameBlock wall layout is generated from src/combat.js at build.
 */
(function() {
 "use strict";
 window.buildGameBlockArena = function() {
  const walls=window.GAMEBLOCK_ARENA_WALLS;
  if(!Array.isArray(walls)||walls.length<8)throw Error("GameBlock arena data missing");
  const scene=new THREE.Group();
  scene.name="GameBlock original Sandstone Crossing";
  const color=c=>new THREE.MeshStandardMaterial({color:c,roughness:1,metalness:0});
  const sand=color(0xd6bc85),stone=color(0xc7ab7a),plaster=color(0xb9a16f),shade=color(0xa48a62);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(48,48),sand);
  ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  walls.forEach((w,i)=>{
   const box=new THREE.Mesh(new THREE.BoxGeometry(w.w,w.h,w.d),
      i<4?stone:i%2===0?plaster:shade);
   box.name="GameBlock solid wall "+i;
   box.position.set(w.x,w.h/2,w.z);
   box.receiveShadow=box.castShadow=true;
   scene.add(box);
  });
  return scene;
 };
})();