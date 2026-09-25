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
    custom: { exos:[] },   // « Ma séance » : [{exoId, sets}]
    templates: [],         // modèles enregistrés : [{id, n, exos:[{exoId, sets}]}]
    importedProgram: [],
    medals: {},            // {familleId: {t: palier atteint 0-4, d: {1: iso, 2: iso…}}}
    settings: { theme:"auto", unit:"kg", todayTab:"custom", name:"" },
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
    merged.custom = Object.assign({}, d.custom, parsed.custom||{});
    merged.sessions = (parsed.sessions||[]).map(compactSession);
    merged.templates = parsed.templates||[];
    merged.medals = parsed.medals||{};
    merged.importedProgram = parsed.importedProgram||[];
    delete merged.settings.todayMode; // v1.2 : remplacé par todayTab (« Ma séance » en premier)
    delete merged.trophies; // ancien système de trophées (v1.0-1.1), remplacé par les médailles à paliers
    return merged;
  }catch(e){ return defaultState(); }
}

// ---------- sauvegarde différée + cache des statistiques ----------
// save() est appelé à chaque interaction (un appui sur +/− par exemple). Réécrire tout
// l'historique (plusieurs centaines de Ko après quelques années) à chaque fois coûtait
// ~70 ms sur téléphone : on invalide le cache tout de suite et on écrit au calme,
// avec écriture forcée quand l'app passe en arrière-plan ou se ferme.
let DATA_VER = 0;
const MEMO = new Map();
function memo(key, fn){
  const hit = MEMO.get(key);
  if(hit && hit.v===DATA_VER) return hit.r;
  const r = fn();
  MEMO.set(key, { v:DATA_VER, r });
  return r;
}
let persistTimer = null, persistBlocked = false;
// Une séance terminée n'a plus besoin des champs de travail (notes, cibles de séries,
// ressenti vide, séries non faites) : on les retire pour garder le stockage léger.
function compactSession(s){
  const out = {};
  ["id","date","source","type","resolvedType","name","tplId","planned","startedAt","completedAt","durationSec"].forEach(k=>{ if(s[k]!=null && s[k]!==false) out[k] = s[k]; });
  out.exos = (s.exos||[]).map(ex=>({
    exoId: ex.exoId,
    targetReps: ex.targetReps,
    sets: ex.sets.filter(st=>st.done).map(st=>{
      const o = { reps: st.reps, done: true };
      if(st.weight!=null) o.weight = st.weight;
      if(st.pr) o.pr = true;
      return o;
    })
  })).filter(ex=>ex.sets.length);
  return out;
}
function save(){
  DATA_VER++;
  if(persistBlocked) return;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, 400);
}
function persistNow(){
  clearTimeout(persistTimer); persistTimer = null;
  if(persistBlocked) return;
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); }catch(e){}
}
window.addEventListener("pagehide", ()=>{ if(persistTimer) persistNow(); });
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="hidden" && persistTimer) persistNow(); });

// ---------- utilitaires ----------
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function clone(x){ return JSON.parse(JSON.stringify(x)); }
function round1(x){ return Math.round(x*10)/10; }

