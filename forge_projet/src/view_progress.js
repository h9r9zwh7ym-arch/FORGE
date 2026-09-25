// ================= VUE : PROGRÈS =================
let progressTab = "overview";

function trainedExoIds(){
  const last = {};
  S.sessions.forEach(s=>s.exos.forEach(ex=>{ if(ex.sets.some(st=>st.done)) last[ex.exoId] = s.date; }));
  return Object.keys(last).sort((a,b)=>last[b].localeCompare(last[a]));
}
function muscleSets(days){
  const cutoff = addDaysISO(todayISO(), -days);
  const counts = {};
  S.sessions.filter(s=>s.date>cutoff).forEach(s=>s.exos.forEach(ex=>{
    const def = EXO_MAP[ex.exoId]; if(!def) return;
    const n = ex.sets.filter(st=>st.done).length;
    if(n) counts[def.muscles[0]] = (counts[def.muscles[0]]||0)+n;
  }));
  return MUSCLES.map(m=>({ label:m.n, value:counts[m.id]||0, unit:"séries" })).filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
}
function recentPRs(n){
  const out = [];
  for(let i=S.sessions.length-1;i>=0 && out.length<n;i--){
    const s = S.sessions[i];
    s.exos.forEach(ex=>ex.sets.forEach(st=>{ if(st.done && st.pr && out.length<n) out.push({ s, def:EXO_MAP[ex.exoId], st }); }));
  }
  return out.filter(x=>x.def);
}

function renderProgress(){
  const seg = segHTML("progress", [["overview","Vue d'ensemble"],["exos","Exercices"],["medals","Médailles"]], progressTab, "progressTab");
  const pane = progressTab==="exos" ? exosPaneHTML() : progressTab==="medals" ? medalsPaneHTML() : overviewPaneHTML();
  return `<div class="navbar"><div class="nb-title">Progrès</div></div><div class="content">
    <h1 class="lt">Progrès</h1>${seg}<div class="seg-pane">${pane}</div></div>`;
}

function levelCardHTML(){
  const lv = levelInfo();
  return `<div class="level-card stagger" style="--i:0">
    <div class="lv-badge"><span>${lv.level}</span></div>
    <div class="grow">
      <div class="lv-title">Niveau ${lv.level} · ${esc(lv.title)}</div>
      <div class="xpbar"><span style="width:${Math.round(lv.pct*100)}%"></span></div>
      <div class="lv-sub"><span data-count="${lv.xp}" data-unit="XP">${fmtNum(lv.xp)} XP</span> · encore ${fmtNum(lv.next-lv.xp)} XP pour le niveau ${lv.level+1}</div>
    </div>
  </div>`;
}

