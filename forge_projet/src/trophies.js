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

// t : seuils bronze / argent / or / platine
const MEDALS = [
  { id:"sessions", n:"Assiduité",        em:"🏋️", unit:"séances terminées", one:"séance terminée",           t:[1,20,75,200],          val:()=>S.sessions.length },
  { id:"streak",   n:"Régularité",       em:"📅", unit:"semaines d'affilée",          t:[2,4,12,26],            val:maxStreakWeeksEver },
  { id:"perfect",  n:"Semaine parfaite", em:"🎯", unit:"semaines à l'objectif", one:"semaine à l'objectif",       t:[1,4,12,30],            val:perfectWeeksCount, desc:"Semaines où tu atteins ton objectif de séances hebdomadaires." },
  { id:"volume",   n:"Tonnage",          em:"🪨", unit:"kg soulevés au total",        t:[1000,10000,100000,500000], val:totalVolumeAllTime },
  { id:"bigday",   n:"Grosse séance",    em:"💪", unit:"kg en une seule séance",      t:[1000,3000,6000,10000], val:bestSessionVolume },
  { id:"sets",     n:"Séries",           em:"🔁", unit:"séries validées",             t:[50,250,1000,3000],     val:totalSets },
  { id:"prs",      n:"Records",          em:"💥", unit:"records personnels battus", one:"record personnel battu",   t:[1,10,50,150],          val:()=>S.meta.prCount||0 },
  { id:"mastery",  n:"Maîtrise",         em:"🎓", unit:"exercices maîtrisés", one:"exercice maîtrisé",         t:[1,5,10,20],            val:masteredExosCount, desc:"Un exercice est maîtrisé quand tu l'as pratiqué dans 8 séances." },
  { id:"variety",  n:"Polyvalence",      em:"🧭", unit:"exercices différents",        t:[5,15,30,50],           val:distinctExosCount },
  { id:"muscles",  n:"Corps complet",    em:"🧬", unit:"groupes musculaires travaillés", t:[4,7,9,11],          val:distinctMusclesCount },
  { id:"time",     n:"Temps sous la barre", em:"⏱️", unit:"heures d'entraînement", one:"heure d'entraînement",    t:[1,10,50,150],          val:()=>totalDurationSec()/3600 },
  { id:"marathon", n:"Endurance",        em:"⌛", unit:"séances de 45 min ou plus", one:"séance de 45 min ou plus",   t:[1,5,20,50],            val:countSessions(s=>(s.durationSec||0)>=45*60) },
  { id:"early",    n:"Lève-tôt",         em:"🌅", unit:"séances commencées avant 8 h", one:"séance commencée avant 8 h", t:[1,5,20,50],           val:countSessions(s=>{ const h=startHour(s); return h!==null && h<8; }) },
  { id:"night",    n:"Oiseau de nuit",   em:"🌙", unit:"séances commencées après 21 h", one:"séance commencée après 21 h", t:[1,5,20,50],          val:countSessions(s=>startHour(s)>=21) },
  { id:"custom",   n:"Sur mesure",       em:"✍️", unit:"séances composées par toi", one:"séance composée par toi",   t:[1,5,20,50],            val:countSessions(s=>s.source==="custom") },
];
const MEDAL_MAP = {}; MEDALS.forEach(m=>MEDAL_MAP[m.id]=m);

function medalTier(m){ return (S.medals[m.id]||{}).t||0; }
function medalProgress(m){
  const v = m.val(), t = medalTier(m);
  const next = t<4 ? m.t[t] : null, prev = t>0 ? m.t[t-1] : 0;
  return { v, t, next, pct: next==null ? 1 : Math.max(0,Math.min(1,(v-prev)/(next-prev))) };
}
function medalUnit(m, v){ return v<=1 && m.one ? m.one : m.unit; }
function fmtMedalVal(m, v){
  if(m.id==="time") return v<10 ? round1(v).toLocaleString("fr-CH") : fmtNum(v);
  return fmtNum(Math.floor(v));
}

function checkMedals(silent){
  const ups = [];
  const now = new Date().toISOString();
  MEDALS.forEach(m=>{
    const v = m.val();
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
}

Object.assign(ACT, {
  showMedal(d){ showMedalModal(d.id); },
});
