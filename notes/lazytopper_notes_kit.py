# -*- coding: utf-8 -*-

# ── verbatim locked CSS from light_note_FINAL.html ──
CSS = r"""
  :root{
    --green:hsl(152,55%,45%);--green-deep:hsl(152,60%,30%);--green-tint:hsl(152,50%,96%);--green-line:hsl(152,40%,84%);
    --navy:#0f2444;--ink:#1a2433;--ink-soft:#566173;--ink-faint:#8b94a3;
    --bg:#f6f8fa;--card:#fff;--line:#e7ebf0;
    --amber-tint:#fdf6e9;--amber-line:#f0e0bf;--amber-ink:#8a6d2f;--amber:#d99a2b;
    --rose-tint:#fdf0f0;--rose-line:#f3d4d4;--rose-ink:#a8484a;--rose:#c75c5c;
    --blue:#3a6ea5;--violet:#7a5fb0;--orange:#e0883b;
    --radius:18px;--radius-sm:12px;--shadow:0 1px 2px rgba(15,36,68,.04),0 8px 24px rgba(15,36,68,.05);
    --serif:'Fraunces',Georgia,serif;--sans:'Inter',system-ui,sans-serif;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:var(--sans);background:var(--bg);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased;padding:24px}
  .wrap{max-width:780px;margin:0 auto}.katex{font-size:1.04em}
  .topbar{display:flex;align-items:center;gap:10px;margin-bottom:16px;color:var(--ink-soft);font-size:13px;font-weight:500}
  .topbar a{color:var(--ink-soft);text-decoration:none}
  .eyebrow{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:13px}
  .chip{font-size:12px;font-weight:600;padding:5px 11px;border-radius:999px;background:#eef1f5;color:var(--ink-soft);white-space:nowrap}
  .chip.unit{background:var(--green-tint);color:var(--green-deep)}
  h1.title{font-family:var(--serif);font-weight:600;font-size:38px;line-height:1.08;letter-spacing:-.02em;color:var(--navy);margin-bottom:10px}
  .board-asks{display:flex;gap:12px;align-items:flex-start;background:var(--green-tint);border:1px solid var(--green-line);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:22px}
  .board-asks .ic{flex:none;width:26px;height:26px;border-radius:7px;background:var(--green);color:#fff;display:grid;place-items:center;font-size:14px;margin-top:1px}
  .board-asks p{font-size:14px;margin:0}.board-asks b{color:var(--green-deep)}
  .tabs{display:flex;gap:4px;background:#eceff3;padding:4px;border-radius:12px;margin-bottom:24px;position:sticky;top:12px;z-index:20}
  .tab{flex:1;text-align:center;font-size:14px;font-weight:600;padding:9px 12px;border-radius:9px;border:none;background:transparent;color:var(--ink-soft);cursor:pointer;font-family:var(--sans);transition:.15s}
  .tab.active{background:#fff;color:var(--navy);box-shadow:0 1px 3px rgba(15,36,68,.1)}
  .panel{display:none}.panel.show{display:block;animation:fade .25s ease}
  @keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
  section.block{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:22px 24px;margin-bottom:16px;box-shadow:var(--shadow)}
  .sec-label{font-size:11.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--green-deep);margin-bottom:10px}
  h2.sec{font-family:var(--serif);font-weight:600;font-size:23px;color:var(--navy);margin-bottom:12px;letter-spacing:-.01em}
  p{font-size:15px;margin-bottom:10px}p:last-child{margin-bottom:0}
  b.t{color:var(--navy);font-weight:600}
  .hint{font-size:13px;color:var(--ink-faint);font-style:italic;margin-bottom:12px}
  .defs{display:grid;gap:10px;margin-top:6px}
  .def{border:1px solid var(--line);border-left:3px solid var(--green);border-radius:10px;padding:13px 15px;background:#fcfdfe}
  .def .name{font-weight:700;color:var(--navy);font-size:14.5px;margin-bottom:3px}
  .def .body{font-size:14px;color:var(--ink-soft)}
  .concepts{display:grid;gap:10px}
  .concept{display:grid;grid-template-columns:auto 1fr;gap:13px;align-items:start;padding:13px 15px;border:1px solid var(--line);border-radius:11px;background:#fcfdfe}
  .concept .dot{flex:none;width:28px;height:28px;border-radius:8px;background:var(--green-tint);color:var(--green-deep);display:grid;place-items:center;font-weight:700;font-size:13px;margin-top:1px}
  .concept .ctitle{font-weight:600;color:var(--navy);font-size:14.5px}
  .concept .cbody{font-size:13.5px;color:var(--ink-soft);margin-top:3px}
  .concept .tested{display:inline-block;margin-top:7px;font-size:12px;font-weight:600;color:var(--green-deep);background:var(--green-tint);padding:3px 9px;border-radius:999px}
  .figure{margin-top:14px;border:1px solid var(--line);border-radius:13px;overflow:hidden;background:#fcfdfe}
  .figure .fcap{padding:9px 14px;font-size:12px;font-weight:600;color:var(--ink-soft);border-bottom:1px solid var(--line)}
  .figure .fcap .ft{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--green-deep);margin-right:6px}
  .figure svg,.figure img{display:block;width:100%;height:auto;background:#fff}
  .figure .flegend{padding:9px 14px;border-top:1px solid var(--line);font-size:12.5px;color:var(--ink-soft);display:flex;flex-wrap:wrap;gap:14px}
  .figure .flegend span{display:inline-flex;align-items:center;gap:5px}
  .figure .flegend i{width:16px;height:3px;border-radius:2px;display:inline-block}
  .ex{border:1px solid var(--line);border-radius:13px;margin-bottom:13px;overflow:hidden;background:#fff}
  .ex-head{display:flex;align-items:center;gap:10px;padding:13px 16px;background:var(--navy);color:#eaf0f8;cursor:pointer;user-select:none}
  .ex-head .shape{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#7fd6ab}
  .ex-head .qmeta{margin-left:auto;font-size:11.5px;color:#9fb3cf;font-weight:600}
  .ex-head .caret{margin-left:8px;transition:.2s;color:#9fb3cf}
  .ex.open .caret{transform:rotate(90deg)}
  .ex-q{padding:14px 16px;font-family:var(--serif);font-style:italic;font-size:15px;color:var(--navy);background:#fbfdff;border-bottom:1px solid var(--line)}
  .ex-body{display:none;padding:14px 16px}.ex.open .ex-body{display:block;animation:fade .2s}
  .steps{display:grid;gap:9px}
  .step{display:grid;grid-template-columns:auto 1fr;gap:12px;padding:11px 13px;border:1px solid var(--line);border-radius:10px}
  .step .n{flex:none;width:24px;height:24px;border-radius:50%;background:var(--green);color:#fff;display:grid;place-items:center;font-weight:700;font-size:12px}
  .step .sbody{font-size:14px}.step .lead{font-weight:600;color:var(--navy)}
  .step .ctag{display:inline-block;margin-top:5px;font-size:11.5px;font-weight:600;color:var(--ink-soft);background:#eef1f5;padding:2px 8px;border-radius:6px}
  .marklogic{margin-top:13px;border:1px dashed var(--green-line);background:var(--green-tint);border-radius:10px;padding:11px 13px;font-size:13px;color:var(--green-deep)}
  .strat{display:grid;gap:9px}
  .strat .row{display:grid;grid-template-columns:auto 1fr;gap:11px;align-items:start;font-size:14px}
  .strat .arrow{color:var(--green);font-weight:700;margin-top:1px}.strat .cue{font-weight:600;color:var(--navy)}
  .pitfalls{background:var(--rose-tint);border-color:var(--rose-line)}
  .pitfalls .sec-label{color:var(--rose-ink)}.pitfalls h2.sec{color:#7a2f31}
  .pit{display:grid;grid-template-columns:auto 1fr;gap:11px;font-size:14px;padding:9px 0;border-bottom:1px solid var(--rose-line)}
  .pit:last-child{border-bottom:none}.pit .x{color:var(--rose-ink);font-weight:700}.pit b{color:#7a2f31}
  .frow{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px}
  .fitem{background:#fcfdfe;border:1px solid var(--green-line);border-radius:11px;padding:13px 15px}
  .fitem.full{grid-column:1/-1}
  .fitem .flabel{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--green-deep);margin-bottom:7px}
  .fitem .fval{font-size:16px;color:var(--navy)}
  .signtable{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
  .signcard{border:1px solid var(--line);border-radius:11px;padding:13px 15px;background:#fcfdfe}
  .signcard h4{font-size:13px;color:var(--navy);margin-bottom:7px;font-weight:700}
  .rulelist{display:grid;gap:9px;margin-top:8px}
  .rulei{display:grid;grid-template-columns:auto 1fr;gap:11px;font-size:14px;padding:10px 13px;border:1px solid var(--line);border-radius:10px;background:#fcfdfe}
  .rulei .rn{flex:none;width:22px;height:22px;border-radius:6px;background:var(--green-tint);color:var(--green-deep);display:grid;place-items:center;font-weight:700;font-size:12px}
  .rxn{display:grid;gap:7px;margin-top:9px}
  .rxn .req{background:#fcfdfe;border:1px solid var(--line);border-left:3px solid var(--violet);border-radius:9px;padding:10px 13px;font-size:14.5px;color:var(--navy)}
  .rxn .cond{font-size:12px;color:var(--ink-faint);display:block;margin-top:3px}
  .mm-intro{font-size:13.5px;color:var(--ink-soft);margin-bottom:10px;text-align:center}
  .mm-controls{display:flex;gap:8px;justify-content:center;margin-bottom:12px;flex-wrap:wrap}
  .mm-btn{font-size:12.5px;font-weight:600;padding:6px 13px;border-radius:8px;border:1px solid var(--line);background:#fff;color:var(--ink-soft);cursor:pointer;font-family:var(--sans)}
  #mmStage{width:100%;height:600px;background:#fcfdfe;border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden}
  #mmStage svg{width:100%;height:100%;display:block;cursor:grab}
  .mm-link{fill:none;stroke-width:2px;opacity:.45}
  .node-card{cursor:pointer}.node-label{font-family:var(--sans);font-weight:600;fill:var(--navy)}
  .node-root rect{fill:var(--navy)}.node-root .node-label{fill:#fff;font-family:var(--serif)}
  .leaf .node-label{fill:var(--ink-soft);font-weight:500}
  .footnote{text-align:center;font-size:12px;color:var(--ink-faint);font-style:italic;margin:20px 0 4px}
  .insight{background:var(--amber-tint);border:1px solid var(--amber-line);border-radius:11px;padding:12px 15px;font-size:13px;color:var(--amber-ink);margin-top:14px}
  .pdf-btn{flex:0 0 auto;margin-left:6px;font-size:12.5px;font-weight:600;padding:9px 12px;border-radius:9px;border:1px solid var(--green-line);background:#fff;color:var(--green-deep);cursor:pointer;display:inline-flex;align-items:center;gap:5px;font-family:var(--sans);white-space:nowrap}.pdf-btn:hover{background:var(--green-tint)}@media print{@page{margin:14mm}.topbar,.tabs,.mm-intro,.mm-controls,.pdf-btn{display:none!important}.panel{display:none!important}.panel.show{display:block!important}#mmStage{height:auto;min-height:55vh;overflow:visible}#mmStage svg{width:100%;height:auto}body{padding:0}.wrap{max-width:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}.figure img,.figure svg{max-height:235mm;width:auto;max-width:100%;margin:0 auto}.block,.def,.concept,.figure,.ex,.rulei,.pit{break-inside:avoid}h1.title,.board-asks{break-inside:avoid}}
  @media(max-width:560px){body{padding:14px}h1.title{font-size:28px}section.block{padding:18px 16px}.frow,.signtable{grid-template-columns:1fr}#mmStage{height:520px}.tabs{top:6px}}
"""

