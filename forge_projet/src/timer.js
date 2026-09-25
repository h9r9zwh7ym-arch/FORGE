// ================= TIMER DE REPOS =================
let restState = null; // {endAt, totalSec, label, exoIdx}
let restInterval = null;

function startRestTimer(sec, label, exoIdx){
  restState = { endAt: Date.now()+sec*1000, totalSec:sec, label:label||"Repos", exoIdx };
  renderRestBar();
  clearInterval(restInterval);
  restInterval = setInterval(tickRest, 250);
}
function adjustRestTimer(delta){
  if(!restState) return;
  restState.endAt += delta*1000;
  tickRest();
}
function stopRestTimer(){
  restState = null;
  clearInterval(restInterval);
  const bar = qs("#restbar");
  if(bar) bar.classList.remove("show");
  if(typeof refreshFocusRegion==="function") refreshFocusRegion();
}
function tickRest(){
  if(!restState) return;
  const remain = Math.round((restState.endAt-Date.now())/1000);
  if(remain<=0){
    if(navigator.vibrate) try{ navigator.vibrate([120,60,120]); }catch(e){}
    toast("⚡ C'est reparti — série suivante");
    if(typeof restReady!=="undefined") restReady = true;
    sfx("restEnd");
    stopRestTimer();
    return;
  }
  // 3 dernières secondes : l'anneau bat et le téléphone vibre à chaque seconde
  const wrap = document.querySelector(".ring-wrap");
  if(wrap) wrap.classList.toggle("ending", remain<=3);
  if(remain<=3 && remain!==restState.lastTick){ restState.lastTick = remain; if(navigator.vibrate) try{ navigator.vibrate(10); }catch(e){} sfx("restTick"); }
  renderRestBar(remain);
  if(typeof updateFocusRing==="function") updateFocusRing(remain, restState.totalSec);
}
function fmtMMSS(sec){
  const m = Math.floor(sec/60), s = sec%60;
  return `${m}:${s<10?"0":""}${s}`;
}
function renderRestBar(remainOverride){
  const bar = qs("#restbar");
  if(!bar || !restState) return;
  const remain = remainOverride!=null? remainOverride : Math.max(0,Math.round((restState.endAt-Date.now())/1000));
  // sur l'onglet Aujourd'hui, l'anneau du mode focus remplace la pastille tant que
  // l'exercice au repos est celui affiché ; sinon la pastille reste visible partout.
  const focusShowing = typeof currentTab!=="undefined" && currentTab==="today" && typeof liveFocusIdx!=="undefined" && liveFocusIdx===restState.exoIdx;
  if(focusShowing){ bar.classList.remove("show"); return; }
  bar.classList.add("show");
  bar.innerHTML = `<div class="rt-time">${fmtMMSS(remain)}</div><div class="rt-label">${esc(restState.label)}</div>
    <button data-a="restAdjust" data-d="-15">−15</button><button data-a="restAdjust" data-d="15">+15</button><button data-a="restSkip">Passer</button>`;
}
Object.assign(ACT, {
  restAdjust(d){ adjustRestTimer(parseInt(d.d,10)); },
  restSkip(){ stopRestTimer(); },
});
