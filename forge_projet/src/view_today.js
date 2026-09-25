// ================= VUE : AUJOURD'HUI =================
// Avant la séance : deux sections — « Proposée » (moteur, avec choix du type de séance)
// et « Ma séance » (composée par l'utilisateur, avec modèles réutilisables).
// Pendant la séance : mode focus, un exercice à la fois.
const PATTERN_EMOJI = { squat:"🏋️", hinge:"⚙️", push:"⬆️", pull:"⬇️", lunge:"🚶", core:"🔲", calf:"🦶" };

let liveFocusIdx = 0;
let focusAnimDir = null;
let justDone = null; // {exi, si} : série qui vient d'être validée (animation du point)

function fmtDuration(sec){
  if(sec<60) return `${sec} s`;
  const m = Math.round(sec/60);
  if(m<60) return `${m} min`;
  return `${Math.floor(m/60)} h ${String(m%60).padStart(2,"0")}`;
}
function repsLabel(range){ return range[0]===range[1] ? `${range[0]}` : `${range[0]}-${range[1]}`; }
function musclesLabel(def){ return def.muscles.map(m=>MUSCLE_MAP[m].n).join(" · "); }

function renderToday(){
  const draft = getOrCreateDraft();
  liveFocusIdx = Math.min(liveFocusIdx, Math.max(0, draft.exos.length-1));
  return draft.startedAt ? renderTodayLive(draft) : renderTodayPreview(draft);
}

// ---------- en-tête motivation ----------
function miniRingSVG(pct){
  const r=18, c=2*Math.PI*r;
  const off = c*(1-Math.min(1,pct));
  return `<svg viewBox="0 0 46 46"><circle class="bgc" cx="23" cy="23" r="${r}"/><circle class="fgc" cx="23" cy="23" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg>`;
}
function motivRowHTML(){
  const goal = S.goals.daysPerWeek||3, done = sessionsThisWeek(), streak = currentStreakWeeks();
  const lv = levelInfo();
  const msg = done>=goal ? "Objectif de la semaine atteint !" : goal-done===1 ? "Plus qu'une séance pour l'objectif." : `Encore ${goal-done} séances pour l'objectif.`;
  return `<div class="motiv-row">
    <div class="motiv-ring">${miniRingSVG(done/goal)}<span>${done}/${goal}</span></div>
    <div class="motiv-txt"><div class="m1">${msg}</div><div class="m2">Niveau ${lv.level} · ${esc(lv.title)}</div></div>
    <div class="streak-badge" title="Semaines d'affilée">${icon("flame")}${streak}</div>
  </div>`;
}
function doneTodayHTML(){
  const today = sessionsToday();
  if(!today.length) return "";
  const s = today[today.length-1];
  return `<button class="done-today stagger" style="--i:0" data-a="openSessionDetail" data-id="${s.id}">
    <div class="dt-ico">${icon("check")}</div>
    <div class="grow"><div class="dt-t">Séance du jour faite</div>
    <div class="dt-s">${fmtDuration(s.durationSec||0)} · ${sessionSetCount(s)} séries · ${sessionVolume(s) ? fmtKg(sessionVolume(s)) : sessionReps(s)+" répétitions"}</div></div>
    <span class="chev">${icon("chev")}</span>
  </button>`;
}

// ---------- aperçu ----------
function renderTodayPreview(draft){
  const mode = S.settings.todayMode==="custom" ? "custom" : "proposal";
  return `<div class="navbar"><div class="nb-title">Aujourd'hui</div></div><div class="content">
    <div class="eyebrow">${fmtDate(todayISO(),"long")}</div>
    <h1 class="lt">Aujourd'hui</h1>
    ${motivRowHTML()}
    ${doneTodayHTML()}
    ${segHTML("today", [["proposal","Proposée"],["custom","Ma séance"]], mode, "todayMode")}
    <div class="seg-pane">${mode==="custom" ? customPaneHTML() : proposalPaneHTML(draft)}</div>
  </div>`;
}

function exoRowHTML(def, sub, i, actions){
  return `<div class="row stagger" style="--i:${i+2}">
    <button class="row-main" data-a="showExoInfo" data-id="${def.id}">
      <div class="ico" style="background:var(--tint)">${PATTERN_EMOJI[def.pattern]||"💪"}</div>
      <div class="grow"><div class="t">${esc(def.n)}</div><div class="s">${sub}</div></div>
    </button>${actions}
  </div>`;
}