def head(title):
    return ('<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    f'<title>{title}</title>'
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">'
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css">'
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js"></script>'
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js"></script>'
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>'
    '<style>'+CSS+'</style></head><body><div class="wrap">')

# generic JS engine; only MM JSON differs per chapter
def js(mm_json, root_open_idx):
    return ('<script>'
    'function show(id,btn){document.querySelectorAll(".panel").forEach(p=>p.classList.remove("show"));'
    'document.getElementById(id).classList.add("show");document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));'
    'btn.classList.add("active");if(id==="mind")setTimeout(initMind,40);window.scrollTo({top:0,behavior:"smooth"});}'
    'function tex(h){h.parentElement.classList.toggle("open")}'
    f'const MM={mm_json};const ROPEN={root_open_idx};'
    'let mmRoot,mmSvg,mmG,mmZoom,mmInited=false;'
    'function isMobile(){return window.innerWidth<=760;}'
    'function nodeW(d){const base=d.depth===0?160:d.children||d._children?d.data.name.length*7.0+50:d.data.name.length*6.3+22;return Math.min(270,Math.max(90,base));}'
    'function initMind(){mmSvg=d3.select("#mmStage svg");mmSvg.selectAll("*").remove();mmG=mmSvg.append("g");'
    'mmZoom=d3.zoom().scaleExtent([0.4,2]).on("zoom",e=>mmG.attr("transform",e.transform));mmSvg.call(mmZoom);'
    'mmRoot=d3.hierarchy(MM);mmRoot.x0=0;mmRoot.y0=0;'
    'mmRoot.children.forEach((c,i)=>{if(!ROPEN.includes(i)&&c.children){c._children=c.children;c.children=null;}});'
    'mmInited=true;updateMind(mmRoot);setTimeout(mmFit,60);}'
    'function updateMind(source){const mobile=isMobile();d3.tree().nodeSize(mobile?[120,90]:[46,235])(mmRoot);'
    'const nodes=mmRoot.descendants(),links=mmRoot.links(),dur=400;function pos(d){return mobile?[d.x,d.depth*120]:[d.y,d.x];}'
    'const link=mmG.selectAll("path.mm-link").data(links,d=>d.target.data.name+d.target.depth);'
    'const le=link.enter().append("path").attr("class","mm-link").attr("stroke",d=>d.target.data.color||d.source.data.color||"#16b96a")'
    '.attr("d",()=>{const[x,y]=pos(source.__o||source);return cv(x,y,x,y,mobile);});'
    'link.merge(le).transition().duration(dur).attr("stroke",d=>d.target.data.color||d.source.data.color||"#16b96a")'
    '.attr("d",d=>{const[sx,sy]=pos(d.source),[tx,ty]=pos(d.target);return cv(sx,sy,tx,ty,mobile);});'
    'link.exit().transition().duration(dur).attr("d",()=>{const[x,y]=pos(source);return cv(x,y,x,y,mobile);}).remove();'
    'const node=mmG.selectAll("g.node-card").data(nodes,d=>d.data.name+d.depth);'
    'const ne=node.enter().append("g").attr("class",d=>"node-card"+(d.depth===0?" node-root":"")+(!d.children&&!d._children?" leaf":""))'
    '.attr("transform",()=>{const[x,y]=pos(source.__o||source);return`translate(${x},${y})`;})'
    '.on("click",(e,d)=>{if(d.children){d._children=d.children;d.children=null;}else if(d._children){d.children=d._children;d._children=null;}updateMind(d);});'
    'ne.append("rect").attr("height",30).attr("rx",11).attr("y",-15).attr("fill",d=>d.depth===0?"#0f2444":"#fff")'
    '.attr("stroke",d=>d.depth===0?"#0f2444":(d.data.color||"#e7ebf0")).attr("stroke-width",d=>d.depth===1?2:1.3);'
    'ne.append("text").attr("class","node-label").attr("dy","0.32em").attr("x",12).style("font-size",d=>d.depth===0?"13.5px":"12.5px");'
    'const nu=ne.merge(node);nu.transition().duration(dur).attr("transform",d=>{const[x,y]=pos(d);return`translate(${x},${y})`;});'
    'nu.select("text").text(d=>d.data.name+(d._children?"  +":d.children&&d.depth>0?"  \u2212":""));'
    'nu.select("rect").attr("width",d=>nodeW(d));node.exit().transition().duration(dur).style("opacity",0).remove();'
    'nodes.forEach(d=>{d.__o={x:d.x,depth:d.depth,y:d.y};});}'
    'function cv(sx,sy,tx,ty,mobile){if(mobile){const my=(sy+ty)/2;return`M ${sx} ${sy} C ${sx} ${my}, ${tx} ${my}, ${tx} ${ty}`;}const mx=(sx+tx)/2;return`M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;}'
    'function mmExpand(open){(function rec(d){if(open){if(d._children){d.children=d._children;d._children=null;}}else{if(d.children&&d.depth>0){d._children=d.children;d.children=null;}}(d.children||d._children||[]).forEach(rec);})(mmRoot);updateMind(mmRoot);setTimeout(mmFit,60);}'
    'function mmFit(){if(!mmInited)return;const st=document.getElementById("mmStage"),sw=st.clientWidth,sh=st.clientHeight,b=mmG.node().getBBox();if(!b.width)return;const sc=Math.min((sw-60)/b.width,(sh-60)/b.height,1.3),tx=(sw-b.width*sc)/2-b.x*sc,ty=(sh-b.height*sc)/2-b.y*sc;mmSvg.transition().duration(400).call(mmZoom.transform,d3.zoomIdentity.translate(tx,ty).scale(sc));}'
    'function renderMath(){if(window.renderMathInElement)renderMathInElement(document.body,{delimiters:[{left:"$",right:"$",display:false}],throwOnError:false});}'
    'window.addEventListener("load",renderMath);'
    'let rT;window.addEventListener("resize",()=>{clearTimeout(rT);rT=setTimeout(()=>{if(document.getElementById("mind").classList.contains("show"))initMind();},250);});'
    '(function(){var t=document.querySelector(".tabs");if(t){var b=document.createElement("button");b.className="pdf-btn";b.innerHTML="\u2913\u00a0Save as PDF";b.title="Save this tab as PDF / print";b.onclick=function(){window.print();};t.appendChild(b);}window.addEventListener("beforeprint",function(){var m=document.getElementById("mind");if(m&&m.classList.contains("show")&&typeof mmFit==="function"){try{mmFit();}catch(e){}}});})();</script></body></html>')

