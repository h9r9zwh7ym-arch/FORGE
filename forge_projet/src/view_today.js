// ================= VUE : AUJOURD'HUI (mode focus) =================
const PATTERN_EMOJI = { squat:"🏋️", hinge:"⚙️", push:"⬆️", pull:"⬇️", lunge:"🚶", core:"🔲", calf:"🦶" };

let liveFocusIdx = 0;
let focusAnimDir = null;

function fmtDuration(sec){
  if(sec<60) return `${sec} s`;
  const m = Math.round(sec/60);
  if(m<60) return `${m} min`;
  return `${Math.floor(m/60)} h ${String(m%60).padStart(2,"0")}`;
}
function repsLabel(range){ return range[0]===range[1] ? `${range[0]}` : `${range[0]}-${range[1]}`; }

function renderToday(){
  const draft = getOrCreateDraft();
  liveFocusIdx = Math.min(liveFocusIdx, Math.max(0, draft.exos.length-1));
  return draft.startedAt ? renderTodayLive(draft) : renderTodayPreview(draft);
}

function miniRingSVG(pct){
  const r=18, c=2*Math.PI*r;
  const off = c*(1-Math.min(1,pct));
  return `<svg viewBox="0 0 46 46"><circle class="bgc" cx="23" cy="23" r="${r}"/><circle class="fgc" cx="23" cy="23" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg>`;
}
function motivRowHTML(){
  const goal = S.goals.daysPerWeek||3;
  const done = sessionsThisWeek();
  const pct = done/goal;
  const streak = currentStreakWeeks();
  return `<div class="motiv-row">
    <div class="motiv-ring">${miniRingSVG(pct)}</div>
    <div class="motiv-txt"><div class="m1">${done}/${goal} séances cette semaine</div><div class="m2">${done>=goal?"Objectif atteint — bravo !":"Continue, tu y es presque."}</div></div>
    <div class="streak-badge">${icon("flame")}${streak}</div>
  </div>`;
}

function sourceChip(draft){
  if(draft.source==="imported") return `<span class="chip on">Programme importé${draft.name?" · "+esc(draft.name):""}</span>`;
  return "";
}

function renderTodayPreview(draft){
  if(!draft.exos.length){
    return `<div class="navbar"><div class="nb-title">Aujourd'hui</div></div><div class="content">
      <h1 class="lt">Aujourd'hui</h1>
      <div class="empty-state"><span class="em">🧰</span>Aucun exercice ne correspond à ton matériel actuel.<br>Renseigne ton équipement dans l'onglet Profil.</div>
    </div>`;
  }
  const rows = draft.exos.map((ex,i)=>{
    const def = EXO_MAP[ex.exoId];
    return `<div class="row">
      <div class="ico" style="background:var(--tint)">${PATTERN_EMOJI[def.pattern]||"💪"}</div>
      <div class="grow"><div class="t">${esc(def.n)}</div><div class="s">${def.muscles.map(m=>MUSCLE_MAP[m].n).join(" · ")} — ${ex.targetSets} × ${repsLabel(ex.targetReps)}</div></div>
      <button class="icon-btn" data-a="swapExoOpen" data-idx="${i}">${icon("swap")}</button>
      <button class="icon-btn" data-a="removeExo" data-idx="${i}">${icon("close")}</button>
    </div>`;
  }).join("");
  return `<div class="navbar"><div class="nb-title">Aujourd'hui</div></div><div class="content">
    <div class="eyebrow">${fmtDate(todayISO(),"long")}</div>
    <h1 class="lt">Séance du jour</h1>
    ${motivRowHTML()}
    ${draft.source==="imported"?`<div class="chips" style="margin-bottom:12px">${sourceChip(draft)}</div>`:""}
    <div class="group">${rows}</div>
    <div class="btnrow"><button class="btn secondary sm" data-a="addExoOpen">${icon("plus")} Ajouter</button>${draft.source==="engine"?`<button class="btn secondary sm" data-a="regenSession">${icon("swap")} Autre séance</button>`:`<button class="btn secondary sm" data-a="dropImported">${icon("swap")} Suggestion auto</button>`}</div>
    <div class="btnrow"><button class="btn" data-a="startSession">Commencer la séance</button></div>
    <p class="hr-note" style="margin:16px 20px 0">La séance reste modifiable avant et pendant l'entraînement : retire, remplace ou ajoute un exercice à tout moment.</p>
  </div>`;
}

