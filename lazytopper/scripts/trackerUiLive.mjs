import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, ".project_memory", "tracker_ui");
const OUT_HTML = path.join(OUT_DIR, "index_live.html");

fs.mkdirSync(OUT_DIR, { recursive: true });

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>LazyTopper Tracker - Screener (Live)</title>
  <style>
    :root{--bg:#0b0f14;--card:#0f1620;--muted:#94a3b8;--text:#e5e7eb;--good:#22c55e;--bad:#ef4444;--blue:#60a5fa;--border:#1f2937}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
    header{position:sticky;top:0;z-index:9;display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);
      background:linear-gradient(180deg, rgba(15,22,32,.95), rgba(11,15,20,.95));backdrop-filter: blur(10px)}
    h1{font-size:20px;margin:0;font-weight:800}
    .right{display:flex;gap:10px;align-items:center}
    .pillTop{border:1px solid var(--border);border-radius:999px;padding:7px 10px;color:var(--muted);font-weight:800;font-size:12px}
    button{background:#0b1220;border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:10px;cursor:pointer;font-weight:700}
    button:hover{border-color:#334155}
    main{max-width:1200px;margin:0 auto;padding:18px 20px}
    .meta{color:var(--muted);font-size:12px;margin:10px 0 18px;display:flex;gap:18px;flex-wrap:wrap}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px 14px 10px;box-shadow:0 8px 24px rgba(0,0,0,.35)}
    .cardHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .card h2{margin:0;font-size:16px}
    .pill{display:inline-flex;align-items:center;gap:8px;font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid var(--border);color:var(--muted);margin-top:8px}
    .pill b{color:var(--text)}
    .tog{margin-top:10px;display:flex;gap:10px;align-items:center}
    .tog input{transform: translateY(1px)}
    .stage{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:10px 10px;margin-top:8px;border-radius:12px;border:1px solid rgba(31,41,55,.8);background:rgba(2,6,23,.35)}
    .stage .left{display:flex;flex-direction:column;gap:4px}
    .id{font-weight:900;letter-spacing:.3px}
    .title{opacity:.92}
    .state{font-size:12px;color:var(--muted)}
    .badge{font-size:12px;font-weight:900;padding:6px 10px;border-radius:999px;border:1px solid var(--border);white-space:nowrap}
    .done{color:var(--good);border-color:rgba(34,197,94,.35);background:rgba(34,197,94,.08)}
    .doing{color:var(--blue);border-color:rgba(96,165,250,.35);background:rgba(96,165,250,.08)}
    .todo{color:var(--muted)}
    .blocked{color:var(--bad);border-color:rgba(239,68,68,.35);background:rgba(239,68,68,.08)}
    .currentRing{outline:2px solid rgba(96,165,250,.55);box-shadow:0 0 0 6px rgba(96,165,250,.08)}
    .err{margin:14px 0 0;border:1px solid rgba(239,68,68,.25);background:rgba(239,68,68,.06);padding:10px 12px;border-radius:12px;color:var(--text)}
    @media (max-width:980px){.grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
<header>
  <h1>LazyTopper Tracker — Screener</h1>
  <div class="right">
    <div class="pillTop mono" id="gitPill">Git: …</div>
    <button id="refreshBtn">Refresh</button>
    <button id="hardBtn">Hard Reload</button>
  </div>
</header>

<main>
  <div class="meta">
    <div>Generated: <span class="mono" id="genAt">…</span></div>
    <div>Overall current: <b class="mono" id="overall">…</b></div>
  </div>

  <div id="errorBox" class="err" style="display:none"></div>
  <div class="grid" id="tracks"></div>
</main>

<script>
  let state = { data:null, showDone:{} };

  function badgeClass(s){
    s = String(s||"").toUpperCase();
    if(s==="DONE"||s==="SKIP") return "badge done";
    if(s==="DOING") return "badge doing";
    if(s==="BLOCKED") return "badge blocked";
    return "badge todo";
  }
  function badgeText(s){
    s = String(s||"").toUpperCase();
    if(s==="SKIP") return "SKIP";
    if(s==="DONE") return "DONE";
    if(s==="DOING") return "DOING";
    if(s==="BLOCKED") return "BLOCKED";
    return "TODO";
  }

  function render(data){
    const tracksEl = document.getElementById("tracks");
    tracksEl.innerHTML = "";

    document.getElementById("genAt").textContent = data.generatedAt || "";
    document.getElementById("overall").textContent = data.overallCurrent || "";

    // Git badge: clean vs dirty, using drift count as signal
    const driftCount = (data.drift && data.drift.count) ? data.drift.count : 0;
    document.getElementById("gitPill").textContent = driftCount === 0 ? "Git: clean" : ("Git: drift(" + driftCount + ")");

    for(const t of (data.tracks||[])){
      const card = document.createElement("div");
      card.className = "card";

      const head = document.createElement("div");
      head.className = "cardHead";

      const h2 = document.createElement("h2");
      h2.textContent = t.title || t.id;
      head.appendChild(h2);

      card.appendChild(head);

      const pill = document.createElement("div");
      pill.className = "pill";
      pill.innerHTML = 'Current: <b class="mono">' + (t.currentStage || "") + "</b>";
      card.appendChild(pill);

      // Collapsible / hide-done toggle per track
      if(state.showDone[t.id] === undefined) state.showDone[t.id] = false;

      const tog = document.createElement("div");
      tog.className = "tog";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!state.showDone[t.id];
      cb.addEventListener("change", () => { state.showDone[t.id] = cb.checked; render(state.data); });
      const lbl = document.createElement("label");
      lbl.textContent = "Show completed";
      tog.appendChild(cb); tog.appendChild(lbl);
      card.appendChild(tog);

      for(const s of (t.stages||[])){
        const isDone = (String(s.state||"").toUpperCase()==="DONE" || String(s.state||"").toUpperCase()==="SKIP");
        if(isDone && !state.showDone[t.id]) continue;

        const row = document.createElement("div");
        row.className = "stage" + ((t.currentStage===s.id) ? " currentRing" : "");

        const left = document.createElement("div");
        left.className = "left";

        const id = document.createElement("div");
        id.className = "id mono";
        id.textContent = s.id;

        const title = document.createElement("div");
        title.className = "title";
        title.textContent = s.title || "";

        const st = document.createElement("div");
        st.className = "state mono";
        st.textContent = "state: " + badgeText(s.state);

        left.appendChild(id); left.appendChild(title); left.appendChild(st);

        const badge = document.createElement("div");
        badge.className = badgeClass(s.state);
        badge.textContent = badgeText(s.state);

        row.appendChild(left);
        row.appendChild(badge);
        card.appendChild(row);
      }

      tracksEl.appendChild(card);
    }
  }

  async function tick(){
    try{
      const res = await fetch("/stage_status.json?ts=" + Date.now(), { cache: "no-store" });
      if(!res.ok) throw new Error("fetch failed: " + res.status);
      const data = await res.json();
      state.data = data;
      document.getElementById("errorBox").style.display = "none";
      render(data);
    }catch(e){
      const eb = document.getElementById("errorBox");
      eb.style.display = "block";
      eb.textContent = "FAILED_TO_LOAD — " + (e && e.message ? e.message : String(e));
      // keep prior UI if we have data
      if(state.data) render(state.data);
      document.getElementById("overall").textContent = "FAILED_TO_LOAD";
    }
  }

  document.getElementById("refreshBtn").addEventListener("click", () => location.reload());
  document.getElementById("hardBtn").addEventListener("click", () => location.reload(true));

  tick();
  setInterval(tick, 1200);
</script>
</body>
</html>`;

fs.writeFileSync(OUT_HTML, html, "utf8");
console.log("Wrote:", path.relative(ROOT, OUT_HTML));
