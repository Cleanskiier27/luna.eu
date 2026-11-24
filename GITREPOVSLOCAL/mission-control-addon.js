(() => {
  "use strict";

  const DEFAULT_BRIDGE = "http://127.0.0.1:4195";
  let bridgeUrl = localStorage.getItem("mocr_bridge_url") || DEFAULT_BRIDGE;
  let bridgeOnline = false;
  let activeTab = "overview";
  const startTime = Number(localStorage.getItem("mocr_met_start")) || (localStorage.setItem("mocr_met_start", String(Date.now())), Date.now());

  const SATGPU_DEFAULT = [
    { id: "SATGPU-ALPHA", orbit: "LEO 540km", inc: 51.6, gpu: "H100-ORBIT 64TFLOPS", lat: 28.5, lon: -80.6, spd: 0.85, tensor_pct: 48, vram_pct: 61, temp_c: 54.2, downlink_mbps: 440 },
    { id: "SATGPU-LUNA-1", orbit: "LUNAR RELAY", inc: 28.5, gpu: "B200-RAD 120TFLOPS", lat: 12.4, lon: 18.2, spd: 0.42, tensor_pct: 64, vram_pct: 72, temp_c: 60.4, downlink_mbps: 510 },
    { id: "SATGPU-ISS-CORE", orbit: "ISS 408km", inc: 51.6, gpu: "A100-SPACE 42TFLOPS", lat: -22.1, lon: 134.8, spd: 1.05, tensor_pct: 37, vram_pct: 52, temp_c: 49.8, downlink_mbps: 390 },
    { id: "SATGPU-POLAR-4", orbit: "SSO 780km", inc: 98.2, gpu: "L40S-ORBIT 38TFLOPS", lat: 64.1, lon: -21.9, spd: 0.72, tensor_pct: 55, vram_pct: 58, temp_c: 56.1, downlink_mbps: 425 },
    { id: "SATGPU-GEO-WEST", orbit: "GEO 35786km", inc: 0.1, gpu: "H200-GEO 96TFLOPS", lat: 0.0, lon: -105.0, spd: 0.1, tensor_pct: 41, vram_pct: 49, temp_c: 51.0, downlink_mbps: 365 },
  ];

  const NASA_RELAYS_DEFAULT = [
    { id: "NASA-GDSCC", name: "NASA-GDSCC Goldstone", lat: 35.4, lon: -116.9, band: "Ka-Band", status: "LOCKED" },
    { id: "NASA-MDSCC", name: "NASA-MDSCC Madrid", lat: 40.4, lon: -4.2, band: "S-Band", status: "LOCKED" },
    { id: "NASA-CDSCC", name: "NASA-CDSCC Canberra", lat: -35.4, lon: 149.0, band: "X-Band", status: "LOCKED" },
    { id: "NASA-GSFC", name: "NASA-GSFC Goddard", lat: 39.0, lon: -76.8, band: "Optical", status: "LOCKED" },
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

  const DEFAULT_CHECKLIST = [
    { id: "bridge", label: "Verify Local Telemetry Bridge (/api/health & /api/telemetry)", done: false, detail: "Pending check", status: "PENDING" },
    { id: "procs", label: "Verify Live Running Programs & Socket Intercept Feeds", done: false, detail: "Pending check", status: "PENDING" },
    { id: "neural", label: "Confirm Neural Network [4-7-9-7-3] & Stream of Thought Active", done: true, detail: "Stream active", status: "PASS" },
    { id: "satgpu", label: "Lock SatGPU Orbital Compute Node & Onboard Camera Feed", done: true, detail: "SATGPU-ALPHA locked", status: "PASS" },
    { id: "vpn", label: "Verify Global VPN Grid & NASA Force Push Relay Channel", done: false, detail: "Pending check", status: "PENDING" },
    { id: "routes", label: "Probe LunaRecycle Site & Sim Routes (index, rocket-launch, simulation3d, seo-toolkit)", done: false, detail: "Pending check", status: "PENDING" },
    { id: "owner", label: "Confirm Ownership Attribution (Andrew t Middleton) & DATACENTRAL Link", done: true, detail: "Verified in DOM", status: "PASS" },
    { id: "sync", label: "Review Branch Sync (addon/mission-control-satgpu & DATACENTRAL)", done: true, detail: "Synced on GitHub", status: "PASS" },
  ];

  const BLUEPRINTS_FALLBACK = [
    {
      id: "BP-01",
      code: "LUNA-HAB-01",
      title: "Lunar Habitat & Command Dome",
      category: "SURFACE ARCHITECTURE",
      dimensions: "54.0 m span x 25.0 m elevation",
      power_kw: 185,
      mass_tons: 42.6,
      summary: "Regolith-shielded geodesic command dome assembled in 5 highlighted stages from solar bus to orbital DSN lock.",
      build_sequence: [
        { step: 1, code: "01", feature: "Solar Array Power Bus", explanation: "Deploy dual photovoltaic wings (185 kW) and anchor power bus into lunar regolith before pressurizing habitat modules.", hx: 44, hy: 226, hw: 146, hh: 72 },
        { step: 2, code: "02", feature: "EVA Airlock & Dust Seal", explanation: "Mate pressurized airlock tunnel and electrostatic dust shield onto the primary pad foundation.", hx: 190, hy: 244, hw: 84, hh: 56 },
        { step: 3, code: "03", feature: "Geodesic Command Dome", explanation: "Erect and inflate the 54 m regolith-shielded geodesic command dome housing MOCR workstations.", hx: 274, hy: 162, hw: 228, hh: 138 },
        { step: 4, code: "04", feature: "Optical Comms Mast", explanation: "Raise the 25 m laser optical mast to establish line-of-sight telemetry with orbital SatGPU nodes.", hx: 506, hy: 152, hw: 58, hh: 146 },
        { step: 5, code: "05", feature: "SatGPU & NASA DSN Lock", explanation: "Synchronize surface mast with overhead SatGPU compute ring and NASA DSN Force-Push carrier.", hx: 578, hy: 54, hw: 156, hh: 88 },
      ],
    },
    {
      id: "BP-02",
      code: "SATGPU-RING-02",
      title: "SatGPU Orbital Compute Ring",
      category: "ORBITAL COMPUTE",
      dimensions: "14.8 m truss x 4.2 m bus",
      power_kw: 92,
      mass_tons: 6.4,
      summary: "Radiation-hardened H100/B200 orbital compute ring featuring nadir multi-spectral camera gimbal and cryo radiator fins.",
      build_sequence: [
        { step: 1, code: "01", feature: "Orbital Truss Backbone", explanation: "Deploy primary 14.8 m carbon-composite truss spine in LEO/Lunar relay inclination.", hx: 210, hy: 160, hw: 360, hh: 80 },
        { step: 2, code: "02", feature: "Tensor Compute Core", explanation: "Dock radiation-hardened H100-ORBIT / B200-RAD tensor modules onto central bus bay.", hx: 320, hy: 152, hw: 140, hh: 96 },
        { step: 3, code: "03", feature: "Cryo Radiator & Solar Fins", explanation: "Unfurl dual-loop thermal radiators and 92 kW photovoltaic wings for continuous GPU cooling.", hx: 92, hy: 170, hw: 596, hh: 60 },
        { step: 4, code: "04", feature: "Nadir Camera & Phased Array", explanation: "Calibrate 4-band optical/IR/SAR camera gimbal and Ka/X-band downlink array.", hx: 334, hy: 248, hw: 112, hh: 110 },
      ],
    },
    {
      id: "BP-03",
      code: "NASA-DSN-PUSH-03",
      title: "NASA DSN Force-Push Relay Mesh",
      category: "DEEP SPACE NETWORK",
      dimensions: "384,400 km Earth-Moon Span",
      power_kw: 120,
      mass_tons: 3.8,
      summary: "Earth DSN ground anchors (Goldstone, Madrid, Canberra, Goddard) routing Force-Push bursts via Lunar Halo Relay to public VPN nodes.",
      build_sequence: [
        { step: 1, code: "01", feature: "Earth DSN Ground Anchors", explanation: "Lock Goldstone, Madrid, Canberra, and Goddard stations onto synchronized mission time.", hx: 66, hy: 130, hw: 168, hh: 160 },
        { step: 2, code: "02", feature: "Ka/S/X Carrier Uplink", explanation: "Establish multi-band encrypted Force-Push uplink corridor toward lunar halo orbit.", hx: 236, hy: 116, hw: 160, hh: 180 },
        { step: 3, code: "03", feature: "Lunar Halo Optical Relay", explanation: "Bridge Earth RF uplink to high-throughput optical relay orbiting Moonbase Dome.", hx: 396, hy: 140, hw: 136, hh: 130 },
        { step: 4, code: "04", feature: "VPN Grid Telemetry Fan-Out", explanation: "Broadcast Force-Push telemetry bursts across 38 public VPN nodes with live ACK tracking.", hx: 540, hy: 116, hw: 170, hh: 180 },
      ],
    },
    {
      id: "BP-04",
      code: "NEURAL-THOUGHT-04",
      title: "Neural Stream-of-Thought Core",
      category: "COGNITIVE TELEMETRY",
      dimensions: "4-7-9-7-3 Lattice",
      power_kw: 14,
      mass_tons: 0.9,
      summary: "Live feed-forward neural lattice synthesizing CPU, RAM, Network, and Disk telemetry into SENSE -> CONTEXT -> DECIDE thought traces.",
      build_sequence: [
        { step: 1, code: "01", feature: "4-Channel Sensor Bus", explanation: "Ingest normalized CPU, RAM, Network I/O, and Disk metrics from the cached bridge.", hx: 64, hy: 130, hw: 140, hh: 160 },
        { step: 2, code: "02", feature: "Hidden Lattice [7-9-7]", explanation: "Propagate activations across encoding, context, and decision layers to locate peak neuron.", hx: 224, hy: 100, hw: 220, hh: 210 },
        { step: 3, code: "03", feature: "Stream of Thought Emitter", explanation: "Translate peak hidden activations into human-readable SENSE -> CONTEXT -> DECIDE traces.", hx: 454, hy: 118, hw: 134, hh: 174 },
        { step: 4, code: "04", feature: "Checklist & Swarm Actuator", explanation: "Drive Activity Checklist readiness checks and interactive Swarm CMD / prompt steering.", hx: 594, hy: 130, hw: 132, hh: 156 },
      ],
    },
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
    thoughtTrace: null,
    thoughtPaused: false,
    thoughtFocus: "ALL",
    thoughts: [],
    satNodes: SATGPU_DEFAULT,
    satIdx: 0,
    satMode: "OPTICAL",
    satZoom: 1.0,
    nasaRelays: NASA_RELAYS_DEFAULT,
    vpnNodes: VPN_FALLBACK,
    vpnRegion: "ALL",
    vpnSelected: null,
    vpnBursts: [],
    vpnPushFrames: 0,
    vpnAutoPush: false,
    procs: [],
    tabs: [],
    conns: [],
    checklist: loadChecklist(),
    blueprints: BLUEPRINTS_FALLBACK,
    bpIdx: 0,
    bpStep: 0,
    bpPlay: false,
    bpGrid: true,
    bpCallouts: true,
    bpShowAll: false,
    fpv: { x: 0, y: 0, z: -8, yaw: 0, pitch: 0, thrust: 0.03, orbit: true, angle: 0, dragging: false, lx: 0, ly: 0 },
  };

  function loadChecklist() {
    try {
      const raw = localStorage.getItem("mocr_activity_checklist_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_CHECKLIST.map((x) => ({ ...x }));
  }

  function saveChecklist() {
    try {
      localStorage.setItem("mocr_activity_checklist_v1", JSON.stringify(state.checklist));
    } catch { /* ignore */ }
  }

  const $ = (id) => document.getElementById(id);
  const bridgeInput = $("bridge-url");
  bridgeInput.value = bridgeUrl;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch]));
  }

  // ── Tab Switching ──
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".tab-pane").forEach((p) => p.classList.toggle("active", p.id === `tab-${activeTab}`));
    });
  });

  $("btn-crt").addEventListener("click", () => document.body.classList.toggle("crt-scanlines"));
  $("btn-bp-bg").addEventListener("click", () => document.body.classList.toggle("blueprint-bg"));
  $("btn-reconnect").addEventListener("click", () => {
    bridgeUrl = bridgeInput.value.trim().replace(/\/+$/, "") || DEFAULT_BRIDGE;
    localStorage.setItem("mocr_bridge_url", bridgeUrl);
    pollBridge();
    appendTerm(`[BRIDGE] Reconnecting to ${bridgeUrl} ...`);
    pushThought("CONTEXT", "TELEMETRY", `Reconnecting telemetry bridge -> ${bridgeUrl}`);
  });

  // ── Clocks ──
  setInterval(() => {
    const now = new Date();
    $("mocr-utc").textContent = now.toISOString().slice(11, 19);
    const s = Math.floor((Date.now() - startTime) / 1000);
    const pad = (n, w = 2) => String(n).padStart(w, "0");
    $("mocr-met").textContent = `${pad(Math.floor(s / 86400), 3)}:${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  }, 1000);

  // ── Neural Stream of Thought Engine ──
  function pushThought(phase, domain, text) {
    if (state.thoughtPaused && phase !== "PROMPT") return;
    const ts = new Date().toISOString().slice(11, 19);
    state.thoughts.push({ ts, phase, domain, text });
    if (state.thoughts.length > 60) state.thoughts.shift();
    renderThoughtStream();
  }

  function renderThoughtStream() {
    const box = $("nn-thought-stream");
    if (!box) return;
    const filtered = state.thoughtFocus === "ALL"
      ? state.thoughts
      : state.thoughts.filter((t) => t.domain === state.thoughtFocus || t.phase === "PROMPT");
    const clsMap = { SENSE: "thought-sense", CONTEXT: "thought-ctx", DECIDE: "thought-decide", PROMPT: "thought-user" };
    box.innerHTML = filtered.slice(-30).map((t) =>
      `<div class="thought-line"><span class="thought-time">[${t.ts}]</span>` +
      `<span class="thought-phase ${clsMap[t.phase] || "thought-ctx"}">${esc(t.phase)}//${esc(t.domain)}</span>` +
      `<span>${esc(t.text)}</span></div>`
    ).join("");
    box.scrollTop = box.scrollHeight;
  }

  $("thought-toggle").addEventListener("click", () => {
    state.thoughtPaused = !state.thoughtPaused;
    $("thought-toggle").textContent = state.thoughtPaused ? "Resume Stream" : "Pause Stream";
  });

  document.querySelectorAll("[data-thought-focus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.thoughtFocus = btn.dataset.thoughtFocus;
      document.querySelectorAll("[data-thought-focus]").forEach((x) => x.classList.toggle("active", x === btn));
      $("thought-focus-label").textContent = `FOCUS: ${state.thoughtFocus}`;
      renderThoughtStream();
    });
  });

  function handleThoughtPrompt(raw) {
    const q = raw.trim();
    if (!q) return;
    pushThought("PROMPT", "USER", q);
    const low = q.toLowerCase();
    const nd = state.satNodes[state.satIdx] || SATGPU_DEFAULT[0];
    if (low.includes("sat")) {
      pushThought("DECIDE", "SATGPU", `${nd.id} (${nd.orbit}) Tensor=${nd.tensor_pct}% VRAM=${nd.vram_pct}% Temp=${nd.temp_c}C Downlink=${nd.downlink_mbps}Mbps.`);
    } else if (low.includes("vpn") || low.includes("nasa") || low.includes("push")) {
      const ch = $("vpn-channel-select").value;
      pushThought("DECIDE", "VPN", `Channel ${ch} locked across ${state.nasaRelays.length} NASA DSN relays -> ${state.vpnNodes.length} public VPN nodes (${state.vpnPushFrames} bursts sent).`);
    } else if (low.includes("check")) {
      const doneCount = state.checklist.filter((c) => c.done).length;
      pushThought("DECIDE", "TELEMETRY", `Activity checklist ${doneCount}/${state.checklist.length} items complete.`);
    } else {
      pushThought("DECIDE", "TELEMETRY", `System ${Math.max(state.cpu, state.ram) > 80 ? "ELEVATED" : "NOMINAL"}: CPU=${state.cpu.toFixed(1)}% RAM=${state.ram.toFixed(1)}% LoadIdx=${state.nnOut.load_index.toFixed(2)} Eff=${state.nnOut.efficiency.toFixed(2)}.`);
    }
  }

  $("thought-inject").addEventListener("click", () => {
    handleThoughtPrompt($("thought-input").value);
    $("thought-input").value = "";
  });
  $("thought-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleThoughtPrompt($("thought-input").value);
      $("thought-input").value = "";
    }
  });

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
    state.thoughtTrace = {
      stage: Math.max(state.cpu, state.ram) > 80 ? "ELEVATED" : "NOMINAL",
      peak_layer_idx: 2,
      peak_neuron: 3,
      peak_activation: state.nnActs[2][3],
      summary: `SIM SENSE CPU ${state.cpu.toFixed(1)}% RAM ${state.ram.toFixed(1)}% -> H2#4 (${state.nnActs[2][3].toFixed(2)}) -> Cloud Runner nominal`,
    };
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
  let pollSeq = 0;
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
        state.thoughtTrace = tel.thought_trace || null;
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
        if (vRes && Array.isArray(vRes.nasa_relays) && vRes.nasa_relays.length) state.nasaRelays = vRes.nasa_relays;
        $("bridge-data-note").textContent = `Streaming live Windows data from ${bridgeUrl}`;
      } else {
        bridgeOnline = false;
        badge.textContent = "CLOUD RUNNER SIM";
        badge.className = "bridge-badge sim";
        simulateStep();
        $("bridge-data-note").textContent = "Cloud Runner simulation active (start addon_server.py locally for live OS processes & tabs)";
      }

      pollSeq += 1;
      if (state.thoughtTrace) {
        if (pollSeq % 2 === 1) {
          pushThought("SENSE", "TELEMETRY", state.thoughtTrace.summary);
        } else {
          const nd = state.satNodes[state.satIdx] || SATGPU_DEFAULT[0];
          pushThought("CONTEXT", "SATGPU", `${nd.id} tensor=${nd.tensor_pct}% temp=${nd.temp_c}C | Net=${formatBytes(state.netBps)} -> Eff=${state.nnOut.efficiency.toFixed(2)}`);
        }
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
      ["THOUGHT-ENG", state.thoughtPaused ? "PAUSED" : "STREAMING", state.thoughtPaused ? "#ffa500" : "#00ff66"],
      ["NASA-VPN", `${state.nasaRelays.length} RELAYS`, "#ffb800"],
      ["NET-INTERCEPT", "ARMED", "#ff4757"],
      ["CHECKLIST", `${state.checklist.filter((c) => c.done).length}/${state.checklist.length}`, "#c084fc"],
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

  $("table-search").addEventListener("input", renderTables);

  // ── Canvas 1: Refined Neural Net with Traveling Signal Packets & Layer Labels ──
  function drawNN() {
    const cv = $("nn-canvas");
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, W, H);

    const layers = state.nnLayers;
    const pos = layers.map((n, li) => {
      const x = 84 + (li * (W - 168)) / (layers.length - 1);
      return Array.from({ length: n }, (_, ni) => ({
        x,
        y: n === 1 ? H / 2 : 28 + (ni * (H - 64)) / (n - 1),
      }));
    });

    const t = Date.now() * 0.0035;
    for (let l = 0; l < layers.length - 1; l++) {
      for (let i = 0; i < pos[l].length; i++) {
        for (let j = 0; j < pos[l + 1].length; j++) {
          const act = (state.nnActs[l] && state.nnActs[l][i]) || 0.4;
          const pulse = 0.5 + 0.5 * Math.sin(t + i * 0.9 + j * 0.6 + l);
          const hot = pulse * act > 0.46;
          ctx.strokeStyle = hot ? "rgba(255, 184, 0, 0.56)" : "rgba(40, 58, 100, 0.32)";
          ctx.lineWidth = hot ? 1.4 : 0.7;
          ctx.beginPath();
          ctx.moveTo(pos[l][i].x, pos[l][i].y);
          ctx.lineTo(pos[l + 1][j].x, pos[l + 1][j].y);
          ctx.stroke();

          if (hot && ((i + j + l) % 3 === 0)) {
            const p = (t * 0.6 + i * 0.17 + j * 0.23) % 1;
            const px = pos[l][i].x + (pos[l + 1][j].x - pos[l][i].x) * p;
            const py = pos[l][i].y + (pos[l + 1][j].y - pos[l][i].y) * p;
            ctx.fillStyle = l === layers.length - 2 ? "#00ff66" : "#00e5ff";
            ctx.beginPath();
            ctx.arc(px, py, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    const cols = ["#ffb800", "#c084fc", "#818cf8", "#c084fc", "#00ff66"];
    const layerNames = ["IN:TELEM", "H1:ENC", "H2:CTX", "H3:DEC", "OUT:ACT"];
    const inLabels = ["CPU", "RAM", "NET", "DSK"];
    const outLabels = ["LOAD", "EFF", "ALRT"];

    pos.forEach((colNodes, l) => {
      const layerActs = state.nnActs[l] || [];
      let peakIdx = 0;
      layerActs.forEach((v, idx) => { if (v > (layerActs[peakIdx] || 0)) peakIdx = idx; });

      colNodes.forEach((pt, j) => {
        const act = layerActs[j] || 0.3;
        const r = 8 + act * 4;
        if (l > 0 && l < layers.length - 1 && j === peakIdx) {
          ctx.strokeStyle = "#00e5ff";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = cols[l];
        ctx.globalAlpha = 0.25 + act * 0.72;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = cols[l];
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.fillStyle = act > 0.55 ? "#030712" : "#e6edf3";
        ctx.font = "9px Courier New";
        ctx.textAlign = "center";
        ctx.fillText(act.toFixed(1), pt.x, pt.y + 3);

        if (l === 0) {
          ctx.fillStyle = "#ffb800";
          ctx.textAlign = "right";
          ctx.fillText(inLabels[j] || "", pt.x - 16, pt.y + 3);
        } else if (l === layers.length - 1) {
          ctx.fillStyle = "#00ff66";
          ctx.textAlign = "left";
          ctx.fillText(outLabels[j] || "", pt.x + 16, pt.y + 3);
        }
      });

      ctx.fillStyle = cols[l];
      ctx.font = "bold 10px Courier New";
      ctx.textAlign = "center";
      ctx.fillText(layerNames[l], colNodes[0].x, H - 10);
    });
    ctx.textAlign = "left";
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
        pushThought("DECIDE", "SATGPU", `Switched onboard camera feed to ${state.satNodes[state.satIdx].id}`);
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

    const r = Math.max(W, H) * 0.92 * state.satZoom;
    const hy = H * 0.43;
    ctx.fillStyle = limb;
    ctx.strokeStyle = hi;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, hy + r, r, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

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

  // ── Global VPN Grid & NASA Force Push Channel ──
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

  function visibleVpnNodes() {
    return state.vpnRegion === "ALL"
      ? state.vpnNodes
      : state.vpnNodes.filter((n) => (REGIONS[state.vpnRegion] || []).includes(n.country));
  }

  function triggerNasaForcePush() {
    const channel = $("vpn-channel-select").value;
    const targets = visibleVpnNodes();
    state.vpnPushFrames += 1;
    const avgPing = targets.length
      ? Math.round(targets.reduce((acc, n) => acc + n.ping_ms, 0) / targets.length)
      : 0;
    const ts = new Date().toISOString().slice(11, 19);
    state.vpnBursts.push({ started: Date.now(), channel, relayIdx: state.vpnPushFrames % state.nasaRelays.length });
    if (state.vpnBursts.length > 6) state.vpnBursts.shift();

    $("vpn-push-stats").textContent = `FRAMES: ${state.vpnPushFrames} | RELAYS: ${state.nasaRelays.length} | ACK: ${avgPing} ms`;
    const log = $("vpn-push-log");
    const relay = state.nasaRelays[state.vpnPushFrames % state.nasaRelays.length];
    log.textContent = `[${ts}] FORCE PUSH #${state.vpnPushFrames} [${channel}] from ${relay.id} -> ${targets.length} VPN nodes (avg ACK ${avgPing}ms)\n` + log.textContent;
    pushThought("DECIDE", "VPN", `NASA Force Push #${state.vpnPushFrames} on ${channel} via ${relay.id} (${targets.length} nodes, ${avgPing}ms ACK).`);
    appendTerm(`[NASA-VPN] Force Push #${state.vpnPushFrames} dispatched on ${channel} (${targets.length} nodes).`);
  }

  $("vpn-force-push").addEventListener("click", triggerNasaForcePush);
  $("vpn-auto-push").addEventListener("click", () => {
    state.vpnAutoPush = !state.vpnAutoPush;
    $("vpn-auto-push").textContent = `Auto-Pulse: ${state.vpnAutoPush ? "ON" : "OFF"}`;
    $("vpn-auto-push").classList.toggle("active", state.vpnAutoPush);
  });
  setInterval(() => {
    if (state.vpnAutoPush) triggerNasaForcePush();
  }, 4500);

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

    const visible = visibleVpnNodes();
    const now = Date.now();
    state.vpnBursts = state.vpnBursts.filter((b) => now - b.started < 2400);

    const hub = state.vpnSelected || visible[0];
    if (hub) {
      const [hx, hy] = llToXY(hub.lat, hub.lon, W, H);
      ctx.strokeStyle = "rgba(0, 229, 255, 0.25)";
      visible.slice(0, 10).forEach((n) => {
        const [nx, ny] = llToXY(n.lat, n.lon, W, H);
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + nx) / 2, Math.min(hy, ny) - 24, nx, ny); ctx.stroke();
      });
    }

    // Active NASA Force Push waves & arcs
    state.vpnBursts.forEach((burst) => {
      const prog = (now - burst.started) / 2400;
      const relay = state.nasaRelays[burst.relayIdx] || state.nasaRelays[0];
      const [rx, ry] = llToXY(relay.lat, relay.lon, W, H);

      ctx.strokeStyle = `rgba(255, 184, 0, ${(1 - prog).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rx, ry, 8 + prog * 90, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 184, 0, ${((1 - prog) * 0.55).toFixed(2)})`;
      ctx.lineWidth = 1.2;
      visible.slice(0, 14).forEach((n) => {
        const [nx, ny] = llToXY(n.lat, n.lon, W, H);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.quadraticCurveTo((rx + nx) / 2, Math.min(ry, ny) - 34, nx, ny);
        ctx.stroke();
      });
    });

    const pulse = (now % 1800) / 1800;
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

    // NASA DSN / MOCR Relay Diamonds
    state.nasaRelays.forEach((relay) => {
      const [rx, ry] = llToXY(relay.lat, relay.lon, W, H);
      ctx.fillStyle = "#ffb800";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(rx, ry - 6);
      ctx.lineTo(rx + 6, ry);
      ctx.lineTo(rx, ry + 6);
      ctx.lineTo(rx - 6, ry);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.font = "bold 10px Courier New";
      ctx.fillStyle = "#ffb800";
      ctx.fillText(`${relay.id} [${relay.band}]`, rx + 8, ry - 4);
    });
  }

  // ── Activity Checklist ──
  function renderChecklist() {
    const list = $("checklist-items");
    const done = state.checklist.filter((c) => c.done).length;
    const total = state.checklist.length || 1;
    const pct = Math.round((done / total) * 100);
    $("chk-progress-bar").style.width = `${pct}%`;
    $("chk-progress-text").textContent = `${pct}%`;
    $("chk-summary").textContent = `${done} / ${state.checklist.length} COMPLETE`;
    $("mocr-checklist-chip").textContent = `${done}/${state.checklist.length}`;

    list.innerHTML = state.checklist.map((item, idx) => {
      const cls = item.status === "PASS" ? "chk-pass" : item.status === "WARN" ? "chk-warn" : "chk-pending";
      return `<div class="check-row">` +
        `<label><input type="checkbox" data-chk-idx="${idx}" ${item.done ? "checked" : ""}><span>${esc(item.label)}</span></label>` +
        `<div class="check-meta"><span style="color:var(--muted);font-size:0.74rem">${esc(item.detail)}</span>` +
        `<span class="chk-pill ${cls}">${esc(item.status)}</span></div></div>`;
    }).join("");

    list.querySelectorAll("input[type='checkbox']").forEach((cb) => {
      cb.addEventListener("change", () => {
        const idx = Number(cb.dataset.chkIdx);
        state.checklist[idx].done = cb.checked;
        state.checklist[idx].status = cb.checked ? "PASS" : "PENDING";
        state.checklist[idx].detail = cb.checked ? "Manual check" : "Unchecked";
        saveChecklist();
        renderChecklist();
        renderDomTelemetry();
      });
    });
  }

  async function runAutoChecklist() {
    pushThought("SENSE", "TELEMETRY", "Running live Activity Checklist audit across bridge, VPN, and site routes...");
    const setItem = (id, ok, detail) => {
      const it = state.checklist.find((x) => x.id === id);
      if (it) {
        it.done = ok;
        it.status = ok ? "PASS" : "WARN";
        it.detail = detail;
      }
    };

    const [health, tel, procs, conns, vpn] = await Promise.all([
      fetchJson("/api/health"),
      fetchJson("/api/telemetry"),
      fetchJson("/api/processes"),
      fetchJson("/api/connections"),
      fetchJson("/api/vpn-nodes"),
    ]);

    setItem("bridge", Boolean(health && tel), health ? `Online (uptime ${health.uptime_s}s)` : "Bridge offline (SIM mode)");
    setItem("procs", Boolean(procs && conns), procs ? `${procs.count} procs / ${conns.count} sockets` : "Fallback rows");
    setItem("neural", state.thoughts.length > 0, `Stream active (${state.thoughts.length} thoughts)`);
    setItem("satgpu", state.satNodes.length > 0, `${state.satNodes[state.satIdx].id} ready`);
    setItem("vpn", Boolean(vpn && vpn.nodes), vpn ? `${vpn.count} nodes + ${(vpn.nasa_relays || state.nasaRelays).length} NASA relays` : `${state.vpnNodes.length} fallback nodes`);

    const routeUrls = ["index.html", "rocket-launch.html", "simulation3d.html", "seo-toolkit.html"];
    const routeChecks = await Promise.all(routeUrls.map(async (u) => {
      try {
        const res = await fetch(u, { method: "GET" });
        return res.ok;
      } catch {
        return false;
      }
    }));
    const okCount = routeChecks.filter(Boolean).length;
    setItem("routes", okCount === routeUrls.length, `${okCount}/${routeUrls.length} HTTP 200`);

    const authorMeta = document.querySelector('meta[name="author"]');
    setItem("owner", Boolean(authorMeta && authorMeta.content.includes("Andrew t Middleton")), authorMeta ? authorMeta.content : "Missing author meta");
    setItem("sync", true, "addon/mission-control-satgpu & DATACENTRAL");

    saveChecklist();
    renderChecklist();
    renderDomTelemetry();
    pushThought("DECIDE", "TELEMETRY", `Activity Checklist complete: ${state.checklist.filter((c) => c.done).length}/${state.checklist.length} passed.`);
  }

  $("chk-run-auto").addEventListener("click", runAutoChecklist);
  $("chk-reset").addEventListener("click", () => {
    state.checklist = DEFAULT_CHECKLIST.map((x) => ({ ...x }));
    saveChecklist();
    renderChecklist();
    renderDomTelemetry();
  });
  $("chk-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ timestamp: new Date().toISOString(), checklist: state.checklist }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.download = `luna-activity-checklist-${Date.now()}.json`;
    a.href = URL.createObjectURL(blob);
    a.click();
  });
  $("chk-add-btn").addEventListener("click", () => {
    const txt = $("chk-new-input").value.trim();
    if (!txt) return;
    state.checklist.push({ id: `custom-${Date.now()}`, label: txt, done: false, detail: "Custom task", status: "PENDING" });
    $("chk-new-input").value = "";
    saveChecklist();
    renderChecklist();
    renderDomTelemetry();
  });

  // ── Moonbase Blueprints & Build Sequence ──
  async function loadBlueprints() {
    const res = await fetchJson("/api/blueprints");
    if (res && Array.isArray(res.blueprints) && res.blueprints.length) {
      state.blueprints = res.blueprints;
      initBlueprintControls();
      renderBlueprintSidebar();
    }
  }

  function initBlueprintControls() {
    const wrap = $("bp-selector");
    if (!wrap) return;
    wrap.innerHTML = state.blueprints.map((b, idx) =>
      `<button class="btn-sm ${idx === state.bpIdx ? "active" : ""}" type="button" data-bp-idx="${idx}">${esc(b.id)} // ${esc(b.code)}</button>`
    ).join("");
    wrap.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => {
        state.bpIdx = Number(b.dataset.bpIdx);
        state.bpStep = 0;
        state.bpShowAll = false;
        wrap.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
        renderBlueprintSidebar();
        const cur = state.blueprints[state.bpIdx];
        pushThought("CONTEXT", "SATGPU", `Loaded blueprint ${cur.id} (${cur.title}) build sequence.`);
      });
    });
  }

  function renderBlueprintSidebar() {
    const bp = state.blueprints[state.bpIdx] || BLUEPRINTS_FALLBACK[0];
    const seq = bp.build_sequence || [];
    if (state.bpStep >= seq.length) state.bpStep = 0;
    const activeStep = seq[state.bpStep] || { code: "01", feature: bp.title, explanation: bp.summary };

    $("bp-hud-summary").textContent = `${bp.id} // ${bp.code}`;
    $("bp-step-banner").textContent = state.bpShowAll
      ? `ALL ${seq.length} BUILD SEQUENCE FEATURES HIGHLIGHTED // ${bp.title}`
      : `Step ${activeStep.code} // ${activeStep.feature}: ${activeStep.explanation}`;

    $("bp-sidebar").innerHTML = [
      ["CATEGORY", bp.category, "#00e5ff"],
      ["DIMENSIONS", bp.dimensions, "#ffb800"],
      ["POWER / MASS", `${bp.power_kw} kW / ${bp.mass_tons} t`, "#00ff66"],
    ].map(([k, v, c]) =>
      `<div class="matrix-cell"><span>${esc(k)}</span><strong style="color:${c}">${esc(v)}</strong></div>`
    ).join("");

    $("bp-seq-list").innerHTML = seq.map((st, idx) => {
      const isAct = state.bpShowAll || idx === state.bpStep;
      const isDone = !state.bpShowAll && idx < state.bpStep;
      return `<button type="button" class="bp-step-card ${isAct ? "active" : ""} ${isDone ? "done" : ""}" data-bp-step="${idx}">` +
        `<span class="bp-step-num">${esc(st.code)}</span>` +
        `<div><strong style="color:${isAct ? "#ffb800" : "#e6edf3"}">${esc(st.feature)}</strong>` +
        `<div style="color:#98a2be;margin-top:2px">${esc(st.explanation)}</div></div></button>`;
    }).join("");

    $("bp-seq-list").querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.bpShowAll = false;
        state.bpStep = Number(btn.dataset.bpStep);
        renderBlueprintSidebar();
      });
    });
  }

  $("bp-grid-btn").addEventListener("click", () => {
    state.bpGrid = !state.bpGrid;
    $("bp-grid-btn").classList.toggle("active", state.bpGrid);
  });
  $("bp-callout-btn").addEventListener("click", () => {
    state.bpCallouts = !state.bpCallouts;
    $("bp-callout-btn").classList.toggle("active", state.bpCallouts);
  });
  $("bp-prev").addEventListener("click", () => {
    const seq = (state.blueprints[state.bpIdx] || BLUEPRINTS_FALLBACK[0]).build_sequence || [];
    state.bpShowAll = false;
    state.bpStep = (state.bpStep - 1 + seq.length) % Math.max(1, seq.length);
    renderBlueprintSidebar();
  });
  $("bp-next").addEventListener("click", () => {
    const seq = (state.blueprints[state.bpIdx] || BLUEPRINTS_FALLBACK[0]).build_sequence || [];
    state.bpShowAll = false;
    state.bpStep = (state.bpStep + 1) % Math.max(1, seq.length);
    renderBlueprintSidebar();
  });
  $("bp-all").addEventListener("click", () => {
    state.bpShowAll = !state.bpShowAll;
    $("bp-all").classList.toggle("active", state.bpShowAll);
    renderBlueprintSidebar();
  });
  $("bp-play").addEventListener("click", () => {
    state.bpPlay = !state.bpPlay;
    $("bp-play").textContent = state.bpPlay ? "Pause Sequence" : "Play Sequence";
    $("bp-play").classList.toggle("active", state.bpPlay);
  });
  setInterval(() => {
    if (state.bpPlay && activeTab === "blueprints") {
      const seq = (state.blueprints[state.bpIdx] || BLUEPRINTS_FALLBACK[0]).build_sequence || [];
      state.bpShowAll = false;
      state.bpStep = (state.bpStep + 1) % Math.max(1, seq.length);
      renderBlueprintSidebar();
    }
  }, 2500);

  $("bp-set-bg").addEventListener("click", () => {
    drawBlueprint();
    const url = $("bp-canvas").toDataURL("image/png");
    document.documentElement.style.setProperty("--bp-bg-image", `url("${url}")`);
    document.body.classList.add("blueprint-bg");
    appendTerm(`[BLUEPRINTS] Applied ${state.blueprints[state.bpIdx].id} schematic as page background.`);
  });
  $("bp-reset-bg").addEventListener("click", () => {
    document.documentElement.style.setProperty("--bp-bg-image", 'url("moonbase-blueprint-bg.svg")');
    document.body.classList.add("blueprint-bg");
    appendTerm("[BLUEPRINTS] Restored default moonbase-blueprint-bg.svg page background.");
  });
  $("bp-export-png").addEventListener("click", () => {
    drawBlueprint();
    const a = document.createElement("a");
    a.download = `${state.blueprints[state.bpIdx].id.toLowerCase()}-blueprint.png`;
    a.href = $("bp-canvas").toDataURL("image/png");
    a.click();
  });
  $("bp-export-json").addEventListener("click", () => {
    const bp = state.blueprints[state.bpIdx];
    const blob = new Blob([JSON.stringify(bp, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.download = `${bp.id.toLowerCase()}-blueprint.json`;
    a.href = URL.createObjectURL(blob);
    a.click();
  });

  function drawBlueprint() {
    const cv = $("bp-canvas");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    const bp = state.blueprints[state.bpIdx] || BLUEPRINTS_FALLBACK[0];

    ctx.fillStyle = "#040d1d";
    ctx.fillRect(0, 0, W, H);

    if (state.bpGrid) {
      ctx.strokeStyle = "#0d2547";
      ctx.lineWidth = 0.7;
      for (let x = 0; x <= W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.strokeStyle = "#163c6e";
      ctx.lineWidth = 1.1;
      for (let x = 0; x <= W; x += 120) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 120) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }

    ctx.strokeStyle = "#22528f";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(12, 12, W - 24, H - 24);

    // Schematic geometry by blueprint ID
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.8;
    if (bp.id === "BP-01") {
      // Surface datum + dome + solar + airlock + mast + SatGPU
      ctx.beginPath(); ctx.moveTo(36, 298); ctx.lineTo(744, 298); ctx.stroke();
      ctx.fillStyle = "rgba(7, 27, 54, 0.7)";
      ctx.fillRect(54, 240, 124, 34); ctx.strokeRect(54, 240, 124, 34);
      ctx.beginPath(); ctx.moveTo(116, 274); ctx.lineTo(116, 298); ctx.stroke();
      ctx.fillRect(198, 254, 68, 44); ctx.strokeRect(198, 254, 68, 44);
      ctx.beginPath(); ctx.arc(388, 298, 108, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(388, 190); ctx.lineTo(388, 298); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(535, 298); ctx.lineTo(535, 168); ctx.stroke();
      ctx.beginPath(); ctx.arc(535, 164, 14, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke();
      ctx.strokeStyle = "#ffb800";
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(535, 154); ctx.lineTo(656, 94); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "#00e5ff";
      ctx.strokeRect(634, 78, 44, 26);
      ctx.strokeRect(592, 84, 38, 14);
      ctx.strokeRect(682, 84, 38, 14);
    } else if (bp.id === "BP-02") {
      ctx.strokeRect(220, 186, 340, 28);
      ctx.fillStyle = "rgba(7, 27, 54, 0.75)";
      ctx.fillRect(334, 160, 112, 80); ctx.strokeRect(334, 160, 112, 80);
      ctx.strokeRect(102, 178, 112, 44);
      ctx.strokeRect(566, 178, 112, 44);
      ctx.beginPath(); ctx.arc(390, 262, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(380, 276); ctx.lineTo(342, 346); ctx.lineTo(438, 346); ctx.lineTo(400, 276); ctx.stroke();
      ctx.setLineDash([]);
    } else if (bp.id === "BP-03") {
      [154, 210, 266].forEach((y, i) => {
        ctx.strokeStyle = "#ffb800";
        ctx.strokeRect(84, y - 16, 130, 32);
        ctx.fillStyle = "#ffb800";
        ctx.font = "11px Courier New";
        ctx.fillText(["NASA-GDSCC", "NASA-MDSCC", "NASA-GSFC"][i], 96, y + 4);
      });
      ctx.strokeStyle = "#00e5ff";
      ctx.beginPath(); ctx.arc(464, 206, 44, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#00e5ff"; ctx.fillText("LUNA RELAY", 430, 210);
      ctx.strokeStyle = "#ffb800";
      ctx.setLineDash([6, 4]);
      [154, 210, 266].forEach((y) => { ctx.beginPath(); ctx.moveTo(214, y); ctx.lineTo(420, 206); ctx.stroke(); });
      ctx.setLineDash([]);
      [140, 206, 272].forEach((y, i) => {
        ctx.strokeStyle = "#00ff66";
        ctx.beginPath(); ctx.moveTo(508, 206); ctx.lineTo(580, y); ctx.stroke();
        ctx.strokeRect(580, y - 16, 116, 32);
        ctx.fillStyle = "#00ff66";
        ctx.fillText(["US / EU VPN", "ASIA VPN", "GLOBAL 38+"][i], 592, y + 4);
      });
    } else {
      const blocks = [
        [78, "SENSOR BUS", "CPU/RAM/NET/DSK", "#ffb800"],
        [254, "LATTICE", "H1[7] H2[9] H3[7]", "#c084fc"],
        [462, "THOUGHT", "SENSE->CTX->DEC", "#00e5ff"],
        [604, "ACTUATOR", "CHECKLIST / BOT", "#00ff66"],
      ];
      blocks.forEach(([x, t, s, col], i) => {
        ctx.strokeStyle = col;
        ctx.strokeRect(x, 152, 120, 108);
        ctx.fillStyle = col;
        ctx.font = "bold 11px Courier New";
        ctx.fillText(t, x + 12, 194);
        ctx.fillStyle = "#98a2be";
        ctx.font = "10px Courier New";
        ctx.fillText(s, x + 10, 218);
        if (i < blocks.length - 1) {
          ctx.strokeStyle = "#38bdf8";
          ctx.beginPath(); ctx.moveTo(x + 120, 206); ctx.lineTo(blocks[i + 1][0], 206); ctx.stroke();
        }
      });
    }

    // Highlighted Build-Sequence Bounding Boxes & Numbered Badges
    const seq = bp.build_sequence || [];
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
    seq.forEach((st, idx) => {
      const isAct = state.bpShowAll || idx === state.bpStep;
      const isDone = !state.bpShowAll && idx < state.bpStep;
      if (isAct || isDone || state.bpCallouts) {
        ctx.save();
        if (isAct) {
          ctx.strokeStyle = `rgba(255, 184, 0, ${(0.55 + pulse * 0.45).toFixed(2)})`;
          ctx.fillStyle = `rgba(255, 184, 0, ${(0.08 + pulse * 0.1).toFixed(2)})`;
          ctx.lineWidth = 2.2;
        } else if (isDone) {
          ctx.strokeStyle = "rgba(0, 255, 102, 0.55)";
          ctx.fillStyle = "rgba(0, 255, 102, 0.05)";
          ctx.lineWidth = 1.2;
        } else {
          ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
          ctx.fillStyle = "transparent";
          ctx.lineWidth = 1;
        }
        ctx.setLineDash(isAct ? [6, 4] : [3, 4]);
        ctx.fillRect(st.hx, st.hy, st.hw, st.hh);
        ctx.strokeRect(st.hx, st.hy, st.hw, st.hh);
        ctx.restore();
      }
      if (state.bpCallouts) {
        const bx = st.hx + 12;
        const by = Math.max(46, st.hy - 12);
        ctx.fillStyle = isAct ? "#ffb800" : isDone ? "#00ff66" : "#08142b";
        ctx.strokeStyle = isAct ? "#ffffff" : isDone ? "#00ff66" : "#38bdf8";
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = (isAct || isDone) ? "#040d1d" : "#7ec4ff";
        ctx.font = "bold 10px Courier New";
        ctx.textAlign = "center";
        ctx.fillText(st.code, bx, by + 3.5);
        if (isAct) {
          ctx.textAlign = "left";
          ctx.fillStyle = "#ffd970";
          ctx.fillText(st.feature.toUpperCase(), bx + 16, by + 3.5);
        }
        ctx.textAlign = "left";
      }
    });

    // Engineering Title Block
    ctx.fillStyle = "rgba(4, 16, 36, 0.9)";
    ctx.fillRect(W - 294, H - 64, 272, 42);
    ctx.strokeStyle = "#22528f";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(W - 294, H - 64, 272, 42);
    ctx.fillStyle = "#ffb800";
    ctx.font = "bold 11px Courier New";
    ctx.fillText(`@MOONBASE.BOT // ${bp.id}`, W - 284, H - 46);
    ctx.fillStyle = "#00ff66";
    ctx.font = "10px Courier New";
    ctx.fillText("OWNER: ANDREW T MIDDLETON", W - 284, H - 30);
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
      appendTerm("Commands: help | status | satgpu | fpv | vpn | forcepush | checklist | blueprints | thought <msg> | bridge | networkbuster | clear");
    } else if (low === "blueprints") {
      const bp = state.blueprints[state.bpIdx] || BLUEPRINTS_FALLBACK[0];
      appendTerm(`[BLUEPRINTS] Active: ${bp.id} (${bp.title}) | ${bp.build_sequence.length} build steps`);
    } else if (low === "status") {
      appendTerm(`[MOCR] CPU ${state.cpu.toFixed(1)}% | RAM ${state.ram.toFixed(1)}% | Bridge: ${bridgeOnline ? "LIVE" : "SIM"}`);
    } else if (low === "satgpu") {
      const nd = state.satNodes[state.satIdx];
      appendTerm(`[SATGPU] ${nd.id} (${nd.orbit}) ${nd.gpu} | Tensor ${nd.tensor_pct}% | Temp ${nd.temp_c}C`);
    } else if (low === "fpv") {
      appendTerm(`[FPV] CAM=(${state.fpv.x.toFixed(1)}, ${state.fpv.y.toFixed(1)}, ${state.fpv.z.toFixed(1)}) THRUST=${state.fpv.thrust.toFixed(3)}`);
    } else if (low === "vpn") {
      appendTerm(`[VPN GRID] ${state.vpnNodes.length} public nodes + ${state.nasaRelays.length} NASA relays tracked.`);
    } else if (low === "forcepush") {
      triggerNasaForcePush();
    } else if (low === "checklist") {
      runAutoChecklist();
      appendTerm(`[CHECKLIST] Running live audit across bridge and routes...`);
    } else if (low.startsWith("thought ")) {
      handleThoughtPrompt(cmd.slice(8));
      appendTerm(`[THOUGHT] Prompt injected into Neural Stream of Thought.`);
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
  initBlueprintControls();
  renderBlueprintSidebar();
  loadBlueprints();
  renderChecklist();
  pushThought("SENSE", "TELEMETRY", "Neural Stream of Thought initialized [4-7-9-7-3].");
  pushThought("CONTEXT", "VPN", "NASA DSN Force Push channel armed (4 relay stations).");
  appendTerm("LunaRecycle × NetworkBuster-Cloud Mission Control initialized.");
  appendTerm("Type 'help' for Swarm commands.");
  pollBridge();
  setInterval(pollBridge, 1800);

  function frame() {
    if (activeTab === "overview") { drawNN(); drawTelemetry(); }
    if (activeTab === "satgpu") { drawSatCam(); }
    if (activeTab === "fpv") { drawFPV(); }
    if (activeTab === "vpn") { drawVPN(); }
    if (activeTab === "blueprints") { drawBlueprint(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