function overviewPaneHTML(){
  if(!S.sessions.length){
    return `${levelCardHTML()}<div class="empty-state"><span class="em">📈</span>Tes statistiques apparaîtront ici après ta première séance : régularité, tonnage, répartition musculaire, records…</div>`;
  }
  const vol = totalVolumeAllTime(), hours = totalDurationSec()/3600;
  const kpis = `<div class="kpi-grid">
    <div class="kpi stagger" style="--i:1"><div class="kpi-l">Séances</div><div class="kpi-v" data-count="${S.sessions.length}">${S.sessions.length}</div><div class="kpi-s">${sessionsInMonth()} ce mois-ci</div></div>
    <div class="kpi stagger" style="--i:2"><div class="kpi-l">Tonnage total</div><div class="kpi-v" ${vol>=10000?`data-count="${round1(vol/1000)}" data-dec="1" data-unit="t"`:`data-count="${Math.round(vol)}" data-unit="kg"`}>${fmtKg(vol)}</div><div class="kpi-s">record : ${fmtKg(bestSessionVolume())} / séance</div></div>
    <div class="kpi stagger" style="--i:3"><div class="kpi-l">Temps d'entraînement</div><div class="kpi-v" data-count="${round1(hours)}" data-dec="1" data-unit="h">${fmtDec(hours)} h</div><div class="kpi-s">${fmtDuration(Math.round(totalDurationSec()/S.sessions.length))} en moyenne</div></div>
    <div class="kpi stagger" style="--i:4"><div class="kpi-l">Séries validées</div><div class="kpi-v" data-count="${totalSets()}">${fmtNum(totalSets())}</div><div class="kpi-s">${S.meta.prCount||0} records battus</div></div>
  </div>
  <div class="stat-strip stagger" style="--i:5;margin-top:10px">
    <div class="stat-box"><div class="num">${currentStreakWeeks()}</div><div class="lbl">sem. d'affilée</div></div>
    <div class="stat-box"><div class="num">${maxStreakWeeksEver()}</div><div class="lbl">meilleure série</div></div>
    <div class="stat-box"><div class="num">${weeklyAverage(8).toLocaleString("fr-CH")}</div><div class="lbl">séances / sem.</div></div>
  </div>`;

  const weeks = weeklyBuckets(12);
  const wlabel = b => fmtDate(b.wk);
  const sessCols = columnChart(weeks.map(b=>({ label:wlabel(b), v:b.sessions, tip:`Semaine du ${wlabel(b)} : ${b.sessions} séance${b.sessions>1?"s":""}` })), { goal:S.goals.daysPerWeek });
  const volCols = columnChart(weeks.map(b=>({ label:wlabel(b), v:Math.round(b.volume), tip:`Semaine du ${wlabel(b)} : ${fmtKg(b.volume)}` })), { fmt:v=>fmtKg(v) });
  const musc = muscleSets(30);
  const prs = recentPRs(5);

  return `${levelCardHTML()}${kpis}
    <div class="chart-card stagger" style="--i:6">
      <div class="cc-h"><div class="cc-t">Régularité</div><div class="cc-s">18 dernières semaines</div></div>
      ${heatmap(18)}
    </div>
    <div class="chart-card stagger" style="--i:7">
      <div class="cc-h"><div class="cc-t">Séances par semaine</div><div class="cc-s">objectif : ${S.goals.daysPerWeek} par semaine</div></div>
      ${sessCols}
      ${dataTable(["Semaine du","Séances"], weeks.map(b=>[wlabel(b), b.sessions]))}
    </div>
    <div class="chart-card stagger" style="--i:8">
      <div class="cc-h"><div class="cc-t">Tonnage par semaine</div><div class="cc-s">charge × répétitions</div></div>
      ${volCols}
      ${dataTable(["Semaine du","Tonnage"], weeks.map(b=>[wlabel(b), fmtKg(b.volume)]))}
    </div>
    ${musc.length?`<div class="chart-card stagger" style="--i:9">
      <div class="cc-h"><div class="cc-t">Répartition musculaire</div><div class="cc-s">séries des 30 derniers jours, par muscle principal</div></div>
      <div class="hbars">${hbarList(musc)}</div>
    </div>`:""}
    ${prs.length?`<h2 class="sh">Derniers records</h2><div class="group">${prs.map((p,i)=>`<button class="row tap stagger" style="--i:${10+i}" data-a="openExoChart" data-id="${p.def.id}">
      <div class="ico" style="background:var(--orange)">💥</div>
      <div class="grow"><div class="t">${esc(p.def.n)}</div><div class="s">${p.st.reps} reps${p.st.weight?" × "+p.st.weight+" kg":""} · ${fmtRelative(p.s.date)}</div></div>
      <span class="chev">${icon("chev")}</span></button>`).join("")}</div>`:""}`;
}