# mindmap panel scaffold (same for all)
def mind_panel():
    return ('<div class="panel" id="mind"><div class="mm-intro">Tap a branch to expand. Drag to pan, scroll to zoom.</div>'
    '<div class="mm-controls"><button class="mm-btn" onclick="mmExpand(true)">Expand all</button>'
    '<button class="mm-btn" onclick="mmExpand(false)">Collapse all</button><button class="mm-btn" onclick="mmFit()">Fit</button></div>'
    '<div id="mmStage"><svg></svg></div></div>')


# ───────────────────────── ELECTRICITY (Physics · Ch 11) ─────────────────────────
def zig(x0,x1,y,n=6,amp=7):
    pts=[(x0,y)]; seg=(x1-x0)/n
    for i in range(1,n): pts.append((x0+seg*i, y+(amp if i%2 else -amp)))
    pts.append((x1,y)); return " ".join(f"{round(a,1)},{round(b,1)}" for a,b in pts)

VI_SVG = ('<svg viewBox="0 0 440 300" xmlns="http://www.w3.org/2000/svg" font-family="Inter,sans-serif">'
 '<defs><marker id="ah" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#566173"/></marker></defs>'
 '<line x1="55" y1="255" x2="415" y2="255" stroke="#566173" stroke-width="1.4" marker-end="url(#ah)"/>'
 '<line x1="55" y1="255" x2="55" y2="40" stroke="#566173" stroke-width="1.4" marker-end="url(#ah)"/>'
 '<line x1="55" y1="255" x2="400" y2="58" stroke="hsl(152,55%,45%)" stroke-width="2.6"/>'
 + "".join(f'<circle cx="{55+i*69}" cy="{255-i*39.4}" r="3.4" fill="hsl(152,60%,30%)"/>' for i in range(1,6)) +
 '<text x="235" y="285" font-size="13" fill="#566173" text-anchor="middle">Current  I  (A)  \u2192</text>'
 '<text x="20" y="150" font-size="13" fill="#566173" text-anchor="middle" transform="rotate(-90 20 150)">Potential difference  V  (V)  \u2192</text>'
 '<text x="330" y="120" font-size="13" fill="hsl(152,60%,30%)" font-weight="700">V \u221d I</text>'
 '<text x="62" y="270" font-size="12" fill="#8b94a3">O</text></svg>')

SERIES_SVG = ('<svg viewBox="0 0 460 170" xmlns="http://www.w3.org/2000/svg" font-family="Inter,sans-serif">'
 '<rect x="40" y="30" width="380" height="110" rx="6" fill="none" stroke="#0f2444" stroke-width="2"/>'
 # break top wire for three resistors
 '<rect x="55" y="22" width="350" height="16" fill="#fff"/>'
 f'<polyline points="{zig(70,150,30)}" fill="none" stroke="hsl(152,55%,45%)" stroke-width="2.2"/>'
 f'<polyline points="{zig(190,270,30)}" fill="none" stroke="hsl(152,55%,45%)" stroke-width="2.2"/>'
 f'<polyline points="{zig(310,390,30)}" fill="none" stroke="hsl(152,55%,45%)" stroke-width="2.2"/>'
 '<line x1="150" y1="30" x2="190" y2="30" stroke="#0f2444" stroke-width="2"/>'
 '<line x1="270" y1="30" x2="310" y2="30" stroke="#0f2444" stroke-width="2"/>'
 '<text x="110" y="18" font-size="13" fill="hsl(152,60%,30%)" text-anchor="middle">R\u2081</text>'
 '<text x="230" y="18" font-size="13" fill="hsl(152,60%,30%)" text-anchor="middle">R\u2082</text>'
 '<text x="350" y="18" font-size="13" fill="hsl(152,60%,30%)" text-anchor="middle">R\u2083</text>'
 # battery on left side
 '<line x1="40" y1="78" x2="40" y2="86" stroke="#fff" stroke-width="6"/>'
 '<line x1="34" y1="74" x2="46" y2="74" stroke="#0f2444" stroke-width="2"/><line x1="37" y1="82" x2="43" y2="82" stroke="#0f2444" stroke-width="3"/>'
 '<line x1="34" y1="90" x2="46" y2="90" stroke="#0f2444" stroke-width="2"/><line x1="37" y1="98" x2="43" y2="98" stroke="#0f2444" stroke-width="3"/>'
 '<text x="22" y="90" font-size="12" fill="#566173">+ \u2212</text>'
 # ammeter on bottom
 '<circle cx="230" cy="140" r="13" fill="#fff" stroke="#0f2444" stroke-width="2"/><text x="230" y="145" font-size="13" fill="#0f2444" text-anchor="middle">A</text>'
 '<rect x="217" y="127" width="26" height="26" fill="#fff" opacity="0"/>'
 '<text x="230" y="166" font-size="12" fill="#566173" text-anchor="middle">same current I everywhere</text></svg>')

PARALLEL_SVG = ('<svg viewBox="0 0 460 210" xmlns="http://www.w3.org/2000/svg" font-family="Inter,sans-serif">'
 '<line x1="150" y1="30" x2="150" y2="150" stroke="#0f2444" stroke-width="2"/>'
 '<line x1="320" y1="30" x2="320" y2="150" stroke="#0f2444" stroke-width="2"/>'
 '<text x="142" y="26" font-size="13" fill="#0f2444" text-anchor="end">X</text>'
 '<text x="328" y="26" font-size="13" fill="#0f2444">Y</text>'
 + "".join(
   f'<line x1="150" y1="{y}" x2="180" y2="{y}" stroke="#0f2444" stroke-width="2"/>'
   f'<polyline points="{zig(180,290,y)}" fill="none" stroke="hsl(152,55%,45%)" stroke-width="2.2"/>'
   f'<line x1="290" y1="{y}" x2="320" y2="{y}" stroke="#0f2444" stroke-width="2"/>'
   f'<text x="235" y="{y-9}" font-size="12" fill="hsl(152,60%,30%)" text-anchor="middle">R{sub}</text>'
   for y,sub in [(50,"\u2081"),(90,"\u2082"),(130,"\u2083")]) +
 # outer loop down to battery+ammeter
 '<line x1="150" y1="150" x2="150" y2="185" stroke="#0f2444" stroke-width="2"/>'
 '<line x1="320" y1="150" x2="320" y2="185" stroke="#0f2444" stroke-width="2"/>'
 '<line x1="150" y1="185" x2="210" y2="185" stroke="#0f2444" stroke-width="2"/>'
 '<line x1="270" y1="185" x2="320" y2="185" stroke="#0f2444" stroke-width="2"/>'
 '<line x1="226" y1="181" x2="238" y2="181" stroke="#0f2444" stroke-width="2"/><line x1="229" y1="189" x2="235" y2="189" stroke="#0f2444" stroke-width="3"/>'
 '<text x="232" y="205" font-size="12" fill="#566173" text-anchor="middle">battery</text>'
 '<circle cx="295" cy="185" r="12" fill="#fff" stroke="#0f2444" stroke-width="2"/><text x="295" y="190" font-size="12" fill="#0f2444" text-anchor="middle">A</text>'
 '<text x="385" y="93" font-size="12" fill="#566173">same V across<tspan x="385" dy="15">each branch</tspan></text></svg>')

def fig(tag,cap,inner,legend=""):
    leg = f'<div class="flegend">{legend}</div>' if legend else ""
    return f'<div class="figure"><div class="fcap"><span class="ft">{tag}</span>{cap}</div>{inner}{leg}</div>'

