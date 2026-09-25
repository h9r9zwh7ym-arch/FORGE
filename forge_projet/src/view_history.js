// ================= VUE : HISTORIQUE =================
function sessionTitle(s){
  if(s.name) return s.name;
  if(s.source==="custom") return "Ma séance";
  if(s.source==="imported") return "Programme importé";
  const t = SESSION_TYPE_MAP[s.resolvedType||s.type];
  return t ? t.n : "Séance";
}
function sessionEmoji(s){
  if(s.source==="custom") return "✍️";
  if(s.source==="imported") return "🤖";
  const t = SESSION_TYPE_MAP[s.resolvedType||s.type];
  return t && t.id!=="auto" ? t.em : "🏋️";
}

function renderHistory(){
  const sessions = S.sessions.slice().reverse();
  if(!sessions.length){
    return `<div class="navbar"><div class="nb-title">Historique</div></div><div class="content">
      <h1 class="lt">Historique</h1>
      <div class="empty-state"><span class="em">📋</span>Aucune séance enregistrée pour l'instant.<br>Termine ta première séance pour la voir ici.</div>
    </div>`;
  }
  const months = [];
  sessions.forEach(s=>{
    const key = s.date.slice(0,7);
    let m = months[months.length-1];
    if(!m || m.key!==key){ m = { key, list:[] }; months.push(m); }
    m.list.push(s);
  });
  let i = 0;
  const html = months.map(m=>{
    const d = parseISO(m.key+"-01");
    const vol = m.list.reduce((t,s)=>t+sessionVolume(s),0);
    const rows = m.list.map(s=>{
      const prs = sessionPRCount(s);
      return `<button class="row tap stagger" style="--i:${Math.min(i++,12)}" data-a="openSessionDetail" data-id="${s.id}">
        <div class="ico" style="background:var(--tint)">${sessionEmoji(s)}</div>
        <div class="grow"><div class="t">${esc(sessionTitle(s))}${prs?` <span class="pr-badge">💥 ${prs}</span>`:""}</div>
        <div class="s">${esc(fmtDate(s.date,"long"))} · ${sessionSetCount(s)} séries · ${fmtKg(sessionVolume(s))}</div></div>
        <div class="val">${s.durationSec?fmtDuration(s.durationSec):""}</div><span class="chev">${icon("chev")}</span>
      </button>`;
    }).join("");
    return `<h2 class="sh">${MOIS_LONG[d.getMonth()].replace(/^./,c=>c.toUpperCase())} ${d.getFullYear()}</h2>
      <div class="sh-sub">${m.list.length} séance${m.list.length>1?"s":""} · ${fmtKg(vol)}</div>
      <div class="group">${rows}</div>`;
  }).join("");
  return `<div class="navbar"><div class="nb-title">Historique</div></div><div class="content">
    <h1 class="lt">Historique</h1>${html}</div>`;
}

function sessionDetailHTML(s){
  const rows = s.exos.map(ex=>{
    const def = EXO_MAP[ex.exoId];
    if(!def) return "";
    const sets = ex.sets.filter(st=>st.done);
    if(!sets.length) return "";
    return `<div class="row" style="align-items:flex-start">
      <div class="ico" style="background:var(--tint)">${PATTERN_EMOJI[def.pattern]||"💪"}</div>
      <div class="grow"><div class="t">${esc(def.n)}</div>
      <div class="set-chips">${sets.map(st=>`<span class="chip ${st.pr?"pr":""}">${st.pr?"💥 ":""}${st.reps||"?"}${st.weight!=null&&st.weight!==""?" × "+st.weight+" kg":""}</span>`).join("")}</div></div>
    </div>`;
  }).join("");
  const time = s.startedAt ? new Date(s.startedAt).toLocaleTimeString("fr-CH",{hour:"2-digit",minute:"2-digit"}) : "";
  return `<div class="sheet-hd"><span class="t">${esc(sessionTitle(s))}</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
    <div class="sheet-body">
    <p class="body" style="margin-bottom:12px">${esc(fmtDate(s.date,"long"))}${time?" à "+time:""}</p>
    <div class="stat-strip">
      <div class="stat-box"><div class="num">${s.durationSec?fmtDuration(s.durationSec):"–"}</div><div class="lbl">durée</div></div>
      <div class="stat-box"><div class="num">${sessionSetCount(s)}</div><div class="lbl">séries</div></div>
      <div class="stat-box"><div class="num">${fmtKg(sessionVolume(s))}</div><div class="lbl">soulevés</div></div>
      <div class="stat-box"><div class="num">${sessionPRCount(s)}</div><div class="lbl">records</div></div>
    </div>
    <div class="group" style="margin-top:14px">${rows||'<div style="padding:16px" class="s">Aucune série complétée.</div>'}</div>
    <div class="btnrow"><button class="btn secondary" data-a="redoSession" data-id="${s.id}">${icon("repeat")} Refaire cette séance</button></div>
    <div class="btnrow"><button class="btn ghost" style="color:var(--red)" data-a="deleteSession" data-id="${s.id}">Supprimer de l'historique</button></div>
    </div>`;
}

Object.assign(ACT, {
  openSessionDetail(d){
    const s = S.sessions.find(x=>x.id===d.id);
    if(s) openSheet(sessionDetailHTML(s));
  },
  redoSession(d){
    const s = S.sessions.find(x=>x.id===d.id); if(!s) return;
    S.custom = { exos: s.exos.filter(ex=>EXO_MAP[ex.exoId]).map(ex=>({ exoId:ex.exoId, sets:Math.max(1,ex.sets.length) })), name: s.name||null };
    S.settings.todayTab = "custom";
    save(); closeSheet();
    switchTab("today");
    toast("Séance chargée dans « Ma séance »");
  },
  deleteSession(d){
    confirmSheet({ title:"Supprimer cette séance ?", html:"Elle disparaîtra de l'historique et des statistiques. Les médailles déjà obtenues sont conservées.", ok:"Supprimer", danger:true,
      onOk:()=>{ S.sessions = S.sessions.filter(x=>x.id!==d.id); save(); changed(); toast("Séance supprimée"); } });
  },
});
VIEWS.history = renderHistory;
