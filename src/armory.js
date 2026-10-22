import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {WEAPON_DEFAULTS,HAND_DEFAULTS} from './viewmodels.js';

// Standalone cosmetic armory: combat still uses the existing pistol/rifle rules.
export const ARMORY_ITEMS=Object.freeze([
 {id:'g18',label:'Glock 18',slot:'pistol',path:'models/g18.glb',type:'Пистолет'},
 {id:'usp',label:'USP-S',slot:'pistol',path:'models/usp-s.glb',type:'Пистолет с глушителем'},
 {id:'ak47',label:'AK-47',slot:'rifle',path:'models/ak47.glb',type:'Автомат'},
 {id:'ak74',label:'AK-74',slot:'rifle',path:'models/low-poly_ak-74.glb',type:'Автомат'},
 {id:'m4',label:'M4A4',slot:'rifle',path:'models/m4a4_low_poly.glb',type:'Автомат'}
]);
const STORE='gameblock:armory-v3';
const DEFAULT={pistol:'g18',rifle:'ak47'};
const load=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{}}catch{return {}}};
const save=data=>{try{localStorage.setItem(STORE,JSON.stringify(data))}catch{}};
const copy=value=>JSON.parse(JSON.stringify(value));
export function installArmory({views,selectWeapon,onSelection=()=>{},onPlay=()=>{},baseUrl='/'}) {
 const loader=new GLTFLoader();
 const cache=new Map();
 const stored=load();
 const chosen={...DEFAULT};
 for(const slot of ['pistol','rifle']){
  if(ARMORY_ITEMS.some(item=>item.id===stored.chosen?.[slot]&&item.slot===slot))
   chosen[slot]=stored.chosen[slot];
 }
 const grips=stored.grips&&typeof stored.grips==='object'?stored.grips:{};
 let active=ARMORY_ITEMS[0],busy=false;
 const persist=()=>save({chosen,grips});
 const snapshot=(id,slot)=>{
  if(!id||!views[slot])return;
  const view=views[slot];
  grips[id]={weapon:copy(view.calibration),hands:copy(view.handCalibration)};
  persist();
 };
 const restoreGrip=item=>{
  const view=views[item.slot],preset=grips[item.id];
  view.calibrate(preset?.weapon||WEAPON_DEFAULTS[item.slot]);
  for(const side of ['R','L'])
   view.calibrateHand(side,preset?.hands?.[side]||HAND_DEFAULTS[item.slot][side]);
 };
 const css=document.createElement('style');
 css.textContent=`
 #gbArmoryButton{position:fixed;top:43%;left:10px;z-index:61;background:linear-gradient(120deg,#e4b573,#aa753e);color:#142231;border:1px solid #fff0bb;border-radius:4px;box-shadow:0 4px 16px #0008;padding:11px 12px;font:900 12px system-ui;touch-action:manipulation}
 body:not([data-phase="playing"]) #gbArmoryButton{display:none}
 #gbArmory{position:fixed;inset:0;z-index:95;background:#050c15eb;display:grid;place-items:center;padding:12px;touch-action:pan-y;overflow:auto}
 #gbArmory[hidden]{display:none!important}
 #gbArmoryCard{width:min(740px,100%);max-height:94dvh;overflow:auto;background:linear-gradient(160deg,#20374d,#0a1523);color:#eff5fb;border:1px solid #b89b75;border-radius:9px;padding:16px;font:600 13px system-ui;overscroll-behavior:contain;touch-action:pan-y}
 #gbArmoryCard button{color:#fff;background:#24384c;border:1px solid #8199ab;border-radius:4px;padding:10px;font:800 13px system-ui;touch-action:manipulation}
 #gbArmoryCard h2{font-size:23px;letter-spacing:.07em;margin:0}
 #gbArmoryCard .gbIntro{color:#b8c9d7;font-weight:500;margin:7px 0 14px;line-height:1.45}
 #gbArmoryCard .gbSection{font-size:12px;letter-spacing:.15em;color:#eac38d;margin:14px 0 8px}
 #gbArmoryCard .gbRow{display:grid;grid-template-columns:repeat(auto-fit,minmax(133px,1fr));gap:8px}
 #gbArmoryCard .gbItem{text-align:left;display:flex;flex-direction:column;align-items:flex-start;min-height:120px;background:linear-gradient(130deg,#263d53,#182737)}
 #gbArmoryCard .gbItem strong{font-size:17px;color:#f8e0b5}
 #gbArmoryCard .gbItem small{color:#aabecb;margin:6px 0}
 #gbArmoryCard .gbItem em{font:900 11px system-ui;font-style:normal;color:#89e3a4;margin-top:auto}
 #gbArmoryCard .gbItem[aria-pressed="true"]{border:2px solid #ffca82;background:#52604c}
 #gbArmoryCard .gbActions{display:flex;gap:9px;margin-top:16px}
 #gbArmoryCard .gbActions button{flex:1;min-height:46px}
 #gbArmoryCard #gbArmoryPlay{background:#b88b4a;color:#101d26;border-color:#f7d296}
 #gbArmoryCard #gbArmoryStatus{min-height:18px;color:#bbebc7;font-weight:600;margin:10px 0}
 #gbArmoryCard input{touch-action:auto;width:100%;font-size:12px}
 `;
 document.head.append(css);
 const launcher=document.createElement('button');
 launcher.id='gbArmoryButton';launcher.type='button';launcher.textContent='▣ МАГАЗИН';
 const overlay=document.createElement('section');overlay.id='gbArmory';overlay.hidden=true;
 overlay.innerHTML=`<div id="gbArmoryCard"><h2>▣ МАГАЗИН ОРУЖИЯ</h2><p class="gbIntro">Пять моделей — бесплатно для тестирования. Выбери оружие, затем выходи в бой. Настройки рук и оружия сохраняются отдельно.</p><div id="gbArmoryRows"></div><p id="gbArmoryStatus" role="status">Выбери модель оружия.</p><details><summary>Свой GLB с телефона</summary><p class="gbIntro">Заменяет выбранную модель только на этом устройстве, пока страница открыта.</p><input id="gbArmoryFile" type="file" accept=".glb,model/gltf-binary"></details><div class="gbActions"><button id="gbArmoryClose" type="button">НАЗАД</button><button id="gbArmoryPlay" type="button">▶ ИГРАТЬ</button></div></div>`;
 document.body.append(launcher,overlay);
 const rows=overlay.querySelector('#gbArmoryRows');
 const status=overlay.querySelector('#gbArmoryStatus');
 const file=overlay.querySelector('#gbArmoryFile');
 const open=()=>{overlay.hidden=false;refresh();};
 const close=()=>{overlay.hidden=true;};
 function refresh(){
  rows.replaceChildren();
  for(const slot of ['pistol','rifle']){
   const title=document.createElement('div');
   title.className='gbSection';title.textContent=slot==='pistol'?'ПИСТОЛЕТЫ':'АВТОМАТЫ';
   rows.append(title);
   const row=document.createElement('div');row.className='gbRow';
   for(const item of ARMORY_ITEMS.filter(i=>i.slot===slot)){
    const button=document.createElement('button');
    button.type='button';button.className='gbItem';
    button.setAttribute('aria-pressed',String(chosen[slot]===item.id));
    const name=document.createElement('strong');name.textContent=item.label;
    const description=document.createElement('small');description.textContent=item.type;
    const price=document.createElement('em');price.textContent=chosen[slot]===item.id?'✓ ВЫБРАНО':'БЕСПЛАТНО';
    button.append(name,description,price);
    button.addEventListener('click',()=>equip(item));
    row.append(button);
   }
   rows.append(row);
  }
 }
 async function equip(item,{activate=true}={}){
  if(busy)return false;
  busy=true;status.textContent='Загрузка '+item.label+'…';
  try{
   let scene=cache.get(item.id);
   if(!scene){
    const url=(baseUrl.endsWith('/')?baseUrl:baseUrl+'/')+item.path;
    const result=await loader.loadAsync(url);
    scene=result.scene;cache.set(item.id,scene);
   }
   const previous=chosen[item.slot];
   if(previous!==item.id)snapshot(previous,item.slot);
   views[item.slot].setModel(scene);
   if(previous!==item.id)restoreGrip(item);
   chosen[item.slot]=item.id;active=item;persist();refresh();
   if(activate)selectWeapon(item.slot);
   onSelection(item);
   status.textContent='✓ '+item.label+' установлен. Можно играть и настраивать руки.';
   return true;
  }catch(e){
   console.error('Armory GLB failed:',item.id,e);
   active=item;
   status.textContent='Не удалось открыть '+item.label+'. Проверь GLB или загрузи его ниже.';
   return false;
  }finally{busy=false}
 }
 async function restore(){
  for(const slot of ['pistol','rifle']){
   const item=ARMORY_ITEMS.find(i=>i.id===chosen[slot]);
   if(item&&item.id!==DEFAULT[slot]){
    await equip(item,{activate:false});
    restoreGrip(item);
   }
   else onSelection(ARMORY_ITEMS.find(i=>i.id===DEFAULT[slot]));
  }
 }
 file.addEventListener('change',async()=>{
  const selected=file.files?.[0];
  if(!selected||busy)return;
  if(!selected.name.toLowerCase().endsWith('.glb')){status.textContent='Требуется формат GLB';return;}
  busy=true;status.textContent='Читаем '+selected.name+'…';
  try{
   const bytes=await selected.arrayBuffer();
   const result=await new Promise((resolve,reject)=>loader.parse(bytes,'',resolve,reject));
   const slot=active.slot;
   views[slot].setModel(result.scene);
   cache.set(active.id,result.scene);
   if(chosen[slot]!==active.id)snapshot(chosen[slot],slot);
   chosen[slot]=active.id;persist();refresh();selectWeapon(slot);onSelection(active);
   status.textContent='✓ Модель из телефона загружена для текущей сессии.';
  }catch(error){status.textContent='Не удалось прочитать GLB: '+error.message;}
  finally{busy=false;file.value='';}
 });
 launcher.addEventListener('click',open);
 overlay.querySelector('#gbArmoryClose').addEventListener('click',close);
 overlay.querySelector('#gbArmoryPlay').addEventListener('click',()=>{close();onPlay()});
 addEventListener('pagehide',()=>{for(const slot of ['pistol','rifle'])snapshot(chosen[slot],slot)});
 refresh();
 return {open,close,equip,restore,chosen,get isOpen(){return !overlay.hidden}};
}
