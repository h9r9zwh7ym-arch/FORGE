// ================= MOTEUR DE SUGGESTION (100% local, aucun appel réseau) =================
const PATTERN_CYCLE = ["squat","hinge","push","pull","lunge","core","calf"];
const SESSION_SIZE = { court:4, moyen:6, long:8 };

function normName(s){
  return (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g," ").trim();
}

// score d'un groupe musculaire : plus il a été délaissé récemment, plus il est prioritaire
function muscleScore(muscleId){
  const days = daysSinceTrained(muscleId);
  const emph = S.goals.emphasis[muscleId] || "normal";
  let w = emph==="prioriser" ? 1.6 : emph==="eviter" ? 0.25 : 1;
  let score = Math.min(days,10) * w;
  if(days<2) score *= 0.2; // récupération : fortement déprioritisé si travaillé hier ou aujourd'hui
  return score;
}

function recencyPenalty(exoId){
  // pénalise un exercice utilisé dans les 2 dernières séances, pour varier
  let penalty = 0;
  for(let i=S.sessions.length-1, n=0; i>=0 && n<2; i--, n++){
    if(S.sessions[i].exos.some(e=>e.exoId===exoId)) penalty += 2.5;
  }
  return penalty;
}

function scoreExo(exo){
  const primary = exo.muscles[0];
  let score = muscleScore(primary);
  exo.muscles.slice(1).forEach(m=>score += muscleScore(m)*0.3);
  if(isIncluded(exo.id)) score += 3;
  score -= recencyPenalty(exo.id);
  return score;
}

function repRangeForGoal(exo){
  const goal = S.goals.overall;
  const mid = Math.round((exo.repsMin+exo.repsMax)/2);
  if(goal==="force") return [exo.repsMin, mid];
  if(goal==="endurance") return [mid, exo.repsMax+4];
  return [exo.repsMin, exo.repsMax];
}

function loadableTypeOf(exo){
  return exo.equip.find(id=>EQUIP_MAP[id] && EQUIP_MAP[id].loadable);
}

function nextWeight(exo, current){
  const type = loadableTypeOf(exo);
  if(!type) return null;
  const owned = (S.equipment.weights[type]||[]).slice().sort((a,b)=>a-b);
  if(owned.length){
    const higher = owned.find(w=>w>current+0.001);
    return higher!==undefined ? higher : owned[owned.length-1];
  }
  const inc = DEFAULT_INCREMENT[type]||2.5;
  return round1(current+inc);
}

function suggestForExo(exo){
  const [rMin,rMax] = repRangeForGoal(exo);
  const last = lastPerformance(exo.id);
  const type = loadableTypeOf(exo);
  let weight = null;
  if(type){
    const owned = (S.equipment.weights[type]||[]).slice().sort((a,b)=>a-b);
    weight = owned.length ? owned[0] : (DEFAULT_INCREMENT[type]||2.5);
  }
  let targetReps=[rMin,rMax], note=null;

  if(last){
    const doneSets = last.exo.sets.filter(st=>st.done);
    if(doneSets.length){
      const avgRpe = doneSets.reduce((t,s)=>t+(s.rpe||7),0)/doneSets.length;
      const hitTop = doneSets.every(s=>(s.reps||0) >= (last.exo.targetReps? last.exo.targetReps[1] : rMax));
      const missed = doneSets.some(s=>(s.reps||0) < Math.max(1,(last.exo.targetReps? last.exo.targetReps[0]:rMin)-1));
      const lastWeight = doneSets[0].weight||0;
      if(type){
        if(hitTop && avgRpe<=7.5 && !missed){
          weight = nextWeight(exo, lastWeight);
          note = "Charge augmentée : tu as atteint le haut de la fourchette la dernière fois.";
        } else if(missed || avgRpe>=9){
          weight = lastWeight;
          targetReps = [rMin, Math.max(rMin, rMax-2)];
          note = "On garde la même charge pour consolider la forme.";
        } else {
          weight = lastWeight;
        }
      } else {
        // poids du corps : progression par les répétitions
        if(hitTop && avgRpe<=7.5) note = "Essaie d'ajouter des répétitions par rapport à la dernière fois.";
      }
    }
  }
  return { targetReps, weight, note };
}

