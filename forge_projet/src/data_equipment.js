// ================= MATÉRIEL =================
// Catalogue du matériel reconnu par le moteur de suggestion. Chaque exercice de la
// bibliothèque référence un sous-ensemble de ces identifiants. `loadable` signifie que
// l'utilisateur peut renseigner les charges réellement possédées (utilisé pour la
// progression de charge). `always` signifie que l'équipement est toujours disponible
// (poids du corps) et n'a donc pas de case à cocher.
const EQUIP_TYPES = [
  { id:"bodyweight", n:"Poids du corps", em:"🤸", always:true },
  { id:"dumbbells",  n:"Haltères",        em:"🏋️", loadable:true, unit:"kg", hint:"Renseigne les paires que tu possèdes (ex. 8 kg, 12 kg)." },
  { id:"barbell",    n:"Barre + disques", em:"🏋️‍♂️", loadable:true, unit:"kg", hint:"Poids total que tu peux charger (barre comprise)." },
  { id:"kettlebell", n:"Kettlebell",      em:"🔔", loadable:true, unit:"kg", hint:"Renseigne les kettlebells que tu possèdes." },
  { id:"bench",      n:"Banc",            em:"🛋️" },
  { id:"pullup_bar", n:"Barre de traction", em:"🚪" },
  { id:"bands",      n:"Élastiques",      em:"➰", loadable:true, unit:"niveau", hint:"Renseigne les résistances que tu possèdes (léger, moyen, fort)." },
  { id:"mat",        n:"Tapis de sol",    em:"🧘" },
];
const EQUIP_MAP = {};
EQUIP_TYPES.forEach(e=>EQUIP_MAP[e.id]=e);

// Incréments de charge par défaut utilisés par le moteur de progression quand
// l'équipement n'a pas de liste de poids explicite (ex. barre non détaillée).
const DEFAULT_INCREMENT = { barbell:2.5, dumbbells:1, kettlebell:2, bands:1 };

function defaultEquipment(){
  return {
    owned:{ bodyweight:true, dumbbells:false, barbell:false, kettlebell:false, bench:false, pullup_bar:false, bands:false, mat:false },
    weights:{ dumbbells:[], barbell:[], kettlebell:[], bands:[] }, // ex. dumbbells:[8,12], bands:["léger","moyen"]
    custom:[] // [{id,n}] équipements libres, informatifs (extensibles au fil du temps)
  };
}

function hasEquip(eq, list){
  if(!list || !list.length) return true;
  return list.every(id=>id==="bodyweight" || eq.owned[id]);
}

// Catégories d'affichage des exercices : l'équipement principal qui les caractérise
// (le banc est un accessoire, il ne crée pas de catégorie).
const EXO_CATS = [
  { id:"bodyweight", n:"Poids du corps",   em:"🤸" },
  { id:"dumbbells",  n:"Haltères",         em:"🏋️" },
  { id:"barbell",    n:"Barre & disques",  em:"🏋️‍♂️" },
  { id:"kettlebell", n:"Kettlebell",       em:"🔔" },
  { id:"bands",      n:"Élastiques",       em:"➰" },
  { id:"pullup_bar", n:"Barre de traction", em:"🚪" },
];
function exoCategory(e){
  for(const c of ["dumbbells","barbell","kettlebell","bands","pullup_bar"]) if(e.equip.includes(c)) return c;
  return "bodyweight";
}