function proposalPaneHTML(draft){
  const imported = draft.source==="imported";
  const typeChips = SESSION_TYPES.map(t=>`<button class="type-chip ${!imported&&draft.type===t.id?"on":""}" data-a="setType" data-v="${t.id}"><span>${t.em}</span>${t.n}</button>`).join("");
  let hero;
  if(imported){
    hero = `<div class="plan-card stagger" style="--i:1">
      <div class="pc-eyebrow">Programme importé</div>
      <div class="pc-title">${esc(draft.name||"Séance importée")}</div>
      <div class="pc-reason">${S.importedProgram.length} séance${S.importedProgram.length>1?"s":""} en attente dans ton programme.</div>
      <button class="btn ghost sm" style="margin-top:8px;padding:0" data-a="dropImported">Revenir à la suggestion automatique</button>
    </div>`;
  } else {
    const t = SESSION_TYPE_MAP[draft.type]||SESSION_TYPES[0], rt = SESSION_TYPE_MAP[draft.resolvedType];
    const title = draft.type==="auto" && rt ? `${rt.em} ${rt.n}` : `${t.em} ${t.n}`;
    const focus = focusMuscles(draft).slice(0,4);
    hero = `<div class="plan-card stagger" style="--i:1">
      <div class="pc-eyebrow">${draft.type==="auto"?"Choisie pour toi":"Séance proposée"}</div>
      <div class="pc-title">${title}</div>
      ${draft.reason?`<div class="pc-reason">${esc(draft.reason)}</div>`:""}
      ${draft.exos.length?`<div class="pc-meta"><span>${draft.exos.length} exercices</span><span>${draft.exos.reduce((t,e)=>t+e.sets.length,0)} séries</span><span>≈ ${estimateMinutes(draft)} min</span></div>
      <div class="pc-muscles">${focus.map(m=>`<span>${MUSCLE_MAP[m].n}</span>`).join("")}</div>`:""}
    </div>`;
  }
  if(!draft.exos.length){
    return `<div class="type-scroll">${typeChips}</div>${hero}
      <div class="empty-state"><span class="em">🧰</span>Pas d'exercice disponible pour ce type de séance avec ton matériel.<br>Essaie un autre type, ou complète ton matériel dans l'onglet Profil.</div>`;
  }
  const rows = draft.exos.map((ex,i)=>exoRowHTML(EXO_MAP[ex.exoId], `${ex.targetSets} × ${repsLabel(ex.targetReps)}${ex.sets[0]&&ex.sets[0].weight?" · "+ex.sets[0].weight+" kg":""}`, i,
    `<button class="icon-btn" aria-label="Remplacer" data-a="swapExoOpen" data-idx="${i}">${icon("swap")}</button>
     <button class="icon-btn" aria-label="Retirer" data-a="removeExo" data-idx="${i}">${icon("close")}</button>`)).join("");
  return `<div class="type-scroll">${typeChips}</div>
    ${hero}
    <div class="group" style="margin-top:12px">${rows}</div>
    <div class="btnrow">
      <button class="btn secondary sm" data-a="addExoOpen">${icon("plus")} Ajouter</button>
      ${imported?"":`<button class="btn secondary sm" data-a="regenSession">${icon("repeat")} Autre proposition</button>`}
    </div>
    <div class="btnrow"><button class="btn big" data-a="startSession">${icon("play")} Commencer cette séance</button></div>`;
}

function customPaneHTML(){
  const c = S.custom.exos;
  const tpls = S.templates.length ? `<h2 class="sh">Mes modèles</h2>
    <div class="tpl-scroll">${S.templates.map((t,i)=>`<div class="tpl-card stagger" style="--i:${i}">
      <button class="tpl-main" data-a="loadTemplate" data-id="${t.id}">
        <div class="tpl-name">${esc(t.n)}</div>
        <div class="tpl-sub">${t.exos.length} exercice${t.exos.length>1?"s":""} · ${t.exos.reduce((a,e)=>a+e.sets,0)} séries</div>
        <div class="tpl-ems">${t.exos.slice(0,5).map(e=>EXO_MAP[e.exoId]?PATTERN_EMOJI[EXO_MAP[e.exoId].pattern]:"").join("")}</div>
      </button>
      <button class="tpl-del" aria-label="Supprimer le modèle" data-a="deleteTemplate" data-id="${t.id}">${icon("close")}</button>
    </div>`).join("")}</div>` : "";
  if(!c.length){
    return `${tpls}<div class="builder-empty stagger" style="--i:1">
      <div class="be-ico">✍️</div>
      <div class="be-t">Compose ta séance</div>
      <div class="be-s">Choisis les exercices que tu veux faire aujourd'hui. Forge calcule les charges à partir de ton historique.</div>
      <button class="btn" data-a="customAddOpen">${icon("plus")} Choisir des exercices</button>
      <button class="btn ghost sm" style="margin-top:6px" data-a="customFromProposal">Partir de la séance proposée</button>
    </div>`;
  }
  const rows = c.map((e,i)=>{
    const def = EXO_MAP[e.exoId]; if(!def) return "";
    return exoRowHTML(def, musclesLabel(def), i, `<div class="mini-step">
        <button aria-label="Moins de séries" data-a="customSets" data-idx="${i}" data-d="-1">−</button><span>${e.sets}×</span><button aria-label="Plus de séries" data-a="customSets" data-idx="${i}" data-d="1">+</button>
      </div>
      <button class="icon-btn" aria-label="Retirer" data-a="customRemove" data-idx="${i}">${icon("close")}</button>`);
  }).join("");
  const sets = c.reduce((t,e)=>t+e.sets,0);
  const preview = { exos: c.map(e=>({ exoId:e.exoId, sets:new Array(e.sets).fill(0) })) };
  return `${tpls}
    <h2 class="sh">${esc(S.custom.name||"Ma séance")}<button class="more" data-a="customClear">Vider</button></h2>
    <div class="sh-sub">${c.length} exercice${c.length>1?"s":""} · ${sets} séries · ≈ ${estimateMinutes(preview)} min</div>
    <div class="group">${rows}</div>
    <div class="btnrow">
      <button class="btn secondary sm" data-a="customAddOpen">${icon("plus")} Ajouter</button>
      <button class="btn secondary sm" data-a="saveTemplateOpen">${icon("bookmark")} Enregistrer</button>
    </div>
    <div class="btnrow"><button class="btn big" data-a="startCustom">${icon("play")} Commencer ma séance</button></div>`;
}

