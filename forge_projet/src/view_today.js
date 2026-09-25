// ================= VUE : AUJOURD'HUI =================
const PATTERN_EMOJI = { squat:"🏋️", hinge:"⚙️", push:"⬆️", pull:"⬇️", lunge:"🚶", core:"🔲", calf:"🦶" };

function fmtDuration(sec){
  if(sec<60) return `${sec} s`;
  const m = Math.round(sec/60);
  if(m<60) return `${m} min`;
  return `${Math.floor(m/60)} h ${String(m%60).padStart(2,"0")}`;
}
function repsLabel(range){ return range[0]===range[1] ? `${range[0]}` : `${range[0]}-${range[1]}`; }

function renderToday(){
  const draft = getOrCreateDraft();
  return draft.startedAt ? renderTodayLive(draft) : renderTodayPreview(draft);
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
    ${draft.source==="imported"?`<div class="chips" style="margin-bottom:12px">${sourceChip(draft)}</div>`:""}
    <div class="group">${rows}</div>
    <div class="btnrow"><button class="btn secondary sm" data-a="addExoOpen">${icon("plus")} Ajouter</button>${draft.source==="engine"?`<button class="btn secondary sm" data-a="regenSession">${icon("swap")} Autre séance</button>`:`<button class="btn secondary sm" data-a="dropImported">${icon("swap")} Suggestion auto</button>`}</div>
    <div class="btnrow"><button class="btn" data-a="startSession">Commencer la séance</button></div>
    <p class="hr-note" style="margin:16px 20px 0">La séance reste modifiable avant et pendant l'entraînement : retire, remplace ou ajoute un exercice à tout moment.</p>
  </div>`;
}

function renderTodayLive(draft){
  const totalSets = draft.exos.reduce((t,e)=>t+e.sets.length,0);
  const doneSets = draft.exos.reduce((t,e)=>t+e.sets.filter(s=>s.done).length,0);
  const elapsed = Math.round((Date.now()-Date.parse(draft.startedAt))/1000);
  const cards = draft.exos.map((ex,i)=>renderExoCard(ex,i)).join("");
  return `<div class="navbar"><div class="nb-title">Séance en cours</div><div class="nb-right"><button class="icon-btn" data-a="abandonSession">${icon("trash")}</button></div></div>
  <div class="content">
    <div class="eyebrow">${fmtDuration(elapsed)} · ${doneSets}/${totalSets} séries</div>
    <h1 class="lt">Séance en cours</h1>
    ${cards}
    <div class="btnrow"><button class="btn secondary sm" data-a="addExoOpen">${icon("plus")} Ajouter un exercice</button></div>
    <div class="btnrow"><button class="btn" data-a="finishSession">Terminer la séance</button></div>
  </div>`;
}

function renderExoCard(ex,i){
  const def = EXO_MAP[ex.exoId];
  const rows = ex.sets.map((st,j)=>`<div class="set-row">
      <button class="checkbtn ${st.done?"done":""}" data-a="toggleSet" data-exi="${i}" data-si="${j}">${st.done?icon("check"):""}</button>
      <input type="number" inputmode="numeric" placeholder="reps" value="${st.reps??""}" data-c="setReps" data-exi="${i}" data-si="${j}">
      <input type="number" inputmode="decimal" placeholder="${def.equip.includes('bodyweight')&&def.equip.length===1?"pdc":"kg"}" value="${st.weight??""}" data-c="setWeight" data-exi="${i}" data-si="${j}">
      <button class="icon-btn" style="color:var(--label3)" data-a="removeSet" data-exi="${i}" data-si="${j}">${icon("close")}</button>
    </div>`).join("");
  return `<div class="set-card">
    <div class="set-hd">
      <div class="ico">${PATTERN_EMOJI[def.pattern]||"💪"}</div>
      <div class="grow"><div class="nm">${esc(def.n)}</div><div class="mg">${def.muscles.map(m=>MUSCLE_MAP[m].n).join(" · ")} — objectif ${repsLabel(ex.targetReps)} reps</div></div>
      <button class="icon-btn" data-a="showExoInfo" data-id="${def.id}">ℹ️</button>
    </div>
    ${ex.note?`<div class="exo-note">${esc(ex.note)}</div>`:""}
    <div class="set-row hd"><span></span><span>Reps</span><span>Charge</span><span></span></div>
    ${rows}
    <div class="set-actions">
      <button data-a="addSet" data-exi="${i}">+ série</button>
      <button data-a="swapExoOpen" data-idx="${i}">Remplacer</button>
      <button data-a="removeExo" data-idx="${i}">Retirer</button>
    </div>
  </div>`;
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
  startSession(){ S.draft.startedAt = new Date().toISOString(); changed(); },
  regenSession(){
    confirmSheet({ title:"Générer une autre séance ?", html:"La proposition actuelle sera remplacée.", ok:"Générer", onOk:()=>{ regenerateDraft(); changed(); } });
  },
  dropImported(){
    confirmSheet({ title:"Revenir à la suggestion automatique ?", html:"Le programme importé restera disponible pour une prochaine séance.", ok:"Revenir à l'auto", onOk:()=>{ S.draft = generateEngineSession(); save(); changed(); } });
  },
  removeExo(d){ S.draft.exos.splice(+d.idx,1); changed(); },
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
  toggleSet(d){
    const exi=+d.exi, si=+d.si;
    const ex = S.draft.exos[exi], st = ex.sets[si], def = EXO_MAP[ex.exoId];
    if(!st.done){
      if(st.reps==null) st.reps = Math.round((ex.targetReps[0]+ex.targetReps[1])/2);
      st.done = true;
      if(isNewPR(ex.exoId, st.weight||0, st.reps||0) && (st.weight||st.reps)){ toast("💥 Nouveau record sur "+def.n+" !"); S.meta.prCount = (S.meta.prCount||0)+1; }
      startRestTimer(def.restSec, def.n);
    } else { st.done = false; }
    changed();
  },
  setReps(d,el){ S.draft.exos[+d.exi].sets[+d.si].reps = el.value===""?null:parseFloat(el.value); save(); },
  setWeight(d,el){ S.draft.exos[+d.exi].sets[+d.si].weight = el.value===""?null:parseFloat(el.value); save(); },
  addSet(d){
    const ex = S.draft.exos[+d.exi];
    const last = ex.sets[ex.sets.length-1];
    ex.sets.push({ reps:null, weight:last?last.weight:null, done:false, rpe:null });
    ex.targetSets = ex.sets.length;
    changed();
  },
  removeSet(d){
    const ex = S.draft.exos[+d.exi];
    if(ex.sets.length>1){ ex.sets.splice(+d.si,1); ex.targetSets = ex.sets.length; changed(); }
  },
  showExoInfo(d){
    const e = EXO_MAP[d.id];
    openSheet(`<div class="sheet-hd"><span class="t">${esc(e.n)}</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
      <div class="sheet-body"><p class="body">${e.muscles.map(m=>MUSCLE_MAP[m].n).join(" · ")}</p>
      <h2 class="sh" style="margin-top:18px">Exécution</h2>
      <div class="group"><div style="padding:12px 16px">${e.cues.map(c=>`<div style="padding:6px 0">• ${esc(c)}</div>`).join("")}</div></div>
      <h2 class="sh">Sécurité</h2><p class="body">${esc(e.safety)}</p></div>`);
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
    stopRestTimer();
    save();
    closeSheet();
    const newTrophies = checkTrophies();
    setTimeout(()=>showCelebration(draft, newTrophies), 320);
  },
  abandonSession(){
    confirmSheet({ title:"Abandonner la séance ?", html:"La progression de cette séance sera perdue.", ok:"Abandonner", danger:true,
      onOk:()=>{ S.draft=null; stopRestTimer(); changed(); } });
  },
});
VIEWS.today = renderToday;