def ex(shape,meta,q,steps,marklogic):
    sl="".join(f'<div class="step"><div class="n">{i+1}</div><div class="sbody"><span class="lead">{lead}</span> {body}{(" <span class=ctag>"+tag+"</span>") if tag else ""}</div></div>' for i,(lead,body,tag) in enumerate(steps))
    return (f'<div class="ex" onclick="tex(this)"><div class="ex-head"><span class="shape">{shape}</span>'
            f'<span class="qmeta">{meta}</span><span class="caret">\u25B8</span></div>'
            f'<div class="ex-q">{q}</div><div class="ex-body"><div class="steps">{sl}</div>'
            f'<div class="marklogic">{marklogic}</div></div></div>')

ELEC = (head('LazyTopper \u00b7 Electricity \u2014 Physics prototype')
 + '<div class="topbar"><a href="#">\u2190 Topic Hub</a><span>\u00b7</span><span>Science</span><span>\u00b7</span><span>Physics</span></div>'
 + '<div class="eyebrow"><span class="chip unit">Physics \u00b7 Ch 11</span><span class="chip">Class 10 \u00b7 CBSE 2026\u201327</span><span class="chip">High weightage</span></div>'
 + '<h1 class="title">Electricity</h1>'
 + '<div class="board-asks"><div class="ic">\u2605</div><p><b>What the board actually asks:</b> Ohm\u2019s-law numericals, the resistance\u2013resistivity relation $R=\\rho l/A$, equivalent resistance in <b>series &amp; parallel</b>, and the <b>heating effect</b> ($H=I^2Rt$) with electric power ($P=VI$). Almost every mark sits in a numerical.</p></div>'
 + '<div class="tabs"><button class="tab active" onclick="show(\'note\',this)">Note</button>'
   '<button class="tab" onclick="show(\'mind\',this)">Mindmap</button>'
   '<button class="tab" onclick="show(\'deriv\',this)">Derivations</button></div>'
 # ---- NOTE ----
 + '<div class="panel show" id="note">'
 + '<section class="block"><div class="sec-label">The Big Idea</div><h2 class="sec">Charge flows; resistance fights back.</h2>'
   '<p>A cell sets up a <b class="t">potential difference</b> that pushes <b class="t">charge</b> through a conductor \u2014 that flow is the <b class="t">current</b>. Every conductor <b class="t">resists</b> that flow, and Ohm\u2019s law ties the three together: $V=IR$. Once you can find the equivalent resistance of a network, everything else \u2014 the current, the power, the heat \u2014 follows from $V$, $I$ and $R$.</p></section>'
 + '<section class="block"><div class="sec-label">Definitions the board rewards</div><h2 class="sec">State these exactly</h2>'
   '<p class="hint">One-mark questions ask for these word-for-word \u2014 say them the way the textbook does.</p><div class="defs">'
   '<div class="def"><div class="name">Electric current</div><div class="body">The rate of flow of electric charge through a cross-section: $I=\\dfrac{Q}{t}$. SI unit: <b>ampere (A)</b>; $1\\,\\text{A}=1\\,\\text{C/s}$.</div></div>'
   '<div class="def"><div class="name">Potential difference</div><div class="body">The work done to move a unit charge from one point to the other: $V=\\dfrac{W}{Q}$. SI unit: <b>volt (V)</b>; $1\\,\\text{V}=1\\,\\text{J/C}$.</div></div>'
   '<div class="def"><div class="name">Ohm\u2019s law</div><div class="body">The potential difference across a metallic conductor is directly proportional to the current through it, <b>provided the temperature stays constant</b>: $V\\propto I$, so $V=IR$.</div></div>'
   '<div class="def"><div class="name">Resistance</div><div class="body">The property of a conductor to oppose the flow of charge: $R=\\dfrac{V}{I}$. SI unit: <b>ohm ($\\Omega$)</b>; $1\\,\\Omega=1\\,\\text{V/A}$.</div></div>'
   '<div class="def"><div class="name">Resistivity ($\\rho$)</div><div class="body">A characteristic property of the material in $R=\\rho\\dfrac{l}{A}$. SI unit: <b>$\\Omega\\,\\text{m}$</b>. Independent of the wire\u2019s shape or size.</div></div>'
   '<div class="def"><div class="name">Electric power</div><div class="body">The rate at which electrical energy is consumed: $P=VI=I^2R=\\dfrac{V^2}{R}$. SI unit: <b>watt (W)</b>.</div></div>'
   '</div></section>'
 + '<section class="block"><div class="sec-label">Must-know concepts</div><h2 class="sec">\u2026and where they\u2019re tested</h2><div class="concepts">'
   '<div class="concept"><div class="dot">1</div><div><div class="ctitle">Ohm\u2019s law &amp; the V\u2013I graph</div><div class="cbody">For a metallic conductor at fixed temperature, $V/I$ is constant. The graph of $V$ against $I$ is a straight line through the origin \u2014 its slope is the resistance $R$.</div><span class="tested">2 mark \u00b7 graph + slope = R</span>'
   + fig('NCERT Fig 11.3 (authored)','Ohm\u2019s law: V\u2013I is a straight line through O',VI_SVG) + '</div></div>'
   '<div class="concept"><div class="dot">2</div><div><div class="ctitle">Factors affecting resistance</div><div class="cbody">$R\\propto l$ and $R\\propto \\dfrac{1}{A}$, giving $R=\\rho\\dfrac{l}{A}$. Longer wire \u2192 more resistance; thicker wire \u2192 less.</div><span class="tested">Derivation \u00b7 R \u221d l/A numerical</span></div></div>'
   '<div class="concept"><div class="dot">3</div><div><div class="ctitle">Resistivity \u2014 material property</div><div class="cbody">Conductors $\\sim 10^{-8}\\,\\Omega\\text{m}$, insulators $\\sim 10^{12}\\,\\Omega\\text{m}$. <b class="t">Alloys</b> (nichrome, manganin) have higher resistivity and don\u2019t oxidise \u2014 used in heating elements; <b class="t">tungsten</b> for bulb filaments.</div><span class="tested">Why alloys for heaters</span></div></div>'
   '<div class="concept"><div class="dot">4</div><div><div class="ctitle">Resistors in series</div><div class="cbody">Same current through each; $R_s=R_1+R_2+R_3$ \u2014 always <b>larger</b> than any single resistor.</div><span class="tested">2\u20133 mark equivalent-R</span>'
   + fig('NCERT Fig 11.6 (authored)','Resistors in series \u2014 one current path',SERIES_SVG) + '</div></div>'
   '<div class="concept"><div class="dot">5</div><div><div class="ctitle">Resistors in parallel</div><div class="cbody">Same voltage across each; $\\dfrac{1}{R_p}=\\dfrac{1}{R_1}+\\dfrac{1}{R_2}+\\dfrac{1}{R_3}$ \u2014 always <b>smaller</b> than any single resistor. Domestic wiring is parallel.</div><span class="tested">2\u20133 mark equivalent-R</span>'
   + fig('NCERT Fig 11.7 (authored)','Resistors in parallel \u2014 current splits',PARALLEL_SVG) + '</div></div>'
   '<div class="concept"><div class="dot">6</div><div><div class="ctitle">Heating effect (Joule\u2019s law)</div><div class="cbody">Heat $H=I^2Rt$ \u2014 proportional to $I^2$, to $R$, and to time. Used in the heater, the electric iron, and the <b class="t">fuse</b> (melts on excess current).</div><span class="tested">3 mark \u00b7 H = I\u00b2Rt</span></div></div>'
   '<div class="concept"><div class="dot">7</div><div><div class="ctitle">Electric power &amp; energy</div><div class="cbody">$P=VI=I^2R=\\dfrac{V^2}{R}$. Commercial energy unit is the <b class="t">kilowatt-hour</b>: $1\\,\\text{kWh}=3.6\\times10^6\\,\\text{J}$.</div><span class="tested">Power rating \u00b7 cost numerical</span></div></div>'
   '</div></section>'
 # worked examples (numericals by shape) -- all real NCERT examples
 + '<section class="block"><div class="sec-label">Worked examples \u2014 numericals by shape</div><h2 class="sec">One example per question-shape</h2>'
   '<p class="hint">Physics rule: write the <b>given quantities with units</b> at step 1, then the formula, then substitute. Sourced from NCERT Examples 11.2, 11.3, 11.8, 11.10.</p>'
 + ex('Charge / work','NCERT Ex 11.2 \u00b7 1\u20132 mk',
      'How much work is done in moving a charge of 2 C across two points having a potential difference of 12 V?',
      [('Given.','$Q=2\\,\\text{C}$, $V=12\\,\\text{V}$, $W=?$',''),
       ('Formula.','$V=\\dfrac{W}{Q}\\Rightarrow W=VQ$.','definition of V'),
       ('Substitute.','$W=12\\,\\text{V}\\times 2\\,\\text{C}=24\\,\\text{J}$.','')],
      'Mark scheme: formula (\u00bd) + correct substitution with units (\u00bd) + answer 24 J with unit (1).')
 + ex('Ohm\u2019s law','NCERT Ex 11.3 \u00b7 2 mk',
      'How much current will an electric bulb draw from a 220 V source if the resistance of the filament is 1200 \u03a9?',
      [('Given.','$V=220\\,\\text{V}$, $R=1200\\,\\Omega$, $I=?$',''),
       ('Formula.','From Ohm\u2019s law $I=\\dfrac{V}{R}$.','V = IR'),
       ('Substitute.','$I=\\dfrac{220}{1200}=0.18\\,\\text{A}$.','')],
      'Mark scheme: correct rearrangement (1) + answer 0.18 A with unit (1).')
 + ex('Parallel network','NCERT Ex 11.8 \u00b7 3 mk',
      '$R_1=5\\,\\Omega$, $R_2=10\\,\\Omega$, $R_3=30\\,\\Omega$ are connected in parallel to a 12 V battery. Find the current in each, the total current, and the total resistance.',
      [('Same voltage.','In parallel, $V=12\\,\\text{V}$ across every resistor.','parallel rule'),
       ('Branch currents.','$I_1=\\tfrac{12}{5}=2.4$, $I_2=\\tfrac{12}{10}=1.2$, $I_3=\\tfrac{12}{30}=0.4$ A.','I = V/R'),
       ('Total current.','$I=2.4+1.2+0.4=4\\,\\text{A}$.','I = I\u2081+I\u2082+I\u2083'),
       ('Equivalent R.','$\\tfrac{1}{R_p}=\\tfrac{1}{5}+\\tfrac{1}{10}+\\tfrac{1}{30}=\\tfrac{1}{3}\\Rightarrow R_p=3\\,\\Omega$.','')],
      'Mark scheme: branch currents (1) + total current (1) + $R_p=3\\,\\Omega$ (1). Note $R_p$ is smaller than the smallest resistor \u2014 a quick sanity check.')
 + ex('Power rating','NCERT Ex 11.10 \u00b7 3 mk',
      'An electric iron consumes 840 W at maximum and 360 W at minimum, on 220 V. Find the current and resistance in each case.',
      [('Formula.','$P=VI\\Rightarrow I=\\dfrac{P}{V}$; then $R=\\dfrac{V}{I}$.','P = VI'),
       ('Maximum.','$I=\\tfrac{840}{220}=3.82\\,\\text{A}$, $R=\\tfrac{220}{3.82}=57.6\\,\\Omega$.',''),
       ('Minimum.','$I=\\tfrac{360}{220}=1.64\\,\\text{A}$, $R=\\tfrac{220}{1.64}=134.2\\,\\Omega$.','')],
      'Mark scheme: each case current (\u00bd) + resistance (1) \u00d7 2 = 3. Lower power \u2192 higher resistance on the same supply.')
 + '</section>'
 # strategies
 + '<section class="block"><div class="sec-label">Strategy</div><h2 class="sec">How to attack any Electricity numerical</h2><div class="strat">'
   '<div class="row"><span class="arrow">\u2192</span><div><span class="cue">List given quantities with units first.</span> Convert mA\u2192A, cm\u2192m, min\u2192s before substituting.</div></div>'
   '<div class="row"><span class="arrow">\u2192</span><div><span class="cue">Decide series or parallel.</span> Series \u2192 same current, add R. Parallel \u2192 same voltage, add reciprocals.</div></div>'
   '<div class="row"><span class="arrow">\u2192</span><div><span class="cue">Reduce the network to one R</span> before applying $V=IR$ to the whole circuit.</div></div>'
   '<div class="row"><span class="arrow">\u2192</span><div><span class="cue">For heat/energy choose the right form:</span> $H=I^2Rt$ when $I,R$ known; $P=\\tfrac{V^2}{R}$ when $V,R$ known.</div></div>'
   '</div></section>'
 # pitfalls
 + '<section class="block pitfalls"><div class="sec-label">Pitfalls</div><h2 class="sec">Where students lose easy marks</h2>'
   '<div class="pit"><span class="x">\u2715</span><div>Adding resistances directly <b>in parallel</b>. You must add reciprocals \u2014 $R_p$ is always the smallest.</div></div>'
   '<div class="pit"><span class="x">\u2715</span><div>Forgetting that current is the same in <b>series</b> but voltage is the same in <b>parallel</b>.</div></div>'
   '<div class="pit"><span class="x">\u2715</span><div>Dropping the <b>square</b> on $I$ in $H=I^2Rt$.</div></div>'
   '<div class="pit"><span class="x">\u2715</span><div>Mixing up <b>kW</b> (power) and <b>kWh</b> (energy) in cost problems.</div></div>'
   '<div class="pit"><span class="x">\u2715</span><div>Not converting <b>time to seconds</b> when finding heat in joules.</div></div>'
   '</section>'
 # formula strip
 + '<section class="block"><div class="sec-label">One-screen recall</div><h2 class="sec">Formula &amp; fact strip</h2><div class="frow">'
   '<div class="fitem"><div class="flabel">Current</div><div class="fval">$I=\\dfrac{Q}{t}$</div></div>'
   '<div class="fitem"><div class="flabel">Ohm\u2019s law</div><div class="fval">$V=IR$</div></div>'
   '<div class="fitem"><div class="flabel">Resistivity</div><div class="fval">$R=\\rho\\dfrac{l}{A}$</div></div>'
   '<div class="fitem"><div class="flabel">Series</div><div class="fval">$R_s=R_1+R_2+R_3$</div></div>'
   '<div class="fitem"><div class="flabel">Parallel</div><div class="fval">$\\dfrac{1}{R_p}=\\sum\\dfrac{1}{R_i}$</div></div>'
   '<div class="fitem"><div class="flabel">Heating (Joule)</div><div class="fval">$H=I^2Rt$</div></div>'
   '<div class="fitem full"><div class="flabel">Power &amp; energy</div><div class="fval">$P=VI=I^2R=\\dfrac{V^2}{R}\\quad\\cdot\\quad 1\\,\\text{kWh}=3.6\\times10^6\\,\\text{J}$</div></div>'
   '</div></section></div>'
 # ---- MINDMAP ----
 + mind_panel()
 # ---- DERIVATIONS (third tab) ----
 + '<div class="panel" id="deriv">'
 + '<section class="block"><div class="sec-label">The rigorous formal core</div><h2 class="sec">Derive the combination &amp; heating laws</h2>'
   '<p class="hint">For Physics, the subject-adaptive third tab holds the chapter\u2019s <b>derivations</b> \u2014 the formal apparatus CBSE can ask you to prove.</p></section>'
 + '<section class="block"><h2 class="sec">1 \u00b7 Resistors in series</h2><div class="rulelist">'
   '<div class="rulei"><div class="rn">1</div><div>Same current $I$ flows through each resistor; the total voltage splits: $V=V_1+V_2+V_3$.</div></div>'
   '<div class="rulei"><div class="rn">2</div><div>By Ohm\u2019s law on each: $V_1=IR_1$, $V_2=IR_2$, $V_3=IR_3$, and on the whole: $V=IR_s$.</div></div>'
   '<div class="rulei"><div class="rn">3</div><div>So $IR_s=IR_1+IR_2+IR_3$. Cancel $I$: $\\boxed{R_s=R_1+R_2+R_3}$.</div></div></div></section>'
 + '<section class="block"><h2 class="sec">2 \u00b7 Resistors in parallel</h2><div class="rulelist">'
   '<div class="rulei"><div class="rn">1</div><div>Same voltage $V$ across each; the total current splits: $I=I_1+I_2+I_3$.</div></div>'
   '<div class="rulei"><div class="rn">2</div><div>$I_1=\\tfrac{V}{R_1}$, $I_2=\\tfrac{V}{R_2}$, $I_3=\\tfrac{V}{R_3}$, and $I=\\tfrac{V}{R_p}$.</div></div>'
   '<div class="rulei"><div class="rn">3</div><div>So $\\tfrac{V}{R_p}=\\tfrac{V}{R_1}+\\tfrac{V}{R_2}+\\tfrac{V}{R_3}$. Cancel $V$: $\\boxed{\\dfrac{1}{R_p}=\\dfrac{1}{R_1}+\\dfrac{1}{R_2}+\\dfrac{1}{R_3}}$.</div></div></div></section>'
 + '<section class="block"><h2 class="sec">3 \u00b7 Joule\u2019s law of heating</h2><div class="rulelist">'
   '<div class="rulei"><div class="rn">1</div><div>Work to move charge $Q$ through $V$ is $W=VQ$. With $Q=It$, energy supplied in time $t$ is $W=VIt$.</div></div>'
   '<div class="rulei"><div class="rn">2</div><div>In a purely resistive circuit this energy is dissipated as heat: $H=VIt$.</div></div>'
   '<div class="rulei"><div class="rn">3</div><div>Substitute Ohm\u2019s law $V=IR$: $\\boxed{H=I^2Rt}$ \u2014 Joule\u2019s law of heating.</div></div></div>'
   '<div class="insight"><b>Template insight:</b> the third tab is <b>subject-adaptive</b>. Maths\u2009\u2192\u2009<i>Proof</i>, Physics-Light\u2009\u2192\u2009<i>Rules</i>, and here Physics-Electricity\u2009\u2192\u2009<i>Derivations</i> \u2014 the slot is always \u201cthe rigorous formal core,\u201d its label fits what the chapter actually contains.</div></section>'
 + '</div>'
 + '<p class="footnote">Physics prototype \u00b7 Electricity \u00b7 worked examples = NCERT Examples 11.2/11.3/11.8/11.10 \u00b7 figures authored as SVG per the diagram-sourcing rule \u00b7 print-safe \u00b7 content to be validated against NCERT before locking</p>'
 + '</div>'
 + js('{"name":"Electricity","children":['
     '{"name":"Current & charge","color":"#3a6ea5","children":[{"name":"I = Q/t"},{"name":"Ampere; 1 A = 1 C/s"},{"name":"Conventional direction"}]},'
     '{"name":"Ohm\u2019s law & resistance","color":"#e0883b","children":[{"name":"V = IR"},{"name":"V\u2013I straight line"},{"name":"R = V/I, ohm"}]},'
     '{"name":"Resistance factors","color":"#16b96a","children":[{"name":"R = \u03c1 l/A"},{"name":"Length \u2191 \u2192 R \u2191"},{"name":"Area \u2191 \u2192 R \u2193"},{"name":"Resistivity = material"}]},'
     '{"name":"Combinations","color":"#7a5fb0","children":[{"name":"Series: Rs = \u03a3R"},{"name":"Parallel: 1/Rp = \u03a31/R"},{"name":"Series: same I"},{"name":"Parallel: same V"}]},'
     '{"name":"Heating & power","color":"#3a6ea5","children":[{"name":"H = I\u00b2Rt"},{"name":"P = VI = I\u00b2R = V\u00b2/R"},{"name":"Fuse, heater, bulb"},{"name":"kWh = 3.6\u00d710\u2076 J"}]},'
     '{"name":"Don\u2019t lose marks on\u2026","color":"#c75c5c","children":[{"name":"Parallel = add reciprocals"},{"name":"Square I in I\u00b2Rt"},{"name":"kW vs kWh"},{"name":"Convert units"}]}'
     ']}', '[1,3]'))

