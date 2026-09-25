// ================= INITIALISATION =================
const APP_VERSION = "1.8";
const COPYRIGHT = `© ${new Date().getFullYear()} Yannick Wahler. Tous droits réservés.`;

function applyTheme(){
  const t = S.settings.theme;
  if(t==="light") document.documentElement.setAttribute("data-theme","light");
  else if(t==="dark") document.documentElement.setAttribute("data-theme","dark");
  else document.documentElement.removeAttribute("data-theme");
}

// ---------- animation de lancement ----------
// Les animations portent sur des <div> (le marteau, l'enclume, les étincelles) et
// jamais sur des éléments internes aux SVG : piège Safari documenté dans Zeste.
function splashTagline(){
  const t = plannedTemplate();
  if(t && !sessionsToday().some(s=>s.tplId===t.id)) return `Aujourd'hui : ${t.n}`;
  const streak = currentStreakWeeks();
  if(streak>=2) return `${streak} semaines d'affilée — on continue`;
  if(sessionsToday().length) return "Séance du jour déjà faite, bravo";
  return "Forge ton corps, séance après séance";
}
function showSplash(){
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sp = document.createElement("div");
  sp.id = "splash";
  sp.className = reduce ? "splash reduce" : "splash";
  const sparks = Array.from({length:18}, (_,i)=>{
    const a = -170 + i*(160/17) + (Math.random()*10-5);
    return `<i style="--a:${a.toFixed(0)}deg;--d:${(46+Math.random()*50).toFixed(0)}px;--t:${(Math.random()*0.08).toFixed(2)}s;--s:${(0.6+Math.random()*0.7).toFixed(2)}"></i>`;
  }).join("");
  sp.innerHTML = `<div class="sp-stage">
      <div class="sp-glow"></div>
      <div class="sp-anvil"><svg viewBox="0 0 120 64" aria-hidden="true"><path d="M4 6H86c14 0 26 4 32 10H86v8c0 6-6 8-12 10l-4 12h12v12H38V46h12l-4-12c-10-2-20-6-26-14H4Z" fill="#34343a"/><path d="M4 6H86c14 0 26 4 32 10H86" stroke="#7a7a84" stroke-width="3" fill="none"/></svg></div>
      <div class="sp-hammer"><svg viewBox="0 0 80 80" aria-hidden="true"><rect x="36" y="18" width="8" height="60" rx="3" fill="#8a5a34"/><rect x="12" y="4" width="56" height="18" rx="4" fill="#9aa0a8"/><rect x="12" y="4" width="56" height="5" rx="2" fill="#c8ccd2"/></svg></div>
      <div class="sp-sparks">${sparks}</div>
    </div>
    <div class="sp-word">${"Forge".split("").map((c,i)=>`<span style="--i:${i}">${c}</span>`).join("")}</div>
    <div class="sp-tag">${esc(splashTagline())}</div>`;
  document.body.appendChild(sp);
  let gone = false;
  const leave = ()=>{
    if(gone) return; gone = true;
    sp.classList.add("out");
    setTimeout(()=>sp.remove(), 450);
  };
  sp.addEventListener("click", leave);
  setTimeout(leave, reduce ? 700 : 2000);
}

function init(){
  buildShell();
  applyTheme();
  checkMedals(true); // médailles déjà méritées (ex. après mise à jour) : attribuées sans célébration
  applyPlannedSession(); // la séance prévue aujourd'hui s'affiche directement
  switchTab("today");
  showSplash();

  const fi = qs("#fileImport");
  if(fi){
    fi.addEventListener("change", async (e)=>{
      const file = e.target.files[0];
      if(!file) return;
      const text = await file.text();
      const res = importProgramJSON(text);
      fi.value = "";
      if(res.ok){
        toast(`Programme importé : ${res.count} séance(s)`);
        changed();
        if(res.warnings && res.warnings.length){
          setTimeout(()=>openModal(`<div style="font-weight:700">Avertissements</div>
            <div class="hr-note" style="margin-top:8px;text-align:left">${res.warnings.map(esc).join("<br>")}</div>
            <button class="btn secondary" style="margin-top:14px" data-a="closesheet">OK</button>`), 380);
        }
      } else {
        openModal(`<div style="font-weight:700;color:var(--red)">Import impossible</div>
          <div class="hr-note" style="margin-top:8px">${esc(res.error)}</div>
          <button class="btn secondary" style="margin-top:14px" data-a="closesheet">OK</button>`);
      }
    });
  }
}

init();