// Dates au format AAAA-MM-JJ en heure LOCALE : toISOString() convertit en UTC et
// décale d'un jour les minuits locaux en Suisse (UTC+1/+2).
function localISO(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function todayISO(){ return localISO(new Date()); }
function parseISO(s){ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
function addDaysISO(iso,n){ const d=parseISO(iso); d.setDate(d.getDate()+n); return localISO(d); }
function daysBetween(a,b){ return Math.round((parseISO(b)-parseISO(a))/86400000); }
function weekKey(iso){
  const d = parseISO(iso);
  d.setDate(d.getDate()-(d.getDay()+6)%7); // lundi
  return localISO(d);
}
const MOIS = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const MOIS_LONG = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
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
function fmtNum(n){ return Math.round(n).toLocaleString("fr-CH"); }
function fmtDec(n){ return round1(n).toLocaleString("fr-CH"); }
function fmtKg(kg){
  if(kg>=10000) return `${round1(kg/1000).toLocaleString("fr-CH")} t`;
  return `${fmtNum(kg)} kg`;
}

// ---------- exercices disponibles ----------
function isExcluded(id){ return S.prefs.excluded.includes(id); }
function isIncluded(id){ return S.prefs.included.includes(id); }
function availableExos(){
  return EXOS.filter(e=>hasEquip(S.equipment, e.equip) && !isExcluded(e.id));
}

// ---------- historique : agrégats ----------
function lastPerformance(exoId){ return memo("lp:"+exoId, ()=>lastPerformance_raw(exoId)); }
function lastPerformance_raw(exoId){
  for(let i=S.sessions.length-1;i>=0;i--){
    const s = S.sessions[i];
    const ex = s.exos.find(x=>x.exoId===exoId);
    if(ex && ex.sets.some(st=>st.done)) return {session:s, exo:ex};
  }
  return null;
}
function daysSinceTrained(muscleId){ return memo("dst:"+muscleId+todayISO(), ()=>daysSinceTrained_raw(muscleId)); }
function daysSinceTrained_raw(muscleId){
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
function sessionReps(s){
  return s.exos.reduce((t,ex)=>t+ex.sets.filter(st=>st.done).reduce((a,st)=>a+(st.reps||0),0),0);
}
function sessionPRCount(s){
  return s.exos.reduce((t,ex)=>t+ex.sets.filter(st=>st.done&&st.pr).length,0);
}
function totalVolumeAllTime(){ return memo("totalVolumeAllTime", totalVolumeAllTime_raw); }
function totalVolumeAllTime_raw(){ return S.sessions.reduce((t,s)=>t+sessionVolume(s),0); }
function totalSets(){ return memo("totalSets", totalSets_raw); }
function totalSets_raw(){ return S.sessions.reduce((t,s)=>t+sessionSetCount(s),0); }
function totalDurationSec(){ return memo("totalDurationSec", totalDurationSec_raw); }
function totalDurationSec_raw(){ return S.sessions.reduce((t,s)=>t+(s.durationSec||0),0); }
function bestSessionVolume(){ return memo("bestSessionVolume", bestSessionVolume_raw); }
function bestSessionVolume_raw(){ return S.sessions.reduce((m,s)=>Math.max(m,sessionVolume(s)),0); }
function distinctExosCount(){ return memo("distinctExosCount", distinctExosCount_raw); }
function distinctExosCount_raw(){
  const ids = new Set();
  S.sessions.forEach(s=>s.exos.forEach(ex=>{ if(ex.sets.some(st=>st.done)) ids.add(ex.exoId); }));
  return ids.size;
}
function distinctMusclesCount(){ return memo("distinctMusclesCount", distinctMusclesCount_raw); }
function distinctMusclesCount_raw(){
  const ms = new Set();
  S.sessions.forEach(s=>s.exos.forEach(ex=>{
    const def = EXO_MAP[ex.exoId];
    if(def && ex.sets.some(st=>st.done)) def.muscles.forEach(m=>{ if(m!=="cardio") ms.add(m); });
  }));
  return ms.size;
}
function startHour(s){ return s.startedAt ? new Date(s.startedAt).getHours() : null; }

function estimated1RM(weight,reps){
  if(!weight||!reps) return weight||0;
  return weight*(1+reps/30); // formule d'Epley
}
function exoPRs(exoId){ return memo("pr:"+exoId, ()=>exoPRs_raw(exoId)); }
function exoPRs_raw(exoId){
  let maxWeight=0, maxVolumeSession=0, best1rm=0, count=0;
  S.sessions.forEach(s=>{
    const ex = s.exos.find(x=>x.exoId===exoId);
    if(!ex || !ex.sets.some(st=>st.done)) return;
    count++;
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
  return { maxWeight, maxVolumeSession, best1rm:round1(best1rm), count };
}
function isNewPR(exoId, weight, reps){
  const pr = exoPRs(exoId);
  if(!pr.count) return false; // la toute première fois n'est pas un « record battu »
  return weight>pr.maxWeight || estimated1RM(weight,reps)>pr.best1rm+0.01;
}

// ---------- régularité ----------
// semaines consécutives avec au moins une séance ; la semaine en cours pas encore
// entamée ne casse pas la série (on repart de la semaine précédente).
function currentStreakWeeks(){
  const weeks = new Set(S.sessions.map(s=>weekKey(s.date)));
  let cursor = weekKey(todayISO());
  if(!weeks.has(cursor)) cursor = addDaysISO(cursor,-7);
  let n=0;
  while(weeks.has(cursor)){ n++; cursor = addDaysISO(cursor,-7); }
  return n;
}
function maxStreakWeeksEver(){ return memo("maxStreakWeeksEver", maxStreakWeeksEver_raw); }
function maxStreakWeeksEver_raw(){
  const weeks = Array.from(new Set(S.sessions.map(s=>weekKey(s.date)))).sort();
  let best=0, cur=0, prev=null;
  weeks.forEach(w=>{
    cur = (prev && addDaysISO(prev,7)===w) ? cur+1 : 1;
    best = Math.max(best,cur); prev = w;
  });
  return best;
}
function perfectWeeksCount(){ return memo("perfectWeeksCount", perfectWeeksCount_raw); }
function perfectWeeksCount_raw(){
  const goal = S.goals.daysPerWeek||3, per = {};
  S.sessions.forEach(s=>{ const k=weekKey(s.date); per[k]=(per[k]||0)+1; });
  return Object.values(per).filter(n=>n>=goal).length;
}
function sessionsInMonth(){
  const ym = todayISO().slice(0,7);
  return S.sessions.filter(s=>s.date.slice(0,7)===ym).length;
}
function sessionsInYear(){
  const y = todayISO().slice(0,4);
  return S.sessions.filter(s=>s.date.slice(0,4)===y).length;
}
function sessionsThisWeek(){
  const wk = weekKey(todayISO());
  return S.sessions.filter(s=>weekKey(s.date)===wk).length;
}
function weeklyAverage(weeks){
  const cutoff = addDaysISO(todayISO(), -weeks*7);
  return round1(S.sessions.filter(s=>s.date>cutoff).length/weeks);
}
function sessionsToday(){ return S.sessions.filter(s=>s.date===todayISO()); }

// n dernières semaines (la plus ancienne d'abord)
function weeklyBuckets(n){
  const cur = weekKey(todayISO()), out = [];
  for(let i=n-1;i>=0;i--){
    const wk = addDaysISO(cur,-7*i);
    out.push({ wk, sessions:0, volume:0, sets:0, minutes:0 });
  }
  const idx = {}; out.forEach((b,i)=>idx[b.wk]=i);
  S.sessions.forEach(s=>{
    const i = idx[weekKey(s.date)];
    if(i===undefined) return;
    const b = out[i];
    b.sessions++; b.volume += sessionVolume(s); b.sets += sessionSetCount(s); b.minutes += (s.durationSec||0)/60;
  });
  return out;
}
function dayMap(){ return memo("dayMap", dayMap_raw); }
function dayMap_raw(){
  const m = {};
  S.sessions.forEach(s=>{
    const e = m[s.date] || (m[s.date]={sessions:0,volume:0,sets:0});
    e.sessions++; e.volume += sessionVolume(s); e.sets += sessionSetCount(s);
  });
  return m;
}

// ---------- niveau (XP) ----------
const LEVEL_TITLES = [[15,"Légende de la forge"],[10,"Maître forgeron·ne"],[6,"Forgeron·ne"],[3,"Compagnon·ne"],[1,"Apprenti·e"]];
function totalXP(){ return memo("totalXP", totalXP_raw); }
function totalXP_raw(){
  const medalPts = Object.values(S.medals).reduce((t,m)=>t+[0,10,25,50,100].slice(1,(m.t||0)+1).reduce((a,b)=>a+b,0),0);
  return S.sessions.length*50 + totalSets()*2 + (S.meta.prCount||0)*10 + medalPts;
}
// niveau L atteint à 125·L·(L−1) XP : 0, 250, 750, 1500, 2500…
function levelInfo(xp){
  if(xp==null) xp = totalXP();
  let L=1;
  while(125*(L+1)*L <= xp) L++;
  const base = 125*L*(L-1), next = 125*(L+1)*L;
  return { level:L, xp, base, next, pct:(xp-base)/(next-base), title:LEVEL_TITLES.find(([min])=>L>=min)[1] };
}

// ---------- planning hebdomadaire ----------
const JOURS_COURTS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
function weekdayIdx(iso){ return (parseISO(iso).getDay()+6)%7; } // lundi = 0
function plannedTemplate(iso){
  const wd = weekdayIdx(iso||todayISO());
  return S.templates.find(t=>(t.days||[]).includes(wd)) || null;
}

// ---------- statistiques du profil ----------
function favoriteExercise(){ return memo("favoriteExercise", favoriteExercise_raw); }
function favoriteExercise_raw(){
  const c = {};
  S.sessions.forEach(s=>s.exos.forEach(ex=>{ if(ex.sets.some(st=>st.done)) c[ex.exoId]=(c[ex.exoId]||0)+1; }));
  const id = Object.keys(c).sort((a,b)=>c[b]-c[a])[0];
  return id ? { def:EXO_MAP[id], n:c[id] } : null;
}
function favoriteWeekday(){ return memo("favoriteWeekday", favoriteWeekday_raw); }
function favoriteWeekday_raw(){
  const c = [0,0,0,0,0,0,0];
  S.sessions.forEach(s=>c[weekdayIdx(s.date)]++);
  const max = Math.max(...c);
  return max ? { i:c.indexOf(max), n:max } : null;
}
function favoriteMoment(){ return memo("favoriteMoment", favoriteMoment_raw); }
function favoriteMoment_raw(){
  const c = { "le matin":0, "à midi":0, "l'après-midi":0, "le soir":0 };
  S.sessions.forEach(s=>{
    const h = startHour(s); if(h===null) return;
    c[h<11?"le matin":h<14?"à midi":h<18?"l'après-midi":"le soir"]++;
  });
  const k = Object.keys(c).sort((a,b)=>c[b]-c[a])[0];
  return c[k] ? k : null;
}
function bestWeek(){ return memo("bestWeek", bestWeek_raw); }
function bestWeek_raw(){
  const per = {};
  S.sessions.forEach(s=>{ const k=weekKey(s.date); per[k]=(per[k]||0)+1; });
  const k = Object.keys(per).sort((a,b)=>per[b]-per[a])[0];
  return k ? { wk:k, n:per[k] } : null;
}
function topLifts(n){ return memo("tl:"+n, ()=>topLifts_raw(n)); }
function topLifts_raw(n){
  const best = {};
  S.sessions.forEach(s=>s.exos.forEach(ex=>ex.sets.forEach(st=>{
    if(!st.done || !st.weight) return;
    const b = best[ex.exoId];
    if(!b || st.weight>b.w || (st.weight===b.w && st.reps>b.r)) best[ex.exoId] = { w:st.weight, r:st.reps, date:s.date };
  })));
  return Object.keys(best).filter(id=>EXO_MAP[id]).map(id=>Object.assign({ def:EXO_MAP[id] }, best[id])).sort((a,b)=>b.w-a.w).slice(0,n);
}
function firstSessionDate(){ return memo("firstSessionDate", firstSessionDate_raw); }
function firstSessionDate_raw(){ return S.sessions.length ? S.sessions.reduce((m,s)=>s.date<m?s.date:m, S.sessions[0].date) : null; }
