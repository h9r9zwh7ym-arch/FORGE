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

// notes (Hz)
const NT = { C5:523.25, D5:587.33, E5:659.25, G5:783.99, A5:880, C6:1046.5, D6:1174.7, E6:1318.5, G6:1568, A6:1760, C7:2093 };
const SFX = {
  tick(){ tone(1900, 0, 0.035, { gain:0.2, type:"triangle" }); },
  step(up){ tone(up ? 1500 : 1150, 0, 0.05, { gain:0.24, type:"triangle", to: up ? 1750 : 950 }); },
  open(){ tone(420, 0, 0.12, { gain:0.3, to:760 }); },
  close(){ tone(700, 0, 0.1, { gain:0.26, to:380 }); },
  seg(){ tone(1250, 0, 0.04, { gain:0.18, type:"triangle" }); },
  swipe(){ whoosh(0, 0.22, 900, 2600, 0.35); },
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
  restTick(){ tone(NT.E6, 0, 0.08, { gain:0.3, type:"triangle" }); },
  restEnd(){ bell(NT.A5, 0, 1.1, 0.2); bell(NT.E6, 0.14, 1.1, 0.16); },
  remove(){ tone(260, 0, 0.14, { gain:0.4, to:150 }); },
};
function sfx(name, arg){
  if(!soundOn() || !SFX[name]) return;
  if(!AC || AC.state!=="running"){ if(!audioReady() || AC.state!=="running") return; }
  try{ SFX[name](arg); }catch(e){}
}

// petit « tic » pour les contrôles de sélection (segments, puces, interrupteurs, onglets, bandeau)
document.addEventListener("click", e=>{
  const b = e.target.closest && e.target.closest(".seg button, .type-chip, .chip, .tabbtn, .ls-chip, .navbtn, .wp-day, .tpl-daypick button");
  if(b && !b.disabled) sfx("seg");
});