function renderTodayLive(draft){
  if(!draft.exos.length){
    return `<div class="navbar"><div class="nb-title">Séance en cours</div><div class="nb-right"><button class="icon-btn" data-a="abandonSession">${icon("trash")}</button></div></div>
    <div class="content"><div class="empty-state"><span class="em">🧰</span>Tous les exercices ont été retirés.<br>Ajoute-en un pour continuer.</div>
    <div class="btnrow"><button class="btn" data-a="addExoOpen">${icon("plus")} Ajouter un exercice</button></div></div>`;
  }
  const totalSets = draft.exos.reduce((t,e)=>t+e.sets.length,0);
  const doneSets = draft.exos.reduce((t,e)=>t+e.sets.filter(s=>s.done).length,0);
  const elapsed = Math.round((Date.now()-Date.parse(draft.startedAt))/1000);
  return `<div class="navbar"><div class="nb-title">Séance en cours</div><div class="nb-right"><button class="icon-btn" data-a="abandonSession">${icon("trash")}</button></div></div>
  <div class="content">
    <div class="eyebrow" id="todayEyebrow">${fmtDuration(elapsed)} · ${doneSets}/${totalSets} séries</div>
    <h1 class="lt">Séance en cours</h1>
    <div id="focusRegion">${renderFocusRegionInner(draft)}</div>
    <div class="btnrow"><button class="btn" data-a="finishSession">Terminer la séance</button></div>
  </div>`;
}

function ringSVG(remain, total){
  const r=76, c=2*Math.PI*r;
  const frac = total>0 ? Math.max(0,remain)/total : 0;
  const off = c*(1-frac);
  return `<div class="ring-wrap"><svg viewBox="0 0 172 172">
    <circle class="ring-bg" cx="86" cy="86" r="${r}"/>
    <circle class="ring-fg" id="ringFg" cx="86" cy="86" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
  </svg><div class="ring-label"><div class="ring-time" id="ringTime">${fmtMMSS(Math.max(0,remain))}</div><div class="ring-sub">restant</div></div></div>`;
}
function updateFocusRing(remain, total){
  const t = qs("#ringTime"), fg = qs("#ringFg");
  if(!t || !fg) return;
  t.textContent = fmtMMSS(Math.max(0,remain));
  const r=76, c=2*Math.PI*r;
  const frac = total>0 ? Math.max(0,remain)/total : 0;
  fg.setAttribute("stroke-dashoffset", (c*(1-frac)).toFixed(1));
}

function renderFocusRegionInner(draft){
  const idx = Math.min(liveFocusIdx, draft.exos.length-1);
  liveFocusIdx = idx;
  const ex = draft.exos[idx], def = EXO_MAP[ex.exoId];
  const dots = draft.exos.map((e,i)=>{
    const allDone = e.sets.every(s=>s.done);
    return `<button class="${i===idx?"current":allDone?"done":""}" data-a="focusJump" data-idx="${i}" aria-label="Exercice ${i+1}"></button>`;
  }).join("");
  const finishedCount = draft.exos.filter(e=>e.sets.every(s=>s.done)).length;
  const nav = `<div class="focus-nav">
    <button class="navbtn" data-a="focusPrev" ${idx===0?"disabled":""} style="transform:scaleX(-1)">${icon("chev")}</button>
    <button class="center-link" data-a="openOverview">Voir la séance (${finishedCount}/${draft.exos.length})</button>
    <button class="navbtn" data-a="focusNext" ${idx===draft.exos.length-1?"disabled":""}>${icon("chev")}</button>
  </div>`;
  return `<div class="focus-dots">${dots}</div>${renderFocusCard(idx, ex, def)}${nav}`;
}

