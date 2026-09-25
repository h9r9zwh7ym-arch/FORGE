// ================= INTERFACE : coquille =================
const TABS = [
  { id:"today",    n:"Aujourd'hui", icon:"home" },
  { id:"history",  n:"Historique",  icon:"clock" },
  { id:"progress", n:"Progrès",     icon:"chart" },
  { id:"profil",   n:"Profil",      icon:"user" },
];

const ICONS = {
  home:'<path d="M3 11.5 12 4l9 7.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
  clock:'<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M12 7.5V12l3.2 2" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  chart:'<path d="M4 20V10M12 20V4M20 20v-7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  user:'<circle cx="12" cy="8" r="3.6" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M4.5 20c1.4-4 4-6 7.5-6s6.1 2 7.5 6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  check:'<path d="M5 13l4.5 4.5L19 8" stroke="currentColor" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  chev:'<path d="M2 1l5 5.5L2 12" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  close:'<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  plus:'<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  trophy:'<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M12 14v3M9 20h6M9.5 17h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  flame:'<path d="M12 3s4 3.5 4 7.5a4 4 0 1 1-8 0c0-1 .4-1.8 1-2.5-.1 1 .3 1.6.9 1.9C9.6 7 10.5 5 12 3Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',
  edit:'<path d="M4 20l.9-3.6L16.4 5 19 7.6 7.6 19 4 20Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',
  timer:'<circle cx="12" cy="13" r="7.5" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M12 9.5V13l2.5 1.5M9.5 2.5h5M12 2.5v2.6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  swap:'<path d="M6 8h11l-3-3M18 16H7l3 3" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  play:'<path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor"/>',
  bookmark:'<path d="M7 4h10v16l-5-3.6L7 20V4Z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
  repeat:'<path d="M17 3l3 3-3 3M20 6H8a4 4 0 0 0-4 4v1M7 21l-3-3 3-3M4 18h12a4 4 0 0 0 4-4v-1" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  search:'<circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.9" fill="none"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  trash:'<path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
};
function icon(name){ return `<svg viewBox="0 0 24 24">${ICONS[name]||""}</svg>`; }

function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function qs(sel,root){ return (root||document).querySelector(sel); }
function qsa(sel,root){ return Array.from((root||document).querySelectorAll(sel)); }

// ---------- tabbar ----------
function buildShell(){
  qs("#app").innerHTML = TABS.map(t=>`<div class="view" id="v-${t.id}"></div>`).join("");
  if(!qs("#charttip")){ const t = document.createElement("div"); t.id = "charttip"; t.setAttribute("role","tooltip"); document.body.appendChild(t); }
  qs(".tabbar").innerHTML = TABS.map(t=>`<button class="tabbtn" data-a="tab" data-id="${t.id}">${icon(t.icon)}<span class="tl">${t.n}</span></button>`).join("");
  qsa(".view").forEach(v=>v.addEventListener("scroll",()=>{
    v.classList.toggle("scrolled", v.scrollTop>4);
  }));
}

let currentTab = "today";
function switchTab(id){
  currentTab = id;
  qsa(".tabbtn").forEach(b=>b.classList.toggle("on", b.dataset.id===id));
  qsa(".view").forEach(v=>v.classList.toggle("active", v.id==="v-"+id));
  renderViewAnimated(id);
  if(typeof renderRestBar==="function") renderRestBar();
}

const VIEWS = {};
function renderView(id){
  const el = qs("#v-"+id);
  if(!el || !VIEWS[id]) return;
  const scrollTop = el.scrollTop;
  hideTip();
  el.innerHTML = VIEWS[id]();
  el.classList.toggle("scrolled", scrollTop>4);
  el.scrollTop = scrollTop;
  settleSegs(el);
}
// rendu avec entrée animée (apparition décalée des éléments .stagger, compteurs)
// — réservé aux changements d'onglet ou de section, pas aux rendus après chaque action.
let enterTimer = null;
function renderViewAnimated(id){
  const el = qs("#v-"+id);
  if(!el) return;
  el.classList.add("enter");
  renderView(id);
  animateCounts(el);
  clearTimeout(enterTimer);
  enterTimer = setTimeout(()=>el.classList.remove("enter"), 1200);
}