// ---------- sélecteur d'exercices (recherche, filtre musculaire, multi-sélection) ----------
let picker = null;
function openPicker(opts){
  picker = Object.assign({ multi:false, selected:[], exclude:new Set(), q:"", muscle:null }, opts);
  const chips = [["","Tous"]].concat(MUSCLES.map(m=>[m.id,m.n])).map(([id,n])=>`<button class="chip ${(picker.muscle||"")===id?"on":""}" data-a="pickerMuscle" data-v="${id}">${esc(n)}</button>`).join("");
  openSheet(`<div class="sheet-hd"><span class="t">${esc(picker.title)}</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
    <div class="picker-top">
      <label class="search">${icon("search")}<input id="pickerSearch" type="search" placeholder="Rechercher un exercice" autocomplete="off"></label>
      <div class="chip-scroll" id="pickerChips">${chips}</div>
    </div>
    <div class="sheet-body" id="pickerList">${pickerListHTML()}</div>`,
    { tall:true, footer: picker.multi ? `<button class="btn" id="pickerDone" data-a="pickerDone" disabled>Ajouter</button>` : null });
  const inp = qs("#pickerSearch");
  if(inp) inp.addEventListener("input", ()=>{ picker.q = inp.value; qs("#pickerList").innerHTML = pickerListHTML(); });
}
function pickerListHTML(){
  const q = normName(picker.q);
  const pool = availableExos().filter(e=>!picker.exclude.has(e.id)
    && (!picker.muscle || e.muscles.includes(picker.muscle))
    && (!q || normName(e.n).includes(q) || e.muscles.some(m=>normName(MUSCLE_MAP[m].n).includes(q))));
  if(!pool.length) return `<div class="empty-state"><span class="em">🔍</span>Aucun exercice ne correspond.</div>`;
  const byPattern = {};
  pool.forEach(e=>{ (byPattern[e.pattern]=byPattern[e.pattern]||[]).push(e); });
  return Object.keys(byPattern).map(p=>`<div class="pick-h">${esc(PATTERN_LABEL[p]||p)}</div><div class="group">${byPattern[p].map(e=>{
    const on = picker.selected.includes(e.id);
    return `<button class="row tap pick-row ${on?"on":""}" data-a="pickerTap" data-id="${e.id}">
      <div class="ico" style="background:var(--tint)">${PATTERN_EMOJI[p]}</div>
      <div class="grow"><div class="t">${esc(e.n)}</div><div class="s">${musclesLabel(e)}</div></div>
      ${picker.multi?`<span class="pick-check">${on?icon("check"):""}</span>`:""}
    </button>`;
  }).join("")}</div>`).join("");
}
function refreshPickerFooter(){
  const b = qs("#pickerDone"); if(!b) return;
  const n = picker.selected.length;
  b.disabled = !n;
  b.textContent = n ? `Ajouter ${n} exercice${n>1?"s":""}` : "Ajouter";
}