function renderFocusCard(idx, ex, def){
  const animClass = focusAnimDir==="r" ? "anim-r" : focusAnimDir==="l" ? "anim-l" : "";
  focusAnimDir = null;
  const resting = restState && restState.exoIdx===idx;
  const allDone = ex.sets.every(s=>s.done);
  const header = `<div class="fc-icon">${PATTERN_EMOJI[def.pattern]||"💪"}</div>
    <div class="fc-name">${esc(def.n)}</div>
    <div class="fc-sub"><button data-a="showExoInfo" data-id="${def.id}" style="color:var(--tint);font-weight:600">${def.muscles.map(m=>MUSCLE_MAP[m].n).join(" · ")} · détails</button></div>`;

  if(resting){
    const remain = Math.max(0, Math.round((restState.endAt-Date.now())/1000));
    return `<div class="focus-card ${animClass}">${header}
      <div class="fc-phase">Repos</div>
      ${ringSVG(remain, restState.totalSec)}
      <div class="ring-adjust"><button data-a="restAdjust" data-d="-15">−15 s</button><button data-a="restAdjust" data-d="15">+15 s</button></div>
      <div class="fc-quiet"><button data-a="restSkip">Passer le repos</button></div>
    </div>`;
  }

  if(allDone){
    const recap = ex.sets.map(s=>`<span class="chip">${s.reps||"?"}${s.weight!=null?" × "+s.weight+" kg":""}</span>`).join("");
    return `<div class="focus-card ${animClass}">${header}
      <div class="fc-done-badge">${icon("check")}</div>
      <div class="fc-recap">${recap}</div>
      <div class="fc-quiet"><button data-a="swapExoOpen" data-idx="${idx}">Remplacer</button><button data-a="addSetFocus" data-exi="${idx}">+ série</button></div>
    </div>`;
  }

  const si = ex.sets.findIndex(s=>!s.done);
  const st = ex.sets[si];
  const hasWeight = !!loadableTypeOf(def);
  return `<div class="focus-card ${animClass}">${header}
    <div class="fc-phase">Série ${si+1} / ${ex.sets.length}</div>
    <div class="set-dots">${ex.sets.map((s,i)=>`<span class="sd ${s.done?"done":i===si?"current":""}"></span>`).join("")}</div>
    <div class="big-steppers">
      <div class="big-stepper"><div class="bs-label">Répétitions</div><div class="bs-row">
        <button data-a="stepReps" data-exi="${idx}" data-si="${si}" data-d="-1">−</button>
        <div class="bs-val">${st.reps??"–"}</div>
        <button data-a="stepReps" data-exi="${idx}" data-si="${si}" data-d="1">+</button>
      </div></div>
      ${hasWeight?`<div class="big-stepper"><div class="bs-label">Charge (kg)</div><div class="bs-row">
        <button data-a="stepWeight" data-exi="${idx}" data-si="${si}" data-d="-1">−</button>
        <div class="bs-val">${st.weight??"–"}</div>
        <button data-a="stepWeight" data-exi="${idx}" data-si="${si}" data-d="1">+</button>
      </div></div>`:""}
    </div>
    ${ex.note?`<div class="exo-note" style="margin:0 0 16px">${esc(ex.note)}</div>`:""}
    <button class="btn" data-a="validateSet" data-exi="${idx}">${icon("check")} Série validée</button>
    <div class="fc-quiet" style="margin-top:14px"><button data-a="swapExoOpen" data-idx="${idx}">Remplacer</button><button data-a="removeExo" data-idx="${idx}">Retirer</button></div>
  </div>`;
}

function refreshFocusRegion(){
  const el = qs("#focusRegion");
  if(!el || !S.draft || !S.draft.startedAt) return;
  el.innerHTML = renderFocusRegionInner(S.draft);
  const eyebrow = qs("#todayEyebrow");
  if(eyebrow){
    const totalSets = S.draft.exos.reduce((t,e)=>t+e.sets.length,0);
    const doneSets = S.draft.exos.reduce((t,e)=>t+e.sets.filter(s=>s.done).length,0);
    const elapsed = Math.round((Date.now()-Date.parse(S.draft.startedAt))/1000);
    eyebrow.textContent = `${fmtDuration(elapsed)} · ${doneSets}/${totalSets} séries`;
  }
  if(typeof renderRestBar==="function") renderRestBar();
}

function overviewBodyHTML(){
  const rows = S.draft.exos.map((ex,i)=>{
    const def = EXO_MAP[ex.exoId];
    const done = ex.sets.filter(s=>s.done).length;
    const allDone = done===ex.sets.length;
    return `<div class="row">
      <button class="grow" style="display:flex;align-items:center;gap:12px;text-align:left" data-a="jumpFromOverview" data-idx="${i}">
        <div class="ico" style="background:${allDone?"var(--green)":"var(--tint)"}">${allDone?icon("check"):PATTERN_EMOJI[def.pattern]||"💪"}</div>
        <div class="grow"><div class="t">${esc(def.n)}</div><div class="s">${done}/${ex.sets.length} séries</div></div>
      </button>
      <button class="icon-btn" data-a="swapExoOpen" data-idx="${i}">${icon("swap")}</button>
      <button class="icon-btn" data-a="removeExoOverview" data-idx="${i}">${icon("close")}</button>
    </div>`;
  }).join("");
  return `<div class="group">${rows}</div>
    <div class="btnrow"><button class="btn secondary sm" data-a="addExoOpen">${icon("plus")} Ajouter un exercice</button></div>`;
}

