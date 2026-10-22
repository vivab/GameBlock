import { WEAPON_DEFAULTS,HAND_DEFAULTS } from './viewmodels.js';
import {listGlovePresets} from './gloveSkins.js';

// The old Source-skeleton calibration is intentionally not migrated. The
// new GameBlock glove rig has predictable local axes and fresh clean defaults.
const STORAGE='gameblock:retro-grip-v2';
const WEAPON=[
  ['x','Вбок',-1,1,.01],['y','Высота',-1,1,.01],['z','Глубина',-1,1,.01],
  ['rx','Наклон X',-180,180,1],['ry','Разворот Y',-180,180,1],
  ['rz','Крен Z',-180,180,1],['scale','Размер',.35,2.5,.01]
];
const HAND=[
  ['x','Кисть X',-8,8,.05],['y','Кисть Y',-8,8,.05],['z','Кисть Z',-8,8,.05],
  ['pitch','Наклон',-180,180,1],['yaw','Разворот',-180,180,1],
  ['roll','Поворот',-180,180,1],['k','Сжатие пальцев',.25,1.8,.05]
];
function read(){
  try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')||{};}
  catch{return {};}
}
function save(data){
  try{localStorage.setItem(STORAGE,JSON.stringify(data));}catch{}
}
export function setupWeaponCalibration({views,getWeapon,setWeapon=()=>{}}){
  const saved=read();
  const GLOVE_STORAGE='gameblock:gloves-v1';
  let gloveSelection={preset:'midnight',sleeveMode:'uniform'};
  try{gloveSelection={...gloveSelection,...JSON.parse(localStorage.getItem(GLOVE_STORAGE)||'{}')}}catch{}
  for(const view of Object.values(views)){
    try{view.setGloveStyle(gloveSelection)}catch{view.setGloveStyle({preset:'midnight',sleeveMode:'uniform'})}
  }
  for(const [kind,view] of Object.entries(views)){
    const config=saved[kind];if(!config)continue;
    if(config.weapon)view.calibrate(config.weapon);
    for(const side of ['R','L'])if(config[side])view.calibrateHand(side,config[side]);
  }
  const wrapper=document.createElement('div');
  wrapper.id='calibrationUI';
  wrapper.innerHTML=`
    <button id="calibrationOpen" aria-label="Настроить оружие и руки"
      type="button">⚙</button>
    <section id="calibrationPanel" aria-label="Настройка оружия" hidden>
      <div class="cal-head" id="calDragBar"><b style="flex:1">⠿ ПЕРЕТАЩИ МЕНЮ</b>
        <button id="calSide" type="button" aria-label="Перенести меню">⇆</button>
        <button id="calCollapse" type="button" aria-label="Свернуть меню">—</button>
        <button id="calibrationClose" type="button">✕</button></div>
      <div id="calBody">
      <p>Собственные 3D-руки и оружие. Все изменения сохраняются на этом устройстве.</p>
      <label>Оружие <select id="calWeapon">
        <option value="pistol">Glock 18</option><option value="rifle">AK-47</option>
        <option value="knife">Нож</option></select></label>
      <label>Подгоняю <select id="calPart">
        <option value="R">Правая рука</option><option value="L">Левая рука</option>
        <option value="weapon">Оружие</option></select></label>
      <label id="calPoseRow">Пальцы <select id="calPose">
        <option value="pistol">На спуске</option><option value="cup">Обхват</option>
        <option value="fist">Кулак</option><option value="open">Открытая</option>
      </select></label>
      <div style="border-top:1px solid #5673a088;margin:10px 0;padding-top:7px">
        <b>ПЕРЧАТКИ / СКИНЫ</b>
        <label>Расцветка <select id="calGlove"></select></label>
        <label>Предплечья <select id="calSleeves">
          <option value="uniform">Рукава спецназа</option>
          <option value="bare">Открытые руки + перчатки</option>
        </select></label>
        <small>Перчатки независимы от оружия: одна расцветка на Glock, AK и нож.</small>
      </div>
      <div class="cal-actions" id="calWeaponScaleButtons">
        <button id="calSmaller" type="button">− Меньше оружие</button>
        <button id="calBigger" type="button">＋ Больше оружие</button>
      </div>
      <div id="calSliders"></div>
      <div class="cal-actions">
        <button id="calReset" type="button">Сбросить</button>
        <button id="calCopy" type="button">Копировать хват</button>
      </div>
      <textarea id="calOutput" readonly aria-label="Координаты" rows="3"></textarea>
      <small id="calStatus">Передвигай руки ползунками и смотри на оружие.</small>
      </div>
    </section>`;
  const css=document.createElement('style');
  css.textContent=`
    #calibrationUI{position:fixed;inset:0;z-index:40;pointer-events:none;
      font:600 12px system-ui,Arial;color:#edf4ef}
    #calibrationOpen{position:absolute;top:98px;left:max(12px,env(safe-area-inset-left));
      pointer-events:auto;background:#172737;border:1px solid #b7a27f;
      border-radius:8px;width:38px;height:38px;color:#fff;font-size:24px}
    #calibrationPanel{position:absolute;top:2%;left:max(9px,env(safe-area-inset-left));
      width:min(330px,calc(100vw - 22px));max-height:94%;overflow:hidden;overscroll-behavior:contain;
      pointer-events:auto;background:#111e2bf7;border:1px solid #b7a27f;
      border-radius:11px;padding:13px;box-shadow:0 12px 45px #000a}
    #calibrationPanel[hidden],#calPoseRow[hidden]{display:none!important}
    #calDragBar{touch-action:none;user-select:none;cursor:grab;margin:-5px -5px 8px;padding:6px;
      background:#233c50;border-radius:6px}
    #calDragBar:active{cursor:grabbing}
    #calDragBar button{touch-action:manipulation;min-width:28px}
    #calBody{max-height:calc(87dvh - 66px);overflow:auto;overscroll-behavior:contain;
      touch-action:pan-y;-webkit-overflow-scrolling:touch}
    #calibrationPanel.cal-collapsed{max-height:none}
    #calibrationPanel.cal-collapsed #calBody{display:none}
    #calibrationUI button,#calibrationUI input,#calibrationUI select,
    #calibrationUI textarea{touch-action:auto;color:inherit;font:inherit}
    #calibrationPanel button{background:#324b59;border:1px solid #b2a180;
      padding:6px 9px;border-radius:5px}
    #calibrationPanel .cal-head {display:flex;align-items:center;
      justify-content:space-between;letter-spacing:.07em}
    #calibrationPanel p{font-size:11px;line-height:1.35;font-weight:400;
      color:#b7c5c4;margin:8px 0}
    #calibrationPanel label:not(.cal-row){display:flex;align-items:center;
      justify-content:space-between;gap:9px;margin:7px 0}
    #calibrationPanel select{background:#254152;border:1px solid #7e908b;
      border-radius:4px;max-width:65%;padding:4px}
    #calibrationPanel .cal-row {display:grid;grid-template-columns:85px minmax(0,1fr) 34px;
      align-items:center;gap:7px;margin:6px 0}
    #calibrationPanel .cal-row input{width:100%;accent-color:#e5b771}
    #calibrationPanel .cal-row output{font-size:10px;text-align:right}
    #calibrationPanel .cal-actions{display:flex;gap:5px;margin:11px 0}
    #calibrationPanel .cal-actions[hidden]{display:none!important}
    #calWeaponScaleButtons button{flex:1;background:#8a693d!important;font-weight:800}
    #calibrationPanel textarea{background:#071621;border:1px solid #617987;
      font-size:10px;padding:5px;width:100%;height:48px;user-select:text}
    #calibrationPanel small{font-size:10px;color:#b7c2c2;font-weight:400}
    @media(max-height:440px){
      #calibrationOpen{top:63px}#calibrationPanel{padding:8px}
      #calibrationPanel .cal-row{margin:2px 0}
      #calibrationPanel p{margin:2px 0}
    }`;
  document.head.append(css);document.body.append(wrapper);
  const $=id=>wrapper.querySelector('#'+id);
  const wp=$('calWeapon'),part=$('calPart'),pose=$('calPose'),panel=$('calibrationPanel');
  const view=()=>views[wp.value];
  const gloveSelect=$('calGlove'),sleeveSelect=$('calSleeves');
  for(const preset of listGlovePresets()){
    const option=document.createElement('option');
    option.value=preset.id;option.textContent=preset.name;
    gloveSelect.append(option);
  }
  const currentGlove=views.pistol.gloveStyle;
  gloveSelect.value=currentGlove.preset;
  sleeveSelect.value=currentGlove.sleeveMode;
  function saveGloves(){
    const config={preset:gloveSelect.value,sleeveMode:sleeveSelect.value};
    for(const v of Object.values(views))v.setGloveStyle(config);
    try{localStorage.setItem(GLOVE_STORAGE,JSON.stringify(config))}catch{}
    $('calStatus').textContent='✓ Перчатки применены ко всему оружию';
  }
  gloveSelect.addEventListener('change',saveGloves);
  sleeveSelect.addEventListener('change',saveGloves);
  const value=()=>part.value==='weapon'?view().calibration:view().handCalibration[part.value];
  function remember(){
    saved[wp.value]={weapon:view().calibration,...view().handCalibration};
    save(saved);
  }
  function output(){
    $('calOutput').value=JSON.stringify({weapon:wp.value,
      mount:view().calibration,hands:view().handCalibration});
  }
  function display(){
    const hand=part.value!=='weapon';$('calPoseRow').hidden=!hand;
    $('calWeaponScaleButtons').hidden=hand;
    if(hand)pose.value=value().pose;
    const sliders=$('calSliders');sliders.replaceChildren();
    for(const [key,label,min,max,step] of hand?HAND:WEAPON){
      const row=document.createElement('label');row.className='cal-row';
      const name=document.createElement('span');name.textContent=label;
      const input=document.createElement('input');input.type='range';
      input.min=min;input.max=max;input.step=step;
      input.value=value()[key];input.setAttribute('aria-label',label);
      const number=document.createElement('output');number.textContent=input.value;
      row.append(name,input,number);sliders.append(row);
      input.addEventListener('input',()=>{
        const n=Number(input.value);
        if(hand)view().calibrateHand(part.value,{[key]:n});
        else view().calibrate({[key]:n});
        number.textContent=input.value;remember();output();
        $('calStatus').textContent='✓ Сохранено';
      });
    }
    output();
  }
  $('calibrationOpen').addEventListener('pointerdown',event=>{
    event.stopPropagation();event.preventDefault();
    panel.hidden=!panel.hidden;
    if(!panel.hidden){
      panel.classList.remove('cal-collapsed');$('calCollapse').textContent='—';
      wp.value=getWeapon();part.value='R';display();
    }
  });
  $('calibrationClose').addEventListener('click',()=>panel.hidden=true);
  $('calCollapse').addEventListener('click',()=>{
    panel.classList.toggle('cal-collapsed');
    $('calCollapse').textContent=panel.classList.contains('cal-collapsed')?'▣':'—';
  });
  const setPanelPosition=(x,y)=>{
    const r=panel.getBoundingClientRect();
    panel.style.left=Math.max(3,Math.min(innerWidth-r.width-3,x))+'px';
    panel.style.top=Math.max(3,Math.min(innerHeight-Math.min(r.height,90)-3,y))+'px';
    panel.style.right='auto';
  };
  $('calSide').addEventListener('click',()=>{
    const r=panel.getBoundingClientRect();
    setPanelPosition(r.left>innerWidth/2?8:innerWidth-r.width-8,r.top);
  });
  const dragbar=$('calDragBar');
  let dragging=null;
  dragbar.addEventListener('pointerdown',event=>{
    if(event.target.closest('button')||event.button!==0)return;
    const r=panel.getBoundingClientRect();
    dragging={id:event.pointerId,dx:event.clientX-r.left,dy:event.clientY-r.top};
    dragbar.setPointerCapture(event.pointerId);
    event.preventDefault();event.stopPropagation();
  });
  dragbar.addEventListener('pointermove',event=>{
    if(!dragging||event.pointerId!==dragging.id)return;
    setPanelPosition(event.clientX-dragging.dx,event.clientY-dragging.dy);
    event.preventDefault();event.stopPropagation();
  });
  const stopDragging=event=>{if(dragging?.id===event.pointerId)dragging=null};
  dragbar.addEventListener('pointerup',stopDragging);
  dragbar.addEventListener('pointercancel',stopDragging);
  addEventListener('resize',()=>{
    const r=panel.getBoundingClientRect();setPanelPosition(r.left,r.top);
  });
  wp.addEventListener('change',()=>{setWeapon(wp.value);display();});
  part.addEventListener('change',display);
  pose.addEventListener('change',()=>{
    if(part.value==='weapon')return;
    view().calibrateHand(part.value,{pose:pose.value});remember();output();
  });
  for(const [button,delta] of [['calSmaller',-.1],['calBigger',.1]]){
    $(button).addEventListener('click',()=>{
      if(part.value!=='weapon'){part.value='weapon'}
      const current=view().calibration.scale;
      const next=Math.round(Math.max(.35,Math.min(2.5,current+delta))*100)/100;
      view().calibrate({scale:next});remember();display();
      $('calStatus').textContent='✓ Размер оружия: '+next.toFixed(2)+'×';
    });
  }
  $('calReset').addEventListener('click',()=>{
    if(part.value==='weapon')view().calibrate(WEAPON_DEFAULTS[wp.value]);
    else view().calibrateHand(part.value,HAND_DEFAULTS[wp.value][part.value]);
    remember();display();$('calStatus').textContent='Настройки восстановлены';
  });
  $('calCopy').addEventListener('click',async()=>{
    output();try{await navigator.clipboard.writeText($('calOutput').value);
      $('calStatus').textContent='Хват скопирован';}
    catch{$('calOutput').focus();$('calOutput').select();
      $('calStatus').textContent='Копируй выделенные координаты вручную';}
  });
  wrapper.addEventListener('pointermove',event=>event.stopPropagation());
  return {showWeapon:name=>{wp.value=name;display()},
    open:()=>{panel.hidden=false;wp.value=getWeapon();display()}};
}