# ───────────────────────── CHEMICAL REACTIONS (Chemistry · Ch 1) ─────────────────────────
def rxn(eq,cond=""):
    c=f'<span class="cond">{cond}</span>' if cond else ""
    return f'<div class="req">{eq}{c}</div>'

CHEM = (head('LazyTopper \u00b7 Chemical Reactions & Equations \u2014 Chemistry prototype')
 + '<div class="topbar"><a href="#">\u2190 Topic Hub</a><span>\u00b7</span><span>Science</span><span>\u00b7</span><span>Chemistry</span></div>'
 + '<div class="eyebrow"><span class="chip unit">Chemistry \u00b7 Ch 1</span><span class="chip">Class 10 \u00b7 CBSE 2026\u201327</span><span class="chip">High weightage</span></div>'
 + '<h1 class="title">Chemical Reactions &amp; Equations</h1>'
 + '<div class="board-asks"><div class="ic">\u2605</div><p><b>What the board actually asks:</b> <b>balance</b> a skeletal equation (with state symbols), <b>identify the reaction type</b> (combination / decomposition / displacement / double-displacement / redox), and explain everyday effects \u2014 <b>corrosion</b> and <b>rancidity</b>. The equation <i>is</i> the answer here.</p></div>'
 + '<div class="tabs"><button class="tab active" onclick="show(\'note\',this)">Note</button>'
   '<button class="tab" onclick="show(\'mind\',this)">Mindmap</button>'
   '<button class="tab" onclick="show(\'rxn\',this)">Reactions</button></div>'
 # ---- NOTE ----
 + '<div class="panel show" id="note">'
 + '<section class="block"><div class="sec-label">The Big Idea</div><h2 class="sec">New substances, written as a balanced equation.</h2>'
   '<p>A chemical reaction makes <b class="t">new substances</b> \u2014 you spot one by a change in state, colour, temperature, or a gas. We write it as an <b class="t">equation</b>, then <b class="t">balance</b> it so atoms are conserved. Almost every reaction in this chapter sorts into one of <b class="t">five types</b>, and many are also <b class="t">redox</b> \u2014 oxygen or hydrogen changing hands.</p></section>'
 + '<section class="block"><div class="sec-label">Definitions the board rewards</div><h2 class="sec">State these exactly</h2>'
   '<p class="hint">These short definitions are 1-mark answers \u2014 say them the way the textbook does.</p><div class="defs">'
   '<div class="def"><div class="name">Balanced chemical equation</div><div class="body">An equation in which the number of atoms of each element is the <b>same on both sides</b> \u2014 because mass can neither be created nor destroyed (law of conservation of mass).</div></div>'
   '<div class="def"><div class="name">Combination reaction</div><div class="body">A reaction in which <b>a single product</b> is formed from two or more reactants.</div></div>'
   '<div class="def"><div class="name">Decomposition reaction</div><div class="body">A reaction in which <b>a single reactant breaks down</b> to give two or more simpler products.</div></div>'
   '<div class="def"><div class="name">Displacement reaction</div><div class="body">A reaction in which a more reactive element <b>displaces another element</b> from its compound.</div></div>'
   '<div class="def"><div class="name">Double-displacement reaction</div><div class="body">A reaction in which there is an <b>exchange of ions</b> between the reactants (a precipitate often forms).</div></div>'
   '<div class="def"><div class="name">Oxidation &amp; reduction</div><div class="body"><b>Oxidation</b> = gain of oxygen or loss of hydrogen. <b>Reduction</b> = loss of oxygen or gain of hydrogen. A reaction with both is a <b>redox</b> reaction.</div></div>'
   '<div class="def"><div class="name">Exothermic / endothermic</div><div class="body"><b>Exothermic</b>: heat is released with the products. <b>Endothermic</b>: energy is absorbed.</div></div>'
   '</div></section>'
 + '<section class="block"><div class="sec-label">Must-know concepts</div><h2 class="sec">\u2026and where they\u2019re tested</h2><div class="concepts">'
   '<div class="concept"><div class="dot">1</div><div><div class="ctitle">Writing &amp; balancing equations</div><div class="cbody">Balance by the hit-and-trial method \u2014 never change a formula, only the coefficients. Add state symbols $(s),(l),(g),(aq)$ to make it informative.</div><span class="tested">3 mark \u00b7 balance + states</span></div></div>'
   '<div class="concept"><div class="dot">2</div><div><div class="ctitle">Combination reactions</div><div class="cbody">Two or more reactants \u2192 one product, e.g. $\\text{CaO}+\\text{H}_2\\text{O}\\rightarrow\\text{Ca(OH)}_2$. Usually <b class="t">exothermic</b> (heat released).</div><span class="tested">Identify + example</span></div></div>'
   '<div class="concept"><div class="dot">3</div><div><div class="ctitle">Decomposition reactions</div><div class="cbody">One reactant \u2192 simpler products, driven by <b class="t">heat</b> (thermal), <b class="t">light</b> (photolytic), or <b class="t">electricity</b> (electrolytic). Usually <b class="t">endothermic</b>.</div><span class="tested">Energy-source classification</span></div></div>'
   '<div class="concept"><div class="dot">4</div><div><div class="ctitle">Displacement reactions</div><div class="cbody">A more reactive metal displaces a less reactive one: $\\text{Fe}+\\text{CuSO}_4\\rightarrow\\text{FeSO}_4+\\text{Cu}$. Iron nail browns; blue solution fades.</div><span class="tested">Reactivity + colour change</span></div></div>'
   '<div class="concept"><div class="dot">5</div><div><div class="ctitle">Double-displacement &amp; precipitation</div><div class="cbody">Ions swap partners; an insoluble salt drops out as a <b class="t">precipitate</b>: $\\text{Na}_2\\text{SO}_4+\\text{BaCl}_2\\rightarrow\\text{BaSO}_4\\!\\downarrow+2\\text{NaCl}$.</div><span class="tested">Name the precipitate</span></div></div>'
   '<div class="concept"><div class="dot">6</div><div><div class="ctitle">Oxidation\u2013reduction (redox)</div><div class="cbody">One reactant is oxidised while the other is reduced: $\\text{CuO}+\\text{H}_2\\rightarrow\\text{Cu}+\\text{H}_2\\text{O}$ \u2014 CuO loses O (reduced), H\u2082 gains O (oxidised).</div><span class="tested">Which is oxidised / reduced</span></div></div>'
   '<div class="concept"><div class="dot">7</div><div><div class="ctitle">Effects in everyday life</div><div class="cbody"><b class="t">Corrosion</b>: a metal is attacked by moisture/acids (rusting of iron). <b class="t">Rancidity</b>: fats/oils oxidise, smell and taste change \u2014 slowed by antioxidants or flushing with nitrogen.</div><span class="tested">2 mark \u00b7 define + example</span></div></div>'
   '</div></section>'
 # worked examples (reactions by shape)
 + '<section class="block"><div class="sec-label">Worked examples \u2014 by reaction shape</div><h2 class="sec">One example per question-shape</h2>'
   '<p class="hint">Chemistry rule: give the <b>balanced equation</b>, the <b>condition</b> above the arrow, and what the examiner is checking. Sourced from NCERT Ch 1.</p>'
 + ex('Balancing','NCERT \u00a71.1.2 \u00b7 3 mk',
      'Balance the skeletal equation: $\\text{Fe}+\\text{H}_2\\text{O}\\rightarrow\\text{Fe}_3\\text{O}_4+\\text{H}_2$',
      [('Count atoms.','LHS Fe 1, H 2, O 1; RHS Fe 3, H 2, O 4 \u2014 unbalanced.',''),
       ('Balance the biggest formula.','$\\text{Fe}_3\\text{O}_4$ has 4 O \u2192 put 4 before $\\text{H}_2\\text{O}$.','start with most atoms'),
       ('Balance H.','8 H on the left now \u2192 put 4 before $\\text{H}_2$.',''),
       ('Balance Fe.','3 Fe on the right \u2192 put 3 before Fe. Final: $3\\text{Fe}+4\\text{H}_2\\text{O}\\rightarrow\\text{Fe}_3\\text{O}_4+4\\text{H}_2$.','')],
      'Mark scheme: correct coefficients (2) + verification that atoms match both sides (1). Never alter a formula \u2014 only coefficients.')
 + ex('Combination','NCERT Activity 1.4 \u00b7 2 mk',
      'What happens when quicklime is added to water? Write the equation and classify it.',
      [('Equation.','$\\text{CaO}(s)+\\text{H}_2\\text{O}(l)\\rightarrow\\text{Ca(OH)}_2(aq)+\\text{Heat}$.',''),
       ('Type.','Two reactants \u2192 one product: a <b>combination</b> reaction.','combination'),
       ('Energy.','Heat is released, so it is also <b>exothermic</b>.','exothermic')],
      'Mark scheme: balanced equation (1) + both classifications, combination + exothermic (1).')
 + ex('Double displacement','NCERT Activity 1.10 \u00b7 2 mk',
      'Sodium sulphate solution is mixed with barium chloride solution. What is observed, and what is the equation?',
      [('Observation.','A white insoluble substance \u2014 a <b>precipitate</b> of barium sulphate \u2014 forms.',''),
       ('Equation.','$\\text{Na}_2\\text{SO}_4(aq)+\\text{BaCl}_2(aq)\\rightarrow\\text{BaSO}_4(s)\\!\\downarrow+2\\text{NaCl}(aq)$.',''),
       ('Type.','Ions exchange partners \u2192 <b>double-displacement</b> (precipitation).','double displacement')],
      'Mark scheme: name the precipitate $\\text{BaSO}_4$ (1) + balanced equation with states (1).')
 + ex('Redox','NCERT \u00a71.2.5 \u00b7 2 mk',
      'In $\\text{CuO}+\\text{H}_2\\rightarrow\\text{Cu}+\\text{H}_2\\text{O}$, which substance is oxidised and which is reduced?',
      [('CuO.','Loses oxygen \u2192 it is <b>reduced</b> to Cu.','reduction = loss of O'),
       ('H\u2082.','Gains oxygen \u2192 it is <b>oxidised</b> to $\\text{H}_2\\text{O}$.','oxidation = gain of O'),
       ('Name.','Both happen together \u2192 a <b>redox</b> reaction.','redox')],
      'Mark scheme: CuO reduced (1) + H\u2082 oxidised (1). State the rule \u2014 gain of O is oxidation, loss of O is reduction.')
 + '</section>'
 # strategies
 + '<section class="block"><div class="sec-label">Strategy</div><h2 class="sec">How to attack a chemical-reaction question</h2><div class="strat">'
   '<div class="row"><span class="arrow">\u2192</span><div><span class="cue">Balance before anything else.</span> Start with the compound that has the most atoms; adjust coefficients only.</div></div>'
   '<div class="row"><span class="arrow">\u2192</span><div><span class="cue">Classify by counting reactants/products.</span> One product \u2192 combination; one reactant \u2192 decomposition; element swap \u2192 displacement; ion swap \u2192 double-displacement.</div></div>'
   '<div class="row"><span class="arrow">\u2192</span><div><span class="cue">For redox, track the oxygen/hydrogen.</span> Whoever gains O (or loses H) is oxidised; the other is reduced.</div></div>'
   '<div class="row"><span class="arrow">\u2192</span><div><span class="cue">Add state symbols + conditions</span> $(s),(l),(g),(aq)$ and Heat/Light/Electricity over the arrow when asked for a \u201ccomplete\u201d equation.</div></div>'
   '</div></section>'
 # pitfalls
 + '<section class="block pitfalls"><div class="sec-label">Pitfalls</div><h2 class="sec">Where students lose easy marks</h2>'
   '<div class="pit"><span class="x">\u2715</span><div>Changing a <b>formula</b> to balance (writing $\\text{H}_2\\text{O}_4$ instead of $4\\text{H}_2\\text{O}$). Only coefficients may change.</div></div>'
   '<div class="pit"><span class="x">\u2715</span><div>Forgetting <b>state symbols</b> when the question asks for a complete equation.</div></div>'
   '<div class="pit"><span class="x">\u2715</span><div>Confusing <b>displacement</b> (one element swaps) with <b>double-displacement</b> (ions swap).</div></div>'
   '<div class="pit"><span class="x">\u2715</span><div>Reversing oxidation and reduction \u2014 remember <b>OIL RIG</b> via oxygen: gain O = oxidation.</div></div>'
   '<div class="pit"><span class="x">\u2715</span><div>Calling every precipitation reaction \u201ccombination.\u201d A precipitate means <b>double-displacement</b>.</div></div>'
   '</section>'
 # formula strip
 + '<section class="block"><div class="sec-label">One-screen recall</div><h2 class="sec">Reaction-type &amp; fact strip</h2><div class="frow">'
   '<div class="fitem"><div class="flabel">Combination</div><div class="fval">2+ reactants \u2192 1 product</div></div>'
   '<div class="fitem"><div class="flabel">Decomposition</div><div class="fval">1 reactant \u2192 2+ products</div></div>'
   '<div class="fitem"><div class="flabel">Displacement</div><div class="fval">element swaps out element</div></div>'
   '<div class="fitem"><div class="flabel">Double displacement</div><div class="fval">ions swap; precipitate</div></div>'
   '<div class="fitem"><div class="flabel">Oxidation</div><div class="fval">gain O / lose H</div></div>'
   '<div class="fitem"><div class="flabel">Reduction</div><div class="fval">lose O / gain H</div></div>'
   '<div class="fitem full"><div class="flabel">Everyday redox</div><div class="fval">Corrosion (rusting) \u00b7 Rancidity (fats/oils oxidise) \u2014 slowed by antioxidants / N\u2082 flush</div></div>'
   '</div></section></div>'
 # ---- MINDMAP ----
 + mind_panel()
 # ---- REACTIONS (third tab) ----
 + '<div class="panel" id="rxn">'
 + '<section class="block"><div class="sec-label">The rigorous formal core</div><h2 class="sec">The equations, grouped by type</h2>'
   '<p class="hint">For Chemistry the subject-adaptive third tab holds the <b>key balanced equations</b> \u2014 the formal core you must reproduce. All are NCERT examples; conditions sit under each.</p></section>'
 + '<section class="block"><h2 class="sec">Combination</h2><div class="rxn">'
   + rxn('$\\text{CaO}(s)+\\text{H}_2\\text{O}(l)\\rightarrow\\text{Ca(OH)}_2(aq)$','quicklime + water \u2192 slaked lime, exothermic')
   + rxn('$2\\text{H}_2(g)+\\text{O}_2(g)\\rightarrow 2\\text{H}_2\\text{O}(l)$','formation of water')
   + rxn('$\\text{C}(s)+\\text{O}_2(g)\\rightarrow\\text{CO}_2(g)$','burning of coal') + '</div></section>'
 + '<section class="block"><h2 class="sec">Decomposition</h2><div class="rxn">'
   + rxn('$\\text{CaCO}_3(s)\\xrightarrow{\\text{Heat}}\\text{CaO}(s)+\\text{CO}_2(g)$','thermal \u2014 limestone \u2192 quicklime')
   + rxn('$2\\text{H}_2\\text{O}(l)\\xrightarrow{\\text{Electricity}}2\\text{H}_2(g)+\\text{O}_2(g)$','electrolytic \u2014 electrolysis of water')
   + rxn('$2\\text{AgCl}(s)\\xrightarrow{\\text{Sunlight}}2\\text{Ag}(s)+\\text{Cl}_2(g)$','photolytic \u2014 used in photography') + '</div></section>'
 + '<section class="block"><h2 class="sec">Displacement</h2><div class="rxn">'
   + rxn('$\\text{Fe}(s)+\\text{CuSO}_4(aq)\\rightarrow\\text{FeSO}_4(aq)+\\text{Cu}(s)$','iron displaces copper')
   + rxn('$\\text{Zn}(s)+\\text{CuSO}_4(aq)\\rightarrow\\text{ZnSO}_4(aq)+\\text{Cu}(s)$','zinc is more reactive than copper') + '</div></section>'
 + '<section class="block"><h2 class="sec">Double displacement (precipitation)</h2><div class="rxn">'
   + rxn('$\\text{Na}_2\\text{SO}_4(aq)+\\text{BaCl}_2(aq)\\rightarrow\\text{BaSO}_4(s)\\!\\downarrow+2\\text{NaCl}(aq)$','white precipitate of barium sulphate') + '</div></section>'
 + '<section class="block"><h2 class="sec">Oxidation\u2013reduction (redox)</h2><div class="rxn">'
   + rxn('$2\\text{Cu}+\\text{O}_2\\xrightarrow{\\text{Heat}}2\\text{CuO}$','copper oxidised \u2014 black coating')
   + rxn('$\\text{CuO}+\\text{H}_2\\xrightarrow{\\text{Heat}}\\text{Cu}+\\text{H}_2\\text{O}$','CuO reduced, H\u2082 oxidised')
   + '</div><div class="insight"><b>Template insight:</b> the third tab is <b>subject-adaptive</b>. Maths\u2009\u2192\u2009<i>Proof</i>, Physics\u2009\u2192\u2009<i>Rules / Derivations</i>, and here Chemistry\u2009\u2192\u2009<i>Reactions</i> \u2014 the chapter\u2019s rigorous core is its set of canonical equations, so the slot carries those.</div></section>'
 + '</div>'
 + '<p class="footnote">Chemistry prototype \u00b7 Chemical Reactions &amp; Equations \u00b7 every equation = a real NCERT Ch 1 reaction \u00b7 KaTeX formulae \u00b7 print-safe \u00b7 content to be validated against NCERT before locking</p>'
 + '</div>'
 + js('{"name":"Chemical Reactions","children":['
     '{"name":"Balancing","color":"#3a6ea5","children":[{"name":"Atoms equal both sides"},{"name":"Change coefficients only"},{"name":"State symbols (s)(l)(g)(aq)"}]},'
     '{"name":"Five types","color":"#e0883b","children":[{"name":"Combination"},{"name":"Decomposition"},{"name":"Displacement"},{"name":"Double displacement"},{"name":"Precipitation"}]},'
     '{"name":"Decomposition by\u2026","color":"#16b96a","children":[{"name":"Heat (thermal)"},{"name":"Light (photolytic)"},{"name":"Electricity (electrolytic)"}]},'
     '{"name":"Redox","color":"#7a5fb0","children":[{"name":"Oxidation = +O / \u2212H"},{"name":"Reduction = \u2212O / +H"},{"name":"2Cu+O\u2082\u21922CuO"},{"name":"CuO+H\u2082\u2192Cu+H\u2082O"}]},'
     '{"name":"Energy","color":"#3a6ea5","children":[{"name":"Exothermic: heat out"},{"name":"Endothermic: energy in"}]},'
     '{"name":"Everyday effects","color":"#c75c5c","children":[{"name":"Corrosion (rusting)"},{"name":"Rancidity (fats oxidise)"},{"name":"Antioxidants / N\u2082 flush"}]}'
     ']}', '[1,3]'))


