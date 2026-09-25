// ================= INITIALISATION =================
const APP_VERSION = "1.2";
const COPYRIGHT = `© ${new Date().getFullYear()} Yannick Wahler. Tous droits réservés.`;

function applyTheme(){
  const t = S.settings.theme;
  if(t==="light") document.documentElement.setAttribute("data-theme","light");
  else if(t==="dark") document.documentElement.setAttribute("data-theme","dark");
  else document.documentElement.removeAttribute("data-theme");
}

function init(){
  buildShell();
  applyTheme();
  checkMedals(true); // médailles déjà méritées (ex. après mise à jour) : attribuées sans célébration
  switchTab("today");

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
