/* Final implementation
   - settings panel fixed to right (mentok)
   - opacity slider affects calendar + settings panel
   - font color affects calendar texts only
   - panel color affects both (with opacity)
   - 4 static Unsplash presets + upload (persist)
   - 10 font choices (persist)
   - restore defaults
   - close button & hamburger toggle
*/

// helper
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const store = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const load = (k, d) => { try { const v = localStorage.getItem(k); return v? JSON.parse(v) : d } catch { return d } }

// elements
const calendarCard = $('#calendarCard');
const daysGrid = $('#daysGrid');
const monthYear = $('#monthYear');
const prevBtn = $('#prevBtn'), nextBtn = $('#nextBtn');

const hamburger = $('#hamburger');
const settingsPanel = $('#settingsPanel');
const closeSettings = $('#closeSettings');

const fontSelect = $('#fontSelect');
const fontColorInput = $('#fontColor');
const panelColorInput = $('#panelColor');
const panelOpacityInput = $('#panelOpacity');
const presetImgs = $$('.preset');
const uploadBg = $('#uploadBg');
const restoreBtn = $('#restoreBtn');

// defaults
const DEFAULTS = {
  bg: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1600&auto=format&fit=crop',
  font: "Poppins, sans-serif",
  fontColor: "#ffffff",
  panelColor: "#ffffff",
  panelOpacity: 15
};

// load saved
const savedBg = load('cal_bg', DEFAULTS.bg);
const savedFont = load('cal_font', DEFAULTS.font);
const savedFontColor = load('cal_fontColor', DEFAULTS.fontColor);
const savedPanelColor = load('cal_panelColor', DEFAULTS.panelColor);
const savedPanelOpacity = load('cal_panelOpacity', DEFAULTS.panelOpacity);

// apply initial UI
document.body.style.backgroundImage = `url(${savedBg})`;
document.body.style.backgroundSize = 'cover';
document.body.style.backgroundPosition = 'center';
document.body.style.fontFamily = savedFont;
document.documentElement.style.setProperty('--cal-text', savedFontColor);
document.body.style.color = savedFontColor;

// helper: apply panel color + opacity to both calendar & settings
function applyPanelColor(hex, opacityPct){
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  const a = (opacityPct/100).toFixed(2);
  const rgba = `rgba(${r},${g},${b},${a})`;
  calendarCard.style.background = rgba;
  settingsPanel.style.background = rgba;
  calendarCard.style.backdropFilter = 'blur(12px) saturate(120%)';
  settingsPanel.style.backdropFilter = 'blur(12px) saturate(120%)';
}
applyPanelColor(savedPanelColor, savedPanelOpacity);

// set control defaults
if (fontSelect) fontSelect.value = savedFont;
if (fontColorInput) fontColorInput.value = savedFontColor;
if (panelColorInput) panelColorInput.value = savedPanelColor;
if (panelOpacityInput) panelOpacityInput.value = savedPanelOpacity;

// --- Calendar render ---
let now = new Date();
let viewMonth = now.getMonth();
let viewYear = now.getFullYear();

function renderCalendar(month, year){
  daysGrid.innerHTML = '';
  monthYear.textContent = `${new Date(year, month).toLocaleString('default',{month:'long'})} ${year}`;

  const firstIndex = new Date(year, month, 1).getDay();
  const daysCount = 32 - new Date(year, month, 32).getDate();
  const prevLast = new Date(year, month, 0).getDate();

  for (let i = firstIndex; i>0; i--){
    const d = document.createElement('div'); d.className='inactive'; d.textContent = prevLast - i +1; daysGrid.appendChild(d);
  }
  for (let d=1; d<=daysCount; d++){
    const cell = document.createElement('div'); cell.textContent = d;
    if (d===now.getDate() && month===now.getMonth() && year===now.getFullYear()){
      cell.classList.add('today');
    }
    daysGrid.appendChild(cell);
  }
  const total = daysGrid.children.length;
  const need = (7 - (total % 7)) % 7;
  for (let i=1;i<=need;i++){ const div=document.createElement('div'); div.className='inactive'; div.textContent = i; daysGrid.appendChild(div); }
}
renderCalendar(viewMonth, viewYear);

