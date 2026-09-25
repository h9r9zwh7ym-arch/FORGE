// ================= GAMIFICATION =================
function maxStreakWeeksEver(){
  if(!S.sessions.length) return 0;
  const weeks = Array.from(new Set(S.sessions.map(s=>weekKey(s.date)))).sort();
  let best=1, cur=1;
  for(let i=1;i<weeks.length;i++){
    const d = parseISO(weeks[i-1]); d.setDate(d.getDate()+7);
    const expected = d.toISOString().slice(0,10);
    if(expected===weeks[i]) cur++; else cur=1;
    if(cur>best) best=cur;
  }
  return best;
}
function masteredExosCount(){
  const counts = {};
  S.sessions.forEach(s=>s.exos.forEach(ex=>{
    if(ex.sets.some(st=>st.done)) counts[ex.exoId]=(counts[ex.exoId]||0)+1;
  }));
  return Object.values(counts).filter(c=>c>=8).length;
}

const TROPHIES = [
  { id:"first_session", n:"Premier forgeage", em:"🔥", desc:"Termine ta première séance.", cond:()=>S.sessions.length>=1 },
  { id:"sessions_10",  n:"Sur la lancée",  em:"🏗️", desc:"10 séances complétées.", cond:()=>S.sessions.length>=10 },
  { id:"sessions_50",  n:"Habitué·e de la forge", em:"⚒️", desc:"50 séances complétées.", cond:()=>S.sessions.length>=50 },
  { id:"sessions_100", n:"Forgeron·ne", em:"🛠️", desc:"100 séances complétées.", cond:()=>S.sessions.length>=100 },
  { id:"streak_4",  n:"Régularité",     em:"📅", desc:"4 semaines d'affilée avec au moins une séance.", cond:()=>maxStreakWeeksEver()>=4 },
  { id:"streak_12", n:"Rythme de croisière", em:"🗓️", desc:"12 semaines d'affilée.", cond:()=>maxStreakWeeksEver()>=12 },
  { id:"streak_26", n:"Acier trempé",   em:"⚙️", desc:"26 semaines d'affilée.", cond:()=>maxStreakWeeksEver()>=26 },
  { id:"pr_first",  n:"Nouveau record", em:"💥", desc:"Bats ton premier record personnel.", cond:()=>(S.meta.prCount||0)>=1 },
  { id:"pr_10",     n:"Chasseur·euse de records", em:"🏆", desc:"10 records personnels battus.", cond:()=>(S.meta.prCount||0)>=10 },
  { id:"volume_1000",  n:"Premiers coups de marteau", em:"🔨", desc:"1000 kg cumulés soulevés.", cond:()=>totalVolumeAllTime()>=1000 },
  { id:"volume_10000", n:"Poids lourd",  em:"🪨", desc:"10 000 kg cumulés soulevés.", cond:()=>totalVolumeAllTime()>=10000 },
  { id:"volume_50000", n:"Force de la forge", em:"⛰️", desc:"50 000 kg cumulés soulevés.", cond:()=>totalVolumeAllTime()>=50000 },
  { id:"mastery_1",  n:"Exercice maîtrisé", em:"🎯", desc:"Un exercice pratiqué 8 fois ou plus.", cond:()=>masteredExosCount()>=1 },
  { id:"mastery_5",  n:"Panoplie complète", em:"🧰", desc:"5 exercices maîtrisés.", cond:()=>masteredExosCount()>=5 },
  { id:"mastery_10", n:"Polyvalence totale", em:"⭐", desc:"10 exercices maîtrisés.", cond:()=>masteredExosCount()>=10 },
];
const TROPHY_MAP = {}; TROPHIES.forEach(t=>TROPHY_MAP[t.id]=t);

function checkTrophies(){
  const unlocked = [];
  TROPHIES.forEach(t=>{
    if(!S.trophies[t.id] && t.cond()){
      S.trophies[t.id] = new Date().toISOString();
      unlocked.push(t);
    }
  });
  if(unlocked.length) save();
  return unlocked;
}

function showCelebration(session, newTrophies){
  const vol = Math.round(sessionVolume(session));
  const sets = sessionSetCount(session);
  const troHTML = newTrophies.length ? `<h2 class="sh" style="margin-top:22px">Trophée${newTrophies.length>1?"s":""} débloqué${newTrophies.length>1?"s":""}</h2>
    <div class="tro-grid">${newTrophies.map(t=>`<div class="tro on"><div class="em">${t.em}</div><div class="tn">${esc(t.n)}</div></div>`).join("")}</div>` : "";
  openModal(`<div class="celebrate-ring">${icon("check")}</div>
    <div style="font-weight:700;font-size:calc(19rem/17)">Séance terminée !</div>
    <div style="color:var(--label2);font-size:calc(14.5rem/17);margin-top:4px">${fmtDuration(session.durationSec)} · ${sets} séries · ${vol} kg déplacés</div>
    <button class="btn" style="margin-top:18px" data-a="closesheet">Continuer</button>`);
  if(newTrophies.length){
    setTimeout(()=>{
      qs(".center-modal").insertAdjacentHTML("beforeend", troHTML);
    }, 50);
  }
}
