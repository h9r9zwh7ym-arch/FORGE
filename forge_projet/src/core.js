// ================= ÉTAT & STOCKAGE =================
const STORAGE_KEY = "forge.v1";

function defaultState(){
  return {
    v:1,
    equipment: defaultEquipment(),
    prefs: { excluded:[], included:[] },
    goals: { overall:"hypertrophie", emphasis:{}, daysPerWeek:3, sessionLength:"moyen" },
    sessions: [],
    draft: null,
    importedProgram: [],
    trophies: {},
    settings: { theme:"auto", unit:"kg", onboarded:false, restSoundOff:false },
    meta: { createdAt: new Date().toISOString(), prCount:0 },
  };
}

let S = load();

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const d = defaultState();
    // fusion superficielle pour tolérer l'ajout de nouveaux champs entre versions
    const merged = Object.assign({}, d, parsed);
    merged.equipment = Object.assign({}, d.equipment, parsed.equipment||{});
    merged.equipment.owned = Object.assign({}, d.equipment.owned, (parsed.equipment||{}).owned||{});
    merged.equipment.weights = Object.assign({}, d.equipment.weights, (parsed.equipment||{}).weights||{});
    merged.prefs = Object.assign({}, d.prefs, parsed.prefs||{});
    merged.goals = Object.assign({}, d.goals, parsed.goals||{});
    merged.settings = Object.assign({}, d.settings, parsed.settings||{});
    merged.meta = Object.assign({}, d.meta, parsed.meta||{});
    merged.sessions = parsed.sessions||[];
    merged.trophies = parsed.trophies||{};
    merged.importedProgram = parsed.importedProgram||[];
    return merged;
  }catch(e){ return defaultState(); }
}

let saveTimer=null;
function save(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); }catch(e){}
}

// ---------- utilitaires ----------
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function clone(x){ return JSON.parse(JSON.stringify(x)); }
function round1(x){ return Math.round(x*10)/10; }

function parseISO(s){ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
function daysBetween(a,b){ return Math.round((parseISO(b)-parseISO(a))/86400000); }
function weekKey(iso){
  const d = parseISO(iso);
  const day = (d.getDay()+6)%7; // lundi=0
  d.setDate(d.getDate()-day);
  return d.toISOString().slice(0,10);
}
const MOIS = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const JOURS = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
function fmtDate(iso, opt){
  const d = parseISO(iso);
  if(opt==="long") return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
  return `${d.getDate()} ${MOIS[d.getMonth()]}`;
}
function fmtRelative(iso){
  const n = daysBetween(iso, todayISO());
  if(n===0) return "aujourd'hui";
  if(n===1) return "hier";
  if(n<7) return `il y a ${n} j`;
  if(n<14) return "il y a 1 sem.";
  if(n<31) return `il y a ${Math.floor(n/7)} sem.`;
  return fmtDate(iso);
}

// ---------- exercices disponibles ----------
function isExcluded(id){ return S.prefs.excluded.includes(id); }
function isIncluded(id){ return S.prefs.included.includes(id); }
function availableExos(){
  return EXOS.filter(e=>hasEquip(S.equipment, e.equip) && !isExcluded(e.id));
}
function allEquipOwned(){
  return EQUIP_TYPES.filter(e=>e.always || S.equipment.owned[e.id]).map(e=>e.id);
}

// ---------- historique : agrégats ----------
function lastPerformance(exoId){
  for(let i=S.sessions.length-1;i>=0;i--){
    const s = S.sessions[i];
    const ex = s.exos.find(x=>x.exoId===exoId);
    if(ex && ex.sets.some(st=>st.done)) return {session:s, exo:ex};
  }
  return null;
}
function daysSinceTrained(muscleId){
  for(let i=S.sessions.length-1;i>=0;i--){
    const s = S.sessions[i];
    const trained = s.exos.some(ex=>{
      const def = EXO_MAP[ex.exoId];
      return def && def.muscles.includes(muscleId) && ex.sets.some(st=>st.done);
    });
    if(trained) return daysBetween(s.date, todayISO());
  }
  return 999;
}
function setVolume(st){ return (st.done? (st.reps||0)*(st.weight||0) : 0); }
function sessionVolume(s){
  return s.exos.reduce((t,ex)=>t+ex.sets.reduce((tt,st)=>tt+setVolume(st),0),0);
}
function sessionSetCount(s){
  return s.exos.reduce((t,ex)=>t+ex.sets.filter(st=>st.done).length,0);
}
function totalVolumeAllTime(){
  return S.sessions.reduce((t,s)=>t+sessionVolume(s),0);
}
function estimated1RM(weight,reps){
  if(!weight||!reps) return weight||0;
  return weight*(1+reps/30); // formule d'Epley
}
function exoPRs(exoId){
  let maxWeight=0, maxVolumeSession=0, best1rm=0;
  S.sessions.forEach(s=>{
    const ex = s.exos.find(x=>x.exoId===exoId);
    if(!ex) return;
    let vol=0;
    ex.sets.forEach(st=>{
      if(!st.done) return;
      vol += (st.reps||0)*(st.weight||0);
      if((st.weight||0)>maxWeight) maxWeight=st.weight;
      const e = estimated1RM(st.weight,st.reps);
      if(e>best1rm) best1rm=e;
    });
    if(vol>maxVolumeSession) maxVolumeSession=vol;
  });
  return { maxWeight, maxVolumeSession, best1rm:round1(best1rm) };
}
function isNewPR(exoId, weight, reps){
  const pr = exoPRs(exoId);
  return weight>pr.maxWeight || estimated1RM(weight,reps)>pr.best1rm;
}

// semaines consécutives avec au moins une séance
function currentStreakWeeks(){
  if(!S.sessions.length) return 0;
  const weeks = new Set(S.sessions.map(s=>weekKey(s.date)));
  let streak=0;
  let cursor = weekKey(todayISO());
  while(weeks.has(cursor)){
    streak++;
    const d = parseISO(cursor); d.setDate(d.getDate()-7);
    cursor = d.toISOString().slice(0,10);
  }
  // tolère la semaine en cours pas encore entamée : ne casse pas si la dernière séance date de la semaine passée uniquement
  if(streak===0){
    const d = parseISO(weekKey(todayISO())); d.setDate(d.getDate()-7);
    const prevWeek = d.toISOString().slice(0,10);
    if(weeks.has(prevWeek)){
      let s=1, c=prevWeek;
      while(true){
        const dd = parseISO(c); dd.setDate(dd.getDate()-7);
        c = dd.toISOString().slice(0,10);
        if(weeks.has(c)) s++; else break;
      }
      return 0; // la semaine en cours n'a rien : le streak est rompu pour "actuel", affiché séparément si besoin
    }
  }
  return streak;
}
function sessionsInMonth(){
  const now=new Date(); const ym = now.toISOString().slice(0,7);
  return S.sessions.filter(s=>s.date.slice(0,7)===ym).length;
}
function sessionsInYear(){
  const y = new Date().getFullYear().toString();
  return S.sessions.filter(s=>s.date.slice(0,4)===y).length;
}
function sessionsThisWeek(){
  const wk = weekKey(todayISO());
  return S.sessions.filter(s=>weekKey(s.date)===wk).length;
}
function weeklyAverage(weeks){
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-weeks*7);
  const n = S.sessions.filter(s=>parseISO(s.date)>=cutoff).length;
  return round1(n/weeks);
}