// ---------- contrôle segmenté avec indicateur glissant ----------
const SEG_PREV = {};
function segHTML(key, options, cur, action){
  const idx = Math.max(0, options.findIndex(o=>o[0]===cur));
  return `<div class="seg" data-seg="${key}" data-cur="${idx}" style="--n:${options.length}" role="tablist">
    <span class="seg-ind"></span>
    ${options.map(([id,label])=>`<button role="tab" aria-selected="${id===cur}" class="${id===cur?"on":""}" data-a="${action}" data-v="${id}">${label}</button>`).join("")}
  </div>`;
}
function settleSegs(root){
  qsa(".seg", root).forEach(sg=>{
    const key = sg.dataset.seg, cur = +sg.dataset.cur, ind = qs(".seg-ind", sg);
    const prev = SEG_PREV[key]==null ? cur : SEG_PREV[key];
    ind.style.transition = "none";
    ind.style.transform = `translateX(${prev*100}%)`;
    void ind.offsetWidth;
    ind.style.transition = "";
    ind.style.transform = `translateX(${cur*100}%)`;
    SEG_PREV[key] = cur;
  });
}

// ---------- compteurs animés ----------
function animateCounts(root){
  const els = qsa("[data-count]", root);
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  els.forEach(el=>{
    const target = parseFloat(el.dataset.count), dec = +(el.dataset.dec||0), unit = el.dataset.unit;
    const fmt = v => (dec ? v.toLocaleString("fr-CH",{minimumFractionDigits:dec,maximumFractionDigits:dec}) : fmtNum(v)) + (unit?" "+unit:"");
    if(reduce || !(target>0)){ el.textContent = fmt(target||0); return; }
    const t0 = performance.now(), dur = 800;
    (function step(t){
      const p = Math.min(1,(t-t0)/dur), e = 1-Math.pow(1-p,3);
      el.textContent = fmt(target*e);
      if(p<1) requestAnimationFrame(step);
    })(t0);
  });
}

// ---------- info-bulle des graphiques (appui ou focus clavier) ----------
let tipOn = null;
function showTip(target){
  const tip = qs("#charttip");
  if(!tip) return;
  if(tipOn) tipOn.classList.remove("tip-on");
  tipOn = target; target.classList.add("tip-on");
  tip.textContent = target.dataset.tip;
  tip.classList.add("show");
  const r = target.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = r.left + r.width/2 - tw/2; x = Math.max(8, Math.min(innerWidth-tw-8, x));
  let y = r.top - th - 8; if(y<8) y = r.bottom + 8;
  tip.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
}
function hideTip(){
  const tip = qs("#charttip");
  if(tip) tip.classList.remove("show");
  if(tipOn){ tipOn.classList.remove("tip-on"); tipOn = null; }
}
document.addEventListener("click", e=>{
  const t = e.target.closest("[data-tip]");
  // pas de bascule : le focus (qui précède le clic) a déjà pu afficher la bulle
  if(t) showTip(t); else hideTip();
});
document.addEventListener("focusin", e=>{ const t = e.target.closest && e.target.closest("[data-tip]"); if(t) showTip(t); });
document.addEventListener("scroll", hideTip, true);

// ---------- saisie d'une valeur numérique ----------
function promptNumber({title, value, unit, step, onOk}){
  openModal(`<div style="font-weight:700;font-size:calc(17rem/17);margin-bottom:12px">${esc(title)}</div>
    <div class="num-field"><input id="numInput" type="number" inputmode="decimal" step="${step||"any"}" value="${value??""}"><span>${esc(unit||"")}</span></div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
      <button class="btn" data-a="numOk">Valider</button>
      <button class="btn ghost" data-a="closesheet" style="height:40px">Annuler</button>
    </div>`);
  qs("#overlay")._onNum = onOk;
  setTimeout(()=>{ const i=qs("#numInput"); if(i){ i.focus(); i.select(); } }, 80);
}
function changed(){
  save();
  const sheetOpen = qs("#overlay").classList.contains("open");
  if(!sheetOpen) renderView(currentTab);
  else dirtyOnClose = true;
}
let dirtyOnClose = false;

