// ================= GAMIFICATION : médailles à paliers, niveau, célébration =================
const TIERS = [
  null,
  { n:"Bronze",  pts:10 },
  { n:"Argent",  pts:25 },
  { n:"Or",      pts:50 },
  { n:"Platine", pts:100 },
];

function masteredExosCount(){
  const counts = {};
  S.sessions.forEach(s=>s.exos.forEach(ex=>{
    if(ex.sets.some(st=>st.done)) counts[ex.exoId]=(counts[ex.exoId]||0)+1;
  }));
  return Object.values(counts).filter(c=>c>=8).length;
}
const countSessions = pred => ()=>S.sessions.filter(pred).length;

// ---- valeurs des nouvelles familles (v1.3) ----
function spanDays(){
  const f = firstSessionDate(); if(!f) return 0;
  const last = S.sessions.reduce((m,s)=>s.date>m?s.date:m, f);
  return daysBetween(f, last);
}
function intenseWeeks(){
  const per = {};
  S.sessions.forEach(s=>{ const k=weekKey(s.date); per[k]=(per[k]||0)+1; });
  return Object.values(per).filter(n=>n>=5).length;
}
// semaines où au moins 8 groupes musculaires différents ont été travaillés
function balancedWeeks(){
  const per = {};
  S.sessions.forEach(s=>s.exos.forEach(ex=>{
    const d = EXO_MAP[ex.exoId];
    if(!d || !ex.sets.some(st=>st.done)) return;
    const k = weekKey(s.date);
    d.muscles.forEach(m=>{ if(m!=="cardio") (per[k]=per[k]||new Set()).add(m); });
  }));
  return Object.values(per).filter(ms=>ms.size>=8).length;
}
function maxRepsOneSession(){ return S.sessions.reduce((m,s)=>Math.max(m, sessionReps(s)), 0); }
function heaviestSet(){
  let m = 0;
  S.sessions.forEach(s=>s.exos.forEach(ex=>ex.sets.forEach(st=>{ if(st.done && st.weight>m) m = st.weight; })));
  return m;
}
// Progression de force sur un exercice chargé : meilleur 1RM estimé comparé à la
// meilleure des 3 premières séances, pour un exercice pratiqué depuis au moins 90 jours
// (évite qu'une progression de débutant de quelques semaines donne le platine).
function bestStrengthRatio(){
  const hist = {};
  S.sessions.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(s=>s.exos.forEach(ex=>{
    const def = EXO_MAP[ex.exoId];
    if(!def || !loadableTypeOf(def)) return;
    const e = Math.max(0, ...ex.sets.filter(st=>st.done&&st.weight).map(st=>estimated1RM(st.weight, st.reps)));
    if(e) (hist[ex.exoId]=hist[ex.exoId]||[]).push({ date:s.date, e });
  }));
  let best = 0;
  Object.values(hist).forEach(h=>{
    if(h.length<4 || daysBetween(h[0].date, h[h.length-1].date)<90) return;
    const base = Math.max(...h.slice(0,3).map(x=>x.e));
    const top = Math.max(...h.slice(3).map(x=>x.e));
    best = Math.max(best, top/base);
  });
  return best;
}
function fullMonths(){
  const per = {};
  S.sessions.forEach(s=>{ const k=s.date.slice(0,7); per[k]=(per[k]||0)+1; });
  return Object.values(per).filter(n=>n>=12).length;
}
// années civiles avec au moins 48 semaines d'entraînement
function ironYears(){
  const per = {};
  S.sessions.forEach(s=>{ const y=s.date.slice(0,4); (per[y]=per[y]||new Set()).add(weekKey(s.date)); });
  return Object.values(per).filter(w=>w.size>=48).length;
}
function equipCatsTrained(){
  const c = new Set();
  S.sessions.forEach(s=>s.exos.forEach(ex=>{ const d=EXO_MAP[ex.exoId]; if(d && ex.sets.some(st=>st.done)) c.add(exoCategory(d)); }));
  return c.size;
}

