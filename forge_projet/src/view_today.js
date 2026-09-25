// ================= VUE : AUJOURD'HUI =================
// Avant la séance : deux sections — « Proposée » (moteur, avec choix du type de séance)
// et « Ma séance » (composée par l'utilisateur, avec modèles réutilisables).
// Pendant la séance : mode focus, un exercice à la fois.

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
  const mode = S.settings.todayTab==="proposal" ? "proposal" : "custom";
  return `<div class="navbar"><div class="nb-title">Aujourd'hui</div></div><div class="content">
    <div class="eyebrow">${fmtDate(todayISO(),"long")}</div>
    <h1 class="lt">Aujourd'hui</h1>
    ${motivRowHTML()}
    ${doneTodayHTML()}
    ${segHTML("today", [["custom","Ma séance"],["proposal","Proposée par l'app"]], mode, "todayMode")}
    <div class="seg-pane">${mode==="custom" ? customPaneHTML() : proposalPaneHTML(draft)}</div>
  </div>`;
}

let freshIds = new Set(); // exercices qui viennent d'être ajoutés : animation d'apparition
function exoRowHTML(def, sub, i, actions, app){
  const fresh = freshIds.has(def.id);
  return `<div class="row stagger ${fresh?"fresh":""}" style="--i:${Math.min(i+2,14)}">
    <button class="row-main" data-a="showExoInfo" data-id="${def.id}" aria-label="${esc(def.n)} : voir la fiche">
      ${exoIcon(def)}
      <div class="grow"><div class="t">${esc(def.n)}${app?' <span class="app-badge" title="Ajouté par l\'app">✨</span>':""}</div><div class="s">${sub}</div></div>
      <span class="info-dot" aria-hidden="true">i</span>
    </button>${actions}
  </div>`;
}
function catLabel(def){ const c = EXO_CATS.find(c=>c.id===exoCategory(def)); return c ? c.n : ""; }

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

// ---------- séances enregistrées & planning ----------
function uiState(){ return S.settings.ui || (S.settings.ui = { planOpen:true, tplOpen:true }); }
let openTpls = new Set();   // séances enregistrées dépliées
let showAllTpls = false;
let reorderMode = false;

function tplRegion(t){
  const c = {};
  t.exos.forEach(e=>{ const d=EXO_MAP[e.exoId]; if(d) c[regionOf(d)]=(c[regionOf(d)]||0)+e.sets; });
  return Object.keys(c).sort((a,b)=>c[b]-c[a])[0] || "core";
}
function tplMinutes(t){ return estimateMinutes({ exos:t.exos.map(e=>({ exoId:e.exoId, sets:new Array(e.sets).fill(0) })) }); }
function daysLabel(days){ return days.slice().sort().map(d=>JOURS_COURTS[d]).join(" · "); }
// prochaine séance planifiée après aujourd'hui (sur 7 jours)
function nextPlanned(){
  for(let k=1;k<=7;k++){
    const iso = addDaysISO(todayISO(), k), t = plannedTemplate(iso);
    if(t) return { iso, t, k };
  }
  return null;
}

function sectionHead(title, key, extra){
  const open = uiState()[key];
  return `<button class="sec-h" data-a="toggleSection" data-k="${key}" aria-expanded="${open}">
    <span>${title}</span>${extra||""}<span class="sec-chev ${open?"open":""}">${icon("chev")}</span>
  </button>`;
}

function weekPlanHTML(){
  const today = todayISO(), monday = weekKey(today);
  const doneDays = new Set(S.sessions.map(s=>s.date));
  const nxt = nextPlanned();
  const open = uiState().planOpen;
  const todayT = plannedTemplate();
  const summary = todayT ? `Aujourd'hui : ${esc(todayT.n)}` : nxt ? `Prochaine : ${JOURS_COURTS[weekdayIdx(nxt.iso)].toLowerCase()}. · ${esc(nxt.t.n)}` : (S.templates.length ? "Aucun jour planifié" : "");
  return `<div class="week-plan stagger" style="--i:0">
    ${sectionHead("Mon planning", "planOpen", summary?`<span class="sec-sum">${summary}</span>`:"")}
    ${open ? `<div class="wp-days">${JOURS_COURTS.map((j,i)=>{
      const iso = addDaysISO(monday,i);
      const t = S.templates.find(t=>(t.days||[]).includes(i));
      const done = doneDays.has(iso), missed = t && iso<today && !done;
      return `<button class="wp-day ${iso===today?"today":""} ${t?"has r-"+tplRegion(t):""} ${done?"done":""} ${missed?"missed":""}" data-a="planDay" data-d="${i}" aria-label="${JOURS[(i+1)%7]} ${parseISO(iso).getDate()} : ${t?esc(t.n):"rien de prévu"}${done?", séance faite":""}${missed?", séance manquée":""}">
        <span class="wp-j">${j}</span><span class="wp-n">${parseISO(iso).getDate()}</span>
        <span class="wp-t">${t?esc(t.n):"—"}</span>
        ${done?`<span class="wp-check">${icon("check")}</span>`:missed?`<span class="wp-miss" title="Séance prévue non faite"></span>`:""}
      </button>`;
    }).join("")}</div>
    <div class="wp-foot">${S.templates.length ? "Touche un jour pour y placer une séance enregistrée." : "Enregistre une séance, puis place-la sur un ou plusieurs jours."}</div>` : ""}
  </div>`;
}