// ---------- sheets / overlay ----------
// _gen : chaque ouverture incrémente le compteur, pour qu'une fermeture en cours
// (nettoyage différé de 300 ms) n'efface pas une sheet ouverte entre-temps.
let overlayGen = 0;
function showOverlay(inner, kind){
  const ov = qs("#overlay");
  const gen = ++overlayGen;
  hideTip();
  ov.innerHTML = `<div class="scrim" data-a="closesheet"></div>${inner}`;
  ov.classList.add("open");
  ov.dataset.kind = kind;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ if(gen===overlayGen) ov.classList.add("show"); }));
}
function openSheet(html, opts){
  opts = opts||{};
  showOverlay(`<div class="sheet ${opts.tall?"tall":""}" role="dialog">${opts.noGrab?"":'<div class="sheet-grab"></div>'}${html}${opts.footer?`<div class="sheet-ft">${opts.footer}</div>`:""}</div>`, "sheet");
}
function openModal(html){
  showOverlay(`<div class="center-modal" role="dialog">${html}</div>`, "modal");
}
function closeSheet(){
  const ov = qs("#overlay");
  if(!ov.classList.contains("open")) return;
  ov.classList.remove("show");
  const gen = overlayGen;
  setTimeout(()=>{
    if(gen!==overlayGen) return;
    ov.classList.remove("open"); ov.innerHTML="";
    if(dirtyOnClose){ dirtyOnClose=false; renderView(currentTab); }
  },300);
}
function confirmSheet({title,html,ok,onOk,danger}){
  openModal(`<div style="font-weight:700;font-size:calc(17rem/17);margin-bottom:6px">${esc(title)}</div>
    <div style="color:var(--label2);font-size:calc(14.5rem/17);line-height:1.4;margin-bottom:18px">${html||""}</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn ${danger?"danger":""}" data-a="confirmYes">${esc(ok||"OK")}</button>
      <button class="btn ghost" data-a="closesheet" style="height:40px">Annuler</button>
    </div>`);
  qs("#overlay")._onYes = onOk;
}

// ---------- toast ----------
let toastTimer=null;
function toast(msg){
  const t = qs("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove("show"), 2200);
}

// ---------- délégation d'actions ----------
const ACT = {
  tab(d){ switchTab(d.id); },
  closesheet(){ closeSheet(); },
  confirmYes(){ const fn = qs("#overlay")._onYes; closeSheet(); if(fn) fn(); },
  numOk(){
    const fn = qs("#overlay")._onNum, v = parseFloat((qs("#numInput")||{}).value);
    closeSheet();
    if(fn && !isNaN(v) && v>=0) fn(v);
  },
  noop(){},
};

document.addEventListener("click", e=>{
  // un glissement de carte ne doit pas déclencher le bouton sous le doigt
  if(typeof suppressClicksUntil!=="undefined" && Date.now()<suppressClicksUntil){ e.preventDefault(); return; }
  const el = e.target.closest("[data-a]");
  if(!el) return;
  const name = el.dataset.a;
  if(ACT[name]) ACT[name](el.dataset, el);
});
document.addEventListener("keydown", e=>{
  if(e.key==="Enter" && e.target && e.target.id==="numInput"){ e.preventDefault(); ACT.numOk(); }
  if(e.key==="Enter" && e.target && (e.target.id==="nameInput" || e.target.id==="tplName")){
    e.preventDefault(); const b = qs('.center-modal [data-a^="save"]'); if(b) b.click();
  }
});
document.addEventListener("change", e=>{
  const el = e.target.closest("[data-c]");
  if(!el) return;
  const name = el.dataset.c;
  if(ACT[name]) ACT[name](el.dataset, el);
});