// navigation
prevBtn.addEventListener('click', ()=>{ viewMonth--; if (viewMonth<0){ viewMonth=11; viewYear--; } renderCalendar(viewMonth, viewYear); });
nextBtn.addEventListener('click', ()=>{ viewMonth++; if (viewMonth>11){ viewMonth=0; viewYear++; } renderCalendar(viewMonth, viewYear); });

// --- Settings actions ---
// toggle settings panel (hamburger)
hamburger.addEventListener('click', ()=>{
  const hidden = settingsPanel.getAttribute('aria-hidden') === 'false';
  settingsPanel.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  if (settingsPanel.getAttribute('aria-hidden') === 'false') settingsPanel.scrollTop = 0;
});

// close
closeSettings.addEventListener('click', ()=> settingsPanel.setAttribute('aria-hidden','true'));

// presets wiring
presetImgs.forEach(img=>{
  const url = img.dataset.src;
  img.src = url;
  img.addEventListener('click', ()=>{
    document.body.style.backgroundImage = `url(${url})`;
    store('cal_bg', url);
  });
});

// upload background
uploadBg.addEventListener('change', (e)=>{
  const f = e.target.files?.[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ()=> {
    const data = reader.result;
    document.body.style.backgroundImage = `url(${data})`;
    store('cal_bg', data);
  };
  reader.readAsDataURL(f);
});

// font select change
fontSelect.addEventListener('change', (e)=>{
  const v = e.target.value;
  document.body.style.fontFamily = v;
  store('cal_font', v);
});

// font color -> only calendar texts (not settings labels)
fontColorInput.addEventListener('input', (e)=>{
  const c = e.target.value;
  document.documentElement.style.setProperty('--cal-text', c); // used by CSS for calendar text
  // also set explicit colors on calendar elements to ensure override
  calendarCard.style.color = c;
  // keep settings panel text readable: do not change settingsPanel color
  store('cal_fontColor', c);
});

// panel color + opacity
panelColorInput.addEventListener('input', (e)=>{
  const hex = e.target.value;
  const op = Number(panelOpacityInput.value);
  applyPanelColor(hex, op);
  store('cal_panelColor', hex);
  store('cal_panelOpacity', op);
});
panelOpacityInput.addEventListener('input', (e)=>{
  const op = Number(e.target.value);
  const hex = panelColorInput.value;
  applyPanelColor(hex, op);
  store('cal_panelOpacity', op);
  store('cal_panelColor', hex);
});

// restore defaults
restoreBtn.addEventListener('click', ()=>{
  localStorage.removeItem('cal_bg'); localStorage.removeItem('cal_font'); localStorage.removeItem('cal_fontColor'); localStorage.removeItem('cal_panelColor'); localStorage.removeItem('cal_panelOpacity');
  // apply defaults
  document.body.style.backgroundImage = `url(${DEFAULTS.bg})`;
  document.body.style.fontFamily = DEFAULTS.font;
  document.documentElement.style.setProperty('--cal-text', DEFAULTS.fontColor);
  document.body.style.color = DEFAULTS.fontColor;
  applyPanelColor(DEFAULTS.panelColor, DEFAULTS.panelOpacity);
  // reset controls
  if (fontSelect) fontSelect.value = DEFAULTS.font;
  if (fontColorInput) fontColorInput.value = DEFAULTS.fontColor;
  if (panelColorInput) panelColorInput.value = DEFAULTS.panelColor;
  if (panelOpacityInput) panelOpacityInput.value = DEFAULTS.panelOpacity;
});

// ensure panel initially hidden & populate font select if empty
settingsPanel.setAttribute('aria-hidden','true');
if (fontSelect && fontSelect.options.length === 0){
  // fallback population (shouldn't be necessary because HTML has options)
  const fonts = ["Poppins, sans-serif","Montserrat, sans-serif","Lato, sans-serif"];
  fonts.forEach(f=> fontSelect.add(new Option(f,f)));
}