function tplCardHTML(t, i){
  const open = openTpls.has(t.id), region = tplRegion(t), loaded = S.custom.tplId===t.id;
  const sets = t.exos.reduce((a,e)=>a+e.sets,0);
  const list = open ? `<div class="tc-list">${t.exos.map(e=>{ const d=EXO_MAP[e.exoId]; return d?`<button class="tc-exo" data-a="showExoInfo" data-id="${d.id}">${exoIcon(d,"sm")}<span class="tc-n">${esc(d.n)}</span><span class="tc-s">${e.sets}×</span></button>`:""; }).join("")}</div>
    <div class="tc-actions">
      <button class="btn sm" data-a="startTemplate" data-id="${t.id}">${icon("play")} Commencer</button>
      <button class="btn secondary sm" data-a="loadTemplate" data-id="${t.id}">${icon("edit")} Modifier</button>
      <button class="btn secondary sm icon-only" aria-label="Plus d'options" data-a="templateMenu" data-id="${t.id}">•••</button>
    </div>` : "";
  return `<div class="tpl-card2 r-${region} ${open?"open":""} ${loaded?"loaded":""} stagger" style="--i:${Math.min(i+1,10)}">
    <button class="tc-head" data-a="toggleTpl" data-id="${t.id}" aria-expanded="${open}">
      <span class="tc-bar"></span>
      <span class="tc-main">
        <span class="tc-name">${esc(t.n)}${loaded?' <span class="tc-tag">chargée</span>':""}</span>
        <span class="tc-meta">${t.exos.length} exercice${t.exos.length>1?"s":""} · ${sets} séries · ≈ ${tplMinutes(t)} min</span>
        <span class="tc-days">${(t.days||[]).length ? (t.days||[]).slice().sort().map(d=>`<span>${JOURS_COURTS[d]}</span>`).join("") : `<em>pas de jour fixe</em>`}</span>
      </span>
      <span class="tc-picts">${t.exos.slice(0,3).map(e=>EXO_MAP[e.exoId]?exoIcon(EXO_MAP[e.exoId],"xs"):"").join("")}</span>
      <span class="sec-chev ${open?"open":""}">${icon("chev")}</span>
    </button>
    ${list}
  </div>`;
}

function templatesHTML(){
  if(!S.templates.length) return "";
  const open = uiState().tplOpen;
  const list = showAllTpls ? S.templates : S.templates.slice(0,3);
  const hidden = S.templates.length - list.length;
  return `<div class="tpl-section">
    ${sectionHead(`Mes séances enregistrées <span class="sec-count">${S.templates.length}</span>`, "tplOpen")}
    ${open ? `<div class="tpl-list">${list.map(tplCardHTML).join("")}</div>
      ${hidden>0 ? `<button class="show-more" data-a="tplShowAll">Afficher les ${hidden} autre${hidden>1?"s":""} ${icon("chev")}</button>`
        : S.templates.length>3 ? `<button class="show-more up" data-a="tplShowAll">Afficher moins ${icon("chev")}</button>` : ""}` : ""}
  </div>`;
}

function customPaneHTML(){
  const c = S.custom.exos;
  const planned = plannedTemplate();
  const doneToday = planned && sessionsToday().some(s=>s.tplId===planned.id);
  const plannedBanner = planned && !doneToday ? `<div class="plan-banner r-${tplRegion(planned)} stagger" style="--i:1">
      <span class="pb-ico">📌</span>
      <div class="grow"><div class="pb-t">Prévu aujourd'hui</div><div class="pb-s">${esc(planned.n)} · ${planned.exos.length} exercices · ≈ ${tplMinutes(planned)} min</div></div>
      <button class="pb-go" data-a="startTemplate" data-id="${planned.id}" aria-label="Commencer ${esc(planned.n)}">${icon("play")}</button>
    </div>` : "";
  const head = weekPlanHTML() + plannedBanner + templatesHTML();
  if(!c.length){
    return `${head}<div class="builder-empty stagger" style="--i:2">
      <div class="be-ico">✍️</div>
      <div class="be-t">Compose ta séance</div>
      <div class="be-s">Choisis tes exercices, ou laisse l'app te proposer une base. Forge calcule les charges à partir de ton historique.</div>
      <button class="btn" data-a="customAddOpen">${icon("plus")} Choisir des exercices</button>
      <button class="btn secondary" style="margin-top:8px" data-a="customFill">✨ Laisser l'app choisir</button>
      <button class="btn ghost sm" style="margin-top:6px" data-a="customFromProposal">Partir de la séance proposée</button>
    </div>`;
  }
  const rows = c.map((e,i)=>{
    const def = EXO_MAP[e.exoId]; if(!def) return "";
    const actions = reorderMode
      ? `<div class="mini-step order"><button aria-label="Monter" data-a="customMove" data-idx="${i}" data-d="-1" ${i===0?"disabled":""}>↑</button><button aria-label="Descendre" data-a="customMove" data-idx="${i}" data-d="1" ${i===c.length-1?"disabled":""}>↓</button></div>`
      : `<div class="mini-step">
        <button aria-label="Moins de séries" data-a="customSets" data-idx="${i}" data-d="-1">−</button><span>${e.sets}×</span><button aria-label="Plus de séries" data-a="customSets" data-idx="${i}" data-d="1">+</button>
      </div>
      <button class="icon-btn" aria-label="Retirer" data-a="customRemove" data-idx="${i}">${icon("close")}</button>`;
    return exoRowHTML(def, `${catLabel(def)} · ${MUSCLE_MAP[def.muscles[0]].n}`, i, actions, e.app);
  }).join("");
  freshIds = new Set();
  const sets = c.reduce((t,e)=>t+e.sets,0);
  const preview = { exos: c.map(e=>({ exoId:e.exoId, sets:new Array(e.sets).fill(0) })) };
  const regions = {}; c.forEach(e=>{ const d=EXO_MAP[e.exoId]; if(d) regions[regionOf(d)]=(regions[regionOf(d)]||0)+e.sets; });
  const balance = Object.keys(REGIONS).filter(r=>regions[r]).map(r=>`<span class="rb r-${r}" style="flex:${regions[r]}" title="${REGIONS[r].n} : ${regions[r]} séries"></span>`).join("");
  return `${head}
    <h2 class="sh">${esc(S.custom.name||"Ma séance")}<span class="sh-actions">${c.length>1?`<button class="more" data-a="toggleReorder">${reorderMode?"Terminé":"Réorganiser"}</button>`:""}<button class="more" data-a="customClear">Vider</button></span></h2>
    <div class="sh-sub">${c.length} exercice${c.length>1?"s":""} · ${sets} séries · ≈ ${estimateMinutes(preview)} min</div>
    <div class="region-bar" aria-hidden="true">${balance}</div>
    <div class="region-legend">${Object.keys(REGIONS).filter(r=>regions[r]).map(r=>`<span><i class="r-${r}"></i>${REGIONS[r].n}</span>`).join("")}</div>
    <div class="group builder ${reorderMode?"reorder":""}">${rows}</div>
    <div class="btnrow">
      <button class="btn secondary sm" data-a="customAddOpen">${icon("plus")} Ajouter</button>
      <button class="btn secondary sm" data-a="customFill">✨ Compléter</button>
      <button class="btn secondary sm" data-a="saveTemplateOpen">${icon("bookmark")} ${S.custom.tplId?"Mettre à jour":"Enregistrer"}</button>
    </div>
    <div class="btnrow"><button class="btn big" data-a="startCustom">${icon("play")} Commencer ma séance</button></div>`;
}

