// ================= VUE : PROFIL =================
const GOAL_LABELS = { force:"Force", hypertrophie:"Prise de masse", endurance:"Endurance" };
const LEN_LABELS = { court:"Courte (≈20 min)", moyen:"Moyenne (≈35 min)", long:"Longue (≈50 min)" };

function ownedEquipCount(){ return EQUIP_TYPES.filter(e=>!e.always && S.equipment.owned[e.id]).length; }

function profileHeroHTML(){
  const lv = levelInfo(), name = (S.settings.name||"").trim();
  const since = firstSessionDate();
  const c = tierCounts();
  const initial = name ? name[0].toUpperCase() : "🔥";
  return `<div class="profile-hero stagger" style="--i:0">
    <button class="ph-avatar" data-a="editName" aria-label="Modifier ton prénom"><span>${esc(initial)}</span><em>${lv.level}</em></button>
    <div class="ph-main">
      <button class="ph-name" data-a="editName">${name?esc(name):"Ajoute ton prénom"} ${icon("edit")}</button>
      <div class="ph-title">Niveau ${lv.level} · ${esc(lv.title)}</div>
      <div class="xpbar"><span style="width:${Math.round(lv.pct*100)}%"></span></div>
      <div class="ph-sub">${since?`Membre actif depuis le ${fmtDate(since)} ${parseISO(since).getFullYear()}`:"Ta première séance t'attend"}</div>
    </div>
  </div>
  <div class="ph-medals stagger" style="--i:1">
    ${[1,2,3,4].map(k=>`<div><span class="pip big t${k}"></span><b data-count="${c[k]}">${c[k]}</b><small>${TIERS[k].n}</small></div>`).join("")}
  </div>`;
}
let profMoreOpen = false;
function profileStatsHTML(){
  if(!S.sessions.length) return "";
  const fav = favoriteExercise(), wd = favoriteWeekday(), moment = favoriteMoment(), bw = bestWeek();
  const avg = Math.round(totalDurationSec()/S.sessions.length);
  const rows = [
    ["🏋️","Séances terminées", fmtNum(S.sessions.length), `${sessionsInYear()} cette année`],
    ["🔥","Semaines d'affilée", currentStreakWeeks(), `record : ${maxStreakWeeksEver()}`],
    ["⭐","Exercice favori", fav?esc(fav.def.n):"–", fav?`${fav.n} séance${fav.n>1?"s":""}`:""],
    ["📆","Jour préféré", wd?JOURS[(wd.i+1)%7]:"–", moment?`plutôt ${moment}`:""],
    ["⏱️","Durée moyenne", fmtDuration(avg), `${fmtDec(totalDurationSec()/3600)} h au total`],
    ["🏆","Meilleure semaine", bw?`${bw.n} séance${bw.n>1?"s":""}`:"–", bw?`semaine du ${fmtDate(bw.wk)}`:""],
    ["🪨","Tonnage total", fmtKg(totalVolumeAllTime()), `${fmtNum(totalSets())} séries validées`],
    ["💥","Records battus", S.meta.prCount||0, `${distinctExosCount()} exercice${distinctExosCount()>1?"s":""} pratiqué${distinctExosCount()>1?"s":""}`],
  ];
  const lifts = topLifts(5);
  return `<h2 class="sh">Mes habitudes<button class="more" data-a="profMore">${profMoreOpen?"Moins":"Plus"}</button></h2>
    <div class="group habits ${profMoreOpen?"open":""}">${rows.map((r,i)=>`<div class="row stat-row stagger ${i>=4?"extra":""}" style="--i:${i+2}">
      <div class="ico" style="background:var(--fill);font-size:16px">${r[0]}</div>
      <div class="grow"><div class="t">${r[1]}</div>${r[3]?`<div class="s">${r[3]}</div>`:""}</div>
      <div class="val strong">${r[2]}</div>
    </div>`).join("")}</div>
    ${lifts.length?`<h2 class="sh">Mes records</h2><div class="group">${lifts.map((l,i)=>`<button class="row tap stagger" style="--i:${i+10}" data-a="openExoChart" data-id="${l.def.id}">
      <div class="rank">${i+1}</div>
      <div class="grow"><div class="t">${esc(l.def.n)}</div><div class="s">${l.r} ${isTimed(l.def)?"s":"reps"} · ${fmtRelative(l.date)}</div></div>
      <div class="val strong">${fmtDec(l.w)} kg</div><span class="chev">${icon("chev")}</span>
    </button>`).join("")}</div>`:""}`;
}