function exoSeries(id){
  const def = EXO_MAP[id], loaded = !!loadableTypeOf(def), pts = [];
  S.sessions.forEach(s=>{
    const ex = s.exos.find(x=>x.exoId===id);
    if(!ex) return;
    const done = ex.sets.filter(st=>st.done);
    if(!done.length) return;
    pts.push({
      s, done,
      best: loaded ? round1(Math.max(...done.map(st=>estimated1RM(st.weight||0, st.reps||0)))) : Math.max(...done.map(st=>st.reps||0)),
      maxW: Math.max(...done.map(st=>st.weight||0)),
      vol: done.reduce((t,st)=>t+(st.reps||0)*(st.weight||0),0),
      reps: done.reduce((t,st)=>t+(st.reps||0),0),
    });
  });
  return { def, loaded, pts };
}

function exosPaneHTML(){
  const ids = trainedExoIds();
  if(!ids.length) return `<div class="empty-state"><span class="em">🏋️</span>Termine des séances pour suivre ta progression exercice par exercice.</div>`;
  return `<div class="sh-sub" style="margin-top:4px">Courbe : ${"1RM estimé"} pour les exercices chargés, meilleure série pour le poids du corps.</div>
    <div class="group">${ids.map((id,i)=>{
    const { def, loaded, pts } = exoSeries(id);
    if(!def) return "";
    const pr = exoPRs(id);
    return `<button class="row tap stagger" style="--i:${Math.min(i,12)}" data-a="openExoChart" data-id="${id}">
      <div class="ico" style="background:var(--tint)">${PATTERN_EMOJI[def.pattern]||"💪"}</div>
      <div class="grow"><div class="t">${esc(def.n)}</div><div class="s">${pts.length} séance${pts.length>1?"s":""} · ${loaded&&pr.maxWeight?"record "+pr.maxWeight+" kg":"record "+Math.max(...pts.map(p=>p.best))+" reps"}</div></div>
      ${sparkline(pts.slice(-10).map(p=>p.best))}
      <span class="chev">${icon("chev")}</span>
    </button>`;
  }).join("")}</div>`;
}

function exoChartSheet(id){
  const { def, loaded, pts } = exoSeries(id);
  const pr = exoPRs(id);
  const lbl = p => fmtDate(p.s.date);
  const main = lineChart(pts.map(p=>({ label:lbl(p), v:p.best, tip:`${fmtDate(p.s.date,"long")} : ${loaded?fmtDec(p.best)+" kg (1RM estimé)":p.best+" reps"}` })),
    { fmt: v=> loaded ? fmtDec(v)+" kg" : v+" reps", aria: loaded?"1RM estimé par séance":"Meilleure série par séance" });
  const last12 = pts.slice(-12);
  const cols = columnChart(last12.map(p=>({ label:lbl(p), v: loaded?Math.round(p.vol):p.reps, tip:`${fmtDate(p.s.date,"long")} : ${loaded?fmtKg(p.vol):p.reps+" reps"}` })), { fmt: v=> loaded?fmtKg(v):v+" reps" });
  const hist = pts.slice(-8).reverse().map(p=>`<div class="row" style="align-items:flex-start">
      <div class="grow"><div class="t" style="font-size:calc(15rem/17)">${esc(fmtDate(p.s.date,"long"))}</div>
      <div class="set-chips">${p.done.map(st=>`<span class="chip ${st.pr?"pr":""}">${st.pr?"💥 ":""}${st.reps}${st.weight?" × "+st.weight+" kg":""}</span>`).join("")}</div></div>
    </div>`).join("");
  openSheet(`<div class="sheet-hd"><span class="t">${esc(def.n)}</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
    <div class="sheet-body">
    <div class="stat-strip">
      <div class="stat-box"><div class="num">${pts.length}</div><div class="lbl">séances</div></div>
      ${loaded?`<div class="stat-box"><div class="num">${pr.maxWeight||"–"}</div><div class="lbl">record (kg)</div></div>
      <div class="stat-box"><div class="num">${pr.best1rm?fmtDec(pr.best1rm):"–"}</div><div class="lbl">1RM estimé</div></div>`
      :`<div class="stat-box"><div class="num">${Math.max(...pts.map(p=>p.best))}</div><div class="lbl">meilleure série</div></div>
      <div class="stat-box"><div class="num">${fmtNum(pts.reduce((t,p)=>t+p.reps,0))}</div><div class="lbl">reps au total</div></div>`}
    </div>
    <div class="chart-card">
      <div class="cc-h"><div class="cc-t">${loaded?"1RM estimé":"Meilleure série"}</div><div class="cc-s">${loaded?"formule d'Epley, meilleure série de chaque séance":"répétitions de ta meilleure série"}</div></div>
      ${main}
    </div>
    <div class="chart-card">
      <div class="cc-h"><div class="cc-t">${loaded?"Tonnage par séance":"Répétitions par séance"}</div><div class="cc-s">${last12.length} dernières séances</div></div>
      ${cols}
      ${dataTable(["Date", loaded?"1RM estimé":"Meilleure série", loaded?"Tonnage":"Reps totales"], pts.map(p=>[fmtDate(p.s.date), loaded?fmtDec(p.best)+" kg":p.best, loaded?fmtKg(p.vol):p.reps]))}
    </div>
    <h2 class="sh">Dernières séances</h2>
    <div class="group">${hist}</div>
    <div class="btnrow"><button class="btn secondary" data-a="showExoInfo" data-id="${id}">Voir la technique</button></div>
    </div>`);
}

