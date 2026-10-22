import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Draggable, collapsible editor; third-person mounts saved for the live game.
export const MOUNT_CONTROLS=Object.freeze([
 {key:'x',label:'↔ Лево / право',min:-.75,max:.75,step:.005,unit:'м'},
 {key:'y',label:'↕ Верх / низ',min:-.75,max:.75,step:.005,unit:'м'},
 {key:'z',label:'↗ Вперёд / назад',min:-.75,max:.75,step:.005,unit:'м'},
 {key:'rx',label:'Наклон X',min:-180,max:180,step:1,unit:'°'},
 {key:'ry',label:'Разворот Y',min:-180,max:180,step:1,unit:'°'},
 {key:'rz',label:'Крен Z',min:-180,max:180,step:1,unit:'°'},
 {key:'scale',label:'Масштаб',min:.35,max:2.3,step:.01,unit:'×'}
]);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function mountControlValue(mount,key,value){
 const control=MOUNT_CONTROLS.find(c=>c.key===key);
 if(!control)throw Error('Unknown mount axis '+key);
 const n=Number(value);
 if(!Number.isFinite(n))return mount[key];
 return clamp(Number((Math.round(n/control.step)*control.step).toFixed(6)),control.min,control.max);
}
const format=(value,field)=>field.unit==='°'?Math.round(value)+'°':
 field.unit==='×'?Number(value).toFixed(2)+'×':Number(value).toFixed(3)+' м';

