// ================= VUE : PROGRÈS =================
function trainedExoIds(){
  const ids = new Set();
  S.sessions.forEach(s=>s.exos.forEach(ex=>{ if(ex.sets.some(st=>st.done)) ids.add(ex.exoId); }));
  return Array.from(ids);
}

function muscleVolume14d(){
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-14);
  const counts = {};
  S.sessions.filter(s=>parseISO(s.date)>=cutoff).forEach(s=>s.exos.forEach(ex=>{
    const def = EXO_MAP[ex.exoId]; if(!def) return;
    const n = ex.sets.filter(st=>st.done).length;
    if(!n) return;
    counts[def.muscles[0]] = (counts[def.muscles[0]]||0)+n;
  }));
  const max = Math.max(1,...Object.values(counts));
  return MUSCLES.filter(m=>m.id!=="cardio").map(m=>({label:m.n, value:counts[m.id]||0, max})).sort((a,b)=>b.value-a.value).filter(x=>x.value>0);
}

function renderProgress(){
  const ids = trainedExoIds();
  const exoRows = ids.map(id=>{
    const def = EXO_MAP[id]; if(!def) return "";
    const pr = exoPRs(id);
    return `<button class="row tap" style="width:100%" data-a="openExoChart" data-id="${id}">
      <div class="ico" style="background:var(--tint)">${PATTERN_EMOJI[def.pattern]||"💪"}</div>
      <div class="grow"><div class="t">${esc(def.n)}</div><div class="s">${MUSCLE_MAP[def.muscles[0]].n}</div></div>
      ${pr.maxWeight? `<span class="pr-badge">PR ${pr.maxWeight} kg</span>`:""}<span class="chev">${icon("chev")}</span>
    </button>`;
  }).join("");

  const bal = muscleVolume14d();
  const troGrid = TROPHIES.map(t=>{
    const on = !!S.trophies[t.id];
    return `<button class="tro ${on?"on":""}" data-a="showTrophy" data-id="${t.id}"><div class="em">${t.em}</div><div class="tn">${esc(t.n)}</div></button>`;
  }).join("");

  return `<div class="navbar"><div class="nb-title">Progrès</div></div><div class="content">
    <h1 class="lt">Progrès</h1>
    <div class="stat-strip">
      <div class="stat-box"><div class="num">${currentStreakWeeks()}</div><div class="lbl">sem. d'affilée</div></div>
      <div class="stat-box"><div class="num">${sessionsInMonth()}</div><div class="lbl">séances / mois</div></div>
      <div class="stat-box"><div class="num">${sessionsInYear()}</div><div class="lbl">séances / an</div></div>
      <div class="stat-box"><div class="num">${weeklyAverage(8)}</div><div class="lbl">/ sem. (8 sem.)</div></div>
    </div>

    <h2 class="sh">Trophées</h2>
    <div class="tro-grid">${troGrid}</div>

    ${bal.length?`<h2 class="sh">Équilibre 14 derniers jours</h2><div class="group">${barListSVG(bal)}</div>`:""}

    <h2 class="sh">Exercices</h2>
    ${exoRows? `<div class="group">${exoRows}</div>` : `<div class="empty-state"><span class="em">📈</span>Termine des séances pour voir ta progression exercice par exercice.</div>`}
  </div>`;
}

function exoChartSheet(id){
  const def = EXO_MAP[id];
  const points = [];
  S.sessions.forEach(s=>{
    const ex = s.exos.find(x=>x.exoId===id);
    if(!ex) return;
    const done = ex.sets.filter(st=>st.done);
    if(!done.length) return;
    const bestWeight = Math.max(...done.map(st=>st.weight||0));
    const vol = done.reduce((t,st)=>t+(st.reps||0)*(st.weight||0),0);
    points.push({date:s.date, weight:bestWeight, vol});
  });
  const pr = exoPRs(id);
  const weightChart = lineChartSVG(points.map(p=>({y:p.weight})));
  const volChart = lineChartSVG(points.map(p=>({y:p.vol})));
  openSheet(`<div class="sheet-hd"><span class="t">${esc(def.n)}</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
    <div class="sheet-body">
    <div class="stat-strip">
      <div class="stat-box"><div class="num">${pr.maxWeight||"–"}</div><div class="lbl">PR charge (kg)</div></div>
      <div class="stat-box"><div class="num">${pr.best1rm||"–"}</div><div class="lbl">1RM estimé</div></div>
      <div class="stat-box"><div class="num">${Math.round(pr.maxVolumeSession)||"–"}</div><div class="lbl">PR volume séance</div></div>
    </div>
    <h2 class="sh">Charge maximale par séance</h2>
    <div class="chart-wrap">${weightChart}</div>
    <h2 class="sh">Volume par séance</h2>
    <div class="chart-wrap">${volChart}</div>
    </div>`);
}

Object.assign(ACT, {
  openExoChart(d){ exoChartSheet(d.id); },
  showTrophy(d){
    const t = TROPHY_MAP[d.id]; const on = !!S.trophies[t.id];
    openModal(`<div style="font-size:40px">${t.em}</div><div style="font-weight:700;font-size:calc(17rem/17);margin-top:8px">${esc(t.n)}</div>
      <div style="color:var(--label2);font-size:calc(14rem/17);margin-top:4px">${esc(t.desc)}</div>
      ${on?`<div class="hr-note" style="margin-top:10px">Débloqué le ${esc(fmtDate(S.trophies[t.id].slice(0,10),"long"))}</div>`:`<div class="hr-note" style="margin-top:10px">Pas encore débloqué</div>`}
      <button class="btn secondary" style="margin-top:16px" data-a="closesheet">Fermer</button>`);
  },
});
VIEWS.progress = renderProgress;