# ============================================================================
# FIGURE TOOLKIT  —  the 3-bucket diagram-sourcing rule, as code
# ----------------------------------------------------------------------------
# Bucket A: ray diagrams & complex/biological figures -> NCERT extraction (below)
# Bucket B: simple labelled schematics (sign convention, axes) -> authored SVG
#           (see VI_SVG / SERIES_SVG / PARALLEL_SVG above for the pattern)
# Bucket C: data-plottable graphs -> generated SVG (compute from coefficients)
# ----------------------------------------------------------------------------
import base64 as _b64
from io import BytesIO as _BytesIO
from PIL import Image as _Image, ImageChops as _ImageChops, ImageDraw as _ImageDraw
import numpy as _np
try:
    import fitz  # PyMuPDF — the MANDATED extractor. pdfplumber is RETIRED.
except Exception:
    fitz = None

def rasterize(pdf_path, page_no, dpi=220):
    """1-indexed PDF page -> PIL image, via PyMuPDF (pymupdf). Install: pip install pymupdf."""
    if not fitz:
        raise RuntimeError("PyMuPDF missing. Run: pip install pymupdf  (pdfplumber is RETIRED)")
    pix = fitz.open(pdf_path)[page_no - 1].get_pixmap(dpi=dpi)
    return _Image.frombytes("RGB", (pix.width, pix.height), pix.samples)

