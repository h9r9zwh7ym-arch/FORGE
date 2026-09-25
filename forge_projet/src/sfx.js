// ================= SONS =================
// Sons synthétisés en direct avec Web Audio (aucun fichier) : courts, doux et
// accordés entre eux (gamme de do majeur), pour accompagner les animations.
// Le contexte audio n'existe qu'après un premier toucher (règle de Safari iOS) ;
// avant cela, et si les sons sont coupés dans le Profil, sfx() ne fait rien.

let AC = null, SFX_OUT = null, NOISE = null;
function audioReady(){
  if(!AC){
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return false;
    try{
      AC = new Ctx();
      const comp = AC.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 4;
      SFX_OUT = AC.createGain(); SFX_OUT.gain.value = 0.9;
      SFX_OUT.connect(comp); comp.connect(AC.destination);
    }catch(e){ AC = null; return false; }
  }
  if(AC.state==="suspended") AC.resume();
  return true;
}
// déverrouillage au premier geste (iOS exige un son joué pendant un geste)
["pointerdown","touchend","keydown"].forEach(ev=>document.addEventListener(ev, function unlock(){
  if(!soundOn()) return;
  if(audioReady()){
    const b = AC.createBuffer(1,1,22050), src = AC.createBufferSource();
    src.buffer = b; src.connect(AC.destination); src.start(0);
  }
}, { passive:true }));

function soundOn(){ return !(typeof S!=="undefined" && S.settings && S.settings.sound===false); }