const MEDAL_CATS = [
  ["regular", "Régularité"], ["force", "Force"], ["volume", "Volume"], ["explore", "Découverte"], ["style", "Style"],
];
// t : seuils bronze / argent / or / platine. Le platine vise le très long terme :
// plusieurs années d'entraînement régulier pour la plupart des familles.
const MEDALS = [
  { id:"sessions", cat:"regular", n:"Assiduité",        em:"🏋️", unit:"séances terminées", one:"séance terminée",     t:[1,25,150,500],   val:()=>S.sessions.length, desc:"Le platine représente environ trois ans à trois séances par semaine." },
  { id:"streak",   cat:"regular", n:"Régularité",       em:"📅", unit:"semaines d'affilée",                          t:[2,8,26,104],     val:maxStreakWeeksEver, desc:"Semaines consécutives avec au moins une séance. Le platine demande deux ans sans interruption." },
  { id:"perfect",  cat:"regular", n:"Semaine parfaite", em:"🎯", unit:"semaines à l'objectif", one:"semaine à l'objectif", t:[1,8,40,150],   val:perfectWeeksCount, desc:"Semaines où tu atteins ton objectif de séances hebdomadaires." },
  { id:"fullmonth",cat:"regular", n:"Mois complet",     em:"🗓️", unit:"mois à 12 séances ou plus", one:"mois à 12 séances ou plus", t:[1,3,6,12], val:fullMonths },
  { id:"ironyear", cat:"regular", n:"Année de fer",     em:"⚒️", unit:"années à 48 semaines actives", one:"année à 48 semaines actives", t:[1,2,3,5], val:ironYears, desc:"Une année civile où tu t'entraînes au moins 48 semaines sur 52. Le platine demande cinq années de ce niveau." },
  { id:"fidelity", cat:"regular", n:"Fidélité",         em:"🤝", unit:"jours entre ta première et ta dernière séance", one:"jour entre ta première et ta dernière séance", t:[30,180,365,1095], val:spanDays, desc:"L'ancienneté de ta pratique. Le platine correspond à trois ans." },
  { id:"planned",  cat:"regular", n:"Planificateur",    em:"📌", unit:"séances prévues faites le bon jour", one:"séance prévue faite le bon jour", t:[1,10,50,200], val:countSessions(s=>s.planned), desc:"Séances de ton planning hebdomadaire faites le jour prévu." },

  { id:"prs",      cat:"force", n:"Records",           em:"💥", unit:"records personnels battus", one:"record personnel battu", t:[1,15,75,300], val:()=>S.meta.prCount||0 },
  { id:"heavy",    cat:"force", n:"Poids lourd",       em:"🪨", unit:"kg sur une seule série",                       t:[20,60,100,150],  val:heaviestSet, desc:"La charge la plus lourde que tu as déplacée sur une série." },
  { id:"doubled",  cat:"force", n:"Deux fois plus fort", em:"📈", unit:"ta force de départ",     t:[1.2,1.5,2,2.5], base:1, val:bestStrengthRatio, fmt:v=>v?"×"+round1(v).toLocaleString("fr-CH",{minimumFractionDigits:1}):"–", desc:"Ton meilleur 1RM estimé sur un exercice chargé, comparé à tes 3 premières séances de cet exercice (pratiqué depuis au moins 90 jours). Le platine demande ×2,5." },
  { id:"mastery",  cat:"force", n:"Maîtrise",          em:"🎓", unit:"exercices maîtrisés", one:"exercice maîtrisé", t:[1,5,15,30],       val:masteredExosCount, desc:"Un exercice est maîtrisé quand tu l'as pratiqué dans 8 séances." },

  { id:"volume",   cat:"volume", n:"Tonnage",          em:"🏔️", unit:"kg soulevés au total",                         t:[1000,25000,250000,1500000], val:totalVolumeAllTime },
  { id:"bigday",   cat:"volume", n:"Grosse séance",    em:"💪", unit:"kg en une seule séance",                       t:[1000,4000,8000,15000], val:bestSessionVolume },
  { id:"sets",     cat:"volume", n:"Séries",           em:"🔁", unit:"séries validées",                              t:[50,500,3000,12000], val:totalSets },
  { id:"centurion",cat:"volume", n:"Centurion",        em:"💯", unit:"répétitions en une séance",                    t:[100,250,500,1000], val:maxRepsOneSession },
  { id:"time",     cat:"volume", n:"Temps sous la barre", em:"⏱️", unit:"heures d'entraînement", one:"heure d'entraînement", t:[1,20,100,400], val:()=>totalDurationSec()/3600, fmt:v=>v<10?round1(v).toLocaleString("fr-CH"):fmtNum(v) },
  { id:"marathon", cat:"volume", n:"Endurance",        em:"⌛", unit:"séances de 45 min ou plus", one:"séance de 45 min ou plus", t:[1,10,50,200], val:countSessions(s=>(s.durationSec||0)>=45*60) },

  { id:"variety",  cat:"explore", n:"Polyvalence",     em:"🧭", unit:"exercices différents",                         t:[5,20,45,80],     val:distinctExosCount },
  { id:"muscles",  cat:"explore", n:"Corps complet",   em:"🧬", unit:"semaines équilibrées", one:"semaine équilibrée", t:[1,10,40,100], val:balancedWeeks, desc:"Semaines où tu travailles au moins 8 groupes musculaires différents." },
  { id:"equipcats",cat:"explore", n:"Touche-à-tout",   em:"🧰", unit:"types de matériel utilisés", one:"type de matériel utilisé", t:[2,3,4,6], val:equipCatsTrained, desc:"Poids du corps, haltères, barre, kettlebell, élastiques, barre de traction." },
  { id:"intense",  cat:"regular", n:"Semaine intense", em:"⚡", unit:"semaines à 5 séances ou plus", one:"semaine à 5 séances ou plus", t:[1,5,20,52], val:intenseWeeks, desc:"Semaines d'au moins 5 séances. Le platine en demande 52." },

  { id:"early",    cat:"style", n:"Lève-tôt",          em:"🌅", unit:"séances commencées avant 8 h", one:"séance commencée avant 8 h", t:[1,10,50,150], val:countSessions(s=>{ const h=startHour(s); return h!==null && h<8; }) },
  { id:"night",    cat:"style", n:"Oiseau de nuit",    em:"🌙", unit:"séances commencées après 21 h", one:"séance commencée après 21 h", t:[1,10,50,150], val:countSessions(s=>startHour(s)>=21) },
  { id:"custom",   cat:"style", n:"Sur mesure",        em:"✍️", unit:"séances composées par toi", one:"séance composée par toi", t:[1,10,50,200], val:countSessions(s=>s.source==="custom") },
];
const MEDAL_MAP = {}; MEDALS.forEach(m=>MEDAL_MAP[m.id]=m);