// ---------- sélecteur d'exercices (recherche, filtre musculaire, multi-sélection) ----------
let picker = null;
function openPicker(opts){
  picker = Object.assign({ multi:false, selected:[], exclude:new Set(), q:"", muscle:null, cat:null }, opts);
  renderPickerSheet();
}
function renderPickerSheet(){
  const owned = new Set(availableExos().map(exoCategory));
  const cats = [["","Tout le matériel"]].concat(EXO_CATS.filter(c=>owned.has(c.id)).map(c=>[c.id, c.em+" "+c.n])).map(([id,n])=>`<button class="chip cat ${(picker.cat||"")===id?"on":""}" data-a="pickerCat" data-v="${id}">${esc(n)}</button>`).join("");
  const chips = [["","Tous les muscles"]].concat(MUSCLES.map(m=>[m.id,m.n])).map(([id,n])=>`<button class="chip ${(picker.muscle||"")===id?"on":""}" data-a="pickerMuscle" data-v="${id}">${esc(n)}</button>`).join("");
  openSheet(`<div class="sheet-hd"><span class="t">${esc(picker.title)}</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
    <div class="picker-top">
      <label class="search">${icon("search")}<input id="pickerSearch" type="search" placeholder="Rechercher un exercice" autocomplete="off"></label>
      <div class="chip-scroll" id="pickerCats">${cats}</div>
      <div class="chip-scroll" id="pickerChips" style="margin-top:8px">${chips}</div>
    </div>
    <div class="sheet-body" id="pickerList">${pickerListHTML()}</div>`,
    { tall:true, footer: picker.multi ? `<button class="btn" id="pickerDone" data-a="pickerDone" disabled>Ajouter</button>` : null });
  const inp = qs("#pickerSearch");
  if(inp){ inp.value = picker.q; inp.addEventListener("input", ()=>{ picker.q = inp.value; qs("#pickerList").innerHTML = pickerListHTML(); }); }
  refreshPickerFooter();
}
function pickerListHTML(){
  const q = normName(picker.q);
  const muscleOrder = {}; MUSCLES.forEach((m,i)=>muscleOrder[m.id]=i);
  const pool = availableExos().filter(e=>!picker.exclude.has(e.id)
    && (!picker.muscle || e.muscles.includes(picker.muscle))
    && (!picker.cat || exoCategory(e)===picker.cat)
    && (!q || normName(e.n).includes(q) || e.muscles.some(m=>normName(MUSCLE_MAP[m].n).includes(q))));
  if(!pool.length) return `<div class="empty-state"><span class="em">🔍</span>Aucun exercice ne correspond.</div>`;
  return EXO_CATS.map(c=>{
    const list = pool.filter(e=>exoCategory(e)===c.id).sort((a,b)=>muscleOrder[a.muscles[0]]-muscleOrder[b.muscles[0]] || a.n.localeCompare(b.n,"fr"));
    if(!list.length) return "";
    let lastM = null;
    return `<div class="pick-h"><span>${c.em}</span> ${esc(c.n)} <span class="pick-n">${list.length}</span></div><div class="group">${list.map(e=>{
      const on = picker.selected.includes(e.id);
      const m = e.muscles[0], sub = m!==lastM ? `<div class="pick-m">${esc(MUSCLE_MAP[m].n)}</div>` : ""; lastM = m;
      return `${sub}<div class="row pick-row ${on?"on":""}" data-id="${e.id}">
        <button class="row-main" data-a="pickerTap" data-id="${e.id}">
          ${exoIcon(e)}
          <div class="grow"><div class="t">${esc(e.n)}</div><div class="s">${musclesLabel(e)}${e.equip.includes("bench")?" · banc":""}</div></div>
        </button>
        <button class="info-btn" aria-label="Fiche de ${esc(e.n)}" data-a="pickerInfo" data-id="${e.id}">i</button>
        ${picker.multi?`<button class="pick-check" aria-label="Sélectionner" data-a="pickerTap" data-id="${e.id}">${on?icon("check"):""}</button>`:""}
      </div>`;
    }).join("")}</div>`;
  }).join("");
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
    <div class="live-strip" id="liveStrip">${liveStripHTML(draft)}</div>
    <div id="focusRegion">${renderFocusRegionInner(draft)}</div>
    <div class="btnrow"><button class="btn" data-a="finishSession">Terminer la séance</button></div>
  </div>`;
}
function liveStripHTML(draft){
  const idx = Math.min(liveFocusIdx, draft.exos.length-1);
  const doneExos = draft.exos.filter(e=>e.sets.every(s=>s.done)).length;
  const left = draft.exos.reduce((t,e)=>t+e.sets.filter(s=>!s.done).length,0);
  const leftMin = Math.round(draft.exos.reduce((t,e)=>{ const d=EXO_MAP[e.exoId]; return t + e.sets.filter(s=>!s.done).length*(40+(d?d.restSec:60)); },0)/60);
  const chips = draft.exos.map((e,i)=>{
    const def = EXO_MAP[e.exoId], n = e.sets.length, d = e.sets.filter(s=>s.done).length;
    const cls = i===idx ? "current" : d===n ? "done" : d ? "started" : "";
    return `<button class="ls-chip ${cls}" data-a="focusJump" data-idx="${i}" aria-label="${esc(def.n)} : ${d} sur ${n} séries">
      <span class="ls-ring r-${regionOf(def)}" style="--p:${Math.round(d/n*100)}"><span>${d===n?icon("check"):pictoSVG(pictoKey(def))}</span></span>
      <span class="ls-name">${esc(def.n)}</span>
      <span class="ls-sets">${d}/${n}</span>
    </button>`;
  }).join("");
  return `<div class="ls-sum"><span><b>${doneExos}/${draft.exos.length}</b> exercices</span><span><b>${left}</b> série${left>1?"s":""} restante${left>1?"s":""}</span>${left?`<span>≈ ${leftMin} min</span>`:""}</div>
    <div class="ls-chips" id="lsChips">${chips}</div>`;
}
function centerStripChip(smooth){
  const strip = qs("#lsChips"), c = strip && qs(".ls-chip.current", strip);
  if(!c) return;
  strip.scrollTo({ left: c.offsetLeft - strip.clientWidth/2 + c.offsetWidth/2, behavior: smooth?"smooth":"auto" });
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
  const finishedCount = draft.exos.filter(e=>e.sets.every(s=>s.done)).length;
  const nav = `<div class="focus-nav">
    <button class="navbtn" aria-label="Exercice précédent" data-a="focusPrev" ${idx===0?"disabled":""} style="transform:scaleX(-1)">${icon("chev")}</button>
    <button class="center-link" data-a="openOverview">Voir la séance (${finishedCount}/${draft.exos.length})</button>
    <button class="navbtn" aria-label="Exercice suivant" data-a="focusNext" ${idx===draft.exos.length-1?"disabled":""}>${icon("chev")}</button>
  </div>`;
  return `${renderFocusCard(idx, ex, def)}${nav}<div class="swipe-hint">Glisse la carte pour changer d'exercice</div>`;
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
  const header = `<button class="fc-info" aria-label="Fiche de l'exercice" data-a="showExoInfo" data-id="${def.id}">i</button>
    <div class="fc-icon">${exoIcon(def,"lg")}</div>
    <div class="fc-name">${esc(def.n)}</div>
    <div class="fc-sub"><button data-a="showExoInfo" data-id="${def.id}">${musclesLabel(def)} · <u>technique</u></button></div>`;
  const setDots = si => `<div class="set-dots">${ex.sets.map((s,i)=>`<span class="sd ${s.done?"done":i===si?"current":""} ${i===jd?"just":""} ${s.pr?"pr":""}"></span>`).join("")}</div>`;

  if(resting){
    const remain = Math.max(0, Math.round((restState.endAt-Date.now())/1000));
    const next = ex.sets.find(s=>!s.done);
    return `<div class="focus-card r-${regionOf(def)} ${animClass}">${header}
      ${setDots(-1)}
      <div class="fc-phase">Repos</div>
      ${ringSVG(remain, restState.totalSec)}
      ${next?`<div class="fc-next">Ensuite : ${next.reps} reps${next.weight?" × "+next.weight+" kg":""}</div>`:""}
      <div class="ring-adjust"><button data-a="restAdjust" data-d="-15">−15 s</button><button data-a="restAdjust" data-d="15">+15 s</button><button class="skip" data-a="restSkip">Passer</button></div>
    </div>`;
  }

  if(allDone){
    const recap = ex.sets.map(s=>`<span class="chip ${s.pr?"pr":""}">${s.pr?"💥 ":""}${s.reps||"?"}${s.weight!=null?" × "+s.weight+" kg":""}</span>`).join("");
    return `<div class="focus-card r-${regionOf(def)} ${animClass}">${header}
      <div class="fc-done-badge">${icon("check")}</div>
      <div class="fc-recap">${recap}</div>
      <div class="fc-quiet"><button data-a="swapExoOpen" data-idx="${idx}">Remplacer</button><button data-a="addSetFocus" data-exi="${idx}">+ série</button></div>
    </div>`;
  }

  const si = ex.sets.findIndex(s=>!s.done);
  const st = ex.sets[si];
  const hasWeight = !!loadableTypeOf(def);
  const unit = isTimed(def) ? "Secondes" : "Répétitions";
  return `<div class="focus-card r-${regionOf(def)} ${animClass}">${header}
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
  const strip = qs("#liveStrip");
  if(strip){ const sl = (qs("#lsChips")||{}).scrollLeft||0; strip.innerHTML = liveStripHTML(S.draft); qs("#lsChips").scrollLeft = sl; centerStripChip(true); }
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
        ${allDone?`<span class="xico done">${icon("check")}</span>`:exoIcon(def)}
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
  S.sessions.push(compactSession(clone(draft)));
  if(draft.source==="imported" && S.importedProgram.length) S.importedProgram.shift();
  S.draft = null;
  liveFocusIdx = 0;
  stopRestTimer();
  const ups = checkMedals();
  const xpAfter = totalXP();
  save();
  scrollTodayTop();
  renderViewAnimated("today");
  showCelebration(draft, ups, xpBefore, xpAfter);
}

// changer d'écran (aperçu ↔ séance en cours) repart du haut de la page
function scrollTodayTop(){ const v = qs("#v-today"); if(v) v.scrollTop = 0; }
function centerOf(sel){
  const el = qs(sel); if(!el) return [null,null];
  const r = el.getBoundingClientRect();
  return [r.left+r.width/2, r.top+r.height/2];
}

// ---------- planning : séances enregistrées assignées à des jours ----------
function openTemplateModal(name, days, id){
  openModal(`<div style="font-weight:700;font-size:calc(17rem/17);margin-bottom:4px">${id?"Séance enregistrée":"Enregistrer ma séance"}</div>
    <div class="hr-note" style="margin:0 0 12px">Choisis les jours où tu veux la faire : elle s'affichera directement ces jours-là à l'ouverture de l'app.</div>
    <div class="num-field"><input id="tplName" type="text" maxlength="40" placeholder="Ex. Haut du corps A" value="${esc(name)}"></div>
    <div class="tpl-daypick">${JOURS_COURTS.map((j,i)=>`<button class="${days.includes(i)||(!id&&(S.custom.pendingDays||[]).includes(i))?"on":""}" data-a="tplDayToggle" data-d="${i}">${j}</button>`).join("")}</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
      <button class="btn" data-a="saveTemplateOk" ${id?`data-id="${id}"`:""} ${id&&S.custom.tplId!==id?'data-edit="1"':""}>Enregistrer</button>
      <button class="btn ghost" data-a="closesheet" style="height:40px">Annuler</button>
    </div>`);
}
function openPlanDaySheet(day){
  const cur = S.templates.find(t=>(t.days||[]).includes(day));
  const label = JOURS[(day+1)%7];
  const rows = S.templates.map(t=>`<button class="row tap" data-a="planSet" data-d="${day}" data-id="${t.id}">
      <div class="ico" style="background:${cur&&cur.id===t.id?"var(--green)":"var(--tint)"}">${cur&&cur.id===t.id?icon("check"):"📋"}</div>
      <div class="grow"><div class="t">${esc(t.n)}</div><div class="s">${t.exos.length} exercices · ${t.exos.reduce((a,e)=>a+e.sets,0)} séries</div></div>
    </button>`).join("");
  openSheet(`<div class="sheet-hd"><span class="t">Le ${label}</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
    <div class="sheet-body">
      ${S.templates.length ? `<p class="body" style="margin-bottom:12px">Quelle séance enregistrée veux-tu faire chaque ${label} ?</p><div class="group">${rows}</div>
        ${cur?`<div class="btnrow"><button class="btn ghost" data-a="planSet" data-d="${day}">Ne rien prévoir le ${label}</button></div>`:""}`
      : `<div class="empty-state" style="padding:24px 20px"><span class="em">📋</span>Tu n'as pas encore de séance enregistrée.</div>`}
      <div class="btnrow"><button class="btn ${S.templates.length?"secondary":""}" data-a="planNew" data-d="${day}">${icon("plus")} Composer une nouvelle séance pour le ${label}</button></div>
    </div>`);
}
// À l'ouverture (et quand on planifie le jour même) : charge la séance prévue aujourd'hui dans « Ma séance »
function applyPlannedSession(force){
  if(S.draft && S.draft.startedAt) return false;
  const t = plannedTemplate();
  if(!t) return false;
  if(!force && S.custom.planDate===todayISO()) return false; // déjà chargée aujourd'hui (et peut-être modifiée)
  if(sessionsToday().some(s=>s.tplId===t.id)) return false;
  S.custom = { exos: clone(t.exos), name: t.n, tplId: t.id, planDate: todayISO() };
  S.settings.todayTab = "custom";
  save();
  return true;
}

// ---------- glisser la carte pour changer d'exercice ----------
let swipe = null;
let suppressClicksUntil = 0;
document.addEventListener("pointerdown", e=>{
  const card = e.target.closest && e.target.closest(".focus-card");
  if(!card || !S.draft || !S.draft.startedAt || (e.pointerType==="mouse" && e.button!==0)) return;
  swipe = { card, x:e.clientX, y:e.clientY, dx:0, active:false, id:e.pointerId, t:performance.now() };
});
document.addEventListener("pointermove", e=>{
  if(!swipe || e.pointerId!==swipe.id) return;
  const dx = e.clientX-swipe.x, dy = e.clientY-swipe.y;
  if(!swipe.active){
    if(Math.abs(dx)>10 && Math.abs(dx)>Math.abs(dy)*1.3){ swipe.active = true; swipe.card.classList.add("dragging"); }
    else { if(Math.abs(dy)>10) swipe = null; return; }
  }
  const n = S.draft.exos.length;
  const edge = (liveFocusIdx===0 && dx>0) || (liveFocusIdx===n-1 && dx<0);
  swipe.dx = edge ? dx*0.25 : dx;
  swipe.card.style.transform = `translateX(${swipe.dx}px) rotate(${swipe.dx/45}deg)`;
});
function endSwipe(e){
  if(!swipe || e.pointerId!==swipe.id) return;
  const s = swipe; swipe = null;
  if(!s.active) return;
  suppressClicksUntil = Date.now()+350;
  const v = s.dx/Math.max(1, performance.now()-s.t), n = S.draft.exos.length;
  const go = (s.dx<-70 || v<-0.6) && liveFocusIdx<n-1 ? 1 : (s.dx>70 || v>0.6) && liveFocusIdx>0 ? -1 : 0;
  s.card.classList.remove("dragging");
  if(go){
    s.card.classList.add(go>0?"fly-l":"fly-r");
    if(navigator.vibrate) try{ navigator.vibrate(8); }catch(err){}
    setTimeout(()=>{ liveFocusIdx += go; focusAnimDir = go>0?"r":"l"; refreshFocusRegion(); }, 170);
  } else {
    s.card.classList.add("snap");
    s.card.style.transform = "";
    setTimeout(()=>s.card.classList.remove("snap"), 350);
  }
}
document.addEventListener("pointerup", endSwipe);
document.addEventListener("pointercancel", endSwipe);

Object.assign(ACT, {
  todayMode(d){ S.settings.todayTab = d.v; save(); renderViewAnimated("today"); },
  pickerCat(d){
    picker.cat = d.v || null;
    qsa("#pickerCats .chip").forEach(c=>c.classList.toggle("on", c.dataset.v===(d.v||"")));
    qs("#pickerList").innerHTML = pickerListHTML();
    qs("#pickerList").scrollTop = 0;
  },
  customFill(){
    const have = S.custom.exos.map(e=>e.exoId);
    const target = SESSION_SIZE[S.goals.sessionLength]||6;
    const n = Math.max(have.length ? 1 : 3, target-have.length);
    const add = suggestComplement(have, Math.min(n, 4));
    if(!add.length){ toast("Aucun exercice disponible avec ton matériel"); return; }
    add.forEach(e=>{ S.custom.exos.push({ exoId:e.id, sets:e.sets, app:true }); freshIds.add(e.id); });
    save(); changed();
    toast(`✨ ${add.length} exercice${add.length>1?"s":""} ajouté${add.length>1?"s":""} par l'app`);
  },
  planDay(d){ openPlanDaySheet(+d.d); },
  planSet(d){
    const day = +d.d;
    S.templates.forEach(t=>{ t.days = (t.days||[]).filter(x=>x!==day); });
    if(d.id){ const t = S.templates.find(x=>x.id===d.id); if(t) t.days.push(day); }
    save(); closeSheet(); changed();
    if(day===weekdayIdx(todayISO())) applyPlannedSession(true);
    toast(d.id ? `Planifié le ${JOURS[(day+1)%7]}` : "Jour libéré");
  },
  templateMenu(d){
    const t = S.templates.find(x=>x.id===d.id); if(!t) return;
    openModal(`<div class="tm-head r-${tplRegion(t)}"><span class="tc-bar"></span><div><div style="font-weight:700;font-size:calc(17rem/17)">${esc(t.n)}</div>
      <div class="hr-note" style="margin:2px 0 0">${t.exos.length} exercices · ${(t.days||[]).length?daysLabel(t.days):"aucun jour fixe"}</div></div></div>
      <div class="menu-list">
        <button data-a="startTemplate" data-id="${t.id}">${icon("play")}<span>Commencer maintenant</span></button>
        <button data-a="loadTemplate" data-id="${t.id}">${icon("edit")}<span>Modifier les exercices</span></button>
        <button data-a="editTemplateDays" data-id="${t.id}">${icon("clock")}<span>Jours et nom</span></button>
        <button data-a="duplicateTemplate" data-id="${t.id}">${icon("bookmark")}<span>Dupliquer</span></button>
        <button class="danger" data-a="deleteTemplate" data-id="${t.id}">${icon("trash")}<span>Supprimer</span></button>
      </div>
      <button class="btn ghost" style="height:40px;margin-top:6px" data-a="closesheet">Fermer</button>`);
  },
  toggleSection(d){ const u = uiState(); u[d.k] = !u[d.k]; save(); changed(); },
  toggleTpl(d){ if(openTpls.has(d.id)) openTpls.delete(d.id); else openTpls.add(d.id); changed(); },
  tplShowAll(){ showAllTpls = !showAllTpls; changed(); },
  toggleReorder(){ reorderMode = !reorderMode; changed(); },
  customMove(d){
    const i = +d.idx, j = i+parseInt(d.d,10), a = S.custom.exos;
    if(j<0 || j>=a.length) return;
    [a[i],a[j]] = [a[j],a[i]];
    freshIds.add(a[j].exoId);
    save(); changed();
  },
  startTemplate(d){
    const t = S.templates.find(x=>x.id===d.id); if(!t) return;
    S.custom = { exos: clone(t.exos), name: t.n, tplId: t.id, planDate: todayISO() };
    closeSheet();
    ACT.startCustom();
  },
  duplicateTemplate(d){
    const t = S.templates.find(x=>x.id===d.id); if(!t) return;
    const copy = { id:uid(), n:`${t.n} (copie)`, days:[], exos:clone(t.exos) };
    S.templates.splice(S.templates.indexOf(t)+1, 0, copy);
    openTpls.add(copy.id);
    closeSheet(); save(); changed(); toast("Séance dupliquée");
  },
  planNew(d){
    S.custom = { exos:[], pendingDays:[+d.d] };
    S.settings.todayTab = "custom";
    closeSheet(); save(); renderViewAnimated("today");
    setTimeout(()=>ACT.customAddOpen(), 380);
  },
  pickerInfo(d){ ACT.showExoInfo({ id:d.id, back:"1" }); },
  backToPicker(){ if(picker) renderPickerSheet(); },
  swapFromInfo(d){
    const idx = +d.idx;
    S.draft.exos[idx] = sessionEntryFor(EXO_MAP[d.id]);
    liveFocusIdx = idx; focusAnimDir = "r";
    closeSheet(); save(); refreshFocusRegion();
    toast(`Remplacé par ${EXO_MAP[d.id].n}`);
  },
  editTemplateDays(d){ const t = S.templates.find(x=>x.id===d.id); if(t) openTemplateModal(t.n, t.days||[], t.id); },
  tplDayToggle(d, el){ el.classList.toggle("on"); },
  setType(d){ regenerateDraft(d.v); renderViewAnimated("today"); },
  startSession(){ S.draft.startedAt = new Date().toISOString(); liveFocusIdx = 0; save(); scrollTodayTop(); renderViewAnimated("today"); },
  regenSession(){ regenerateDraft(); renderViewAnimated("today"); toast("Nouvelle proposition"); },
  dropImported(){
    confirmSheet({ title:"Revenir à la suggestion automatique ?", html:"Le programme importé restera disponible pour une prochaine séance.", ok:"Revenir à l'auto", onOk:()=>{ S.draft = generateEngineSession(); liveFocusIdx=0; save(); renderViewAnimated("today"); } });
  },
  removeExo(d, el){
    const row = el && !S.draft.startedAt && el.closest(".row");
    const go = ()=>{
      S.draft.exos.splice(+d.idx,1);
      if(liveFocusIdx>=S.draft.exos.length) liveFocusIdx = Math.max(0,S.draft.exos.length-1);
      changed();
    };
    if(row){ row.classList.add("leaving"); setTimeout(go, 220); } else go();
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
    if(row){ row.classList.toggle("on", i<0); const c = qs(".pick-check",row); if(c) c.innerHTML = i<0 ? icon("check") : ""; }
    if(navigator.vibrate) try{ navigator.vibrate(6); }catch(e){}
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
      ids.forEach(id=>{ S.custom.exos.push({ exoId:id, sets:EXO_MAP[id].sets }); freshIds.add(id); });
      closeSheet(); save(); changed();
    }});
  },
  customFromProposal(){
    const d = getOrCreateDraft();
    S.custom = { exos: d.exos.map(e=>({ exoId:e.exoId, sets:e.sets.length, app:true })), name:null };
    save(); renderViewAnimated("today"); toast("Séance proposée copiée : modifie-la à ton goût");
  },
  customSets(d){
    const e = S.custom.exos[+d.idx];
    e.sets = Math.max(1, Math.min(10, e.sets+parseInt(d.d,10)));
    changed();
  },
  customRemove(d, el){
    const row = el.closest(".row");
    const go = ()=>{ S.custom.exos.splice(+d.idx,1); changed(); };
    if(row){ row.classList.add("leaving"); setTimeout(go, 220); } else go();
  },
  customClear(){
    confirmSheet({ title:"Vider ma séance ?", html:"Les exercices choisis seront retirés. Tes séances enregistrées ne changent pas.", ok:"Vider", danger:true,
      onOk:()=>{ S.custom = { exos:[] }; save(); renderViewAnimated("today"); } });
  },
  startCustom(){
    if(!S.custom.exos.length) return;
    S.draft = buildCustomSession(S.custom.exos, S.custom.name);
    const planned = plannedTemplate();
    if(S.custom.tplId){ S.draft.tplId = S.custom.tplId; S.draft.planned = !!planned && planned.id===S.custom.tplId; }
    S.draft.startedAt = new Date().toISOString();
    liveFocusIdx = 0;
    save(); scrollTodayTop(); renderViewAnimated("today");
  },
  saveTemplateOpen(){
    const t = S.custom.tplId && S.templates.find(x=>x.id===S.custom.tplId);
    openTemplateModal(S.custom.name||"", t ? (t.days||[]) : [], t ? t.id : null);
  },
  saveTemplateOk(d){
    const name = ((qs("#tplName")||{}).value||"").trim() || `Séance ${S.templates.length+1}`;
    const days = qsa(".tpl-daypick .on").map(b=>+b.dataset.d);
    const editOnly = d.edit==="1";
    let t = d.id ? S.templates.find(x=>x.id===d.id) : S.templates.find(x=>x.n.toLowerCase()===name.toLowerCase());
    // un jour de la semaine ne porte qu'une seule séance
    S.templates.forEach(x=>{ if(x!==t) x.days = (x.days||[]).filter(k=>!days.includes(k)); });
    if(t){ t.n = name; t.days = days; if(!editOnly) t.exos = clone(S.custom.exos.map(e=>({ exoId:e.exoId, sets:e.sets }))); }
    else { t = { id:uid(), n:name, days, exos:clone(S.custom.exos.map(e=>({ exoId:e.exoId, sets:e.sets }))) }; S.templates.push(t); }
    if(!editOnly || S.custom.tplId===t.id){ S.custom.name = name; S.custom.tplId = t.id; }
    delete S.custom.pendingDays;
    openTpls.add(t.id);
    closeSheet(); save(); changed();
    toast(days.length ? `« ${name} » enregistrée pour le ${days.slice().sort().map(k=>JOURS[(k+1)%7]).join(", ")}` : `« ${name} » enregistrée`);
  },
  loadTemplate(d){
    const t = S.templates.find(x=>x.id===d.id); if(!t) return;
    S.custom = { exos: clone(t.exos), name: t.n, tplId: t.id };
    t.exos.forEach(e=>freshIds.add(e.exoId));
    closeSheet(); save(); renderViewAnimated("today"); toast(`« ${t.n} » chargée dans Ma séance`);
    setTimeout(()=>{ const g = qs("#v-today .group.builder"); if(g) g.scrollIntoView({ behavior:"smooth", block:"center" }); }, 260);
  },
  deleteTemplate(d){
    const t = S.templates.find(x=>x.id===d.id); if(!t) return;
    confirmSheet({ title:`Supprimer « ${t.n} » ?`, html:"La séance enregistrée et ses jours de planning seront supprimés.", ok:"Supprimer", danger:true, onOk:()=>{
      S.templates = S.templates.filter(x=>x.id!==d.id);
      if(S.custom.tplId===d.id) delete S.custom.tplId;
      save(); changed();
    } });
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
    const e = EXO_MAP[d.id], region = regionOf(e);
    const pr = exoPRs(e.id), last = lastPerformance(e.id);
    const live = S.draft && S.draft.startedAt;
    const inCustom = S.custom.exos.some(x=>x.exoId===e.id);
    const cat = EXO_CATS.find(c=>c.id===exoCategory(e));
    const stats = pr.count ? `<div class="stat-strip" style="margin-top:14px">
        <div class="stat-box"><div class="num">${pr.count}</div><div class="lbl">séance${pr.count>1?"s":""}</div></div>
        <div class="stat-box"><div class="num">${pr.maxWeight?fmtDec(pr.maxWeight)+" kg":"–"}</div><div class="lbl">record charge</div></div>
        <div class="stat-box"><div class="num">${last?fmtRelative(last.session.date):"–"}</div><div class="lbl">dernière fois</div></div>
      </div>` : `<div class="first-time">Tu n'as encore jamais fait cet exercice : commence léger pour prendre tes repères.</div>`;
    const similar = availableExos().filter(x=>x.id!==e.id && x.muscles[0]===e.muscles[0]).slice(0,4);
    const liveIdx = live ? S.draft.exos.findIndex(x=>x.exoId===e.id) : -1;
    const simHTML = similar.length ? `<h2 class="sh">Même muscle principal</h2><div class="group">${similar.map(x=>`<div class="row">
        <button class="row-main" data-a="showExoInfo" data-id="${x.id}">${exoIcon(x)}<div class="grow"><div class="t">${esc(x.n)}</div><div class="s">${catLabel(x)}</div></div><span class="info-dot">i</span></button>
        ${liveIdx>=0 ? `<button class="chip" data-a="swapFromInfo" data-idx="${liveIdx}" data-id="${x.id}">Remplacer</button>` : !live && !S.custom.exos.some(c=>c.exoId===x.id) ? `<button class="chip" data-a="addToCustom" data-id="${x.id}">+ Ajouter</button>` : ""}
      </div>`).join("")}</div>` : "";
    const back = picker && d.back ? `<button class="btn secondary" data-a="backToPicker">${icon("chev")} Retour à la liste</button>` : "";
    openSheet(`<div class="sheet-hd"><span class="t">Fiche exercice</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
      <div class="sheet-body">
      <div class="exo-hero r-${region}">
        ${exoIcon(e,"xl")}
        <div class="nm">${esc(e.n)}</div>
        <div class="exo-tags"><span class="rtag r-${region}">${REGIONS[region].n}</span><span class="etag">${cat.em} ${esc(cat.n)}</span>${e.equip.includes("bench")?`<span class="etag">+ banc</span>`:""}</div>
      </div>
      <div class="exo-muscle-chips">${e.muscles.map((m,i)=>`<span class="chip ${i===0?"on":""}">${i===0?"Principal : ":""}${MUSCLE_MAP[m].n}</span>`).join("")}</div>
      ${stats}
      <div class="exo-facts">
        <div><b>${e.sets} × ${e.repsMin}-${e.repsMax}</b><span>${isTimed(e)?"secondes":"répétitions"} conseillées</span></div>
        <div><b>${e.restSec} s</b><span>de repos</span></div>
        <div><b>${e.uni?"Unilatéral":"Bilatéral"}</b><span>${e.uni?"un côté à la fois":"les deux côtés"}</span></div>
      </div>
      <h2 class="sh">Exécution</h2>
      <div class="cue-list">${e.cues.map((c,i)=>`<div class="cue-item" style="animation-delay:${i*0.07}s"><div class="cue-num">${i+1}</div><div class="cue-txt">${esc(c)}</div></div>`).join("")}</div>
      <div class="safety-box"><div class="lbl">Sécurité</div><div class="txt">${esc(e.safety)}</div></div>
      ${simHTML}
      <div class="btnrow col">
        ${back}
        ${pr.count ? `<button class="btn secondary" data-a="openExoChart" data-id="${e.id}">Voir ma progression</button>` : ""}
        ${!live ? `<button class="btn ${inCustom?"secondary":""}" data-a="addToCustom" data-id="${e.id}" ${inCustom?"disabled":""}>${inCustom?"Déjà dans Ma séance":"Ajouter à Ma séance"}</button>` : ""}
      </div>
      </div>`);
  },
  addToCustom(d){
    if(S.custom.exos.some(x=>x.exoId===d.id)) return;
    S.custom.exos.push({ exoId:d.id, sets:EXO_MAP[d.id].sets });
    freshIds.add(d.id);
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
