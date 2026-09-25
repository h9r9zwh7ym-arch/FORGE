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
  trash:'<path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
};
function icon(name){ return `<svg viewBox="0 0 24 24">${ICONS[name]||""}</svg>`; }

function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function qs(sel,root){ return (root||document).querySelector(sel); }
function qsa(sel,root){ return Array.from((root||document).querySelectorAll(sel)); }

// ---------- tabbar ----------
function buildShell(){
  qs("#app").innerHTML = TABS.map(t=>`<div class="view" id="v-${t.id}"></div>`).join("");
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
  renderView(id);
  qs("#v-"+id).scrollTop = qs("#v-"+id)._keepScroll||0;
  if(typeof renderRestBar==="function") renderRestBar();
}

const VIEWS = {};
function renderView(id){
  const el = qs("#v-"+id);
  if(!el || !VIEWS[id]) return;
  const scrollTop = el.scrollTop;
  el.innerHTML = VIEWS[id]();
  el.classList.toggle("scrolled", scrollTop>4);
  el.scrollTop = scrollTop;
}
function changed(){
  save();
  const sheetOpen = qs("#overlay").classList.contains("open");
  if(!sheetOpen) renderView(currentTab);
  else dirtyOnClose = true;
}
let dirtyOnClose = false;

// ---------- sheets / overlay ----------
function openSheet(html, opts){
  opts = opts||{};
  const ov = qs("#overlay");
  ov.innerHTML = `<div class="scrim" data-a="closesheet"></div><div class="sheet" role="dialog">${opts.noGrab?"":'<div class="sheet-grab"></div>'}${html}</div>`;
  ov.classList.add("open");
  requestAnimationFrame(()=>requestAnimationFrame(()=>ov.classList.add("show")));
  ov.dataset.kind = "sheet";
}
function openModal(html){
  const ov = qs("#overlay");
  ov.innerHTML = `<div class="scrim" data-a="closesheet"></div><div class="center-modal" role="dialog">${html}</div>`;
  ov.classList.add("open");
  requestAnimationFrame(()=>requestAnimationFrame(()=>ov.classList.add("show")));
  ov.dataset.kind = "modal";
}
function closeSheet(){
  const ov = qs("#overlay");
  if(!ov.classList.contains("open")) return;
  ov.classList.remove("show");
  setTimeout(()=>{ ov.classList.remove("open"); ov.innerHTML=""; if(dirtyOnClose){ dirtyOnClose=false; renderView(currentTab); } },300);
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
  noop(){},
};

document.addEventListener("click", e=>{
  const el = e.target.closest("[data-a]");
  if(!el) return;
  const name = el.dataset.a;
  if(ACT[name]) ACT[name](el.dataset, el);
});
document.addEventListener("change", e=>{
  const el = e.target.closest("[data-c]");
  if(!el) return;
  const name = el.dataset.c;
  if(ACT[name]) ACT[name](el.dataset, el);
});