function medalTier(m){ return (S.medals[m.id]||{}).t||0; }
function medalVal(m){ return memo("mv:"+m.id, m.val); }
function medalProgress(m){
  const v = medalVal(m), t = medalTier(m);
  const next = t<4 ? m.t[t] : null, prev = t>0 ? m.t[t-1] : (m.base||0);
  return { v, t, next, pct: next==null ? 1 : Math.max(0,Math.min(1,(v-prev)/(next-prev))) };
}
function medalUnit(m, v){ return v<=1 && m.one ? m.one : m.unit; }
function fmtMedalVal(m, v){
  if(m.fmt) return m.fmt(v);
  return fmtNum(Math.floor(v));
}

function checkMedals(silent){
  const ups = [];
  const now = new Date().toISOString();
  MEDALS.forEach(m=>{
    const v = medalVal(m);
    const reached = m.t.filter(th=>v>=th).length;
    const cur = S.medals[m.id] || { t:0, d:{} };
    if(reached>cur.t){
      for(let k=cur.t+1;k<=reached;k++){ cur.d[k] = now; if(!silent) ups.push({ m, tier:k }); }
      cur.t = reached;
      S.medals[m.id] = cur;
    }
  });
  save();
  return ups;
}
function tierCounts(){
  const c = [0,0,0,0,0];
  MEDALS.forEach(m=>{ for(let k=1;k<=medalTier(m);k++) c[k]++; });
  return c;
}

function medalHTML(m, tier, size){
  return `<div class="medal t${tier} ${size||""}"><div class="medal-disc"><span class="em">${m.em}</span></div></div>`;
}
function pipsHTML(tier){
  return `<div class="pips">${[1,2,3,4].map(k=>`<span class="pip ${k<=tier?"t"+k:""}"></span>`).join("")}</div>`;
}

function medalCardHTML(m, i){
  const p = medalProgress(m);
  return `<button class="medal-card stagger" style="--i:${i}" data-a="showMedal" data-id="${m.id}">
    ${medalHTML(m, p.t)}
    <div class="mc-name">${esc(m.n)}</div>
    ${pipsHTML(p.t)}
    ${p.next!=null ? `<div class="mc-bar"><span style="width:${Math.round(p.pct*100)}%"></span></div>` : `<div class="mc-done">Complet</div>`}
  </button>`;
}

function showMedalModal(id){
  const m = MEDAL_MAP[id], p = medalProgress(m), st = S.medals[m.id]||{d:{}};
  const rows = [1,2,3,4].map(k=>{
    const got = p.t>=k;
    return `<div class="tier-row ${got?"got":""}">
      <span class="pip t${k}"></span>
      <span class="tr-name">${TIERS[k].n}</span>
      <span class="tr-th">${fmtMedalVal(m, m.t[k-1])} ${esc(medalUnit(m, m.t[k-1]))}</span>
      <span class="tr-date">${got && st.d[k] ? fmtDate(localISO(new Date(st.d[k]))) : got?"✓":""}</span>
    </div>`;
  }).join("");
  openModal(`<div class="medal-modal">
    ${medalHTML(m, p.t, "big")}
    <div class="mm-name">${esc(m.n)}</div>
    <div class="mm-tier">${p.t ? "Palier "+TIERS[p.t].n.toLowerCase() : "Pas encore débloquée"}</div>
    <div class="mm-desc">${esc(m.desc || ("Nombre de "+m.unit+"."))}</div>
    ${p.next!=null ? `<div class="mm-prog"><div class="mc-bar big"><span style="width:${Math.round(p.pct*100)}%"></span></div>
      <div class="mm-prog-txt">${fmtMedalVal(m,p.v)} / ${fmtMedalVal(m,p.next)} ${esc(medalUnit(m,p.next))} pour le palier ${TIERS[p.t+1].n.toLowerCase()}</div></div>` : `<div class="mm-prog-txt">Palier platine atteint : bravo !</div>`}
    <div class="tier-list">${rows}</div>
    <button class="btn secondary" style="margin-top:16px" data-a="closesheet">Fermer</button>
  </div>`);
}