function buildSetsFor(exo, suggestion){
  const sets = [];
  for(let i=0;i<exo.sets;i++){
    sets.push({ reps:null, weight:suggestion.weight, done:false, rpe:null });
  }
  return sets;
}

function pickExosForSession(n){
  const pool = availableExos();
  const chosen = [];
  const usedIds = new Set();
  let bucketI = 0, guard=0;
  while(chosen.length<n && guard<200){
    guard++;
    const pattern = PATTERN_CYCLE[bucketI % PATTERN_CYCLE.length];
    bucketI++;
    const candidates = pool.filter(e=>e.pattern===pattern && !usedIds.has(e.id));
    if(candidates.length){
      candidates.sort((a,b)=>scoreExo(b)-scoreExo(a));
      chosen.push(candidates[0]);
      usedIds.add(candidates[0].id);
    }
    if(bucketI>PATTERN_CYCLE.length*3) break;
  }
  if(chosen.length<n){
    const rest = pool.filter(e=>!usedIds.has(e.id)).sort((a,b)=>scoreExo(b)-scoreExo(a));
    for(const e of rest){ if(chosen.length>=n) break; chosen.push(e); usedIds.add(e.id); }
  }
  return chosen;
}

function generateEngineSession(){
  const n = SESSION_SIZE[S.goals.sessionLength] || 6;
  const exos = pickExosForSession(n);
  return {
    id: uid(), date: todayISO(), source:"engine", startedAt:null, completedAt:null, feeling:null,
    exos: exos.map(exo=>{
      const sug = suggestForExo(exo);
      return { exoId:exo.id, targetSets:exo.sets, targetReps:sug.targetReps, note:sug.note, sets:buildSetsFor(exo,sug) };
    })
  };
}

function resolveExoRef(ref){
  if(ref.id && EXO_MAP[ref.id]) return EXO_MAP[ref.id];
  const target = normName(ref.nom||ref.name||ref.id||"");
  if(!target) return null;
  let found = EXOS.find(e=>normName(e.n)===target || normName(e.id)===target);
  if(found) return found;
  found = EXOS.find(e=>normName(e.n).includes(target) || target.includes(normName(e.n)));
  return found||null;
}

function buildSessionFromImported(prog){
  const warnings = [];
  const exos = [];
  (prog.exercices||prog.exercises||[]).forEach(ref=>{
    const exo = resolveExoRef(ref);
    if(!exo){ warnings.push(`Exercice non reconnu : "${ref.nom||ref.name||ref.id||"?"}" (ignoré).`); return; }
    const setsN = ref.series||ref.sets||exo.sets;
    let reps = [exo.repsMin, exo.repsMax];
    if(typeof ref.reps==="string" && ref.reps.includes("-")){
      const [a,b] = ref.reps.split("-").map(x=>parseInt(x,10));
      if(!isNaN(a)&&!isNaN(b)) reps=[a,b];
    } else if(typeof ref.reps==="number"){ reps=[ref.reps,ref.reps]; }
    const weight = (ref.poids!=null?ref.poids:ref.weight!=null?ref.weight:null);
    const sets = [];
    for(let i=0;i<setsN;i++) sets.push({reps:null,weight,done:false,rpe:null});
    exos.push({ exoId:exo.id, targetSets:setsN, targetReps:reps, note:null, sets });
  });
  return { id:uid(), date:todayISO(), source:"imported", startedAt:null, completedAt:null, feeling:null,
    name: prog.nom||prog.name||null, exos, warnings };
}

function getOrCreateDraft(){
  if(S.draft && S.draft.date===todayISO()) return S.draft;
  if(S.draft && S.draft.date!==todayISO() && !S.draft.completedAt){
    // séance d'un jour précédent jamais terminée : on la garde disponible mais on en propose une nouvelle
  }
  if(S.importedProgram && S.importedProgram.length){
    S.draft = buildSessionFromImported(S.importedProgram[0]);
  } else {
    S.draft = generateEngineSession();
  }
  save();
  return S.draft;
}