Object.assign(ACT, {
  profMore(d, el){
    profMoreOpen = !profMoreOpen;
    const g = qs("#v-profil .group.habits");
    if(el) el.textContent = profMoreOpen ? "Moins" : "Plus";
    if(!g) return changed();
    morphHeight(g, ()=>{ g.classList.toggle("open", profMoreOpen); g.classList.remove("clp-in"); if(profMoreOpen){ void g.offsetWidth; g.classList.add("clp-in"); } });
  },
});
function renderProfil(){
  return `<div class="navbar"><div class="nb-title">Profil</div></div><div class="content">
    <h1 class="lt">Profil</h1>
    ${profileHeroHTML()}
    ${profileStatsHTML()}

    <h2 class="sh">Entraînement</h2>
    <div class="group">
      <button class="row tap" style="width:100%" data-a="openEquip">
        <div class="ico" style="background:var(--tint)">🧰</div>
        <div class="grow"><div class="t">Matériel</div><div class="s">${ownedEquipCount()} équipement${ownedEquipCount()>1?"s":""} renseigné${ownedEquipCount()>1?"s":""}</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
      <button class="row tap" style="width:100%" data-a="openGoals">
        <div class="ico" style="background:var(--tint)">🎯</div>
        <div class="grow"><div class="t">Objectifs</div><div class="s">${GOAL_LABELS[S.goals.overall]} · ${S.goals.daysPerWeek}×/sem.</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
      <button class="row tap" style="width:100%" data-a="openExoPrefs">
        <div class="ico" style="background:var(--tint)">📋</div>
        <div class="grow"><div class="t">Exercices inclus / exclus</div><div class="s">${S.prefs.excluded.length} exclu${S.prefs.excluded.length>1?"s":""} · ${S.prefs.included.length} privilégié${S.prefs.included.length>1?"s":""}</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
    </div>

    <h2 class="sh">Suggestion par IA externe</h2>
    <div class="group">
      <button class="row tap" style="width:100%" data-a="openExportImport">
        <div class="ico" style="background:var(--tint)">🤖</div>
        <div class="grow"><div class="t">Exporter / importer un programme</div><div class="s">${S.importedProgram.length? S.importedProgram.length+" séance(s) importée(s) en attente" : "Aucun programme importé"}</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
    </div>

    <h2 class="sh">Réglages</h2>
    <div class="group">
      <button class="row tap" style="width:100%" data-a="openAppearance">
        <div class="ico" style="background:var(--tint)">🌗</div>
        <div class="grow"><div class="t">Apparence</div><div class="s">${S.settings.theme==="auto"?"Automatique":S.settings.theme==="dark"?"Sombre":"Clair"}</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
      <div class="row">
        <div class="ico" style="background:var(--blue)">🔊</div>
        <div class="grow"><div class="t">Sons</div><div class="s">Retours sonores pendant la séance</div></div>
        <button class="switch ${S.settings.sound!==false?"on":""}" aria-label="Sons" data-a="toggleSound"></button>
      </div>
      <button class="row tap" style="width:100%" data-a="confirmReset">
        <div class="ico" style="background:var(--red)">🗑️</div>
        <div class="grow"><div class="t">Réinitialiser toutes les données</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
      <button class="row tap" style="width:100%" data-a="openAbout">
        <div class="ico" style="background:var(--tint)">ℹ️</div>
        <div class="grow"><div class="t">À propos</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
    </div>
    <p class="hr-note" style="margin:16px 20px 40px">Forge v${APP_VERSION} — toutes les données restent stockées localement sur cet appareil.</p>
  </div>`;
}

