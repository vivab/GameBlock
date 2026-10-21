// A lightweight classic FPS lobby built with plain DOM so it runs on iPhone.
// Progress is local only: this is NOT a fake online account or paid store.
const SAVE_KEY='gameblock:retro-profile-v1';
const defaults=()=>({nick:'PLAYER',id:String(Math.floor(10000000+Math.random()*89999999)),
  games:0,kills:0,deaths:0,wins:0,sound:true});
function readProfile() {
  try {
    const value=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
    return value && typeof value==='object' ? {...defaults(),...value} : defaults();
  } catch { return defaults(); }
}
export function installRetroMenu({onPlay=()=>{},onSound=()=>{},onGallery=()=>{}}={}) {
  const profile=readProfile();
  const save=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(profile));}catch{}};
  save();
  const style=document.createElement('style');
  style.textContent=`
    #retroHome {position:fixed;inset:0;z-index:25;display:flex;
      overflow:hidden;color:#f6f1e3;touch-action:pan-y;
      font-family:system-ui,Arial,sans-serif;
      background:linear-gradient(90deg,#091722f2 0%,#142536b5 28%,#0a192125 49%,
        #1023307a 75%,#08151ef1 100%)}
    #retroHome[hidden] {display:none !important}
    #retroHome:after {content:'';position:absolute;inset:0;pointer-events:none;
      border:10px solid #07101842;box-shadow:inset 0 0 65px #02090f99}
    #retroHome button {border:0;color:inherit;font-weight:900;cursor:pointer;
      letter-spacing:.09em;touch-action:manipulation}
    #retroHome .retroLeft {width:min(32vw,325px);min-width:210px;flex-shrink:0;
      padding:max(18px,env(safe-area-inset-top)) 16px max(15px,env(safe-area-inset-bottom))
      max(24px,env(safe-area-inset-left));
      display:flex;flex-direction:column;gap:8px;z-index:1}
    #retroHome .retroLogo {font-weight:1000;letter-spacing:.15em;font-size:clamp(21px,3vw,39px);
      text-shadow:0 3px 8px #000b}
    #retroHome .retroLogo i {font-style:normal;color:#dfaa66}
    #retroHome .retroSub {font:600 10px system-ui;letter-spacing:.24em;color:#b6ab93}
    #retroHome .retroSep {height:1px;background:linear-gradient(90deg,#e2ba7a66,transparent);
      margin:8px 0}
    #retroHome .retroNav {display:flex;flex-direction:column;gap:5px;margin-top:8px}
    #retroHome .retroNav button {text-align:left;padding:12px 15px;border-radius:3px;
      border-left:4px solid transparent;background:linear-gradient(90deg,#121f2fdf,#15233174);
      font-size:clamp(12px,1.5vw,15px)}
    #retroHome .retroNav button b {display:inline-block;min-width:27px;color:#d4a66e}
    #retroHome .retroNav button.active,#retroHome .retroNav button:hover {
      background:linear-gradient(90deg,#89613cdd,#142736a8);
      border-left-color:#e9b56d}
    #retroHome #retroGallery{margin-top:auto;padding:11px 14px;text-align:center;
      background:#263c3a;border:1px solid #b39b72;font-size:12px;border-radius:4px}
    #retroHome #retroEliteT{padding:11px 12px;text-align:center;
      background:#665039;border:1px solid #d4b887;color:#fff4d7;
      border-radius:3px;font-size:12px;font-weight:800}
    #retroHome #retroTChoice{padding:10px 12px;text-align:center;
      background:#5b352a;border:1px solid #c4967e;color:#fff0d9;
      border-radius:3px;font-size:12px}
    #retroHome #retroAnimationLab {padding:11px 13px;text-align:center;
      background:#24465b;border:1px solid #68a1b3;color:#dcf4ff;
      font-size:12px;border-radius:4px}
    #retroHome #retroFighter {padding:12px 14px;text-align:center;
      background:linear-gradient(110deg,#d3a362,#ac7743);color:#172430;
      border:1px solid #ffe0aa;font-size:12px;border-radius:4px}
    #retroHome #retroGame1 {padding:10px 12px;text-align:center;
      background:#263742;border:1px solid #758f92;color:#e2ebdf;
      border-radius:3px;font-size:11px}
    #retroHome #retroCasting{padding:11px 12px;text-align:center;
      background:#46554c;border:1px solid #afc0af;color:#f7f4e9;border-radius:3px;
      font-size:12px}
    #retroHome #retroPlay {margin-top:0;padding:14px 18px;text-align:center;
      background:linear-gradient(115deg,#f2c181,#b37b45);border:1px solid #ffe6a8;
      box-shadow:0 5px 22px #0008;color:#17232d;font-size:17px;border-radius:4px}
    #retroHome #retroPlay:active {transform:translateY(2px)}
    #retroHome .retroFoot {font:600 10px system-ui;color:#b3bcbf;letter-spacing:.12em}
    #retroHome .retroTop {position:absolute;z-index:1;right:max(22px,env(safe-area-inset-right));
      top:max(20px,env(safe-area-inset-top));display:flex;align-items:center;gap:12px;
      background:#0e1c29df;border:1px solid #a6bbbd50;border-radius:5px;padding:10px 16px}
    #retroHome .retroAvatar {width:43px;height:43px;border-radius:5px;
      display:grid;place-items:center;background:linear-gradient(140deg,#516678,#1d2b39);
      border:1px solid #a8b6b9;font-size:26px}
    #retroHome .retroNick {font-weight:900;min-width:100px}
    #retroHome .retroLevel {font-size:10px;color:#dbbb88}
    #retroHome .retroSide {position:absolute;z-index:1;right:24px;bottom:23px;
      width:min(260px,22vw);padding:14px;background:#0d1c28d9;
      border:1px solid #fff2;color:#becbc9;font-size:12px}
    #retroHome .retroSide strong {display:block;font-size:15px;color:#f4dfc2;letter-spacing:.12em}
    #retroHome .retroPanel {position:absolute;left:36%;bottom:11%;z-index:2;width:min(400px,33vw);
      border:1px solid #e4bb8c70;background:#0c1b26e8;padding:14px 17px;
      box-shadow:0 12px 45px #0009;font-size:13px;line-height:1.55}
    #retroHome .retroPanel[hidden] {display:none !important}
    #retroHome .retroPanel h2 {font-size:18px;margin:0 0 6px}
    #retroHome .retroPanel p {margin:5px 0;color:#cad1ca}
    #retroHome .retroPanel input {background:#172b39;color:white;border:1px solid #af926a;
      width:100%;padding:8px;font:inherit;user-select:text;touch-action:auto}
    #retroHome .retroPanel button {padding:8px 10px;background:#456073;
      border-radius:4px;font-size:11px}
    @media (max-height:480px) {
      #retroHome .retroLeft {gap:1px;padding-top:12px;padding-bottom:9px;width:230px}
      #retroHome .retroLogo {font-size:23px}
      #retroHome .retroNav {gap:1px;margin-top:0}
      #retroHome .retroNav button {padding:8px 10px;font-size:12px}
      #retroHome #retroPlay {padding:9px}
      #retroHome .retroSub,#retroHome .retroFoot {font-size:9px}
      #retroHome .retroPanel {bottom:7%;left:35%;max-height:55%;overflow:auto}
      #retroHome .retroSide {right:13px;bottom:12px;width:180px;font-size:10px}
    }
    @media (max-width:640px) {
      #retroHome .retroLeft {min-width:160px;width:47vw;padding-left:12px}
      #retroHome .retroTop {padding:5px;gap:5px}
      #retroHome .retroAvatar {width:27px;height:27px;font-size:18px}
      #retroHome .retroNick {min-width:55px;font-size:10px}
      #retroHome .retroSide {display:none}
      #retroHome .retroPanel {left:48%;width:49%;padding:8px;font-size:11px}
    }`;
  document.head.append(style);
  const home=document.createElement('section');
  home.id='retroHome';home.setAttribute('aria-label','Главное меню GameBlock');
  home.innerHTML=`
    <div class="retroLeft">
      <div class="retroLogo">GAME<i>BLOCK</i></div>
      <div class="retroSub">BLOCK FIGHTER • ALPHA 0.4</div>
      <div class="retroSep"></div>
      <nav class="retroNav" aria-label="Разделы">
        <button data-tab="loadout" type="button"><b>◈</b> АРСЕНАЛ</button>
        <button data-tab="market" type="button"><b>▤</b> РЫНОК</button>
        <button data-tab="stats" type="button"><b>▥</b> СТАТИСТИКА</button>
        <button data-tab="friends" type="button"><b>☷</b> ДРУЗЬЯ</button>
        <button data-tab="settings" type="button"><b>⚙</b> ПРОФИЛЬ</button>
      </nav>
      <button id="retroFighter" type="button">◈ ПЕРСОНАЖ v1.0 · РЕДАКТОР</button>
      <button id="retroAnimationLab" type="button">▶ 5 АНИМАЦИЙ · ПОЛИГОН</button>
      <button id="retroGallery" type="button" hidden>◈ СТАРАЯ ГАЛЕРЕЯ (АРХИВ)</button>
      <button id="retroCasting" type="button" hidden>АРХИВ CT</button>
      <button id="retroEliteT" type="button" hidden>АРХИВ T</button>
      <button id="retroTChoice" type="button" hidden>АРХИВ МОДЕЛЕЙ T</button>
      <button id="retroGame1" type="button" hidden>СТАРЫЙ РЕЖИМ GAME1</button>
      <button id="retroPlay" type="button">▶ ИГРАТЬ</button>
      <div class="retroFoot">SANDSTONE CROSSING • 5 VS 5 • OFFLINE BOTS</div>
    </div>
    <div class="retroTop">
      <div class="retroAvatar">☠</div>
      <div><div class="retroNick" id="retroNick"></div>
        <div class="retroLevel" id="retroLevel"></div></div>
    </div>
    <div class="retroSide"><strong>SANDSTONE CROSSING</strong>
      Оригинальная пустынная карта с тремя маршрутами.
      Реакция ботов, укрытия, возрождение и команды 5 на 5.</div>
    <div class="retroPanel" id="retroPanel" hidden></div>`;
  document.body.append(home);
  const $=id=>home.querySelector('#'+id);
  let activeTab=null;
  const refresh=()=>{
    $('retroNick').textContent=profile.nick.slice(0,18);
    $('retroLevel').textContent='LVL '+(1+Math.floor(profile.kills/15))+'  ·  ID '+profile.id;
  };
  const sections={
    loadout:()=>'<h2>АРСЕНАЛ</h2><p>Glock 18 · стартовый пистолет</p>'+
      '<p>AK-47 · автомат</p><p>Нож · ближний бой</p>'+
      '<p>Смена оружия в бою: кнопка ◉ или клавиши 1, 2, 3.</p>',
    market:()=>'<h2>РЫНОК</h2><p>Онлайн-покупки и торговля пока недоступны.'+
      ' Всё игровое оружие доступно бесплатно в матче.</p>',
    stats:()=>'<h2>СТАТИСТИКА</h2><p>Матчей: '+profile.games+
      ' · Побед: '+profile.wins+'</p><p>Убийств: '+profile.kills+
      ' · Смертей: '+profile.deaths+'</p><p>Уровень: '+(1+Math.floor(profile.kills/15))+'</p>',
    friends:()=>'<h2>ДРУЗЬЯ</h2><p>Пока что это одиночная игра с ботами.'+
      ' Мультиплеер и список друзей потребуют сервера.</p>',
    settings:()=>'<h2>ПРОФИЛЬ</h2><p>Никнейм (хранится только в браузере)</p>'+
      '<input id="retroNameInput" maxlength="18" aria-label="Никнейм">'+
      '<p><button id="retroSaveName" type="button">СОХРАНИТЬ</button> '+
      '<button id="retroSound" type="button"></button></p>'
  };
  function showTab(tab){
    const panel=$('retroPanel');
    activeTab=activeTab===tab?null:tab;
    for(const button of home.querySelectorAll('[data-tab]'))
      button.classList.toggle('active',button.dataset.tab===activeTab);
    panel.hidden=!activeTab;
    if(!activeTab){panel.replaceChildren();return;}
    panel.innerHTML=sections[activeTab]();
    if(activeTab==='settings'){
      panel.querySelector('#retroNameInput').value=profile.nick;
      panel.querySelector('#retroSound').textContent='Звук: '+(profile.sound?'ВКЛ':'ВЫКЛ');
      panel.querySelector('#retroSaveName').addEventListener('click',()=>{
        const n=panel.querySelector('#retroNameInput').value.trim();
        profile.nick=n.slice(0,18)||'PLAYER';save();refresh();
      });
      panel.querySelector('#retroSound').addEventListener('click',()=>{
        profile.sound=!profile.sound;save();onSound(profile.sound);
        panel.querySelector('#retroSound').textContent='Звук: '+(profile.sound?'ВКЛ':'ВЫКЛ');
      });
    }
  }
  home.querySelectorAll('[data-tab]').forEach(button=>
    button.addEventListener('click',()=>showTab(button.dataset.tab)));
  $('retroPlay').addEventListener('click',()=>{showTab(null);onPlay();});
  $('retroFighter').addEventListener('click',()=>{window.location.href=new URL('fighter-v1.html',window.location.href).href;});
  $('retroAnimationLab').addEventListener('click',()=>{window.location.href=new URL('animation-lab.html',window.location.href).href;});
  $('retroGallery').addEventListener('click',()=>{showTab(null);onGallery();});
  $('retroEliteT').addEventListener('click',()=>{
    window.location.assign(import.meta.env.BASE_URL+'terrorists-five.html');
  });
  $('retroTChoice').addEventListener('click',()=>{
    window.location.assign(import.meta.env.BASE_URL+'terrorists.html');
  });
  $('retroGame1').addEventListener('click',()=>{
    window.location.assign(import.meta.env.BASE_URL+'game1/menu.html');
  });
  $('retroCasting').addEventListener('click',()=>{
    window.location.assign(import.meta.env.BASE_URL+'casting.html');
  });
  refresh();onSound(profile.sound);
  return {
    show(){home.hidden=false;refresh();},
    hide(){home.hidden=true;},
    recordMatch({kills=0,deaths=0,won=false}={}){
      profile.games++;profile.kills+=Math.max(0,kills);
      profile.deaths+=Math.max(0,deaths);if(won)profile.wins++;
      save();refresh();
    },
    get profile(){return {...profile};}
  };
}
