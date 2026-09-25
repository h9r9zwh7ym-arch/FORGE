// ================= PICTOGRAMMES DES EXERCICES =================
// Silhouettes au trait (24×24, trait « currentColor ») : une par famille de mouvement.
// La tête est un disque plein ; le reste est tracé en lignes arrondies.
const PICTO_PATHS = {
  squat:    { h:[13,4.3], d:"M12.6 6.6 10 12l5.3.8-.9 6.2M11.4 8.6l5.8 1.1M8.5 19h8" },
  lunge:    { h:[11,4.2], d:"M11 6.6v5.9l4.8.4v6.1M11 12.5l-3.4 4.1-3.6.4M11 8.4l2.6 3.2M4 19h14" },
  hinge:    { h:[5.6,7.4], d:"M7.5 8.6 15 11.2l-.3 7.8M15 11.2l3 7.8M9 9.2v6M5.8 15.2h6.4M5.8 14v2.4M12.2 14v2.4" },
  bench:    { h:[4.6,13.8], d:"M6.6 14.6h10.6l2.6 4.6M9 14.6V8.4M6 8.4h6M6 7.2v2.4M12 7.2v2.4M4 17.4h15M6 17.4V21M17 17.4V21" },
  fly:      { h:[12,4.4], d:"M12 6.8v8.4M12 9C9.6 9 7.4 8 5.4 5.8M12 9c2.4 0 4.6-1 6.6-3.2M4.4 4.8l2 2M17.6 6.8l2-2M12 15.2l-2.4 4.8M12 15.2l2.4 4.8" },
  pushup:   { h:[4.6,9.6], d:"M6.5 10.6 20 15.6M8.6 11.4v5.6M3.5 18.4h17" },
  dips:     { h:[12,4.4], d:"M12 6.8v7.4M10.4 7.8 7.4 11M13.6 7.8l3 3.2M4 11h5M15 11h5M12 14.2l-1.4 5M12 14.2l3 3.6" },
  overhead: { h:[12,7.6], d:"M12 10v5.8M12 15.8l-2.4 5M12 15.8l2.4 5M10.6 10.6 8.2 3.6M13.4 10.6l2.4-7M5 3.6h14M5 2.4v2.4M19 2.4v2.4" },
  raise:    { h:[12,4.4], d:"M12 6.8v7.6M12 14.4l-2.4 5.6M12 14.4l2.4 5.6M12 8.6H5M12 8.6h7M5 7v3.2M19 7v3.2" },
  row:      { h:[5.2,8], d:"M7 9 14.6 11l.4 8M14.6 11l3 8M8.8 9.6l2.8-2.4.4 5M10.6 12.2h2.8" },
  hang:     { h:[12,6.4], d:"M3.5 3h17M8 3l2.6 5.2M16 3l-2.6 5.2M12 8.8v6.4M12 15.2l-1 5.6M12 15.2l1 5.6" },
  curl:     { h:[9.6,4.4], d:"M9.6 6.8v7.6M9.6 14.4l-2.2 5.6M9.6 14.4l2.2 5.6M9.8 8.4l1.4 4.4 4-3.8M13.8 7.6l2.8 2.8" },
  triceps:  { h:[9.4,6.8], d:"M9.4 9.2v6M9.4 15.2l-2 5.6M9.4 15.2l2 5.6M10.8 9.4l2.4-6 2.6 4.6M14.8 8.8l2-2" },
  bridge:   { h:[4.4,15.6], d:"M6.4 16.4 12.6 12l4.6.4 1.4 5.8M3 18.6h18M9 14.4l-1 4.2" },
  plank:    { h:[5,10.6], d:"M6.8 11.6 20 14.6M8.2 12v5h3M20 14.6l.4 3.2M3.5 18.4h17.5" },
  crunch:   { h:[6.2,9.6], d:"M7.6 11 12.4 16l3.8-4.4 2.8 5.8M9.6 12.2l1.8-2.6M3.5 18.4h17" },
  calf:     { h:[11,4.2], d:"M11 6.6v7.6M11 14.2v4.6l1.6 1.6M11 8.4l2.8 3.2M8 21h8M18 18v-6M16.2 13.8 18 12l1.8 1.8" },
  cardio:   { h:[12,4.4], d:"M12 6.8v6.8M12 8.4 7.4 4M12 8.4 16.6 4M12 13.6l-4.2 6.2M12 13.6l4.2 6.2M3.6 9.4h2M18.4 9.4h2" },
  carry:    { h:[12,4.2], d:"M12 6.6v7.6M12 14.2l-2.8 6M12 14.2l2.6 5.8M12 8.4l-3.6 5M12 8.4l3.6 5M6.6 13.6h3.6M13.8 13.6h3.6" },
};

