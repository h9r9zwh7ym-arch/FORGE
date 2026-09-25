// ================= GRAPHIQUES (sans dépendance) =================
// Une seule série par graphique, couleur d'accent, texte en jetons de texte.
// Colonnes et calendrier en HTML (les animations CSS dans un SVG bouclent sous Safari
// quand un conteneur parent anime, cf. Zeste) ; courbes en SVG, révélées par un
// clip-path animé sur leur conteneur HTML.

function niceStep(max, count){
  const raw = max/(count||3);
  const mag = Math.pow(10, Math.floor(Math.log10(raw||1)));
  const n = raw/mag;
  return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*mag;
}
function niceTicks(max, count){
  if(!(max>0)) return [0,1];
  const step = niceStep(max, count);
  const ticks = [];
  for(let v=0; v<=max+step*0.999; v+=step) ticks.push(round1(v));
  if(ticks[ticks.length-1]<max) ticks.push(round1(ticks[ticks.length-1]+step));
  return ticks;
}
function fmtTick(v){ return v>=10000 ? fmtDec(v/1000)+"k" : v%1 ? fmtDec(v) : fmtNum(v); }

// values: [{label, v, tip}] — la dernière colonne (période en cours) est mise en valeur
function columnChart(values, opts){
  opts = opts||{};
  const max = Math.max(1, ...values.map(x=>x.v), opts.goal||0);
  const ticks = niceTicks(max, 3), top = ticks[ticks.length-1];
  const every = Math.ceil(values.length/4);
  const grid = ticks.map(t=>`<div class="cc-gl" style="bottom:${t/top*100}%"><span>${fmtTick(t)}</span></div>`).join("");
  const goal = opts.goal ? `<div class="cc-goal" style="bottom:${opts.goal/top*100}%"><span>objectif</span></div>` : "";
  const cols = values.map((x,i)=>{
    const last = i===values.length-1;
    const h = x.v/top*100;
    return `<div class="cc-col" data-tip="${esc(x.tip||(x.label+" : "+fmtTick(x.v)))}" tabindex="0">
      ${last && x.v>0 ? `<div class="cc-val" style="bottom:${h}%">${esc(opts.fmt?opts.fmt(x.v):fmtTick(x.v))}</div>`:""}
      <div class="cc-bar ${last?"cur":""}" style="height:${h}%;--i:${i}"></div>
    </div>`;
  }).join("");
  const xl = values.map((x,i)=>`<span>${(i%every===0||i===values.length-1)?esc(x.label):""}</span>`).join("");
  return `<div class="colchart"><div class="cc-plot">${grid}${goal}<div class="cc-bars">${cols}</div></div><div class="cc-x">${xl}</div></div>`;
}

// points: [{label, v, tip}] en ordre chronologique
function lineChart(points, opts){
  opts = opts||{};
  if(points.length<2) return `<div class="chart-empty">${points.length? "Encore une séance et la courbe apparaît." : "Pas encore de données."}</div>`;
  const W=320, H=150, L=34, R=14, T=14, B=24;
  const vals = points.map(p=>p.v);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if(opts.zero) lo = 0;
  const pad = (hi-lo)*0.15 || Math.max(1,hi*0.1);
  const step = niceStep(hi-lo+pad*2, 3);
  const y0 = Math.max(opts.zero?0:-Infinity, Math.floor((lo-pad)/step)*step), y1 = Math.ceil((hi+pad)/step)*step;
  const X = i => L + i*(W-L-R)/(points.length-1);
  const Y = v => T + (1-(v-y0)/(y1-y0))*(H-T-B);
  const grid = [];
  for(let v=y0; v<=y1+step*0.001; v+=step){
    grid.push(`<line x1="${L}" x2="${W-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="lc-grid"/><text x="${L-6}" y="${(Y(v)+3.5).toFixed(1)}" text-anchor="end" class="lc-tick">${fmtTick(round1(v))}</text>`);
  }
  const pts = points.map((p,i)=>[X(i),Y(p.v)]);
  const line = pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
  const area = `${line} L${pts[pts.length-1][0].toFixed(1)},${H-B} L${pts[0][0].toFixed(1)},${H-B} Z`;
  const last = pts[pts.length-1];
  const hits = points.map((p,i)=>`<circle cx="${pts[i][0].toFixed(1)}" cy="${pts[i][1].toFixed(1)}" r="12" class="lc-hit" data-tip="${esc(p.tip||(p.label+" : "+p.v))}" tabindex="0"/>`).join("");
  return `<div class="linechart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria||"Évolution")}">
    ${grid.join("")}
    <path d="${area}" class="lc-area"/>
    <path d="${line}" class="lc-line"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4.5" class="lc-dot"/>
    <text x="${Math.min(last[0],W-R).toFixed(1)}" y="${(last[1]-10).toFixed(1)}" text-anchor="end" class="lc-endlbl">${esc(opts.fmt?opts.fmt(points[points.length-1].v):fmtDec(points[points.length-1].v))}</text>
    <text x="${L}" y="${H-6}" class="lc-tick">${esc(points[0].label)}</text>
    <text x="${W-R}" y="${H-6}" text-anchor="end" class="lc-tick">${esc(points[points.length-1].label)}</text>
    ${hits}
  </svg></div>`;
}