function exoPickerSheet(title, onPick, excludeIds){
  const excl = new Set(excludeIds||[]);
  const pool = availableExos().filter(e=>!excl.has(e.id));
  const byPattern = {};
  pool.forEach(e=>{ (byPattern[e.pattern]=byPattern[e.pattern]||[]).push(e); });
  const html = Object.keys(byPattern).map(p=>{
    const rows = byPattern[p].map(e=>`<button class="row tap" data-a="pickExo" data-id="${e.id}" style="width:100%">
      <div class="ico" style="background:var(--tint)">${PATTERN_EMOJI[p]}</div>
      <div class="grow"><div class="t">${esc(e.n)}</div><div class="s">${e.muscles.map(m=>MUSCLE_MAP[m].n).join(" · ")}</div></div>
    </button>`).join("");
    return `<div class="group" style="margin-top:14px">${rows}</div>`;
  }).join("") || `<div class="empty-state">Aucun exercice disponible avec ton matériel actuel.</div>`;
  openSheet(`<div class="sheet-hd"><span class="t">${esc(title)}</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div><div class="sheet-body">${html}</div>`);
  qs("#overlay")._onPick = onPick;
}

Object.assign(ACT, {
  startSession(){ S.draft.startedAt = new Date().toISOString(); liveFocusIdx = 0; changed(); },
  regenSession(){
    confirmSheet({ title:"Générer une autre séance ?", html:"La proposition actuelle sera remplacée.", ok:"Générer", onOk:()=>{ regenerateDraft(); liveFocusIdx=0; changed(); } });
  },
  dropImported(){
    confirmSheet({ title:"Revenir à la suggestion automatique ?", html:"Le programme importé restera disponible pour une prochaine séance.", ok:"Revenir à l'auto", onOk:()=>{ S.draft = generateEngineSession(); liveFocusIdx=0; save(); changed(); } });
  },
  removeExo(d){
    const idx = +d.idx;
    S.draft.exos.splice(idx,1);
    if(liveFocusIdx>=S.draft.exos.length) liveFocusIdx = Math.max(0,S.draft.exos.length-1);
    changed();
  },
  addExoOpen(){
    exoPickerSheet("Ajouter un exercice", (id)=>{
      const exo = EXO_MAP[id]; const sug = suggestForExo(exo);
      S.draft.exos.push({ exoId:id, targetSets:exo.sets, targetReps:sug.targetReps, note:sug.note, sets:buildSetsFor(exo,sug) });
      closeSheet(); changed();
    }, S.draft.exos.map(e=>e.exoId));
  },
  swapExoOpen(d){
    const idx = +d.idx;
    exoPickerSheet("Remplacer par", (id)=>{
      const exo = EXO_MAP[id]; const sug = suggestForExo(exo);
      S.draft.exos[idx] = { exoId:id, targetSets:exo.sets, targetReps:sug.targetReps, note:sug.note, sets:buildSetsFor(exo,sug) };
      closeSheet(); changed();
    }, S.draft.exos.map(e=>e.exoId));
  },
  pickExo(d){ const fn = qs("#overlay")._onPick; if(fn) fn(d.id); },

  focusPrev(){ if(liveFocusIdx>0){ liveFocusIdx--; focusAnimDir="l"; refreshFocusRegion(); } },
  focusNext(){ if(S.draft && liveFocusIdx<S.draft.exos.length-1){ liveFocusIdx++; focusAnimDir="r"; refreshFocusRegion(); } },
  focusJump(d){ const ni=+d.idx; focusAnimDir = ni>liveFocusIdx?"r":ni<liveFocusIdx?"l":null; liveFocusIdx=ni; refreshFocusRegion(); },
  jumpFromOverview(d){ const ni=+d.idx; focusAnimDir = ni>liveFocusIdx?"r":ni<liveFocusIdx?"l":null; liveFocusIdx=ni; closeSheet(); refreshFocusRegion(); },

  openOverview(){ openSheet(`<div class="sheet-hd"><span class="t">Séance complète</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div><div class="sheet-body">${overviewBodyHTML()}</div>`); },
  removeExoOverview(d){
    const idx = +d.idx;
    S.draft.exos.splice(idx,1);
    if(liveFocusIdx>=S.draft.exos.length) liveFocusIdx = Math.max(0,S.draft.exos.length-1);
    save();
    refreshFocusRegion();
    const body = qs(".sheet-body");
    if(body) body.innerHTML = overviewBodyHTML();
  },

  addSetFocus(d){
    const ex = S.draft.exos[+d.exi];
    const last = ex.sets[ex.sets.length-1];
    ex.sets.push({ reps:last?last.reps:null, weight:last?last.weight:null, done:false, rpe:null });
    ex.targetSets = ex.sets.length;
    save(); refreshFocusRegion();
  },
  stepReps(d){
    const st = S.draft.exos[+d.exi].sets[+d.si];
    st.reps = Math.max(0,(st.reps||0)+parseInt(d.d,10));
    save(); refreshFocusRegion();
  },
  stepWeight(d){
    const ex = S.draft.exos[+d.exi], def = EXO_MAP[ex.exoId], st = ex.sets[+d.si];
    st.weight = stepWeightValue(def, st.weight||0, parseInt(d.d,10));
    save(); refreshFocusRegion();
  },
  validateSet(d){
    const exi = +d.exi;
    const ex = S.draft.exos[exi], def = EXO_MAP[ex.exoId];
    const si = ex.sets.findIndex(s=>!s.done);
    if(si<0) return;
    const st = ex.sets[si];
    st.done = true;
    if((st.weight||st.reps) && isNewPR(ex.exoId, st.weight||0, st.reps||0)){
      toast("💥 Nouveau record sur "+def.n+" !");
      S.meta.prCount = (S.meta.prCount||0)+1;
    }
    startRestTimer(def.restSec, def.n, exi);
    if(!ex.sets.some(s=>!s.done) && exi<S.draft.exos.length-1){ liveFocusIdx = exi+1; focusAnimDir="r"; }
    save();
    refreshFocusRegion();
  },

  showExoInfo(d){
    const e = EXO_MAP[d.id];
    openSheet(`<div class="sheet-hd"><span class="t">Détails</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
      <div class="sheet-body">
      <div class="exo-hero"><div class="ico">${PATTERN_EMOJI[e.pattern]||"💪"}</div><div class="nm">${esc(e.n)}</div></div>
      <div class="exo-muscle-chips">${e.muscles.map(m=>`<span class="chip">${MUSCLE_MAP[m].n}</span>`).join("")}</div>
      <h2 class="sh">Exécution</h2>
      <div class="cue-list">${e.cues.map((c,i)=>`<div class="cue-item" style="animation-delay:${i*0.06}s"><div class="cue-num">${i+1}</div><div class="cue-txt">${esc(c)}</div></div>`).join("")}</div>
      <div class="safety-box"><div class="lbl">Sécurité</div><div class="txt">${esc(e.safety)}</div></div>
      </div>`);
  },

  finishSession(){
    openSheet(`<div class="sheet-hd"><span class="t">Comment te sens-tu ?</span></div>
      <div class="sheet-body" style="padding:8px 16px 20px">
      <div style="display:flex;justify-content:space-between;gap:8px">
        ${["😣","😕","🙂","💪","🔥"].map((em,i)=>`<button class="btn secondary" style="flex-direction:column;height:70px" data-a="setFeelingAndFinish" data-f="${i+1}"><span style="font-size:26px">${em}</span></button>`).join("")}
      </div></div>`, {noGrab:false});
  },
  setFeelingAndFinish(d){
    const draft = S.draft;
    draft.completedAt = new Date().toISOString();
    draft.feeling = +d.f;
    draft.durationSec = Math.round((Date.parse(draft.completedAt)-Date.parse(draft.startedAt))/1000);
    S.sessions.push(clone(draft));
    if(draft.source==="imported" && S.importedProgram.length) S.importedProgram.shift();
    S.draft = null;
    liveFocusIdx = 0;
    stopRestTimer();
    save();
    closeSheet();
    const newTrophies = checkTrophies();
    setTimeout(()=>showCelebration(draft, newTrophies), 320);
  },
  abandonSession(){
    confirmSheet({ title:"Abandonner la séance ?", html:"La progression de cette séance sera perdue.", ok:"Abandonner", danger:true,
      onOk:()=>{ S.draft=null; liveFocusIdx=0; stopRestTimer(); changed(); } });
  },
});
VIEWS.today = renderToday;