// ---------- séance en cours ----------
function renderTodayLive(draft){
  if(!draft.exos.length){
    return `<div class="navbar"><div class="nb-title">Séance en cours</div><div class="nb-right"><button class="icon-btn" aria-label="Abandonner" data-a="abandonSession">${icon("trash")}</button></div></div>
    <div class="content"><h1 class="lt">Séance en cours</h1><div class="empty-state"><span class="em">🧰</span>Tous les exercices ont été retirés.<br>Ajoute-en un pour continuer.</div>
    <div class="btnrow"><button class="btn" data-a="addExoOpen">${icon("plus")} Ajouter un exercice</button></div></div>`;
  }
  return `<div class="navbar"><div class="nb-title">Séance en cours</div><div class="nb-right"><button class="icon-btn" aria-label="Abandonner" data-a="abandonSession">${icon("trash")}</button></div></div>
  <div class="content">
    <div class="eyebrow" id="todayEyebrow">${liveEyebrow(draft)}</div>
    <h1 class="lt">${esc(draft.name || (draft.source==="custom"?"Ma séance":"Séance en cours"))}</h1>
    <div id="focusRegion">${renderFocusRegionInner(draft)}</div>
    <div class="btnrow"><button class="btn" data-a="finishSession">Terminer la séance</button></div>
  </div>`;
}
function liveEyebrow(draft){
  const totalSets = draft.exos.reduce((t,e)=>t+e.sets.length,0);
  const doneSets = draft.exos.reduce((t,e)=>t+e.sets.filter(s=>s.done).length,0);
  const elapsed = Math.round((Date.now()-Date.parse(draft.startedAt))/1000);
  return `${fmtDuration(elapsed)} · ${doneSets}/${totalSets} séries`;
}