def clean_watermark(img, mode="luminance", thresh=150, v_min=200, s_max=0.10):
    """Lift the NCERT 'not to be republished' watermark while keeping the ink.
       mode='luminance' for LINE ART (mirror/lens/slab ray diagrams).
       mode='saturation' for COLOUR figures (heart/canal/nephron) — keeps coloured ink,
            which a luminance cut would eat (e.g. pale-blue heart chambers)."""
    a = _np.asarray(img.convert("RGB")).astype(_np.float32)
    if mode == "luminance":
        lum = 0.299*a[:, :, 0] + 0.587*a[:, :, 1] + 0.114*a[:, :, 2]
        a[lum > thresh] = [255, 255, 255]
    else:  # saturation-aware
        mx = a.max(2); mn = a.min(2)
        V = mx; S = _np.where(mx > 0, (mx - mn) / mx, 0)
        a[(V > v_min) & (S < s_max)] = [255, 255, 255]
    return _Image.fromarray(a.astype("uint8"))

def refill_rect(img, box, color=(238, 246, 241)):
    """Re-stroke an intentional light-grey fill the cleanup removed (e.g. the glass-slab
       body, a shaded mirror back). box=(x0,y0,x1,y1) in the CROPPED image's coords."""
    fill = _Image.new("RGB", img.size, (255, 255, 255))
    _ImageDraw.Draw(fill).rectangle(list(box), fill=color)
    return _ImageChops.darker(img.convert("RGB"), fill)