// ---------- confettis (canvas, sans dépendance) ----------
function confettiBurst(x, y, count){
  if(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = document.createElement("canvas");
  cv.className = "confetti";
  const dpr = window.devicePixelRatio||1;
  cv.width = innerWidth*dpr; cv.height = innerHeight*dpr;
  document.body.appendChild(cv);
  const ctx = cv.getContext("2d"); ctx.scale(dpr,dpr);
  const css = getComputedStyle(document.documentElement);
  const cols = [css.getPropertyValue("--tint"), css.getPropertyValue("--ember2"), css.getPropertyValue("--green"), "#D4A017", "#6FB7C9"].map(c=>c.trim()).filter(Boolean);
  x = x==null ? innerWidth/2 : x; y = y==null ? innerHeight*0.35 : y;
  const parts = [];
  for(let i=0;i<(count||90);i++){
    const a = Math.random()*Math.PI*2, v = 4+Math.random()*7;
    parts.push({ x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v-4, r:Math.random()*Math.PI, vr:(Math.random()-.5)*.35,
      w:5+Math.random()*5, h:8+Math.random()*6, c:cols[i%cols.length] });
  }
  const t0 = performance.now();
  (function frame(t){
    const el = t-t0;
    ctx.clearRect(0,0,innerWidth,innerHeight);
    parts.forEach(p=>{
      p.vy += 0.22; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r);
      ctx.globalAlpha = Math.max(0, 1-el/1800);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h*Math.abs(Math.cos(p.r*2)));
      ctx.restore();
    });
    if(el<1800) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}

// ---------- fin de séance ----------
function showCelebration(session, ups, xpBefore, xpAfter){
  const vol = Math.round(sessionVolume(session));
  const sets = sessionSetCount(session);
  const prs = sessionPRCount(session);
  const reps = sessionReps(session);
  const before = levelInfo(xpBefore), after = levelInfo(xpAfter);
  const levelUp = after.level>before.level;
  const medalsHTML = ups.length ? `<div class="cel-medals">${ups.map((u,i)=>`<div class="cel-medal" style="--i:${i}">${medalHTML(u.m,u.tier)}<div class="cm-t">${esc(u.m.n)}</div><div class="cm-tier">${TIERS[u.tier].n}</div></div>`).join("")}</div>` : "";
  openModal(`<div class="cel">
    <div class="celebrate-ring">${icon("check")}</div>
    <div class="cel-title">Séance terminée !</div>
    <div class="cel-stats">
      <div><div class="n">${fmtDuration(session.durationSec||0)}</div><div class="l">durée</div></div>
      <div><div class="n" data-count="${sets}">${sets}</div><div class="l">séries</div></div>
      ${vol ? `<div><div class="n" data-count="${vol}" data-unit="kg">${fmtNum(vol)} kg</div><div class="l">soulevés</div></div>`
            : `<div><div class="n" data-count="${reps}">${reps}</div><div class="l">répétitions</div></div>`}
    </div>
    ${prs?`<div class="cel-pr">💥 ${prs} record${prs>1?"s":""} battu${prs>1?"s":""}</div>`:""}
    <div class="cel-xp">
      <div class="cel-xp-hd"><span>${levelUp?`Niveau ${after.level} atteint !`:`Niveau ${after.level}`}</span><span class="xpg">+${xpAfter-xpBefore} XP</span></div>
      <div class="xpbar"><span id="celXp" style="width:${Math.round((levelUp?0:before.pct)*100)}%"></span></div>
      <div class="cel-xp-sub">${esc(after.title)}</div>
    </div>
    ${medalsHTML}
    <button class="btn" style="margin-top:18px" data-a="closesheet">Continuer</button>
  </div>`);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const bar = qs("#celXp"); if(bar) bar.style.width = Math.round(after.pct*100)+"%";
    animateCounts(qs(".cel"));
  }));
  setTimeout(()=>confettiBurst(null, innerHeight*0.3, ups.length||levelUp ? 150 : 90), 150);
  setTimeout(()=>sfx(ups.length||levelUp ? "medal" : "exo"), 200);
}

Object.assign(ACT, {
  showMedal(d){ showMedalModal(d.id); },
});