function regenerateDraft(){
  S.draft = S.importedProgram && S.importedProgram.length ? buildSessionFromImported(S.importedProgram[0]) : generateEngineSession();
  save();
  return S.draft;
}

// ---------- export / import IA externe ----------
function buildExportPrompt(){
  const eq = S.equipment;
  const ownedList = EQUIP_TYPES.filter(e=>e.always||eq.owned[e.id]).map(e=>{
    if(e.loadable && (eq.weights[e.id]||[]).length) return `${e.n} (${eq.weights[e.id].join(", ")} ${e.unit})`;
    return e.n;
  });
  const emphasisLines = Object.entries(S.goals.emphasis).filter(([,v])=>v!=="normal")
    .map(([m,v])=>`${MUSCLE_MAP[m]?.n||m} : ${v==="prioriser"?"à prioriser":"à éviter/limiter"}`);
  const excluded = S.prefs.excluded.map(id=>EXO_MAP[id]?.n).filter(Boolean);
  const included = S.prefs.included.map(id=>EXO_MAP[id]?.n).filter(Boolean);
  const recent = S.sessions.slice(-8).map(s=>{
    const lines = s.exos.map(ex=>{
      const def = EXO_MAP[ex.exoId]; if(!def) return null;
      const done = ex.sets.filter(st=>st.done);
      if(!done.length) return null;
      const detail = done.map(st=>`${st.reps||"?"}x${st.weight!=null?st.weight+"kg":"pdc"}`).join(", ");
      return `  - ${def.n} : ${detail}`;
    }).filter(Boolean).join("\n");
    return `${fmtDate(s.date)} (ressenti ${s.feeling||"?"}/5)\n${lines}`;
  }).join("\n");

  return `Voici mon profil d'entraînement (app Forge). Peux-tu me proposer un programme de musculation adapté ?

MATÉRIEL DISPONIBLE :
${ownedList.map(x=>"- "+x).join("\n")||"- (aucun renseigné)"}

OBJECTIF PRINCIPAL : ${S.goals.overall}
FRÉQUENCE VISÉE : ${S.goals.daysPerWeek} séances / semaine
${emphasisLines.length? "GROUPES MUSCULAIRES CIBLÉS :\n"+emphasisLines.map(x=>"- "+x).join("\n") : ""}
${excluded.length? "EXERCICES EXCLUS (blessure, préférence) :\n"+excluded.map(x=>"- "+x).join("\n") : ""}
${included.length? "EXERCICES À PRIVILÉGIER :\n"+included.map(x=>"- "+x).join("\n") : ""}

HISTORIQUE RÉCENT :
${recent||"(aucune séance enregistrée pour l'instant)"}

RÉPONSE ATTENDUE : réponds UNIQUEMENT avec un fichier JSON respectant exactement ce format (les noms d'exercices doivent être en français, proches de la terminologie usuelle) :
{
  "sessions": [
    { "nom": "Séance 1", "exercices": [
      { "nom": "Squat barre", "series": 4, "reps": "6-8", "poids": 60 },
      { "nom": "Développé couché haltères", "series": 3, "reps": "8-12" }
    ] }
  ]
}
Le champ "poids" est facultatif (Forge peut le calculer automatiquement). Propose entre 2 et 4 séances.`;
}

function importProgramJSON(text){
  let data;
  try{ data = JSON.parse(text); }catch(e){ return { ok:false, error:"Le fichier n'est pas un JSON valide." }; }
  const sessions = data.sessions || (Array.isArray(data)?data:null);
  if(!sessions || !Array.isArray(sessions) || !sessions.length){
    return { ok:false, error:"Format inattendu : aucune clé \"sessions\" trouvée." };
  }
  const warnings = [];
  sessions.forEach(s=>{
    const built = buildSessionFromImported(s);
    if(built.warnings) warnings.push(...built.warnings);
  });
  S.importedProgram = sessions;
  if(S.draft && S.draft.date===todayISO() && !S.draft.startedAt){
    S.draft = buildSessionFromImported(S.importedProgram[0]);
  }
  save();
  return { ok:true, count:sessions.length, warnings };
}
