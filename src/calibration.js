import {WEAPON_DEFAULTS,HAND_DEFAULTS} from './viewmodels.js';
// Game1-style calibration: separate gun, left glove, right glove and finger bend.
const STORAGE='gameblock:game1-grip-v1';
const WEAPON=[
 ['x','Вбок',-1,1,.01],['y','Высота',-1,1,.01],['z','Глубина',-1,1,.01],
 ['rx','Наклон X',-180,180,1],['ry','Разворот Y',-180,180,1],
 ['rz','Крен Z',-180,180,1],['scale','Размер',.35,2.5,.01]
];
const HAND=[
 ['x','Вбок',-8,8,.05],['y','Высота',-8,8,.05],['z','Глубина',-8,8,.05],
 ['pitch','Наклон',-180,180,1],['yaw','Разворот',-180,180,1],
 ['roll','Кисть',-180,180,1],['k','Сгиб пальцев',.25,1.8,.05]
];
function read(){try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')||{}}catch{return {}}}
function persist(data){try{localStorage.setItem(STORAGE,JSON.stringify(data))}catch{}}
export function setupWeaponCalibration({views,getWeapon,setWeapon=()=>{}}){
  const saved=read();
  for(const name of Object.keys(views)){
    const c=saved[name];if(!c)continue;
    if(c.weapon)views[name].calibrate(c.weapon);
    for(const hand of ['R','L'])if(c[hand])views[name].calibrateHand(hand,c[hand]);
  }
  const ui=document.createElement('div');ui.id='calibrationUI';
  ui.innerHTML=[
    '<button id="calibrationOpen" type="button" aria-label="Настроить хват" title="Настроить хват">⚙</button>',
    '<section id="calibrationPanel" hidden>',
    '<div class="cal-head"><b>РУКИ GAME1 • ОРУЖИЕ GAMEBLOCK</b><button id="calibrationClose" type="button">✕</button></div>',
    '<p>Настраивай оружие, правую и левую руки отдельно. Изменения сохраняются на этом телефоне.</p>',
    '<label class="cal-weapon">Оружие <select id="calWeapon"><option value="pistol">Glock 18</option>',
    '<option value="rifle">AK-47</option><option value="knife">Нож</option></select></label>',
    '<label class="cal-weapon">Подгоняю <select id="calPart"><option value="weapon">Оружие</option>',
    '<option value="R">Правую руку</option><option value="L">Левую руку</option></select></label>',
    '<label class="cal-weapon" id="calPoseRow" hidden>Пальцы <select id="calPose">',
    '<option value="pistol">На спуске</option><option value="cup">Обхват</option>',
    '<option value="fist">Кулак</option><option value="open">Открытая</option></select></label>',
    '<div id="calSliders"></div><div class="cal-actions">',
    '<button id="calReset" type="button">Сброс части</button>',
    '<button id="calCopy" type="button">Копировать координаты</button></div>',
    '<textarea id="calOutput" readonly rows="3" aria-label="Координаты рук и оружия"></textarea>',
    '<small id="calStatus">Скопируй все настройки и отправь мне.</small></section>'
  ].join('');
  const style=document.createElement('style');
  style.textContent=[
    '#calibrationUI{position:fixed;inset:0;z-index:40;pointer-events:none;color:#edf7ff;font:600 12px system-ui,Arial}',
    '#calibrationOpen{position:absolute;top:99px;left:max(12px,env(safe-area-inset-left));pointer-events:auto;',
    'background:#1c3246;border:1px solid #8caaba;border-radius:10px;width:37px;height:35px;font-size:22px}',
    '#calibrationUI button,#calibrationUI input,#calibrationUI select,#calibrationUI textarea{touch-action:auto;font:inherit;color:inherit}',
    '#calibrationPanel{pointer-events:auto;position:absolute;top:3%;right:max(6px,env(safe-area-inset-right));',
    'width:min(350px,70vw);max-height:94%;overflow-y:auto;overscroll-behavior:contain;',
    'padding:11px;background:#142636fa;border:1px solid #8cadbe;border-radius:13px;box-shadow:0 10px 40px #000a}',
    '#calibrationPanel[hidden],#calPoseRow[hidden]{display:none}',
    '.cal-head{display:flex;justify-content:space-between;gap:6px;align-items:center;font-size:12px}',
    '#calibrationPanel button{border:1px solid #789eb6;border-radius:7px;background:#31516a;padding:6px}',
    '#calibrationPanel p{font-size:11px;line-height:1.35;font-weight:400;margin:6px 0;opacity:.85}',
    '.cal-weapon{display:flex;align-items:center;justify-content:space-between;gap:6px;margin:5px 0}',
    '.cal-weapon select{background:#27485f;padding:4px;border-radius:6px;max-width:65%}',
    '.cal-row{display:grid;grid-template-columns:79px 1fr 42px;align-items:center;gap:6px;margin:6px 0}',
    '.cal-row input{min-width:0;width:100%;accent-color:#9ad8ff}',
    '.cal-row output{font-size:11px;text-align:right;font-variant-numeric:tabular-nums}',
    '.cal-actions{display:flex;justify-content:space-between;gap:8px;margin:9px 0}',
    '.cal-actions button{font-size:11px}#calOutput{width:100%;height:51px;user-select:text;',
    'background:#091a26;border:1px solid #7394a6;border-radius:6px;font-size:10px;padding:5px}',
    '#calStatus{display:block;opacity:.75;font-weight:400;margin-top:5px}',
    '@media(max-height:430px){#calibrationOpen{top:70px}#calibrationPanel{padding:8px}',
    '.cal-row{margin:3px 0}.cal-weapon{margin:3px 0}#calibrationPanel p{margin:3px 0}}',
  ].join('');
  document.head.append(style);document.body.append(ui);
  const $=id=>ui.querySelector('#'+id),wp=$('calWeapon'),part=$('calPart'),pose=$('calPose'),panel=$('calibrationPanel');
  const current=()=>views[wp.value];
  const values=()=>part.value==='weapon'?current().calibration:current().handCalibration[part.value];
  function persistCurrent(){
    saved[wp.value]={weapon:current().calibration,...current().handCalibration};
    persist(saved);
  }
  function output(){
    $('calOutput').value=JSON.stringify({weapon:wp.value,
      mount:current().calibration,hands:current().handCalibration});
  }
  function show(){
    const hand=part.value!=='weapon';
    $('calPoseRow').hidden=!hand;
    if(hand)pose.value=values().pose;
    const area=$('calSliders');area.replaceChildren();
    for(const [key,label,min,max,step] of (hand?HAND:WEAPON)){
      const row=document.createElement('label');row.className='cal-row';
      const name=document.createElement('span');name.textContent=label;
      const input=document.createElement('input');input.type='range';
      input.min=min;input.max=max;input.step=step;input.dataset.key=key;
      input.value=values()[key];input.setAttribute('aria-label',label);
      const value=document.createElement('output');value.textContent=Number(input.value).toFixed(step<1?2:0);
      row.append(name,input,value);area.append(row);
      input.addEventListener('input',()=>{
        const n=Number(input.value);
        if(part.value==='weapon')current().calibrate({[key]:n});
        else current().calibrateHand(part.value,{[key]:n});
        value.textContent=n.toFixed(step<1?2:0);
        persistCurrent();output();
      });
    }
    output();
  }
  $('calibrationOpen').addEventListener('pointerdown',e=>{
    e.stopPropagation();e.preventDefault();
    panel.hidden=!panel.hidden;if(!panel.hidden){wp.value=getWeapon();show()}
  });
  $('calibrationClose').addEventListener('click',()=>{panel.hidden=true});
  wp.addEventListener('change',()=>{setWeapon(wp.value);show()});
  part.addEventListener('change',show);
  pose.addEventListener('change',()=>{current().calibrateHand(part.value,{pose:pose.value});persistCurrent();output()});
  $('calReset').addEventListener('click',()=>{
    if(part.value==='weapon')current().calibrate(WEAPON_DEFAULTS[wp.value]);
    else current().calibrateHand(part.value,HAND_DEFAULTS[wp.value][part.value]);
    persistCurrent();show();$('calStatus').textContent='Стандартные значения восстановлены.';
  });
  $('calCopy').addEventListener('click',async()=>{
    output();
    try{
      if(!navigator.clipboard?.writeText)throw Error('clipboard');
      await navigator.clipboard.writeText($('calOutput').value);
      $('calStatus').textContent='Координаты скопированы. Пришли их мне.';
    }catch{
      $('calOutput').focus();$('calOutput').select();
      $('calStatus').textContent='Выделил координаты. Скопируй их вручную.';
    }
  });
  ui.addEventListener('pointermove',e=>e.stopPropagation());
  show();
  return {showWeapon:name=>{wp.value=name;show()},open:()=>{panel.hidden=false;wp.value=getWeapon();show()}};
}