def to_data_uri(img, fmt="PNG", quality=82):
    buf = _BytesIO(); img.convert("RGB").save(buf, fmt, quality=quality)
    mime = "jpeg" if fmt.upper() == "JPEG" else "png"
    return f"data:image/{mime};base64,{_b64.b64encode(buf.getvalue()).decode()}"

def ncert_figure(pdf_path, page_no, box, tag, caption, legend="",
                 mode="luminance", refill=None, fmt="PNG"):
    """Bucket-A full path: rasterize -> crop -> clean watermark -> (optional) refill grey ->
       frame in the locked .figure grammar.
       *** CONFIRM THE CROP BY EYE FIRST *** NCERT wraps body text tight against figures;
       a too-wide box bleeds paragraph text into the figure (we hit this on heart & nephron).
       Use COLOUR fmt='JPEG' for biological figures to keep file size sane."""
    crop = rasterize(pdf_path, page_no).crop(tuple(box))
    crop = clean_watermark(crop, mode=mode)
    if refill:
        crop = refill_rect(crop, refill)
    return fig(tag, caption, f'<img alt="{caption}" src="{to_data_uri(crop, fmt)}">', legend)

# ============================================================================
# WORKED EXAMPLES (already defined above as strings): ELEC, CHEM.
# Run this file to regenerate them and confirm the kit (incl. the PDF button) works.
# ============================================================================
if __name__ == "__main__":
    import os
    os.makedirs("out", exist_ok=True)
    for name, html in [("electricity_KIT.html", ELEC), ("chemical_reactions_KIT.html", CHEM)]:
        open(os.path.join("out", name), "w", encoding="utf-8").write(html)
        print("wrote out/%s  (%d chars, PDF-button=%s)" % (name, len(html), "pdf-btn" in html))