// ---------- Matériel ----------
function equipBodyHTML(){
  const rows = EQUIP_TYPES.filter(e=>!e.always).map(e=>{
    const on = S.equipment.owned[e.id];
    return `<div class="row">
      <div class="ico" style="background:var(--fill);color:inherit;font-size:16px">${e.em}</div>
      <div class="grow"><div class="t">${esc(e.n)}</div></div>
      <button class="switch ${on?"on":""}" data-a="toggleEquip" data-id="${e.id}"></button>
    </div>`;
  }).join("");
  const weightEditors = EQUIP_TYPES.filter(e=>e.loadable && S.equipment.owned[e.id]).map(e=>{
    const list = (S.equipment.weights[e.id]||[]).slice().sort((a,b)=>a-b);
    const chips = list.map(w=>`<span class="chip on">${w} ${e.unit} <button data-a="removeWeight" data-id="${e.id}" data-w="${w}" style="margin-left:4px">${icon("close")}</button></span>`).join("");
    return `<div class="card" style="margin-top:12px">
      <div style="font-weight:700;margin-bottom:2px">${esc(e.n)}</div>
      <div class="hr-note" style="margin:0 0 10px">${esc(e.hint||"")}</div>
      <div class="chips" style="padding:0 0 10px">${chips||'<span class="hr-note">Aucun poids renseigné</span>'}</div>
      <div style="display:flex;gap:8px">
        <input type="number" inputmode="decimal" placeholder="${e.unit}" id="wadd-${e.id}" style="flex:1;background:var(--fill2);border:0;border-radius:10px;padding:0 12px;height:38px">
        <button class="btn sm" data-a="addWeight" data-id="${e.id}">Ajouter</button>
      </div>
    </div>`;
  }).join("");
  const customs = S.equipment.custom.map(c=>`<div class="row"><div class="ico" style="background:var(--fill)">🔧</div><div class="grow"><div class="t">${esc(c.n)}</div></div><button class="icon-btn" data-a="removeCustom" data-id="${c.id}">${icon("close")}</button></div>`).join("");
  return `<div class="group">${rows}</div>${weightEditors}
    <h2 class="sh">Autre équipement</h2>
    <div class="hr-note" style="margin-top:-6px">Informatif — ajoute librement ce que tu possèdes (banc réglable, TRX…). N'affecte pas encore la suggestion automatique.</div>
    <div class="group" style="margin-top:10px">${customs}
      <div class="row"><input placeholder="Nom de l'équipement" id="customEquipName" style="flex:1;border:0;background:transparent;height:100%;font-size:calc(17rem/17)"><button class="btn sm" data-a="addCustomEquip">Ajouter</button></div>
    </div>`;
}
function openEquip(){
  openSheet(`<div class="sheet-hd"><span class="t">Matériel</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div><div class="sheet-body">${equipBodyHTML()}</div>`);
}
function refreshEquip(){ const b=qs(".sheet-body"); if(b) b.innerHTML = equipBodyHTML(); }

// ---------- Objectifs ----------
function goalsBodyHTML(){
  const overallChips = Object.keys(GOAL_LABELS).map(k=>`<button class="chip ${S.goals.overall===k?"on":""}" data-a="setGoalOverall" data-v="${k}">${GOAL_LABELS[k]}</button>`).join("");
  const lenChips = Object.keys(LEN_LABELS).map(k=>`<button class="chip ${S.goals.sessionLength===k?"on":""}" data-a="setSessionLength" data-v="${k}">${LEN_LABELS[k]}</button>`).join("");
  const emphasisRows = MUSCLES.filter(m=>m.id!=="cardio").map(m=>{
    const v = S.goals.emphasis[m.id]||"normal";
    return `<div class="row">
      <div class="grow t">${esc(m.n)}</div>
      <button class="chip ${v==="prioriser"?"on":""}" data-a="cycleEmphasis" data-id="${m.id}">${v==="prioriser"?"Prioriser":v==="eviter"?"À éviter":"Normal"}</button>
    </div>`;
  }).join("");
  return `<h2 class="sh" style="margin-top:6px">Objectif principal</h2><div class="chips">${overallChips}</div>
    <h2 class="sh">Fréquence visée</h2>
    <div class="field" style="padding:10px 14px"><div class="stepper">
      <button data-a="stepDays" data-d="-1">−</button><div class="val">${S.goals.daysPerWeek}×/sem.</div><button data-a="stepDays" data-d="1">+</button>
    </div></div>
    <h2 class="sh">Durée de séance</h2><div class="chips">${lenChips}</div>
    <h2 class="sh">Groupes musculaires</h2>
    <p class="hr-note" style="margin-top:-6px">Touche un groupe pour faire défiler : normal → à prioriser → à éviter.</p>
    <div class="group" style="margin-top:10px">${emphasisRows}</div>`;
}
function openGoals(){
  openSheet(`<div class="sheet-hd"><span class="t">Objectifs</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div><div class="sheet-body">${goalsBodyHTML()}</div>`);
}
function refreshGoals(){ const b=qs(".sheet-body"); if(b) b.innerHTML = goalsBodyHTML(); }

