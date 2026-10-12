import { WEAPON_DEFAULTS } from './viewmodels.js';

const STORAGE_KEY = 'gameblock:viewmodel-calibration:v1';
const FIELDS = [
  ['x', 'Сдвиг X', -0.6, 0.6, 0.01],
  ['y', 'Сдвиг Y', -0.6, 0.6, 0.01],
  ['z', 'Сдвиг Z', -0.8, 0.8, 0.01],
  ['rx', 'Наклон X', -180, 180, 1],
  ['ry', 'Поворот Y', -180, 180, 1],
  ['rz', 'Поворот Z', -180, 180, 1],
  ['scale', 'Размер', 0.35, 2.5, 0.01],
];
function readSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
  catch { return {}; }
}
function persist(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
export function setupWeaponCalibration({ views, getWeapon }) {
  const saved = readSaved();
  for (const name of Object.keys(views)) if (saved[name]) views[name].calibrate(saved[name]);

  const ui = document.createElement('div');
  ui.id = 'calibrationUI';
  ui.innerHTML = '<button type="button" id="calibrationOpen" aria-label="Подогнать оружие" title="Подогнать оружие">⚙</button>' +
    '<section id="calibrationPanel" aria-label="Подгонка оружия" hidden>' +
    '<div class="cal-head"><strong>ПОДГОНКА ОРУЖИЯ</strong><button type="button" id="calibrationClose" aria-label="Закрыть">✕</button></div>' +
    '<p>Меняй положение оружия относительно пальцев. Настройки сохраняются на этом устройстве.</p>' +
    '<label class="cal-weapon">Оружие <select id="calWeapon">' +
    '<option value="pistol">Glock 18</option><option value="rifle">AK-47</option><option value="knife">Нож</option>' +
    '</select></label><div id="calSliders"></div>' +
    '<div class="cal-actions"><button type="button" id="calReset">Сбросить</button>' +
    '<button type="button" id="calCopy">Копировать координаты</button></div>' +
    '<textarea id="calOutput" readonly aria-label="Координаты для отправки" rows="3"></textarea>' +
    '<small id="calStatus">Подгони оружие и отправь мне текст отсюда.</small></section>';
  const style = document.createElement('style');
  style.textContent = [
    '#calibrationUI{position:fixed;inset:0;z-index:30;pointer-events:none;color:#eaf3f8;font:600 12px system-ui,Arial;}',
    '#calibrationUI button,#calibrationUI select,#calibrationUI input,#calibrationUI textarea{touch-action:auto;color:inherit;font:inherit;}',
    '#calibrationOpen{position:absolute;left:max(13px,env(safe-area-inset-left));top:97px;pointer-events:auto;',
    'background:#1b3043dc;border:1px solid #a9c5d1aa;border-radius:10px;min-width:34px;height:32px;font-size:23px;}',
    '#calibrationPanel{pointer-events:auto;position:absolute;right:max(8px,env(safe-area-inset-right));top:4%;',
    'width:min(340px,68vw);max-height:92%;overflow-y:auto;overscroll-behavior:contain;',
    'padding:12px;background:#152330f7;border:1px solid #91adbcc0;border-radius:13px;box-shadow:0 10px 40px #000b;}',
    '#calibrationPanel[hidden]{display:none}#calibrationPanel button{background:#29485f;',
    'border:1px solid #7ea3bc;border-radius:7px;padding:7px;}#calibrationPanel select{',
    'background:#27475a;border-radius:6px;padding:5px;max-width:100%;}',
    '#calibrationPanel p{font-size:11px;opacity:.8;line-height:1.4;font-weight:400;margin:8px 0;}',
    '.cal-head{display:flex;align-items:center;justify-content:space-between;gap:6px;}',
    '.cal-head strong{font-size:13px;letter-spacing:.03em;}',
    '.cal-weapon{display:flex;gap:8px;align-items:center;margin:9px 0;}',
    '.cal-row{display:grid;grid-template-columns:74px 1fr 41px;align-items:center;gap:8px;margin:7px 0;}',
    '.cal-row input{min-width:0;width:100%;accent-color:#8dd7ff;}',
    '.cal-row output{font-size:11px;text-align:right;font-variant-numeric:tabular-nums;}',
    '.cal-actions{display:flex;gap:8px;justify-content:space-between;margin:10px 0;}',
    '.cal-actions button{font-size:11px;white-space:normal;}',
    '#calOutput{width:100%;height:50px;resize:none;user-select:text;background:#0a1822;',
    'border:1px solid #7394a6;padding:5px;border-radius:6px;font-size:10px;line-height:1.35;}',
    '#calStatus{display:block;opacity:.75;margin-top:5px;font-weight:400;}',
    '@media(max-height:430px){#calibrationOpen{top:70px}#calibrationPanel{font-size:11px;padding:8px;}',
    '.cal-row{margin:4px 0}.cal-weapon{margin:4px 0}#calibrationPanel p{margin:4px 0}}',
  ].join('');
  document.head.append(style); document.body.append(ui);
  const $ = id => ui.querySelector('#' + id);
  const panel = $('calibrationPanel'), weaponSelect = $('calWeapon');
  for (const [key, label, min, max, step] of FIELDS) {
    const row = document.createElement('label'); row.className = 'cal-row';
    const name = document.createElement('span'); name.textContent = label;
    const range = document.createElement('input');
    range.type = 'range'; range.min = min; range.max = max; range.step = step;
    range.dataset.key = key;
    range.setAttribute('aria-label', label);
    const output = document.createElement('output'); output.dataset.key = key;
    row.append(name, range, output); $('calSliders').append(row);
    range.addEventListener('input', () => {
      const weapon = views[weaponSelect.value];
      weapon.calibrate({ [key]: Number(range.value) });
      saved[weaponSelect.value] = weapon.calibration; persist(saved);
      output.textContent = Number(range.value).toFixed(key === 'scale' || step < 1 ? 2 : 0);
      refreshOutput();
    });
  }
  function refreshOutput() {
    const value = views[weaponSelect.value]?.calibration || {};
    $('calOutput').value = JSON.stringify({ weapon: weaponSelect.value, ...value });
  }
  function showWeapon(name) {
    weaponSelect.value = name;
    const values = views[name].calibration;
    for (const input of ui.querySelectorAll('input[data-key]')) {
      const key = input.dataset.key;
      input.value = values[key];
      ui.querySelector('output[data-key="' + key + '"]').textContent =
        Number(values[key]).toFixed(key === 'scale' || Number(input.step) < 1 ? 2 : 0);
    }
    refreshOutput();
  }
  $('calibrationOpen').addEventListener('pointerdown', event => {
    event.stopPropagation(); event.preventDefault();
    panel.hidden = !panel.hidden;
    if (!panel.hidden) showWeapon(getWeapon());
  });
  $('calibrationClose').addEventListener('click', () => { panel.hidden = true; });
  weaponSelect.addEventListener('change', () => showWeapon(weaponSelect.value));
  $('calReset').addEventListener('click', () => {
    const name = weaponSelect.value;
    views[name].calibrate({ ...WEAPON_DEFAULTS[name] });
    delete saved[name]; persist(saved); showWeapon(name);
    $('calStatus').textContent = 'Стандартные координаты восстановлены.';
  });
  $('calCopy').addEventListener('click', async () => {
    refreshOutput();
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText($('calOutput').value);
      $('calStatus').textContent = 'Координаты скопированы — отправь их мне.';
    } catch {
      $('calOutput').focus(); $('calOutput').select();
      $('calStatus').textContent = 'Выделил координаты — скопируй их вручную.';
    }
  });
  ui.addEventListener('pointermove', event => event.stopPropagation());
  showWeapon('pistol');
  return { showWeapon, open: () => { panel.hidden = false; showWeapon(getWeapon()); } };
}