function medalsPaneHTML(){
  const c = tierCounts();
  const pts = c.reduce((t,n,k)=>t+(k?n*TIERS[k].pts:0),0);
  const next = MEDALS.map(m=>({ m, p:medalProgress(m) })).filter(x=>x.p.next!=null).sort((a,b)=>b.p.pct-a.p.pct).slice(0,3);
  return `<div class="medal-summary stagger" style="--i:0">
      ${[1,2,3,4].map(k=>`<div class="ms-cell"><span class="pip big t${k}"></span><div class="ms-n" data-count="${c[k]}">${c[k]}</div><div class="ms-l">${TIERS[k].n}</div></div>`).join("")}
    </div>
    <div class="sh-sub" style="margin-top:10px">${fmtNum(pts)} points de médailles · ${MEDALS.length} médailles × 4 paliers · les paliers platine demandent des années</div>
    ${next.length?`<h2 class="sh">Prochains paliers</h2><div class="group">${next.map((x,i)=>`<button class="row tap stagger" style="--i:${i+1}" data-a="showMedal" data-id="${x.m.id}">
      ${medalHTML(x.m, x.p.t, "sm")}
      <div class="grow"><div class="t">${esc(x.m.n)} <span class="tier-tag t${x.p.t+1}">${TIERS[x.p.t+1].n}</span></div>
      <div class="mc-bar" style="margin-top:6px"><span style="width:${Math.round(x.p.pct*100)}%"></span></div>
      <div class="s" style="margin-top:4px">${fmtMedalVal(x.m,x.p.v)} / ${fmtMedalVal(x.m,x.p.next)} ${esc(medalUnit(x.m,x.p.next))}</div></div>
    </button>`).join("")}</div>`:""}
    ${MEDAL_CATS.map(([cat,label])=>{
      const list = MEDALS.filter(m=>m.cat===cat);
      const done = list.reduce((t,m)=>t+medalTier(m),0);
      return `<h2 class="sh">${label}<span class="more" style="color:var(--label2)">${done}/${list.length*4}</span></h2>
        <div class="medal-grid">${list.map((m,i)=>medalCardHTML(m,i+4)).join("")}</div>`;
    }).join("")}`;
}

Object.assign(ACT, {
  progressTab(d){ progressTab = d.v; renderViewAnimated("progress"); qs("#v-progress").scrollTop = 0; },
  openExoChart(d){ exoChartSheet(d.id); },
});
VIEWS.progress = renderProgress;