function ringSVG(remain, total){
  const r=76, c=2*Math.PI*r;
  const frac = total>0 ? Math.max(0,remain)/total : 0;
  return `<div class="ring-wrap"><svg viewBox="0 0 172 172">
    <circle class="ring-bg" cx="86" cy="86" r="${r}"/>
    <circle class="ring-fg" id="ringFg" cx="86" cy="86" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c*(1-frac)).toFixed(1)}"/>
  </svg><div class="ring-label"><div class="ring-time" id="ringTime">${fmtMMSS(Math.max(0,remain))}</div><div class="ring-sub">restant</div></div></div>`;
}
function updateFocusRing(remain, total){
  const t = qs("#ringTime"), fg = qs("#ringFg");
  if(!t || !fg) return;
  t.textContent = fmtMMSS(Math.max(0,remain));
  const c = 2*Math.PI*76, frac = total>0 ? Math.max(0,remain)/total : 0;
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
    <button class="navbtn" aria-label="Exercice précédent" data-a="focusPrev" ${idx===0?"disabled":""} style="transform:scaleX(-1)">${icon("chev")}</button>
    <button class="center-link" data-a="openOverview">Voir la séance (${finishedCount}/${draft.exos.length})</button>
    <button class="navbtn" aria-label="Exercice suivant" data-a="focusNext" ${idx===draft.exos.length-1?"disabled":""}>${icon("chev")}</button>
  </div>`;
  return `<div class="focus-dots">${dots}</div>${renderFocusCard(idx, ex, def)}${nav}`;
}

function lastTimeHTML(exoId){
  const last = lastPerformance(exoId);
  if(!last) return `<div class="fc-last">Première fois : prends tes repères</div>`;
  const done = last.exo.sets.filter(s=>s.done);
  const w = done[0] && done[0].weight;
  return `<div class="fc-last">La dernière fois (${fmtRelative(last.session.date)}) : ${done.map(s=>s.reps).join(" · ")}${w?" × "+w+" kg":""}</div>`;
}

function renderFocusCard(idx, ex, def){
  const animClass = focusAnimDir==="r" ? "anim-r" : focusAnimDir==="l" ? "anim-l" : "";
  focusAnimDir = null;
  const jd = justDone && justDone.exi===idx ? justDone.si : -1;
  justDone = null;
  const resting = restState && restState.exoIdx===idx;
  const allDone = ex.sets.every(s=>s.done);
  const header = `<div class="fc-icon">${PATTERN_EMOJI[def.pattern]||"💪"}</div>
    <div class="fc-name">${esc(def.n)}</div>
    <div class="fc-sub"><button data-a="showExoInfo" data-id="${def.id}">${musclesLabel(def)} · <u>technique</u></button></div>`;
  const setDots = si => `<div class="set-dots">${ex.sets.map((s,i)=>`<span class="sd ${s.done?"done":i===si?"current":""} ${i===jd?"just":""} ${s.pr?"pr":""}"></span>`).join("")}</div>`;

  if(resting){
    const remain = Math.max(0, Math.round((restState.endAt-Date.now())/1000));
    const next = ex.sets.find(s=>!s.done);
    return `<div class="focus-card ${animClass}">${header}
      ${setDots(-1)}
      <div class="fc-phase">Repos</div>
      ${ringSVG(remain, restState.totalSec)}
      ${next?`<div class="fc-next">Ensuite : ${next.reps} reps${next.weight?" × "+next.weight+" kg":""}</div>`:""}
      <div class="ring-adjust"><button data-a="restAdjust" data-d="-15">−15 s</button><button data-a="restAdjust" data-d="15">+15 s</button><button class="skip" data-a="restSkip">Passer</button></div>
    </div>`;
  }

  if(allDone){
    const recap = ex.sets.map(s=>`<span class="chip ${s.pr?"pr":""}">${s.pr?"💥 ":""}${s.reps||"?"}${s.weight!=null?" × "+s.weight+" kg":""}</span>`).join("");
    return `<div class="focus-card ${animClass}">${header}
      <div class="fc-done-badge">${icon("check")}</div>
      <div class="fc-recap">${recap}</div>
      <div class="fc-quiet"><button data-a="swapExoOpen" data-idx="${idx}">Remplacer</button><button data-a="addSetFocus" data-exi="${idx}">+ série</button></div>
    </div>`;
  }

  const si = ex.sets.findIndex(s=>!s.done);
  const st = ex.sets[si];
  const hasWeight = !!loadableTypeOf(def);
  const unit = def.cues.some(c=>/durée en secondes/.test(c)) ? "Secondes" : "Répétitions";
  return `<div class="focus-card ${animClass}">${header}
    <div class="fc-phase">Série ${si+1} / ${ex.sets.length} · objectif ${repsLabel(ex.targetReps)}</div>
    ${setDots(si)}
    <div class="big-steppers">
      <div class="big-stepper"><div class="bs-label">${unit}</div><div class="bs-row">
        <button aria-label="Moins" data-a="stepReps" data-exi="${idx}" data-si="${si}" data-d="-1">−</button>
        <button class="bs-val" aria-label="Saisir la valeur" data-a="editVal" data-f="reps" data-exi="${idx}" data-si="${si}">${st.reps??"–"}</button>
        <button aria-label="Plus" data-a="stepReps" data-exi="${idx}" data-si="${si}" data-d="1">+</button>
      </div></div>
      ${hasWeight?`<div class="big-stepper"><div class="bs-label">Charge (kg)</div><div class="bs-row">
        <button aria-label="Moins" data-a="stepWeight" data-exi="${idx}" data-si="${si}" data-d="-1">−</button>
        <button class="bs-val" aria-label="Saisir la charge" data-a="editVal" data-f="weight" data-exi="${idx}" data-si="${si}">${st.weight??"–"}</button>
        <button aria-label="Plus" data-a="stepWeight" data-exi="${idx}" data-si="${si}" data-d="1">+</button>
      </div></div>`:""}
    </div>
    ${lastTimeHTML(ex.exoId)}
    ${ex.note?`<div class="exo-note" style="margin:0 0 14px">${esc(ex.note)}</div>`:""}
    <button class="btn big validate" data-a="validateSet" data-exi="${idx}">${icon("check")} Série validée</button>
    <div class="fc-quiet" style="margin-top:14px"><button data-a="swapExoOpen" data-idx="${idx}">Remplacer</button><button data-a="removeExo" data-idx="${idx}">Retirer</button></div>
  </div>`;
}

function refreshFocusRegion(){
  const el = qs("#focusRegion");
  if(!el || !S.draft || !S.draft.startedAt) return;
  el.innerHTML = renderFocusRegionInner(S.draft);
  const eyebrow = qs("#todayEyebrow");
  if(eyebrow) eyebrow.textContent = liveEyebrow(S.draft);
  if(typeof renderRestBar==="function") renderRestBar();
}

function overviewBodyHTML(){
  const rows = S.draft.exos.map((ex,i)=>{
    const def = EXO_MAP[ex.exoId];
    const done = ex.sets.filter(s=>s.done).length;
    const allDone = done===ex.sets.length;
    return `<div class="row">
      <button class="row-main" data-a="jumpFromOverview" data-idx="${i}">
        <div class="ico" style="background:${allDone?"var(--green)":"var(--tint)"}">${allDone?icon("check"):PATTERN_EMOJI[def.pattern]||"💪"}</div>
        <div class="grow"><div class="t">${esc(def.n)}</div><div class="s">${done}/${ex.sets.length} séries</div></div>
      </button>
      <button class="icon-btn" aria-label="Remplacer" data-a="swapExoOpen" data-idx="${i}">${icon("swap")}</button>
      <button class="icon-btn" aria-label="Retirer" data-a="removeExoOverview" data-idx="${i}">${icon("close")}</button>
    </div>`;
  }).join("");
  return `<div class="group">${rows}</div>
    <div class="btnrow"><button class="btn secondary sm" data-a="addExoOpen">${icon("plus")} Ajouter des exercices</button></div>`;
}

function finalizeSession(){
  const draft = S.draft;
  const xpBefore = totalXP();
  draft.completedAt = new Date().toISOString();
  draft.durationSec = Math.round((Date.parse(draft.completedAt)-Date.parse(draft.startedAt))/1000);
  draft.exos = draft.exos.filter(ex=>ex.sets.some(s=>s.done));
  S.sessions.push(clone(draft));
  if(draft.source==="imported" && S.importedProgram.length) S.importedProgram.shift();
  S.draft = null;
  liveFocusIdx = 0;
  stopRestTimer();
  const ups = checkMedals();
  const xpAfter = totalXP();
  save();
  renderViewAnimated("today");
  showCelebration(draft, ups, xpBefore, xpAfter);
}

function centerOf(sel){
  const el = qs(sel); if(!el) return [null,null];
  const r = el.getBoundingClientRect();
  return [r.left+r.width/2, r.top+r.height/2];
}

Object.assign(ACT, {
  todayMode(d){ S.settings.todayMode = d.v; save(); renderViewAnimated("today"); },
  setType(d){ regenerateDraft(d.v); renderViewAnimated("today"); },
  startSession(){ S.draft.startedAt = new Date().toISOString(); liveFocusIdx = 0; save(); renderViewAnimated("today"); },
  regenSession(){ regenerateDraft(); renderViewAnimated("today"); toast("Nouvelle proposition"); },
  dropImported(){
    confirmSheet({ title:"Revenir à la suggestion automatique ?", html:"Le programme importé restera disponible pour une prochaine séance.", ok:"Revenir à l'auto", onOk:()=>{ S.draft = generateEngineSession(); liveFocusIdx=0; save(); renderViewAnimated("today"); } });
  },
  removeExo(d){
    S.draft.exos.splice(+d.idx,1);
    if(liveFocusIdx>=S.draft.exos.length) liveFocusIdx = Math.max(0,S.draft.exos.length-1);
    changed();
  },
  addExoOpen(){
    openPicker({ title:"Ajouter des exercices", multi:true, exclude:new Set(S.draft.exos.map(e=>e.exoId)), onDone:ids=>{
      ids.forEach(id=>S.draft.exos.push(sessionEntryFor(EXO_MAP[id])));
      closeSheet(); changed();
    }});
  },
  swapExoOpen(d){
    const idx = +d.idx;
    const cur = EXO_MAP[S.draft.exos[idx].exoId];
    openPicker({ title:"Remplacer "+cur.n, muscle:cur.muscles[0], exclude:new Set(S.draft.exos.map(e=>e.exoId)), onDone:ids=>{
      S.draft.exos[idx] = sessionEntryFor(EXO_MAP[ids[0]]);
      closeSheet(); changed();
    }});
  },
  pickerTap(d){
    if(!picker) return;
    if(!picker.multi){ picker.onDone([d.id]); return; }
    const i = picker.selected.indexOf(d.id);
    if(i>=0) picker.selected.splice(i,1); else picker.selected.push(d.id);
    const row = qs(`.pick-row[data-id="${d.id}"]`);
    if(row){ row.classList.toggle("on", i<0); qs(".pick-check",row).innerHTML = i<0 ? icon("check") : ""; }
    refreshPickerFooter();
  },
  pickerMuscle(d){
    picker.muscle = d.v || null;
    qsa("#pickerChips .chip").forEach(c=>c.classList.toggle("on", c.dataset.v===(d.v||"")));
    qs("#pickerList").innerHTML = pickerListHTML();
  },
  pickerDone(){ if(picker && picker.selected.length) picker.onDone(picker.selected.slice()); },

  // --- Ma séance ---
  customAddOpen(){
    openPicker({ title:"Choisir des exercices", multi:true, exclude:new Set(S.custom.exos.map(e=>e.exoId)), onDone:ids=>{
      ids.forEach(id=>S.custom.exos.push({ exoId:id, sets:EXO_MAP[id].sets }));
      closeSheet(); save(); renderViewAnimated("today");
    }});
  },
  customFromProposal(){
    const d = getOrCreateDraft();
    S.custom = { exos: d.exos.map(e=>({ exoId:e.exoId, sets:e.sets.length })), name:null };
    save(); renderViewAnimated("today"); toast("Séance proposée copiée : modifie-la à ton goût");
  },
  customSets(d){
    const e = S.custom.exos[+d.idx];
    e.sets = Math.max(1, Math.min(10, e.sets+parseInt(d.d,10)));
    changed();
  },
  customRemove(d){ S.custom.exos.splice(+d.idx,1); changed(); },
  customClear(){
    confirmSheet({ title:"Vider ma séance ?", html:"Les exercices choisis seront retirés. Tes modèles enregistrés ne changent pas.", ok:"Vider", danger:true,
      onOk:()=>{ S.custom = { exos:[] }; save(); renderViewAnimated("today"); } });
  },
  startCustom(){
    if(!S.custom.exos.length) return;
    S.draft = buildCustomSession(S.custom.exos, S.custom.name);
    S.draft.startedAt = new Date().toISOString();
    liveFocusIdx = 0;
    save(); renderViewAnimated("today");
  },
  saveTemplateOpen(){
    openModal(`<div style="font-weight:700;font-size:calc(17rem/17);margin-bottom:4px">Enregistrer comme modèle</div>
      <div class="hr-note" style="margin:0 0 12px">Retrouve cette séance en un geste dans « Mes modèles ».</div>
      <div class="num-field"><input id="tplName" type="text" maxlength="40" placeholder="Ex. Haut du corps A" value="${esc(S.custom.name||"")}"></div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
        <button class="btn" data-a="saveTemplateOk">Enregistrer</button>
        <button class="btn ghost" data-a="closesheet" style="height:40px">Annuler</button>
      </div>`);
    setTimeout(()=>{ const i=qs("#tplName"); if(i) i.focus(); }, 80);
  },
  saveTemplateOk(){
    const name = ((qs("#tplName")||{}).value||"").trim() || `Séance ${S.templates.length+1}`;
    const existing = S.templates.find(t=>t.n.toLowerCase()===name.toLowerCase());
    const exos = clone(S.custom.exos);
    if(existing) existing.exos = exos; else S.templates.push({ id:uid(), n:name, exos });
    S.custom.name = name;
    closeSheet(); save(); changed(); toast(existing?"Modèle mis à jour":"Modèle enregistré");
  },
  loadTemplate(d){
    const t = S.templates.find(x=>x.id===d.id); if(!t) return;
    S.custom = { exos: clone(t.exos), name: t.n };
    save(); renderViewAnimated("today"); toast(`« ${t.n} » chargé`);
  },
  deleteTemplate(d){
    const t = S.templates.find(x=>x.id===d.id); if(!t) return;
    confirmSheet({ title:`Supprimer « ${t.n} » ?`, ok:"Supprimer", danger:true, onOk:()=>{ S.templates = S.templates.filter(x=>x.id!==d.id); save(); changed(); } });
  },

  // --- séance en cours ---
  focusPrev(){ if(liveFocusIdx>0){ liveFocusIdx--; focusAnimDir="l"; refreshFocusRegion(); } },
  focusNext(){ if(S.draft && liveFocusIdx<S.draft.exos.length-1){ liveFocusIdx++; focusAnimDir="r"; refreshFocusRegion(); } },
  focusJump(d){ const ni=+d.idx; focusAnimDir = ni>liveFocusIdx?"r":ni<liveFocusIdx?"l":null; liveFocusIdx=ni; refreshFocusRegion(); },
  jumpFromOverview(d){ const ni=+d.idx; focusAnimDir = ni>liveFocusIdx?"r":ni<liveFocusIdx?"l":null; liveFocusIdx=ni; closeSheet(); refreshFocusRegion(); },

  openOverview(){ openSheet(`<div class="sheet-hd"><span class="t">Séance complète</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div><div class="sheet-body">${overviewBodyHTML()}</div>`); },
  removeExoOverview(d){
    S.draft.exos.splice(+d.idx,1);
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
  // un changement se reporte sur les séries suivantes non validées qui avaient la même valeur
  stepReps(d){
    const ex = S.draft.exos[+d.exi], st = ex.sets[+d.si], old = st.reps;
    const v = Math.max(0,(old||0)+parseInt(d.d,10));
    ex.sets.forEach((s,i)=>{ if(i>=+d.si && !s.done && s.reps===old) s.reps = v; });
    st.reps = v;
    save(); refreshFocusRegion();
  },
  stepWeight(d){
    const ex = S.draft.exos[+d.exi], def = EXO_MAP[ex.exoId], st = ex.sets[+d.si], old = st.weight;
    const v = stepWeightValue(def, old||0, parseInt(d.d,10));
    ex.sets.forEach((s,i)=>{ if(i>=+d.si && !s.done && s.weight===old) s.weight = v; });
    st.weight = v;
    save(); refreshFocusRegion();
  },
  editVal(d){
    const ex = S.draft.exos[+d.exi], st = ex.sets[+d.si], isW = d.f==="weight";
    promptNumber({ title: isW?"Charge de la série":"Répétitions", value: isW?st.weight:st.reps, unit: isW?"kg":"reps", step: isW?"0.5":"1",
      onOk: v=>{
        // la nouvelle valeur s'applique aussi aux séries suivantes non validées
        ex.sets.forEach((s,i)=>{ if(i>=+d.si && !s.done){ if(isW) s.weight = round1(v); else s.reps = Math.round(v); } });
        save(); refreshFocusRegion();
      }});
  },
  validateSet(d){
    const exi = +d.exi;
    const ex = S.draft.exos[exi], def = EXO_MAP[ex.exoId];
    const si = ex.sets.findIndex(s=>!s.done);
    if(si<0) return;
    const st = ex.sets[si];
    const [bx,by] = centerOf(".validate");
    // record : meilleur que l'historique ET que les séries déjà validées aujourd'hui
    const prevToday = ex.sets.filter(s=>s.done);
    const bestTodayW = Math.max(0,...prevToday.map(s=>s.weight||0));
    const best1rmToday = Math.max(0,...prevToday.map(s=>estimated1RM(s.weight,s.reps)));
    const w = st.weight||0, r = st.reps||0;
    const beatsToday = w>bestTodayW || estimated1RM(w,r)>best1rmToday+0.01;
    if((w||r) && beatsToday && isNewPR(ex.exoId, w, r)){
      st.pr = true;
      S.meta.prCount = (S.meta.prCount||0)+1;
      toast("💥 Nouveau record sur "+def.n+" !");
      confettiBurst(bx, by, 60);
    }
    st.done = true;
    if(navigator.vibrate) try{ navigator.vibrate(18); }catch(e){}
    justDone = { exi, si };
    const exoFinished = !ex.sets.some(s=>!s.done);
    startRestTimer(def.restSec, def.n, exi);
    if(exoFinished){
      if(!st.pr) confettiBurst(bx, by, 36);
      if(exi<S.draft.exos.length-1){ liveFocusIdx = exi+1; focusAnimDir="r"; }
    }
    save();
    refreshFocusRegion();
  },

  showExoInfo(d){
    const e = EXO_MAP[d.id];
    const pr = exoPRs(e.id), last = lastPerformance(e.id);
    const inCustom = S.custom.exos.some(x=>x.exoId===e.id);
    const stats = pr.count ? `<div class="stat-strip" style="margin-top:14px">
        <div class="stat-box"><div class="num">${pr.count}</div><div class="lbl">séance${pr.count>1?"s":""}</div></div>
        <div class="stat-box"><div class="num">${pr.maxWeight?pr.maxWeight+" kg":"–"}</div><div class="lbl">record charge</div></div>
        <div class="stat-box"><div class="num">${last?fmtRelative(last.session.date):"–"}</div><div class="lbl">dernière fois</div></div>
      </div>` : "";
    openSheet(`<div class="sheet-hd"><span class="t">Technique</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
      <div class="sheet-body">
      <div class="exo-hero"><div class="ico">${PATTERN_EMOJI[e.pattern]||"💪"}</div><div class="nm">${esc(e.n)}</div></div>
      <div class="exo-muscle-chips">${e.muscles.map((m,i)=>`<span class="chip ${i===0?"on":""}">${MUSCLE_MAP[m].n}</span>`).join("")}</div>
      ${stats}
      <h2 class="sh">Exécution</h2>
      <div class="cue-list">${e.cues.map((c,i)=>`<div class="cue-item" style="animation-delay:${i*0.07}s"><div class="cue-num">${i+1}</div><div class="cue-txt">${esc(c)}</div></div>`).join("")}</div>
      <div class="safety-box"><div class="lbl">Sécurité</div><div class="txt">${esc(e.safety)}</div></div>
      <p class="hr-note" style="margin:10px 20px 0">Repos conseillé : ${e.restSec} s · ${e.sets} × ${e.repsMin}-${e.repsMax}</p>
      ${!S.draft||!S.draft.startedAt ? `<div class="btnrow"><button class="btn secondary" data-a="addToCustom" data-id="${e.id}" ${inCustom?"disabled":""}>${inCustom?"Déjà dans Ma séance":"Ajouter à Ma séance"}</button></div>`:""}
      </div>`);
  },
  addToCustom(d){
    if(S.custom.exos.some(x=>x.exoId===d.id)) return;
    S.custom.exos.push({ exoId:d.id, sets:EXO_MAP[d.id].sets });
    save(); closeSheet(); changed(); toast("Ajouté à Ma séance");
  },

  finishSession(){
    const all = S.draft.exos.reduce((t,e)=>t+e.sets.length,0);
    const done = S.draft.exos.reduce((t,e)=>t+e.sets.filter(s=>s.done).length,0);
    if(!done){
      confirmSheet({ title:"Aucune série validée", html:"Il n'y a rien à enregistrer. Abandonner la séance ?", ok:"Abandonner", danger:true,
        onOk:()=>{ S.draft=null; liveFocusIdx=0; stopRestTimer(); save(); renderViewAnimated("today"); } });
    } else if(done<all){
      confirmSheet({ title:"Terminer la séance ?", html:`${all-done} série${all-done>1?"s":""} non validée${all-done>1?"s":""} ne ser${all-done>1?"ont":"a"} pas enregistrée${all-done>1?"s":""}.`, ok:"Terminer", onOk:finalizeSession });
    } else finalizeSession();
  },
  abandonSession(){
    confirmSheet({ title:"Abandonner la séance ?", html:"La progression de cette séance sera perdue.", ok:"Abandonner", danger:true,
      onOk:()=>{ S.draft=null; liveFocusIdx=0; stopRestTimer(); save(); renderViewAnimated("today"); } });
  },
});
VIEWS.today = renderToday;