export function installWeaponMountEditor({gear,getKind=()=>gear.kind,setKind=()=>{},notify=()=>{}}={}){
 if(!gear?.getMount||!gear?.setMount||!gear?.setModel)
  throw Error('Weapon editor requires a third-person firearm rig');
 const css=document.createElement('style');
 css.textContent=[
 '#weOpen{position:fixed;bottom:max(14px,env(safe-area-inset-bottom));right:14px;z-index:72;background:#d9ab67;color:#10202c;border:1px solid #f8d69f;border-radius:9px;box-shadow:0 4px 18px #0008;font:800 12px system-ui;padding:12px 14px;cursor:pointer;touch-action:manipulation}',
 '#wePanel{position:fixed;top:125px;right:16px;z-index:73;width:min(327px,calc(100vw - 18px));max-height:min(74dvh,620px);display:flex;flex-direction:column;border:1px solid #8fa9b4;border-radius:13px;background:#0c1d2ff4;color:#f2f6fc;box-shadow:0 10px 40px #000b;font:12px system-ui;overflow:hidden;backdrop-filter:blur(7px)}',
 '#wePanel[hidden]{display:none}',
 '#wePanel button,#wePanel input,#wePanel select{font:inherit;touch-action:auto}',
 '#wePanel button{background:#263a50;color:#edf6fc;border:1px solid #657e92;border-radius:6px;min-height:32px;cursor:pointer}',
 '#weHeader{cursor:grab;touch-action:none;user-select:none;flex-shrink:0;padding:11px 8px;display:flex;align-items:center;gap:5px;background:#19344c;border-bottom:1px solid #6f8596;font-weight:800}',
 '#weHeader:active{cursor:grabbing}',
 '#weTitle{flex:1;padding-left:4px;min-width:0}',
 '#weHeader button{width:31px;flex-shrink:0;touch-action:manipulation}',
 '#weBody{padding:12px 11px;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y}',
 '#wePanel.weMin #weBody{display:none}',
 '#wePanel.weMin{max-height:none}',
 '#wePanel label{display:block;font-weight:720;margin:8px 0 6px;color:#cddde9}',
 '#wePanel select{width:100%;border:1px solid #627689;border-radius:6px;color:#edf6ff;background:#23374c;padding:9px;font-size:12px}',
 '#wePanel .we-file{width:100%;max-width:100%;font-size:11px;color:#a8c6d6;margin-top:5px;padding:9px 4px;background:#13293e;border:1px dashed #547084;border-radius:5px}',
 '#wePanel .we-axis{display:grid;grid-template-columns:1fr 78px;gap:3px 9px;padding:7px 0;border-bottom:1px solid #ffffff18;align-items:center}',
 '#wePanel .we-axis label{margin:0;font-size:11px}',
 '#wePanel .we-axis input[type=range]{grid-column:1;grid-row:2;width:100%;accent-color:#f2be70;min-height:29px}',
 '#wePanel .we-axis input[type=number]{grid-column:2;grid-row:2;width:100%;min-width:0;background:#172c41;color:white;border:1px solid #55728d;border-radius:6px;padding:7px 3px;font-size:12px;text-align:center}',
 '#wePanel .we-value{grid-column:2;grid-row:1;text-align:right;font-variant-numeric:tabular-nums;color:#f8ca87;font-size:11px}',
 '#wePanel .we-buttons{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:12px 0 7px}',
 '#wePanel .we-primary{background:#cda369;color:#112234;font-weight:800;border-color:#ecc68b}',
 '#wePanel .we-tip{line-height:1.5;color:#b2c8d8;font-size:11px;padding-top:6px}',
 '#wePanel #weMessage{color:#eacb99;line-height:1.4;min-height:16px;font-size:11px}',
 '@media(max-width:680px){#wePanel{width:min(296px,calc(100vw - 16px));max-height:60dvh}#weOpen{font-size:11px;right:9px;padding:10px 12px}}'
 ].join('\n');
 document.head.append(css);
 const launcher=document.createElement('button');
 launcher.type='button';launcher.id='weOpen';launcher.textContent='⚙ ДВИГАТЬ ОРУЖИЕ';
 const panel=document.createElement('section');
 panel.id='wePanel';panel.setAttribute('aria-label','Подгонка оружия в реальном времени');
 panel.innerHTML=[
 '<div id="weHeader" aria-label="Перетащить меню за заголовок">',
 '<span id="weTitle">⠿ ПОДГОНКА ОРУЖИЯ</span>',
 '<button type="button" id="weDock" title="Поменять сторону экрана">⇆</button>',
 '<button type="button" id="weMinimize" title="Свернуть">—</button>',
 '<button type="button" id="weClose" aria-label="Скрыть редактор">×</button>',
 '</div><div id="weBody">',
 '<label for="weKind">Модель, которую двигаем</label>',
 '<select id="weKind"><option value="rifle">AK-47 / автомат</option><option value="pistol">Пистолет</option></select>',
 '<label for="weFile">Загрузить свой GLB (пока локально)</label>',
 '<input id="weFile" class="we-file" type="file" accept=".glb,model/gltf-binary">',
 '<div class="we-buttons"><button type="button" id="weDefault">Временная модель</button>',
 '<button type="button" id="weReset">↺ Сброс координат</button></div>',
 '<div class="we-buttons"><button type="button" id="weSmaller">− Меньше оружие</button>',
 '<button type="button" id="weBigger">＋ Больше оружие</button></div>',
 '<div id="weSliders"></div>',
 '<div class="we-buttons"><button class="we-primary" type="button" id="weCopy">⧉ Копировать JSON</button>',
 '<button type="button" id="weMoveSide">⇆ Перенести меню</button></div>',
 '<div id="weMessage" role="status"></div>',
 '<div class="we-tip">Движения видны сразу: ладони следуют за оружием. Меню можно',
 ' перетащить за заголовок, свернуть или перенести на другую сторону.',
 ' Координаты сохраняются на этом устройстве; сам GLB открыт локально',
 ' до перезагрузки страницы. Для других игроков GLB потребуется залить в GitHub.</div>',
 '</div>'
 ].join('');
 document.body.append(launcher,panel);
 const $=id=>panel.querySelector('#'+id);
 const kindSelect=$('weKind');
 const rows={};
 const clampPosition=(x,y)=>{
  const width=panel.getBoundingClientRect().width||296;
  const height=panel.getBoundingClientRect().height||52;
  return {x:clamp(x,3,Math.max(3,innerWidth-width-3)),
   y:clamp(y,3,Math.max(3,innerHeight-height-3))};
 };
 const place=(x,y)=>{
  const p=clampPosition(x,y);
  panel.style.left=p.x+'px';panel.style.top=p.y+'px';panel.style.right='auto';
 };
 const moveToSide=()=>{
  const r=panel.getBoundingClientRect();
  place(r.left>innerWidth/2?8:innerWidth-r.width-8,r.top);
 };
 let dragging=null;
 const header=$('weHeader');
 header.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.target.closest('button'))return;
  const r=panel.getBoundingClientRect();
  dragging={id:event.pointerId,x:event.clientX-r.left,y:event.clientY-r.top};
  header.setPointerCapture(event.pointerId);
  event.preventDefault();
 });
 header.addEventListener('pointermove',event=>{
  if(!dragging||event.pointerId!==dragging.id)return;
  place(event.clientX-dragging.x,event.clientY-dragging.y);
  event.preventDefault();
 });
 const stopDrag=event=>{if(dragging?.id===event.pointerId)dragging=null};
 header.addEventListener('pointerup',stopDrag);
 header.addEventListener('pointercancel',stopDrag);
 $('weDock').addEventListener('click',moveToSide);
 $('weMoveSide').addEventListener('click',moveToSide);
 $('weMinimize').addEventListener('click',()=>{
  panel.classList.toggle('weMin');
  $('weMinimize').textContent=panel.classList.contains('weMin')?'▣':'—';
 });
 $('weClose').addEventListener('click',()=>panel.hidden=true);
 launcher.addEventListener('click',()=>{
  if(panel.hidden){
   panel.hidden=false;panel.classList.remove('weMin');
  }else if(panel.classList.contains('weMin')){
   panel.classList.remove('weMin');
  }else panel.hidden=true;
  $('weMinimize').textContent=panel.classList.contains('weMin')?'▣':'—';
  if(!panel.hidden){const bounds=panel.getBoundingClientRect();place(bounds.left,bounds.top);refresh()}
 });
 function currentKind(){return kindSelect.value==='pistol'?'pistol':'rifle'}
 const say=(txt,err=false)=>{
  const el=$('weMessage');el.textContent=txt;el.style.color=err?'#ffaaa0':'#eacb99';
  notify(txt,err);
 };
 function refresh(){
  const mount=gear.getMount(currentKind());
  for(const ctrl of MOUNT_CONTROLS){
   const ui=rows[ctrl.key];if(!ui)continue;
   ui.slider.value=String(mount[ctrl.key]);
   ui.number.value=String(mount[ctrl.key]);
   ui.output.textContent=format(mount[ctrl.key],ctrl);
  }
 }
 for(const ctrl of MOUNT_CONTROLS){
  const row=document.createElement('div');row.className='we-axis';
  const label=document.createElement('label');label.textContent=ctrl.label;
  const id='we-'+ctrl.key;label.setAttribute('for',id);
  const output=document.createElement('output');output.className='we-value';
  const slider=document.createElement('input');slider.id=id;slider.type='range';
  slider.min=ctrl.min;slider.max=ctrl.max;slider.step=ctrl.step;
  const number=document.createElement('input');number.type='number';
  number.setAttribute('aria-label',ctrl.label+' число');
  number.min=ctrl.min;number.max=ctrl.max;number.step=ctrl.step;
  row.append(label,output,slider,number);$('weSliders').append(row);
  const apply=value=>{
   if(value===''||!Number.isFinite(Number(value)))return;
   const v=mountControlValue(gear.getMount(currentKind()),ctrl.key,value);
   gear.setMount(currentKind(),{[ctrl.key]:v});
   slider.value=String(v);number.value=String(v);output.textContent=format(v,ctrl);
  };
  slider.addEventListener('input',event=>apply(event.target.value));
  number.addEventListener('input',event=>apply(event.target.value));
  number.addEventListener('change',refresh);
  rows[ctrl.key]={slider,number,output};
 }
 function changeKind(kind){
  gear.setKind(kind);setKind(kind);refresh();
 }
 kindSelect.addEventListener('change',()=>changeKind(currentKind()));
 function select(kind){
  if(kind!=='pistol'&&kind!=='rifle')return;
  kindSelect.value=kind;refresh();
 }
 for(const [id,delta] of [['weSmaller',-.1],['weBigger',.1]]){
  $(id).addEventListener('click',()=>{
   const kind=currentKind();
   const mount=gear.getMount(kind);
   const scale=mountControlValue(mount,'scale',mount.scale+delta);
   gear.setMount(kind,{scale});
   refresh();say('Масштаб '+kind+': '+scale.toFixed(2)+'×');
  });
 }
 $('weReset').addEventListener('click',()=>{
  gear.resetMount(currentKind());refresh();say('Координаты сброшены');
 });
 $('weDefault').addEventListener('click',()=>{
  gear.setModel(currentKind(),null);$('weFile').value='';say('Временная модель возвращена');
 });
 $('weCopy').addEventListener('click',async()=>{
  const data={weapon:currentKind(),mount:gear.getMount(currentKind())};
  try{await navigator.clipboard.writeText(JSON.stringify(data,null,2));
   say('Координаты скопированы');}
  catch{say('Буфер недоступен — сделай скриншот чисел',true)}
 });
 const loader=new GLTFLoader();
 $('weFile').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  if(!file.name.toLowerCase().endsWith('.glb')){say('Нужен файл .glb',true);return}
  const kind=currentKind();
  try{
   say('Загружаю '+file.name+'…');
   const data=await file.arrayBuffer();
   const gltf=await new Promise((resolve,reject)=>loader.parse(data,'',resolve,reject));
   gear.setModel(kind,gltf);
   say('✓ '+file.name+' загружен. Двигай ползунками!');
  }catch(err){
   console.error('Imported GLB failed',err);say('Ошибка GLB: '+(err.message||err),true);
  }
 });
 const position=()=>{
  const w=panel.getBoundingClientRect().width||296;
  place(innerWidth-w-12,innerWidth<700?115:135);
 };
 position();
 addEventListener('resize',()=>{const r=panel.getBoundingClientRect();place(r.left,r.top)});
 if(innerWidth<700){
  panel.classList.add('weMin');
  $('weMinimize').textContent='▣';
 }
 const selected=getKind();
 if(selected==='rifle'||selected==='pistol')kindSelect.value=selected;
 refresh();
 return {element:panel,launcher,show(){
    panel.hidden=false;panel.classList.remove('weMin');$('weMinimize').textContent='—';
    const bounds=panel.getBoundingClientRect();place(bounds.left,bounds.top);refresh();
   },hide(){panel.hidden=true},
  select,refresh,dispose(){launcher.remove();panel.remove();css.remove()}};
}