// ---------- Exercices inclus / exclus ----------
function exoPrefsBodyHTML(){
  const muscleOrder = {}; MUSCLES.forEach((m,i)=>muscleOrder[m.id]=i);
  return `<p class="hr-note" style="margin:0 20px 4px">★ = à privilégier dans les propositions · Exclure = ne jamais le proposer (blessure, goût…). Les exercices grisés demandent du matériel que tu n'as pas renseigné.</p>` +
  EXO_CATS.map(c=>{
    const list = EXOS.filter(e=>exoCategory(e)===c.id).sort((a,b)=>muscleOrder[a.muscles[0]]-muscleOrder[b.muscles[0]] || a.n.localeCompare(b.n,"fr"));
    const rows = list.map(e=>{
      const excl = isExcluded(e.id), incl = isIncluded(e.id), avail = hasEquip(S.equipment, e.equip);
      return `<div class="row ${avail?"":"unavail"}">
        <button class="row-main" data-a="showExoInfo" data-id="${e.id}" style="flex:1">${exoIcon(e)}<div class="grow"><div class="t">${esc(e.n)}</div><div class="s">${e.muscles.map(m=>MUSCLE_MAP[m].n).join(" · ")}${e.equip.includes("bench")?" · banc":""}</div></div></button>
        <button class="chip ${incl?"on":""}" aria-label="Privilégier" data-a="toggleIncluded" data-id="${e.id}">★</button>
        <button class="chip ${excl?"excl":""}" data-a="toggleExcluded" data-id="${e.id}">Exclure</button>
      </div>`;
    }).join("");
    return `<h2 class="sh">${c.em} ${esc(c.n)}<span class="more" style="color:var(--label2)">${list.length}</span></h2><div class="group">${rows}</div>`;
  }).join("");
}
const PATTERN_LABEL = { squat:"Squat", hinge:"Hanche", push:"Poussée", pull:"Tirage", lunge:"Fentes", core:"Gainage", calf:"Mollets" };
function openExoPrefs(){
  openSheet(`<div class="sheet-hd"><span class="t">Exercices</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div><div class="sheet-body">${exoPrefsBodyHTML()}</div>`);
}
function refreshExoPrefs(){ const b=qs(".sheet-body"); if(b) b.innerHTML = exoPrefsBodyHTML(); }

// ---------- Export / import IA ----------
function exportImportBodyHTML(){
  const importedRows = S.importedProgram.map((s,i)=>`<div class="row"><div class="grow t">${esc(s.nom||s.name||("Séance "+(i+1)))}</div>${i===0?'<span class="chip on">Prochaine</span>':""}</div>`).join("");
  return `<p class="body">Génère un prompt résumant ton profil (matériel, objectifs, historique) à coller dans l'IA de ton choix. Elle te répondra avec un programme au format JSON que tu peux ensuite importer ici.</p>
    <div class="btnrow" style="margin-top:16px"><button class="btn" data-a="copyPrompt">Copier le prompt</button></div>
    <div class="field" style="margin-top:12px"><textarea readonly rows="6" style="width:100%;border:0;background:transparent;font-size:calc(13rem/17);padding:10px 0;resize:vertical">${esc(buildExportPrompt())}</textarea></div>
    <div class="btnrow"><button class="btn secondary" data-a="triggerImport">Importer le fichier JSON reçu</button></div>
    ${S.importedProgram.length? `<h2 class="sh">Programme importé</h2><div class="group">${importedRows}</div><div class="btnrow"><button class="btn ghost" data-a="clearImported">Supprimer le programme importé</button></div>`:""}`;
}
function openExportImport(){
  openSheet(`<div class="sheet-hd"><span class="t">Suggestion par IA</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div><div class="sheet-body">${exportImportBodyHTML()}</div>`);
}

// ---------- Apparence ----------
function appearanceBodyHTML(){
  const opts = [["auto","Auto"],["light","Clair"],["dark","Sombre"]];
  return `<div class="chips" style="padding-top:4px">${opts.map(([v,l])=>`<button class="chip ${S.settings.theme===v?"on":""}" data-a="setTheme" data-v="${v}">${l}</button>`).join("")}</div>`;
}
function openAppearance(){
  openSheet(`<div class="sheet-hd"><span class="t">Apparence</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div><div class="sheet-body">${appearanceBodyHTML()}</div>`);
}

// ---------- À propos ----------
function openAbout(){
  openSheet(`<div class="sheet-hd"><span class="t">À propos</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
    <div class="sheet-body">
    <p class="body" style="margin-top:4px">Forge est une app de suivi de musculation pensée pour un usage solo sur iPhone. Elle propose une séance chaque jour à partir de ton matériel, de tes objectifs et de ton historique, grâce à un moteur de règles 100% local — aucune donnée n'est envoyée sur un serveur.</p>
    <h2 class="sh">Version</h2><p class="body">Forge v${APP_VERSION}</p>
    <h2 class="sh">Données</h2><p class="body">Toutes les données (séances, matériel, objectifs, trophées) restent stockées uniquement sur cet appareil, dans le stockage local du navigateur. Aucun compte, aucun serveur.</p>
    <h2 class="sh">Avertissement</h2><p class="body">Les consignes d'exécution proposées sont des repères techniques généraux. Elles ne remplacent pas l'avis d'un professionnel de santé ou d'un coach pour toute question médicale ou en cas de douleur.</p>
    <h2 class="sh">Copyright</h2><p class="body">${COPYRIGHT}</p>
    </div>`);
}

