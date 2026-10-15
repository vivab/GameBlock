// Mobile-friendly 3D comparison picker. The main Three.js renderer draws all
// visible fighters; this UI only contains selection labels and page controls.
export function installSwatV6Gallery({
  variants, getSelection, onOpen, onClose, onPage, onChoose
}) {
  let opened=false, page=0, origin='home';
  const size=()=>window.innerWidth<650?2:window.innerWidth<1050?3:5;
  const pages=()=>Math.ceil(variants.length/size());
  const root=document.createElement('section');
  root.id='swatV6Gallery';
  root.hidden=true;
  root.setAttribute('aria-label','20 трёхмерных бойцов Counter Flame V6');
  root.innerHTML=[
    '<div class="v6top"><div class="v6heading">',
    '<button id="v6Back" type="button">← НАЗАД</button>',
    '<div><strong>SWAT V6.0 / 20 БОЙЦОВ</strong>',
    '<span>Настоящие 3D-модели · без мультяшных форм</span></div>',
    '<span id="v6Selected">V6-01</span></div>',
    '<div id="v6Strip" class="v6strip" aria-label="Все 20 вариантов"></div></div>',
    '<div class="v6bottom">',
    '<div id="v6Choices" class="v6choices" aria-label="Бойцы на экране"></div>',
    '<div class="v6actions">',
    '<button id="v6Prev" type="button">◀ НАЗАД</button>',
    '<span id="v6Page"></span>',
    '<button id="v6Next" type="button">ВПЕРЁД ▶</button>',
    '<button id="v6Choose" type="button">✓ ВЫБРАТЬ</button>',
    '</div>',
    '<div id="v6Status" role="status">Выбери бойца для матча. Вариант сохранится.</div>',
    '</div>'
  ].join('');
  document.body.append(root);
  const $=id=>root.querySelector('#'+id);
  for(const [i,variant] of variants.entries()){
    const button=document.createElement('button');
    button.type='button';
    button.textContent=variant.id;
    button.title=variant.name;
    button.dataset.index=String(i);
    button.addEventListener('click',()=>select(i));
    $('v6Strip').append(button);
  }
  function drawButtons(){
    $('v6Choices').replaceChildren();
    const selected=getSelection();
    const begin=page*size();
    for(let i=begin;i<Math.min(variants.length,begin+size());i++){
      const variant=variants[i];
      const button=document.createElement('button');
      button.type='button';
      button.dataset.index=String(i);
      button.setAttribute('aria-pressed',String(i===selected));
      const label=document.createElement('b');
      label.textContent=variant.id;
      const name=document.createElement('span');
      name.textContent=variant.name;
      button.append(label,name);
      button.addEventListener('click',()=>select(i));
      $('v6Choices').append(button);
    }
    for(const button of $('v6Strip').children)
      button.setAttribute('aria-pressed',String(Number(button.dataset.index)===selected));
    $('v6Page').textContent=(page+1)+' / '+pages();
    $('v6Selected').textContent='ВЫБРАН: '+variants[selected].id;
    $('v6Prev').disabled=page===0;
    $('v6Next').disabled=page>=pages()-1;
  }
  function showPage(next){
    page=Math.max(0,Math.min(pages()-1,next));
    drawButtons();
    if(opened)onPage(page,size());
  }
  function select(index){
    if(index<0||index>=variants.length)return;
    onChoose(index);
    const target=Math.floor(index/size());
    if(target!==page)showPage(target);
    else drawButtons();
  }
  function open(from='home') {
    if(opened)return;
    origin=from;
    opened=true;
    root.hidden=false;
    page=Math.floor(getSelection()/size());
    drawButtons();
    onOpen(origin);
    onPage(page,size());
  }
  function close(){
    if(!opened)return;
    opened=false;
    root.hidden=true;
    onClose(origin);
  }
  $('v6Back').addEventListener('click',close);
  $('v6Choose').addEventListener('click',close);
  $('v6Prev').addEventListener('click',()=>showPage(page-1));
  $('v6Next').addEventListener('click',()=>showPage(page+1));
  window.addEventListener('resize',()=>{
    if(opened)showPage(Math.floor(getSelection()/size()));
  });
  return {
    open, close,
    get isOpen(){return opened;},
    get page(){return page;},
    get pageSize(){return size();},
    refresh(){if(opened)showPage(page);},
    setStatus(value){$('v6Status').textContent=value;},
  };
}
