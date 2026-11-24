(() => {
  "use strict";

  const DEFAULT_BRIDGE = "http://127.0.0.1:4195";
  let bridgeUrl = localStorage.getItem("mocr_bridge_url") || DEFAULT_BRIDGE;
  let bridgeOnline = false;
  let activeTab = "overview";
  const startTime = Date.now();

  const SATGPU_DEFAULT = [
    { id: "SATGPU-ALPHA", orbit: "LEO 540km", inc: 51.6, gpu: "H100-ORBIT 64TFLOPS", lat: 28.5, lon: -80.6, spd: 0.85, tensor_pct: 48, vram_pct: 61, temp_c: 54.2, downlink_mbps: 440 },
    { id: "SATGPU-LUNA-1", orbit: "LUNAR RELAY", inc: 28.5, gpu: "B200-RAD 120TFLOPS", lat: 12.4, lon: 18.2, spd: 0.42, tensor_pct: 64, vram_pct: 72, temp_c: 60.4, downlink_mbps: 510 },
    { id: "SATGPU-ISS-CORE", orbit: "ISS 408km", inc: 51.6, gpu: "A100-SPACE 42TFLOPS", lat: -22.1, lon: 134.8, spd: 1.05, tensor_pct: 37, vram_pct: 52, temp_c: 49.8, downlink_mbps: 390 },
    { id: "SATGPU-POLAR-4", orbit: "SSO 780km", inc: 98.2, gpu: "L40S-ORBIT 38TFLOPS", lat: 64.1, lon: -21.9, spd: 0.72, tensor_pct: 55, vram_pct: 58, temp_c: 56.1, downlink_mbps: 425 },
    { id: "SATGPU-GEO-WEST", orbit: "GEO 35786km", inc: 0.1, gpu: "H200-GEO 96TFLOPS", lat: 0.0, lon: -105.0, spd: 0.1, tensor_pct: 41, vram_pct: 49, temp_c: 51.0, downlink_mbps: 365 },
  ];

  const VPN_FALLBACK = [
    { city: "Tokyo", country: "JP", lat: 35.6, lon: 139.7, provider: "VPN Gate", users: 2341, ping_ms: 28 },
    { city: "Seoul", country: "KR", lat: 37.6, lon: 126.9, provider: "VPN Gate", users: 1543, ping_ms: 34 },
    { city: "Singapore", country: "SG", lat: 1.3, lon: 103.8, provider: "VPN Gate", users: 2109, ping_ms: 42 },
    { city: "Sydney", country: "AU", lat: -33.9, lon: 151.2, provider: "VPN Gate", users: 644, ping_ms: 118 },
    { city: "Frankfurt", country: "DE", lat: 50.1, lon: 8.6, provider: "VPN Gate", users: 1104, ping_ms: 22 },
    { city: "London", country: "GB", lat: 51.5, lon: -0.1, provider: "VPN Gate", users: 1340, ping_ms: 24 },
    { city: "New York", country: "US", lat: 40.7, lon: -74.0, provider: "VPN Gate", users: 1876, ping_ms: 31 },
    { city: "Los Angeles", country: "US", lat: 34.1, lon: -118.2, provider: "VPN Gate", users: 1543, ping_ms: 37 },
    { city: "Sao Paulo", country: "BR", lat: -23.5, lon: -46.6, provider: "VPN Gate", users: 543, ping_ms: 95 },
    { city: "Cairo", country: "EG", lat: 30.0, lon: 31.2, provider: "VPN Gate", users: 198, ping_ms: 78 },
    { city: "Dubai", country: "AE", lat: 25.2, lon: 55.3, provider: "VPN Gate", users: 876, ping_ms: 63 },
    { city: "Toronto", country: "CA", lat: 43.7, lon: -79.4, provider: "VPN Gate", users: 876, ping_ms: 35 },
  ];

  const state = {
    cpu: 24,
    ram: 48,
    disk: 52,
    netBps: 145000,
    cpuHist: Array(48).fill(24),
    ramHist: Array(48).fill(48),
    netHist: Array(48).fill(18),
    nnLayers: [4, 7, 9, 7, 3],
    nnActs: [[0.24, 0.48, 0.18, 0.52], Array(7).fill(0.5), Array(9).fill(0.5), Array(7).fill(0.5), [0.42, 0.78, 0.19]],
    nnOut: { load_index: 0.42, efficiency: 0.78, alert_level: 0.19 },
    satNodes: SATGPU_DEFAULT,
    satIdx: 0,
    satMode: "OPTICAL",
    satZoom: 1.0,
    vpnNodes: VPN_FALLBACK,
    vpnRegion: "ALL",
    vpnSelected: null,
    procs: [],
    tabs: [],
    conns: [],
    fpv: { x: 0, y: 0, z: -8, yaw: 0, pitch: 0, thrust: 0.03, orbit: true, angle: 0, dragging: false, lx: 0, ly: 0 },
  };

  // ── DOM References ──
  const $ = (id) => document.getElementById(id);
  const bridgeInput = $("bridge-url");
  bridgeInput.value = bridgeUrl;

  // ── Tab Switching ──
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".tab-pane").forEach((p) => p.classList.toggle("active", p.id === `tab-${activeTab}`));
    });
  });

  $("btn-crt").addEventListener("click", () => document.body.classList.toggle("crt-scanlines"));
  $("btn-reconnect").addEventListener("click", () => {
    bridgeUrl = bridgeInput.value.trim().replace(/\/+$/, "") || DEFAULT_BRIDGE;
    localStorage.setItem("mocr_bridge_url", bridgeUrl);
    pollBridge();
    appendTerm(`[BRIDGE] Reconnecting to ${bridgeUrl} ...`);
  });

  // ── Clocks ──
  setInterval(() => {
    const now = new Date();
    $("mocr-utc").textContent = now.toISOString().slice(11, 19);
    const s = Math.floor((Date.now() - startTime) / 1000);
    const pad = (n, w = 2) => String(n).padStart(w, "0");
    $("mocr-met").textContent = `${pad(Math.floor(s / 86400), 3)}:${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  }, 1000);

  // ── Data Fetching (Bridge + Cloud Runner Fallback) ──
  async function fetchJson(path) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(`${bridgeUrl}${path}`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  function formatBytes(b) {
    const units = ["B/s", "KB/s", "MB/s", "GB/s"];
    let idx = 0;
    while (b >= 1024 && idx < units.length - 1) {
      b /= 1024;
      idx++;
    }
    return `${b.toFixed(1)} ${units[idx]}`;
  }

  function simulateStep() {
    const t = Date.now() * 0.001;
    state.cpu = Math.max(8, Math.min(92, 26 + Math.sin(t * 0.8) * 14 + (Math.random() - 0.5) * 6));
    state.ram = Math.max(25, Math.min(88, 52 + Math.cos(t * 0.3) * 8));
    state.disk = 54.2;
    state.netBps = Math.max(4096, 180000 + Math.sin(t * 1.1) * 120000);
    state.nnActs = state.nnLayers.map((cnt, li) =>
      Array.from({ length: cnt }, (_, ni) => Number((0.2 + 0.7 * (0.5 + 0.5 * Math.sin(t * (1 + li * 0.3) + ni))).toFixed(3)))
    );
    state.nnOut = {
      load_index: Number((state.cpu / 100).toFixed(3)),
      efficiency: Number((1 - state.cpu / 140).toFixed(3)),
      alert_level: Number((Math.max(state.cpu, state.ram) / 110).toFixed(3)),
    };
    state.satNodes = SATGPU_DEFAULT.map((nd, idx) => ({
      ...nd,
      lat: Number((nd.lat + Math.sin(t * 0.15 + idx) * 4.5).toFixed(2)),
      lon: Number((((nd.lon + t * nd.spd * 2.5 + 180) % 360) - 180).toFixed(2)),
      tensor_pct: Number((state.cpu * 0.8 + 18 + Math.sin(t + idx) * 6).toFixed(1)),
      vram_pct: Number((state.ram * 0.85 + Math.cos(t * 0.5 + idx) * 4).toFixed(1)),
      temp_c: Number((42 + state.cpu * 0.25).toFixed(1)),
      downlink_mbps: Math.round(320 + 160 * Math.abs(Math.sin(t * 0.3 + idx))),
    }));
    if (!state.procs.length) {
      state.procs = [
        { pid: 4195, name: "addon_server.py (sim)", cpu: 3.4, ram_mb: 44.2 },
        { pid: 2108, name: "chrome.exe", cpu: 12.1, ram_mb: 612.0 },
        { pid: 8820, name: "satgpu-worker", cpu: 18.7, ram_mb: 390.5 },
        { pid: 1024, name: "networkbuster-cloud", cpu: 5.2, ram_mb: 128.4 },
      ];
      state.tabs = [
        { browser: "CHROME", title: "LunaRecycle — Mission Control Addon", pid: 2108 },
        { browser: "EDGE", title: "Cleanskiier27/luna.eu — GitHub Pages", pid: 4412 },
      ];
      state.conns = [
        { proto: "TCP", remote: "127.0.0.1:4195", process: "addon_server.py", threat: "NOMINAL" },
        { proto: "TCP", remote: "185.199.108.153:443", process: "chrome.exe", threat: "NOMINAL" },
        { proto: "UDP", remote: "104.16.132.229:443", process: "satgpu-worker", threat: "NOMINAL" },
      ];
    }
  }

  let polling = false;
  async function pollBridge() {
    if (polling) return;
    polling = true;
    try {
      const tel = await fetchJson("/api/telemetry");
      const badge = $("bridge-badge");
      if (tel) {
        bridgeOnline = true;
        badge.textContent = "LOCAL BRIDGE LIVE";
        badge.className = "bridge-badge live";
        state.cpu = tel.cpu_pct;
        state.ram = tel.ram_pct;
        state.disk = tel.disk_pct;
        state.netBps = tel.net_bps;
        state.nnActs = tel.neural_net.activations;
        state.nnOut = tel.neural_net.outputs;
        if (Array.isArray(tel.satgpu_nodes) && tel.satgpu_nodes.length) {
          state.satNodes = tel.satgpu_nodes;
        }
        const [pRes, tRes, cRes, vRes] = await Promise.all([
          fetchJson("/api/processes"),
          fetchJson("/api/tabs"),
          fetchJson("/api/connections"),
          fetchJson("/api/vpn-nodes"),
        ]);
        if (pRes && pRes.processes) state.procs = pRes.processes;
        if (tRes && tRes.tabs) state.tabs = tRes.tabs;
        if (cRes && cRes.connections) state.conns = cRes.connections;
        if (vRes && vRes.nodes) state.vpnNodes = vRes.nodes;
        $("bridge-data-note").textContent = `Streaming live Windows data from ${bridgeUrl}`;
      } else {
        bridgeOnline = false;
        badge.textContent = "CLOUD RUNNER SIM";
        badge.className = "bridge-badge sim";
        simulateStep();
        $("bridge-data-note").textContent = "Cloud Runner simulation active (start addon_server.py locally for live OS processes & tabs)";
      }

      state.cpuHist.push(state.cpu);
      state.cpuHist.shift();
      state.ramHist.push(state.ram);
      state.ramHist.shift();
      state.netHist.push(Math.min(100, state.netBps / 500000));
      state.netHist.shift();

      renderDomTelemetry();
      renderTables();
      renderSatSidebar();
    } finally {
      polling = false;
    }
  }

  function renderDomTelemetry() {
    $("kpi-cpu").textContent = `${state.cpu.toFixed(1)}%`;
    $("kpi-ram").textContent = `${state.ram.toFixed(1)}%`;
    $("kpi-disk").textContent = `${state.disk.toFixed(1)}%`;
    $("kpi-net").textContent = formatBytes(state.netBps);
    $("mocr-status-text").textContent = Math.max(state.cpu, state.ram) > 85 ? "CRITICAL" : "NOMINAL";
    $("nn-outputs").textContent = `LOAD ${state.nnOut.load_index.toFixed(2)} | EFF ${state.nnOut.efficiency.toFixed(2)} | ALT ${state.nnOut.alert_level.toFixed(2)}`;

    const matrix = [
      ["CPU-CORE", state.cpu > 80 ? "WARN" : "NOMINAL", state.cpu > 80 ? "#ffa500" : "#00ff66"],
      ["MEM-BUS", state.ram > 85 ? "WARN" : "NOMINAL", state.ram > 85 ? "#ffa500" : "#00ff66"],
      ["SATGPU-CAM", "ORBITAL", "#00e5ff"],
      ["FPV-DRIVE", "ACTIVE", "#c084fc"],
      ["GLOBAL-VPN", `${state.vpnNodes.length} NODES`, "#00ff66"],
      ["NET-INTERCEPT", "ARMED", "#ff4757"],
      ["SWARM-BUS", "ONLINE", "#ffb800"],
      ["BRIDGE", bridgeOnline ? "LIVE" : "SIM", bridgeOnline ? "#00ff66" : "#ffb800"],
    ];
    $("subsystem-matrix").innerHTML = matrix
      .map(([k, v, c]) => `<div class="matrix-cell"><span>${k}</span><strong style="color:${c}">${v}</strong></div>`)
      .join("");
  }

  function renderTables() {
    const q = ($("table-search").value || "").toLowerCase();
    const procs = state.procs.filter((p) => !q || p.name.toLowerCase().includes(q) || String(p.pid).includes(q));
    const tabs = state.tabs.filter((t) => !q || t.title.toLowerCase().includes(q) || t.browser.toLowerCase().includes(q));
    const conns = state.conns.filter((c) => !q || c.remote.toLowerCase().includes(q) || c.process.toLowerCase().includes(q));

    $("proc-count").textContent = procs.length;
    $("tab-count").textContent = tabs.length;
    $("conn-count").textContent = conns.length;

    $("proc-tbody").innerHTML = procs.slice(0, 40)
      .map((p) => `<tr><td>${p.pid}</td><td>${esc(p.name)}</td><td>${p.cpu.toFixed(1)}</td><td>${p.ram_mb.toFixed(1)}M</td></tr>`).join("");
    $("tabs-tbody").innerHTML = tabs.slice(0, 40)
      .map((t) => `<tr><td style="color:var(--cyan)">${esc(t.browser)}</td><td>${esc(t.title)}</td><td>${t.pid}</td></tr>`).join("");
    $("conn-tbody").innerHTML = conns.slice(0, 40)
      .map((c) => `<tr><td>${esc(c.proto)}</td><td>${esc(c.remote)}</td><td>${esc(c.process)}</td><td class="tag-${c.threat.toLowerCase()}">${esc(c.threat)}</td></tr>`).join("");
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch]));
  }

  $("table-search").addEventListener("input", renderTables);

  // ── Canvas 1: Neural Net ──
  function drawNN() {
    const cv = $("nn-canvas");
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, W, H);

    const layers = state.nnLayers;
    const pos = layers.map((n, li) => {
      const x = 60 + (li * (W - 120)) / (layers.length - 1);
      return Array.from({ length: n }, (_, ni) => ({
        x,
        y: n === 1 ? H / 2 : 34 + (ni * (H - 68)) / (n - 1),
      }));
    });

    const t = Date.now() * 0.004;
    for (let l = 0; l < layers.length - 1; l++) {
      for (let i = 0; i < pos[l].length; i++) {
        for (let j = 0; j < pos[l + 1].length; j++) {
          const act = (state.nnActs[l] && state.nnActs[l][i]) || 0.4;
          const pulse = 0.5 + 0.5 * Math.sin(t + i * 0.9 + j * 0.6 + l);
          ctx.strokeStyle = pulse * act > 0.48 ? "rgba(255, 184, 0, 0.58)" : "rgba(40, 58, 100, 0.35)";
          ctx.lineWidth = pulse * act > 0.48 ? 1.5 : 0.7;
          ctx.beginPath();
          ctx.moveTo(pos[l][i].x, pos[l][i].y);
          ctx.lineTo(pos[l + 1][j].x, pos[l + 1][j].y);
          ctx.stroke();
        }
      }
    }

    const cols = ["#ffb800", "#c084fc", "#818cf8", "#c084fc", "#00ff66"];
    pos.forEach((colNodes, l) => {
      colNodes.forEach((pt, j) => {
        const act = (state.nnActs[l] && state.nnActs[l][j]) || 0.3;
        ctx.fillStyle = cols[l];
        ctx.globalAlpha = 0.25 + act * 0.75;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 8 + act * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = cols[l];
        ctx.lineWidth = 1.4;
        ctx.stroke();
      });
    });
  }

  // ── Canvas 2: Rolling Telemetry ──
  function drawTelemetry() {
    const cv = $("telem-canvas");
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#122142";
    for (let p = 1; p < 4; p++) {
      const y = (H * p) / 4;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    const drawSeries = (arr, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      arr.forEach((v, i) => {
        const x = (i * W) / (arr.length - 1);
        const y = H - 8 - (Math.min(100, Math.max(0, v)) / 100) * (H - 16);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };
    drawSeries(state.cpuHist, "#ffb800");
    drawSeries(state.ramHist, "#00ff66");
    drawSeries(state.netHist, "#00e5ff");
  }

  // ── SatGPU Onboard Camera ──
  function initSatControls() {
    const wrap = $("sat-node-btns");
    wrap.innerHTML = state.satNodes.map((n, i) =>
      `<button class="btn-sm ${i === 0 ? "active" : ""}" type="button" data-sat-idx="${i}">${n.id.replace("SATGPU-", "")}</button>`
    ).join("");
    wrap.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => {
        state.satIdx = Number(b.dataset.satIdx);
        wrap.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
        renderSatSidebar();
      });
    });
    document.querySelectorAll("[data-sat-mode]").forEach((b) => {
      b.addEventListener("click", () => {
        state.satMode = b.dataset.satMode;
        document.querySelectorAll("[data-sat-mode]").forEach((x) => x.classList.toggle("active", x === b));
      });
    });
    $("sat-zoom-in").addEventListener("click", () => { state.satZoom = Math.min(3.0, state.satZoom + 0.25); });
    $("sat-zoom-out").addEventListener("click", () => { state.satZoom = Math.max(0.6, state.satZoom - 0.25); });
    $("sat-snap").addEventListener("click", () => {
      const a = document.createElement("a");
      a.download = `${state.satNodes[state.satIdx].id.toLowerCase()}-${Date.now()}.png`;
      a.href = $("sat-canvas").toDataURL("image/png");
      a.click();
      appendTerm(`[SATGPU] Snapshot exported for ${state.satNodes[state.satIdx].id}`);
    });
  }

  function renderSatSidebar() {
    const nd = state.satNodes[state.satIdx] || SATGPU_DEFAULT[0];
    $("sat-hud-summary").textContent = `${nd.id} // ${state.satMode} // ${state.satZoom.toFixed(1)}x`;
    const items = [
      ["ORBITAL NODE", nd.id, "#00e5ff"],
      ["ORBIT / INC", `${nd.orbit} (${nd.inc} deg)`, "#ffb800"],
      ["COMPUTE", nd.gpu, "#c084fc"],
      ["TENSOR UTIL", `${nd.tensor_pct}%`, "#00ff66"],
      ["VRAM LOAD", `${nd.vram_pct}%`, "#ffb800"],
      ["THERMAL", `${nd.temp_c} C`, "#ffa500"],
      ["DOWNLINK", `${nd.downlink_mbps} Mbps`, "#00e5ff"],
      ["COORDS", `${nd.lat >= 0 ? "+" : ""}${nd.lat} / ${nd.lon >= 0 ? "+" : ""}${nd.lon}`, "#f3f4ff"],
    ];
    $("sat-sidebar").innerHTML = items.map(([k, v, c]) =>
      `<div class="matrix-cell"><span>${k}</span><strong style="color:${c}">${v}</strong></div>`
    ).join("");
  }

  function drawSatCam() {
    const cv = $("sat-canvas");
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    const nd = state.satNodes[state.satIdx] || SATGPU_DEFAULT[0];
    const t = Date.now() * 0.002;
    const palettes = {
      "OPTICAL": ["#031326", "#0b3a66", "#2a8bc7", "#8ee0ff", "#ffb800"],
      "THERMAL IR": ["#140418", "#540b46", "#c92a42", "#ffae00", "#ffd166"],
      "SAR RADAR": ["#021208", "#073b1d", "#0f8c44", "#00ff66", "#00ff66"],
      "NIGHT VIS": ["#010c04", "#06290f", "#146b29", "#5cff80", "#5cff80"],
    };
    const [bg, limb, band, hi, hud] = palettes[state.satMode];
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Earth limb
    const r = Math.max(W, H) * 0.92 * state.satZoom;
    const hy = H * 0.43;
    ctx.fillStyle = limb;
    ctx.strokeStyle = hi;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, hy + r, r, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    // Terrain waves
    for (let b = 0; b < 6; b++) {
      ctx.strokeStyle = b % 2 === 0 ? band : hi;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      const yb = hy + 20 + b * ((H - hy) / 6);
      for (let x = 0; x <= W; x += 20) {
        const y = yb + Math.sin(x * 0.015 * state.satZoom + t * nd.spd + b) * (8 + b * 2);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    if (state.satMode === "SAR RADAR") {
      const rx = W / 2, ry = H * 0.62, rad = H * 0.3;
      ctx.strokeStyle = band;
      ctx.beginPath(); ctx.arc(rx, ry, rad, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = hi;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(t * 2) * rad, ry + Math.sin(t * 2) * rad); ctx.stroke();
    }

    // Reticle
    const mx = W / 2, my = H / 2;
    ctx.strokeStyle = hud;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(mx - 24, my - 24, 48, 48);
    ctx.beginPath();
    ctx.moveTo(mx - 36, my); ctx.lineTo(mx - 10, my);
    ctx.moveTo(mx + 10, my); ctx.lineTo(mx + 36, my);
    ctx.moveTo(mx, my - 36); ctx.lineTo(mx, my - 10);
    ctx.moveTo(mx, my + 10); ctx.lineTo(mx, my + 36);
    ctx.stroke();

    ctx.fillStyle = "rgba(2, 6, 15, 0.78)";
    ctx.fillRect(0, 0, W, 24);
    ctx.fillStyle = hud;
    ctx.font = "bold 12px Courier New";
    ctx.fillText(`ONBOARD CAM // ${nd.id} [${state.satMode}] FOV ${(42 / state.satZoom).toFixed(1)} deg`, 10, 16);
  }

  // ── FPV 3D Drive ──
  const fpvCv = $("fpv-canvas");
  fpvCv.addEventListener("mousedown", (e) => { state.fpv.dragging = true; state.fpv.lx = e.clientX; state.fpv.ly = e.clientY; state.fpv.orbit = false; });
  window.addEventListener("mouseup", () => { state.fpv.dragging = false; });
  window.addEventListener("mousemove", (e) => {
    if (!state.fpv.dragging) return;
    state.fpv.yaw += (e.clientX - state.fpv.lx) * 0.005;
    state.fpv.pitch = Math.max(-1.2, Math.min(1.2, state.fpv.pitch + (e.clientY - state.fpv.ly) * 0.005));
    state.fpv.lx = e.clientX; state.fpv.ly = e.clientY;
  });
  fpvCv.addEventListener("wheel", (e) => {
    e.preventDefault();
    state.fpv.thrust = Math.max(-0.15, Math.min(0.25, state.fpv.thrust - Math.sign(e.deltaY) * 0.015));
  }, { passive: false });
  $("fpv-orbit").addEventListener("click", () => { state.fpv.orbit = !state.fpv.orbit; });
  $("fpv-boost").addEventListener("click", () => { state.fpv.thrust = Math.min(0.25, state.fpv.thrust + 0.03); });
  $("fpv-slow").addEventListener("click", () => { state.fpv.thrust = Math.max(0, state.fpv.thrust - 0.02); });
  $("fpv-rev").addEventListener("click", () => { state.fpv.thrust = -state.fpv.thrust; });
  $("fpv-reset").addEventListener("click", () => { Object.assign(state.fpv, { x: 0, y: 0, z: -8, yaw: 0, pitch: 0, thrust: 0.03, orbit: false }); });

  function drawFPV() {
    const ctx = fpvCv.getContext("2d");
    const W = fpvCv.width, H = fpvCv.height;
    const cam = state.fpv;
    if (cam.orbit) {
      cam.angle += 0.012;
      cam.x = Math.sin(cam.angle) * 7.5;
      cam.z = Math.cos(cam.angle) * 7.5 - 1;
      cam.yaw = -cam.angle;
    } else {
      cam.x += Math.sin(cam.yaw) * cam.thrust;
      cam.z += Math.cos(cam.yaw) * cam.thrust;
      cam.y -= Math.sin(cam.pitch) * cam.thrust;
    }

    ctx.fillStyle = "#020510";
    ctx.fillRect(0, 0, W, H);

    const nodes = [];
    const cols = ["#ffb800", "#c084fc", "#818cf8", "#c084fc", "#00ff66"];
    state.nnLayers.forEach((cnt, li) => {
      const lx = (li - 2) * 2.6;
      for (let j = 0; j < cnt; j++) {
        nodes.push({ x: lx, y: (j - (cnt - 1) / 2) * 1.1, z: Math.sin(li + j) * 0.8, c: cols[li], act: (state.nnActs[li] && state.nnActs[li][j]) || 0.5 });
      }
    });

    const proj = (wx, wy, wz) => {
      const dx = wx - cam.x, dy = wy - cam.y, dz = wz - cam.z;
      const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
      const rx = dx * cy + dz * sy, rz = -dx * sy + dz * cy;
      const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      const ry = dy * cp - rz * sp, rz2 = dy * sp + rz * cp;
      if (rz2 < 0.25) return null;
      const f = 360;
      return { sx: W / 2 + (rx * f) / rz2, sy: H / 2 - (ry * f) / rz2, r: Math.max(2, (f * 0.14) / rz2), d: rz2 };
    };

    const pts = nodes.map((n) => ({ ...n, p: proj(n.x, n.y, n.z) })).filter((n) => n.p);
    ctx.strokeStyle = "rgba(129, 140, 248, 0.22)";
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < Math.min(pts.length, i + 7); j++) {
        ctx.beginPath(); ctx.moveTo(pts[i].p.sx, pts[i].p.sy); ctx.lineTo(pts[j].p.sx, pts[j].p.sy); ctx.stroke();
      }
    }
    pts.sort((a, b) => b.p.d - a.p.d).forEach((n) => {
      ctx.fillStyle = n.c;
      ctx.beginPath(); ctx.arc(n.p.sx, n.p.sy, n.p.r * (0.7 + n.act * 0.6), 0, Math.PI * 2); ctx.fill();
    });
    ctx.strokeStyle = "#ffb800";
    ctx.beginPath();
    ctx.moveTo(W / 2 - 12, H / 2); ctx.lineTo(W / 2 + 12, H / 2);
    ctx.moveTo(W / 2, H / 2 - 12); ctx.lineTo(W / 2, H / 2 + 12);
    ctx.stroke();
  }

  // ── Global VPN Grid ──
  const REGIONS = {
    ASIA: ["JP", "KR", "TH", "SG", "IN", "HK", "TW", "ID", "PK"],
    EUROPE: ["DE", "NL", "GB", "FR", "CH", "SE", "PL", "RU", "RO", "IT"],
    AMERICAS: ["US", "CA", "BR", "AR", "MX"],
    OCEANIA: ["AU"],
    AFRICA: ["EG", "ZA", "KE"],
    MIDEAST: ["AE", "IL", "TR"],
  };
  document.querySelectorAll("#vpn-region-bar button").forEach((b) => {
    b.addEventListener("click", () => {
      state.vpnRegion = b.dataset.region;
      document.querySelectorAll("#vpn-region-bar button").forEach((x) => x.classList.toggle("active", x === b));
    });
  });

  function llToXY(lat, lon, W, H) {
    const px = 30, py = 20;
    const x = px + ((lon + 180) / 360) * (W - 2 * px);
    const latR = (Math.max(-80, Math.min(80, lat)) * Math.PI) / 180;
    const merc = Math.log(Math.tan(Math.PI / 4 + latR / 2));
    const y = py + (1 - (merc + Math.PI) / (2 * Math.PI)) * (H - 2 * py);
    return [x, y];
  }

  $("vpn-canvas").addEventListener("click", (e) => {
    const rect = $("vpn-canvas").getBoundingClientRect();
    const scaleX = $("vpn-canvas").width / rect.width;
    const scaleY = $("vpn-canvas").height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    let best = null, bestD = 24;
    state.vpnNodes.forEach((nd) => {
      const [nx, ny] = llToXY(nd.lat, nd.lon, $("vpn-canvas").width, $("vpn-canvas").height);
      const d = Math.hypot(mx - nx, my - ny);
      if (d < bestD) { best = nd; bestD = d; }
    });
    if (best) {
      state.vpnSelected = best;
      $("vpn-selected-info").textContent = `${best.city} [${best.country}] | ${best.ping_ms} ms | ${best.users} users | ${best.provider}`;
    }
  });

  function drawVPN() {
    const cv = $("vpn-canvas");
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    ctx.fillStyle = "#020c1a";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#0d2040";
    ctx.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 30) {
      const [x] = llToXY(0, lon, W, H);
      ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, H - 20); ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const [, y] = llToXY(lat, 0, W, H);
      ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(W - 30, y); ctx.stroke();
    }

    const visible = state.vpnRegion === "ALL"
      ? state.vpnNodes
      : state.vpnNodes.filter((n) => (REGIONS[state.vpnRegion] || []).includes(n.country));

    const hub = state.vpnSelected || visible[0];
    if (hub) {
      const [hx, hy] = llToXY(hub.lat, hub.lon, W, H);
      ctx.strokeStyle = "rgba(0, 229, 255, 0.25)";
      visible.slice(0, 10).forEach((n) => {
        const [nx, ny] = llToXY(n.lat, n.lon, W, H);
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + nx) / 2, Math.min(hy, ny) - 24, nx, ny); ctx.stroke();
      });
    }

    const pulse = (Date.now() % 1800) / 1800;
    visible.forEach((nd) => {
      const [x, y] = llToXY(nd.lat, nd.lon, W, H);
      const col = nd.ping_ms < 60 ? "#00ff66" : nd.ping_ms < 150 ? "#ffb800" : "#ff4757";
      ctx.strokeStyle = col;
      ctx.globalAlpha = 1 - pulse;
      ctx.beginPath(); ctx.arc(x, y, 4 + pulse * 12, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, state.vpnSelected && state.vpnSelected.city === nd.city ? 5.5 : 3.5, 0, Math.PI * 2); ctx.fill();
      if (nd.users > 1000 || (state.vpnSelected && state.vpnSelected.city === nd.city)) {
        ctx.font = "11px Courier New";
        ctx.fillText(`${nd.city} (${nd.ping_ms}ms)`, x + 7, y + 3);
      }
    });
  }

  // ── Swarm Terminal ──
  function appendTerm(text) {
    const out = $("swarm-out");
    out.textContent += `${text}\n`;
    out.scrollTop = out.scrollHeight;
  }

  function runSwarmCmd(raw) {
    const cmd = raw.trim();
    if (!cmd) return;
    appendTerm(`SWARM@LUNA> ${cmd}`);
    const low = cmd.toLowerCase();
    if (low === "clear") { $("swarm-out").textContent = ""; return; }
    if (low === "help") {
      appendTerm("Commands: help | status | satgpu | fpv | vpn | bridge | networkbuster | clear");
    } else if (low === "status") {
      appendTerm(`[MOCR] CPU ${state.cpu.toFixed(1)}% | RAM ${state.ram.toFixed(1)}% | Bridge: ${bridgeOnline ? "LIVE" : "SIM"}`);
    } else if (low === "satgpu") {
      const nd = state.satNodes[state.satIdx];
      appendTerm(`[SATGPU] ${nd.id} (${nd.orbit}) ${nd.gpu} | Tensor ${nd.tensor_pct}% | Temp ${nd.temp_c}C`);
    } else if (low === "fpv") {
      appendTerm(`[FPV] CAM=(${state.fpv.x.toFixed(1)}, ${state.fpv.y.toFixed(1)}, ${state.fpv.z.toFixed(1)}) THRUST=${state.fpv.thrust.toFixed(3)}`);
    } else if (low === "vpn") {
      appendTerm(`[VPN GRID] ${state.vpnNodes.length} public nodes tracked across 6 regions.`);
    } else if (low === "bridge") {
      appendTerm(`[BRIDGE] Target: ${bridgeUrl} (${bridgeOnline ? "CONNECTED" : "OFFLINE - USING CLOUD SIM"})`);
    } else if (low === "networkbuster") {
      appendTerm("[NETWORKBUSTER-CLOUD] Luna.eu Addon synced. Run addon_server.py for live OS telemetry.");
    } else {
      appendTerm(`[SWARM] Unknown command '${cmd}'. Type 'help'.`);
    }
  }

  $("swarm-send").addEventListener("click", () => { runSwarmCmd($("swarm-in").value); $("swarm-in").value = ""; });
  $("swarm-in").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { runSwarmCmd($("swarm-in").value); $("swarm-in").value = ""; }
  });

  // ── Boot & Animation Loop ──
  initSatControls();
  renderSatSidebar();
  appendTerm("LunaRecycle × NetworkBuster-Cloud Mission Control initialized.");
  appendTerm("Type 'help' for Swarm commands.");
  pollBridge();
  setInterval(pollBridge, 1800);

  function frame() {
    if (activeTab === "overview") { drawNN(); drawTelemetry(); }
    if (activeTab === "satgpu") { drawSatCam(); }
    if (activeTab === "fpv") { drawFPV(); }
    if (activeTab === "vpn") { drawVPN(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