function sparkline(vals){
  if(vals.length<2) return "";
  const W=64, H=22, lo=Math.min(...vals), hi=Math.max(...vals), span=(hi-lo)||1;
  const pts = vals.map((v,i)=>[2+i*(W-6)/(vals.length-1), H-3-(v-lo)/span*(H-6)]);
  const last = pts[pts.length-1];
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ")}"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.6"/></svg>`;
}

// calendrier de régularité : colonnes = semaines (lundi en haut), intensité = séries du jour
function heatmap(weeks){
  const days = dayMap(), today = todayISO();
  const start = addDaysISO(weekKey(today), -7*(weeks-1));
  const maxSets = Math.max(1, ...Object.values(days).map(d=>d.sets));
  const cells = [], months = [];
  let lastMonth = -1, lastLabel = -9;
  for(let w=0; w<weeks; w++){
    const monday = addDaysISO(start, 7*w);
    const mo = parseISO(monday).getMonth();
    // un libellé de mois fait ~3 colonnes : on saute ceux qui chevaucheraient le précédent
    const show = mo!==lastMonth && w-lastLabel>=3 && (w>0 || parseISO(addDaysISO(monday,14)).getMonth()===mo);
    months.push(`<span>${show ? MOIS[mo] : ""}</span>`);
    if(show) lastLabel = w;
    lastMonth = mo;
    for(let d=0; d<7; d++){
      const iso = addDaysISO(monday, d);
      if(iso>today){ cells.push(`<i class="hm-c fut"></i>`); continue; }
      const e = days[iso];
      const lvl = !e ? 0 : e.sets/maxSets>0.66 ? 3 : e.sets/maxSets>0.33 ? 2 : 1;
      const tip = e ? `${fmtDate(iso,"long")} : ${e.sessions} séance${e.sessions>1?"s":""}, ${e.sets} séries` : `${fmtDate(iso,"long")} : repos`;
      cells.push(`<i class="hm-c l${lvl} ${iso===today?"today":""}" data-tip="${esc(tip)}"></i>`);
    }
  }
  return `<div class="heatmap" style="--w:${weeks}">
    <div class="hm-months">${months.join("")}</div>
    <div class="hm-body"><div class="hm-days"><span>L</span><span></span><span>M</span><span></span><span>V</span><span></span><span>D</span></div>
    <div class="hm-grid">${cells.join("")}</div></div>
    <div class="hm-legend">Moins <i class="hm-c l0"></i><i class="hm-c l1"></i><i class="hm-c l2"></i><i class="hm-c l3"></i> Plus</div>
  </div>`;
}

// barres horizontales (une seule couleur : les catégories n'ont pas d'ordre de valeur)
function hbarList(items){
  const max = Math.max(1,...items.map(x=>x.value));
  return items.map((it,i)=>`<div class="hb-row" data-tip="${esc(it.label+" : "+it.value+" "+(it.unit||""))}">
    <div class="hb-top"><span>${it.region?`<i class="hb-dot r-${it.region}"></i>`:""}${esc(it.label)}</span><span class="hb-v">${it.value}${it.unit?" "+esc(it.unit):""}</span></div>
    <div class="hb-track"><div class="hb-fill" style="width:${it.value/max*100}%;--i:${i}"></div></div>
  </div>`).join("");
}

// tableau équivalent (accessibilité : toute valeur reste lisible sans survol)
function dataTable(headers, rows){
  return `<details class="dtable"><summary>Voir les données</summary><table>
    <thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></details>`;
}