// Famille de mouvement de chaque exercice (repli : famille déduite du pattern).
const PICTO_OF = {
  pompes:"pushup", pompes_genoux:"pushup", pompes_surelevees:"pushup", pompes_declinees:"pushup", pompes_diamant:"pushup", pompes_larges:"pushup", pompe_pike:"pushup",
  dips_banc:"dips",
  squat_pdc:"squat", squat_gobelet:"squat", squat_barre:"squat", goblet_squat_kb:"squat", squat_elastique:"squat", squat_sumo_haltere:"squat", squat_saute:"squat", chaise_murale:"squat", band_walk:"squat", thruster_haltere:"overhead",
  squat_bulgare_pdc:"lunge", fentes_avant:"lunge", fentes_arriere:"lunge", fentes_marchees:"lunge", fentes_laterales:"lunge", fentes_halteres:"lunge", step_up:"lunge",
  pont_fessier:"bridge", pont_fessier_uni:"bridge", pont_fessier_elastique:"bridge", hip_thrust_barre:"bridge", hip_thrust_haltere:"bridge",
  rdl_halteres:"hinge", rdl_uni_haltere:"hinge", deadlift_barre:"hinge", rdl_barre:"hinge", deadlift_kb:"hinge", kb_sumo_deadlift:"hinge", swing_kb:"hinge", superman:"plank",
  planche:"plank", planche_laterale:"plank", mountain_climbers:"plank", bird_dog:"plank", gainage_creux:"crunch", dead_bug:"crunch", crunch:"crunch", releve_jambes:"crunch",
  burpees:"cardio", jumping_jacks:"cardio",
  mollets_pdc:"calf", mollets_uni_pdc:"calf", mollets_halteres:"calf",
  tractions:"hang", tractions_suppination:"hang", suspension_barre:"hang", releve_genoux_suspendu:"hang",
  dc_haltere:"bench", dc_incline_haltere:"bench", dc_barre:"bench", dc_incline_barre:"bench", dc_serre_barre:"bench", floor_press_haltere:"bench", squeeze_press:"bench", pullover_haltere:"bench",
  ecarte_couche:"fly", ecarte_incline:"fly", ecarte_sol:"fly", ecarte_elastique_pect:"fly",
  rowing_uni_haltere:"row", rowing_deux_halteres:"row", rowing_barre:"row", rowing_uni_kb:"row", renegade_row:"row", tirage_elastique:"row",
  dev_epaules_haltere:"overhead", militaire_barre:"overhead", arnold_press:"overhead", kb_overhead_press:"overhead", dev_epaules_elastique:"overhead",
  elevations_laterales:"raise", elevations_frontales:"raise", oiseau_haltere:"raise", ecarte_elastique:"raise", face_pull_elastique:"raise",
  curl_biceps:"curl", curl_marteau:"curl", curl_concentre:"curl", curl_incline:"curl", curl_barre:"curl", curl_biceps_elastique:"curl", curl_poignets:"curl",
  extension_triceps_nuque:"triceps", kickback_triceps:"triceps", extension_triceps_allonge:"triceps", barre_front:"triceps", extension_triceps_elastique:"triceps",
  shrugs_halteres:"carry", marche_fermier:"carry", kb_fermier:"carry",
};
const PICTO_BY_PATTERN = { squat:"squat", hinge:"hinge", push:"pushup", pull:"row", lunge:"lunge", core:"plank", calf:"calf" };

function pictoKey(def){ return PICTO_OF[def.id] || PICTO_BY_PATTERN[def.pattern] || "squat"; }
function pictoSVG(key){
  const p = PICTO_PATHS[key] || PICTO_PATHS.squat;
  return `<svg class="picto" viewBox="0 0 24 24" aria-hidden="true"><circle cx="${p.h[0]}" cy="${p.h[1]}" r="2.1" fill="currentColor"/><path d="${p.d}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// ---- code couleur par zone du corps (couleur + pictogramme + libellé : jamais la couleur seule) ----
const REGIONS = {
  push: { n:"Poussée",          muscles:["pect","epaules","triceps"] },
  pull: { n:"Tirage",           muscles:["dos","biceps","avantbras"] },
  legs: { n:"Jambes",           muscles:["quadriceps","ischios","fessiers","mollets"] },
  core: { n:"Gainage & cardio", muscles:["abdos","cardio"] },
};
const REGION_OF_MUSCLE = {};
Object.keys(REGIONS).forEach(r=>REGIONS[r].muscles.forEach(m=>REGION_OF_MUSCLE[m]=r));
function regionOf(def){ return REGION_OF_MUSCLE[def.muscles[0]] || "core"; }

// tuile d'exercice : pictogramme sur fond de la couleur de zone
function exoIcon(def, size){
  return `<span class="xico r-${regionOf(def)} ${size||""}" title="${esc(REGIONS[regionOf(def)].n)}">${pictoSVG(pictoKey(def))}</span>`;
}
