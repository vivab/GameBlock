import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Free test armory: swap visual GLBs without changing combat ballistics.
// Uploads from a phone are session-local until the GLB is committed to /public/models.
export const ARMORY_ITEMS=Object.freeze([
 {id:'g18',label:'Glock 18',slot:'pistol',path:'models/g18.glb'},
 {id:'usp',label:'USP-S',slot:'pistol',path:'models/usp-s.glb'},
 {id:'ak47',label:'AK-47',slot:'rifle',path:'models/ak47.glb'},
 {id:'ak74',label:'AK-74',slot:'rifle',path:'models/low-poly_ak-74.glb'},
 {id:'m4',label:'M4A4',slot:'rifle',path:'models/m4a4_low_poly.glb'}
]);
export function installArmory({views,selectWeapon,onSelection=()=>{},baseUrl='/'}) {
 const loader=new GLTFLoader();
 const cache=new Map();
 const chosen={pistol:'g18',rifle:'ak47'};
 const style=document.createElement('style');
 style.textContent=`
 #gbArmoryButton{position:fixed;top:44%;left:12px;z-index:61;border:1px solid #e4b778;background:#14293de8;color:#f5d3a0;border-radius:9px;padding:11px;font:800 13px system-ui;touch-action:manipulation}
 #gbArmory{position:fixed;inset:0;z-index:90;display:grid;place-items:center;background:#030b13bc;padding:12px;touch-action:pan-y}
 #gbArmory[hidden]{display:none}
 #gbArmoryCard{width:min(430px,100%);max-height:85dvh;overflow:auto;background:#142437;color:#edf6fc;border:1px solid #8ca1b6;border-radius:15px;padding:18px;font:14px system-ui}
 #gbArmoryCard h2{font-size:22px;margin:0 0 7px}
 #gbArmoryCard p{font-size:12px;color:#b5c7d5;line-height:1.5}
 #gbArmoryCard button{background:#2c445d;color:white;border:1px solid #7b98b0;border-radius:8px;padding:12px;font:700 13px system-ui;touch-action:manipulation}
 #gbArmoryCard button[aria-pressed=true]{background:#b78a4d;color:#101a25}
 #gbArmoryCard .gbArmoryRow{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0 16px}
 #gbArmoryCard input{max-width:100%;font-size:12px}
 #gbArmoryStatus{min-height:22px;color:#b5e9c8}
 `;
 document.head.append(style);
 const launcher=document.createElement('button');
 launcher.id='gbArmoryButton';launcher.type='button';launcher.textContent='▣ МАГАЗИН';
 const overlay=document.createElement('section');overlay.id='gbArmory';overlay.hidden=true;
 overlay.innerHTML=`<div id="gbArmoryCard"><h2>ОРУЖЕЙНЫЙ МАГАЗИН</h2><p>Тестовая версия: всё оружие бесплатно. Выбирай модель и проверяй хват в бою.</p><div id="gbArmoryRows"></div><p>Нет модели на сайте? Выбери GLB с телефона для текущей сессии.</p><input id="gbArmoryFile" type="file" accept=".glb,model/gltf-binary"><p id="gbArmoryStatus" role="status"></p><button id="gbArmoryClose" type="button">Вернуться в игру</button></div>`;
 document.body.append(launcher,overlay);
 const rows=overlay.querySelector('#gbArmoryRows');
 const status=overlay.querySelector('#gbArmoryStatus');
 const file=overlay.querySelector('#gbArmoryFile');
 let current=ARMORY_ITEMS[0],busy=false;
 function refresh(){
  rows.replaceChildren();
  for(const slot of ['pistol','rifle']){
   const h=document.createElement('strong');h.textContent=slot==='pistol'?'ПИСТОЛЕТЫ':'АВТОМАТЫ';rows.append(h);
   const row=document.createElement('div');row.className='gbArmoryRow';
   for(const item of ARMORY_ITEMS.filter(i=>i.slot===slot)){
    const button=document.createElement('button');button.type='button';
    button.textContent=item.label;button.setAttribute('aria-pressed',String(chosen[slot]===item.id));
    button.addEventListener('click',()=>equip(item));
    row.append(button);
   }rows.append(row);
  }
 }
 async function apply(item,scene){
  views[item.slot].setModel(scene);
  chosen[item.slot]=item.id;current=item;refresh();
  selectWeapon(item.slot);onSelection(item);
  status.textContent=item.label+' выбран · можно играть';
 }
 async function equip(item){
  if(busy)return;busy=true;status.textContent='Загружаем '+item.label+'…';
  try{
   let scene=cache.get(item.id);
   if(!scene){
    const url=(baseUrl.endsWith('/')?baseUrl:baseUrl+'/')+item.path;
    const result=await loader.loadAsync(url);
    scene=result.scene;cache.set(item.id,scene);
   }
   await apply(item,scene);
  }catch(e){
   status.textContent='GLB пока нет на сайте. Выбери файл '+item.label+' ниже.';
   current=item;
  }finally{busy=false}
 }
 file.addEventListener('change',async()=>{
  const selected=file.files?.[0];if(!selected||busy)return;
  if(!selected.name.toLowerCase().endsWith('.glb')){status.textContent='Нужен .glb';return}
  busy=true;status.textContent='Читаем GLB…';
  try{
   const bytes=await selected.arrayBuffer();
   const result=await new Promise((resolve,reject)=>loader.parse(bytes,'',resolve,reject));
   cache.set(current.id,result.scene);await apply(current,result.scene);
  }catch(e){status.textContent='Ошибка GLB: '+e.message}
  finally{busy=false;file.value=''}
 });
 launcher.addEventListener('click',()=>{overlay.hidden=false;refresh()});
 overlay.querySelector('#gbArmoryClose').addEventListener('click',()=>overlay.hidden=true);
 refresh();
 return {equip,chosen,close:()=>overlay.hidden=true};
}
