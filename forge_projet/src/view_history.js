// ================= VUE : HISTORIQUE =================
const FEELING_EMOJI = {1:"😣",2:"😕",3:"🙂",4:"💪",5:"🔥"};

function renderHistory(){
  const sessions = S.sessions.slice().reverse();
  if(!sessions.length){
    return `<div class="navbar"><div class="nb-title">Historique</div></div><div class="content">
      <h1 class="lt">Historique</h1>
      <div class="empty-state"><span class="em">📋</span>Aucune séance enregistrée pour l'instant.<br>Termine ta première séance pour la voir ici.</div>
    </div>`;
  }
  let lastMonth=null, html="";
  sessions.forEach(s=>{
    const d = parseISO(s.date);
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
    if(monthKey!==lastMonth){
      html += `<h2 class="sh">${MOIS[d.getMonth()]} ${d.getFullYear()}</h2><div class="group">`;
      if(lastMonth!==null) html = html.replace(/<div class="group">$/,'</div><div class="group">');
      lastMonth = monthKey;
    }
    const vol = sessionVolume(s), sets = sessionSetCount(s);
    html += `<button class="row tap" style="width:100%" data-a="openSessionDetail" data-id="${s.id}">
      <div class="ico" style="background:var(--tint)">${FEELING_EMOJI[s.feeling]||"🏋️"}</div>
      <div class="grow"><div class="t">${esc(fmtDate(s.date,"long"))}</div><div class="s">${s.exos.length} exercices · ${sets} séries · ${Math.round(vol)} kg déplacés</div></div>
      <div class="val">${s.durationSec?fmtDuration(s.durationSec):""}</div><span class="chev">${icon("chev")}</span>
    </button>`;
  });
  html += "</div>";
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
      <div class="s">${sets.map(st=>`${st.reps||"?"}${st.weight!=null?" × "+st.weight+" kg":""}`).join(" · ")}</div></div>
    </div>`;
  }).join("");
  return `<div class="sheet-hd"><span class="t">${esc(fmtDate(s.date,"long"))}</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
    <div class="sheet-body">
    <div class="stat-strip">
      <div class="stat-box"><div class="num">${s.durationSec?fmtDuration(s.durationSec):"–"}</div><div class="lbl">Durée</div></div>
      <div class="stat-box"><div class="num">${Math.round(sessionVolume(s))}</div><div class="lbl">kg déplacés</div></div>
      <div class="stat-box"><div class="num">${FEELING_EMOJI[s.feeling]||"–"}</div><div class="lbl">Ressenti</div></div>
    </div>
    <div class="group" style="margin-top:14px">${rows||'<div style="padding:16px" class="s">Aucune série complétée.</div>'}</div>
    </div>`;
}

Object.assign(ACT, {
  openSessionDetail(d){
    const s = S.sessions.find(x=>x.id===d.id);
    if(s) openSheet(sessionDetailHTML(s));
  },
});
VIEWS.history = renderHistory;
