// ================= GRAPHIQUES SVG (sans dépendance) =================
function lineChartSVG(values, height){
  height = height||110;
  if(!values.length) return '<div class="empty-state" style="padding:24px 10px"><span class="em">📈</span>Pas encore assez de données.</div>';
  const W=300, H=height, P=16;
  const ys = values.map(v=>v.y);
  let max=Math.max(...ys), min=Math.min(...ys,0);
  if(max===min) max = min+1;
  const range = max-min;
  const stepX = values.length>1 ? (W-2*P)/(values.length-1) : 0;
  const pts = values.map((v,i)=>{
    const x = values.length>1 ? P+i*stepX : W/2;
    const y = H-P-((v.y-min)/range)*(H-2*P);
    return [x,y];
  });
  const path = pts.map((p,i)=>(i===0?"M":"L")+p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
  const area = pts.length>1 ? path+` L${pts[pts.length-1][0].toFixed(1)},${H-P} L${pts[0][0].toFixed(1)},${H-P} Z` : "";
  const dots = pts.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2" fill="currentColor"/>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" style="color:var(--tint)">
    ${area?`<path d="${area}" fill="currentColor" opacity=".12" stroke="none"/>`:""}
    ${pts.length>1?`<path d="${path}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`:""}
    ${dots}</svg>`;
}

function barListSVG(items){
  // items: [{label, value, max}]
  if(!items.length) return "";
  return items.map(it=>{
    const pct = it.max? Math.min(100, Math.round(it.value/it.max*100)) : 0;
    return `<div style="padding:8px 16px">
      <div style="display:flex;justify-content:space-between;font-size:calc(13.5rem/17);margin-bottom:4px"><span>${esc(it.label)}</span><span style="color:var(--label2)">${it.value}</span></div>
      <div style="height:8px;border-radius:4px;background:var(--fill)"><div style="height:8px;border-radius:4px;width:${pct}%;background:var(--tint)"></div></div>
    </div>`;
  }).join("");
}
