// ================= EFFETS VISUELS =================
// Onde au toucher, textes flottants, ouverture/fermeture fluide des blocs,
// animation de lancement de séance. Tout porte sur des éléments HTML (jamais sur
// l'intérieur des SVG : piège Safari documenté dans Zeste).

function reducedMotion(){ return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
function haptic(ms){ if(navigator.vibrate) try{ navigator.vibrate(ms); }catch(e){} }

// ---------- onde au toucher ----------
const RIPPLE_SEL = ".btn,.hero-go,.type-chip,.spill,.tc-head,.sec-h,.navbtn,.validate,.menu-list button,.show-more";
document.addEventListener("pointerdown", e=>{
  if(reducedMotion()) return;
  const b = e.target.closest && e.target.closest(RIPPLE_SEL);
  if(!b || b.disabled) return;
  const r = b.getBoundingClientRect(), size = Math.max(r.width, r.height)*2.2;
  const w = document.createElement("span");
  w.className = "ripple";
  w.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-r.left-size/2}px;top:${e.clientY-r.top-size/2}px`;
  if(getComputedStyle(b).position==="static") b.style.position = "relative";
  b.classList.add("has-ripple");
  b.appendChild(w);
  setTimeout(()=>w.remove(), 650);
}, { passive:true });

// ---------- texte flottant (« ✓ Série 2 », « 💥 Record ») ----------
function floatText(x, y, txt, cls){
  if(reducedMotion()) return;
  const f = document.createElement("div");
  f.className = "float-txt " + (cls||"");
  f.textContent = txt;
  f.style.left = x+"px"; f.style.top = y+"px";
  document.body.appendChild(f);
  setTimeout(()=>f.remove(), 1200);
}

// ---------- hauteur animée ----------
// mutate() modifie le contenu ; la hauteur passe en douceur de l'ancienne à la nouvelle.
function morphHeight(el, mutate, done){
  if(!el){ mutate && mutate(); done && done(); return; }
  if(reducedMotion()){ mutate && mutate(); done && done(); return; }
  const h0 = el.offsetHeight;
  if(mutate) mutate();
  const h1 = el.scrollHeight;
  if(Math.abs(h1-h0)<2){ done && done(); return; }
  el.style.overflow = "hidden";
  el.style.height = h0+"px";
  void el.offsetHeight;
  el.style.transition = "height .38s cubic-bezier(.32,.72,0,1)";
  el.style.height = h1+"px";
  let fin = false;
  const end = ()=>{ if(fin) return; fin = true; el.style.height = el.style.overflow = el.style.transition = ""; done && done(); };
  el.addEventListener("transitionend", function te(ev){ if(ev.target===el){ el.removeEventListener("transitionend", te); end(); } });
  setTimeout(end, 480);
}
// ouvre (contenu déjà inséré) ou ferme (contenu retiré à la fin) un bloc .clp
function animateCollapse(el, open, html){
  if(!el) return;
  if(open){
    morphHeight(el, ()=>{ el.innerHTML = html||""; el.classList.remove("clp-in"); void el.offsetWidth; el.classList.add("clp-in"); },
      ()=>setTimeout(()=>el.classList.remove("clp-in"), 500));
  } else {
    if(reducedMotion()){ el.innerHTML = ""; return; }
    el.classList.add("clp-out");
    el.style.overflow = "hidden";
    el.style.height = el.offsetHeight+"px";
    void el.offsetHeight;
    el.style.transition = "height .3s cubic-bezier(.32,.72,0,1)";
    el.style.height = "0px";
    setTimeout(()=>{ el.innerHTML = ""; el.classList.remove("clp-out"); el.style.height = el.style.overflow = el.style.transition = ""; }, 320);
  }
}

// ---------- lancement de séance ----------
const LAUNCH_LINES = [
  "Chaque série compte.",
  "Aujourd'hui, tu forges.",
  "Concentré. Régulier. Plus fort.",
  "Le toi de demain te remercie.",
  "Une rep après l'autre.",
  "Pas de raccourci, que du progrès.",
];
function showLaunch(session){
  const old = qs("#launch"); if(old) old.remove();
  const reduce = reducedMotion();
  const ids = (session && session.exos || []).map(e=>e.exoId).filter(id=>EXO_MAP[id]).slice(0,6);
  const sets = (session && session.exos || []).reduce((t,e)=>t+(e.sets?e.sets.length:0),0);
  const name = session && (session.name || (SESSION_TYPE_MAP[session.resolvedType||session.type]||{}).n) || "Ta séance";
  const line = LAUNCH_LINES[Math.floor(Math.random()*LAUNCH_LINES.length)];
  const sparks = reduce ? "" : Array.from({length:24}, (_,i)=>{
    const a = i*15 + Math.random()*10;
    return `<i style="--a:${a.toFixed(0)}deg;--d:${(90+Math.random()*90).toFixed(0)}px;--s:${(0.5+Math.random()*0.8).toFixed(2)};--t:${(Math.random()*0.12).toFixed(2)}s"></i>`;
  }).join("");
  const el = document.createElement("div");
  el.id = "launch";
  el.className = reduce ? "launch reduce" : "launch";
  el.setAttribute("role", "status");
  el.innerHTML = `<div class="la-bg"></div>
    <div class="la-center">
      <div class="la-rings"><span></span><span></span><span></span></div>
      ${reduce ? "" : `<div class="la-count"><b style="--k:0">3</b><b style="--k:1">2</b><b style="--k:2">1</b></div>`}
      <div class="la-burst">${sparks}</div>
      <div class="la-go">
        <div class="la-title">C'est parti !</div>
        <div class="la-name">${esc(name)}</div>
        <div class="la-picts">${ids.map((id,i)=>`<span style="--k:${i}">${pictoSVG(pictoKey(EXO_MAP[id]))}</span>`).join("")}</div>
        <div class="la-meta">${ids.length ? `${session.exos.length} exercices · ${sets} séries` : ""}</div>
        <div class="la-line">${esc(line)}</div>
      </div>
    </div>
    <div class="la-skip">Touchez pour passer</div>`;
  document.body.appendChild(el);
  let gone = false;
  const timers = [];
  const leave = ()=>{
    if(gone) return; gone = true;
    timers.forEach(clearTimeout);
    el.classList.add("out");
    setTimeout(()=>el.remove(), 420);
  };
  el.addEventListener("click", leave);
  if(reduce){ timers.push(setTimeout(leave, 900)); return; }
  [0,550,1100].forEach(t=>timers.push(setTimeout(()=>haptic(12), t)));
  timers.push(setTimeout(()=>haptic([20,40,30]), 1650));
  timers.push(setTimeout(leave, 3000));
}
