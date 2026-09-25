// ================= TIMER DE REPOS =================
let restState = null; // {endAt, totalSec, label}
let restInterval = null;

function startRestTimer(sec, label){
  restState = { endAt: Date.now()+sec*1000, totalSec:sec, label:label||"Repos" };
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
}
function tickRest(){
  if(!restState) return;
  const remain = Math.round((restState.endAt-Date.now())/1000);
  if(remain<=0){
    if(navigator.vibrate) try{ navigator.vibrate([120,60,120]); }catch(e){}
    toast("Repos terminé — série suivante");
    stopRestTimer();
    return;
  }
  renderRestBar(remain);
}
function fmtMMSS(sec){
  const m = Math.floor(sec/60), s = sec%60;
  return `${m}:${s<10?"0":""}${s}`;
}
function renderRestBar(remainOverride){
  const bar = qs("#restbar");
  if(!bar || !restState) return;
  const remain = remainOverride!=null? remainOverride : Math.max(0,Math.round((restState.endAt-Date.now())/1000));
  bar.classList.add("show");
  bar.innerHTML = `<div class="rt-time">${fmtMMSS(remain)}</div><div class="rt-label">${esc(restState.label)}</div>
    <button data-a="restAdjust" data-d="-15">−15</button><button data-a="restAdjust" data-d="15">+15</button><button data-a="restSkip">Passer</button>`;
}
Object.assign(ACT, {
  restAdjust(d){ adjustRestTimer(parseInt(d.d,10)); },
  restSkip(){ stopRestTimer(); },
});