Object.assign(ACT, {
  editName(){
    openModal(`<div style="font-weight:700;font-size:calc(17rem/17);margin-bottom:12px">Ton prénom</div>
      <div class="num-field"><input id="nameInput" type="text" maxlength="30" placeholder="Prénom" value="${esc(S.settings.name||"")}"></div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
        <button class="btn" data-a="saveName">Enregistrer</button>
        <button class="btn ghost" data-a="closesheet" style="height:40px">Annuler</button>
      </div>`);
    setTimeout(()=>{ const i=qs("#nameInput"); if(i) i.focus(); }, 80);
  },
  saveName(){ S.settings.name = ((qs("#nameInput")||{}).value||"").trim(); closeSheet(); save(); changed(); },
  openEquip, openGoals, openExoPrefs, openExportImport, openAppearance, openAbout,
  toggleEquip(d){ S.equipment.owned[d.id] = !S.equipment.owned[d.id]; save(); refreshEquip(); },
  addWeight(d){
    const input = qs("#wadd-"+d.id); const v = parseFloat(input.value);
    if(!isNaN(v) && v>0){ S.equipment.weights[d.id] = Array.from(new Set([...(S.equipment.weights[d.id]||[]), v])); save(); }
    refreshEquip();
  },
  removeWeight(d){
    S.equipment.weights[d.id] = (S.equipment.weights[d.id]||[]).filter(w=>w!==parseFloat(d.w));
    save(); refreshEquip();
  },
  addCustomEquip(){
    const input = qs("#customEquipName"); const v = (input.value||"").trim();
    if(v){ S.equipment.custom.push({id:uid(),n:v}); save(); }
    refreshEquip();
  },
  removeCustom(d){ S.equipment.custom = S.equipment.custom.filter(c=>c.id!==d.id); save(); refreshEquip(); },

  setGoalOverall(d){ S.goals.overall = d.v; save(); refreshGoals(); },
  setSessionLength(d){ S.goals.sessionLength = d.v; save(); refreshGoals(); },
  stepDays(d){ S.goals.daysPerWeek = Math.max(2,Math.min(6, S.goals.daysPerWeek+parseInt(d.d,10))); save(); refreshGoals(); },
  cycleEmphasis(d){
    const cur = S.goals.emphasis[d.id]||"normal";
    S.goals.emphasis[d.id] = cur==="normal"?"prioriser":cur==="prioriser"?"eviter":"normal";
    save(); refreshGoals();
  },

  toggleExcluded(d){
    const i = S.prefs.excluded.indexOf(d.id);
    if(i>=0) S.prefs.excluded.splice(i,1); else { S.prefs.excluded.push(d.id); S.prefs.included = S.prefs.included.filter(x=>x!==d.id); }
    save(); refreshExoPrefs();
  },
  toggleIncluded(d){
    const i = S.prefs.included.indexOf(d.id);
    if(i>=0) S.prefs.included.splice(i,1); else { S.prefs.included.push(d.id); S.prefs.excluded = S.prefs.excluded.filter(x=>x!==d.id); }
    save(); refreshExoPrefs();
  },

  copyPrompt(){
    const text = buildExportPrompt();
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(()=>toast("Prompt copié !")).catch(()=>toast("Copie impossible — sélectionne le texte manuellement"));
    } else toast("Sélectionne le texte ci-dessous pour le copier");
  },
  triggerImport(){ const f = qs("#fileImport"); if(f) f.click(); },
  clearImported(){
    confirmSheet({ title:"Supprimer le programme importé ?", ok:"Supprimer", danger:true, onOk:()=>{ S.importedProgram=[]; save(); closeSheet(); changed(); } });
  },

  toggleSound(d, el){ S.settings.sound = S.settings.sound===false; save(); el.classList.toggle("on", S.settings.sound); if(S.settings.sound) sfx("set"); },
  setTheme(d){ S.settings.theme = d.v; save(); applyTheme(); const b=qs(".sheet-body"); if(b) b.innerHTML = appearanceBodyHTML(); changed(); },

  confirmReset(){
    confirmSheet({ title:"Réinitialiser toutes les données ?", html:"Cette action est irréversible : séances, matériel, objectifs et trophées seront définitivement supprimés.", ok:"Tout supprimer", danger:true,
      onOk:()=>{ persistBlocked = true; localStorage.removeItem(STORAGE_KEY); location.reload(); } });
  },
});
VIEWS.profil = renderProfil;