// note : fréquence, départ (s, relatif), durée, options
function tone(f, t, dur, o){
  o = o||{};
  const t0 = AC.currentTime + t;
  const osc = AC.createOscillator(), g = AC.createGain();
  osc.type = o.type || "sine";
  osc.frequency.setValueAtTime(f, t0);
  if(o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0+dur);
  const peak = o.gain==null ? 0.25 : o.gain, att = o.att || 0.006;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0+att);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  osc.connect(g);
  if(o.pan && AC.createStereoPanner){ const p = AC.createStereoPanner(); p.pan.value = o.pan; g.connect(p); p.connect(SFX_OUT); }
  else g.connect(SFX_OUT);
  osc.start(t0); osc.stop(t0+dur+0.05);
}
// cloche : fondamentale + partiels inharmoniques qui s'éteignent plus vite
function bell(f, t, dur, gain){
  tone(f, t, dur, { gain:gain, type:"sine" });
  tone(f*2.76, t, dur*0.45, { gain:gain*0.35 });
  tone(f*5.4, t, dur*0.2, { gain:gain*0.12 });
}
// souffle filtré (whoosh)
function whoosh(t, dur, from, to, gain){
  if(!NOISE){
    NOISE = AC.createBuffer(1, AC.sampleRate*1, AC.sampleRate);
    const d = NOISE.getChannelData(0); for(let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
  }
  const t0 = AC.currentTime + t;
  const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  src.buffer = NOISE; f.type = "bandpass"; f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(to, t0+dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain||0.2, t0+dur*0.4); g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  src.connect(f); f.connect(g); g.connect(SFX_OUT);
  src.start(t0); src.stop(t0+dur+0.05);
}

// « toc » feutré façon clavier iOS : un souffle très bref filtré (le contact) et un
// corps grave qui s'éteint en 40 ms. Légère variation de hauteur à chaque fois pour
// que la répétition ne fatigue pas l'oreille.
function tok(t, body, gain){
  if(!NOISE){
    NOISE = AC.createBuffer(1, AC.sampleRate*1, AC.sampleRate);
    const d = NOISE.getChannelData(0); for(let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
  }
  const v = 1 + (Math.random()-0.5)*0.08, t0 = AC.currentTime + t, g0 = gain==null ? 1 : gain;
  const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  src.buffer = NOISE; f.type = "bandpass"; f.frequency.value = 2600*v; f.Q.value = 0.9;
  g.gain.setValueAtTime(0.16*g0, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0+0.014);
  src.connect(f); f.connect(g); g.connect(SFX_OUT);
  src.start(t0, Math.random()*0.5); src.stop(t0+0.03);
  tone((body||190)*v, t, 0.045, { gain:0.22*g0, to:(body||190)*0.6*v, att:0.002 });
}
let lastTok = 0;
// notes (Hz)
const NT = { C5:523.25, D5:587.33, E5:659.25, G5:783.99, A5:880, C6:1046.5, D6:1174.7, E6:1318.5, G6:1568, A6:1760, C7:2093 };
const SFX = {
  tick(){ tok(0, 200, 0.8); },
  step(up){ tok(0, up ? 230 : 175, 0.9); },
  open(){ tone(260, 0, 0.09, { gain:0.14, to:470, att:0.004 }); tok(0, 210, 0.5); },
  close(){ tone(430, 0, 0.08, { gain:0.12, to:240, att:0.004 }); tok(0, 170, 0.5); },
  seg(){ tok(0, 200, 0.8); },
  swipe(){ whoosh(0, 0.2, 700, 2200, 0.18); },
  set(){ bell(NT.E6, 0, 0.35, 0.16); bell(NT.A6, 0.075, 0.5, 0.14); },
  exo(){ [NT.C6, NT.E6, NT.G6, NT.C7].forEach((f,i)=>bell(f, i*0.07, 0.55, 0.13)); },
  pr(){ [NT.G6, NT.C7, NT.E6, NT.G6, NT.C7].forEach((f,i)=>tone(f*(1+Math.random()*0.01), i*0.05, 0.3, { gain:0.22, type:"triangle", pan:(i%2?.4:-.4) })); bell(NT.C6, 0, 0.8, 0.12); },
  complete(){
    [NT.C5, NT.E5, NT.G5].forEach((f,i)=>tone(f, i*0.1, 1.4, { gain:0.12, type:"triangle", att:0.03 }));
    [NT.C6, NT.E6, NT.G6, NT.C7].forEach((f,i)=>bell(f, 0.32+i*0.08, 0.9, 0.12));
    whoosh(0.3, 0.6, 3000, 8000, 0.05);
  },
  medal(){ [NT.G5, NT.C6, NT.E6, NT.G6].forEach((f,i)=>bell(f, i*0.09, 0.8, 0.12)); },
  count(){ tone(NT.A5, 0, 0.16, { gain:0.45, type:"triangle" }); tone(NT.A5*2, 0, 0.08, { gain:0.14 }); },
  go(){ whoosh(0, 0.5, 400, 4000, 0.16); [NT.C5, NT.G5, NT.C6, NT.E6].forEach((f,i)=>tone(f, 0.05+i*0.03, 0.9, { gain:0.1, type:"triangle", att:0.02 })); },
  restTick(){ tone(NT.E5, 0, 0.12, { gain:0.28 }); tok(0, 330, 0.5); },
  restEnd(){ bell(NT.A5, 0, 1.1, 0.2); bell(NT.E6, 0.14, 1.1, 0.16); },
  remove(){ tone(170, 0, 0.12, { gain:0.3, to:95, att:0.003 }); tok(0, 140, 0.7); },
};
const UI_SOUNDS = new Set(["tick","step","open","close","seg","swipe","remove"]);
function sfx(name, arg){
  if(!soundOn() || !SFX[name]) return;
  if(UI_SOUNDS.has(name)){
    if(S.settings.uiSound===false) return;              // clics de l'interface coupés à part
    const now = performance.now(); if(now-lastTok<60) return; lastTok = now; // jamais en rafale
  }
  if(!AC || AC.state!=="running"){ if(!audioReady() || AC.state!=="running") return; }
  try{ SFX[name](arg); }catch(e){}
}

// petit « toc » uniquement quand on change une sélection (segments, filtres, interrupteurs) :
// ni les onglets, ni la navigation, ni les boutons ordinaires ne font de bruit.
document.addEventListener("click", e=>{
  const b = e.target.closest && e.target.closest(".seg button:not(.on), .type-chip:not(.on), #pickerCats .chip, #pickerChips .chip, .switch, .tpl-daypick button, .chip[data-a^='toggle']");
  if(b && !b.disabled) sfx("seg");
});
