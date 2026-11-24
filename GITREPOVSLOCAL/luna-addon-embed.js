(() => {
  "use strict";
  if (document.getElementById("luna-mocr-embed")) return;

  const BRIDGE_URL = "http://127.0.0.1:4195";
  const wrap = document.createElement("div");
  wrap.id = "luna-mocr-embed";
  wrap.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:9999;font-family:Courier New,monospace;";

  const pill = document.createElement("button");
  pill.type = "button";
  pill.textContent = "✦ MOCR Addon";
  pill.style.cssText = "padding:10px 16px;border-radius:999px;border:1px solid #818cf8;background:linear-gradient(135deg,#4f46e5,#9333ea);color:#f3f4ff;font-weight:700;cursor:pointer;box-shadow:0 10px 30px rgba(79,70,229,0.45);";

  const drawer = document.createElement("div");
  drawer.style.cssText = "display:none;width:300px;margin-bottom:10px;padding:14px;border-radius:16px;border:1px solid #303654;background:rgba(11,17,32,0.96);color:#f3f4ff;box-shadow:0 18px 44px rgba(0,0,0,0.55);font-size:12px;";
  drawer.innerHTML = [
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">',
    '<strong style="color:#ffb800;">NETWORKBUSTER // MOCR</strong>',
    '<span id="luna-mocr-mode" style="color:#00e5ff;">SIM</span>',
    '</div>',
    '<div id="luna-mocr-stats" style="line-height:1.7;color:#c8d8e8;">CPU: --% | RAM: --%<br>SatGPU: SATGPU-ALPHA [ORBITAL]<br>Neural Load: 0.42</div>',
    '<a href="mission-control-addon.html" style="display:block;text-align:center;margin-top:10px;padding:8px;border-radius:999px;background:linear-gradient(135deg,#4f46e5,#9333ea);color:#fff;text-decoration:none;font-weight:700;">Open Mission Control Console →</a>',
  ].join("");

  wrap.appendChild(drawer);
  wrap.appendChild(pill);
  document.body.appendChild(wrap);

  let open = false;
  pill.addEventListener("click", () => {
    open = !open;
    drawer.style.display = open ? "block" : "none";
  });

  async function refreshDrawer() {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1100);
    try {
      const res = await fetch(`${BRIDGE_URL}/api/telemetry`, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error();
      const d = await res.json();
      document.getElementById("luna-mocr-mode").textContent = "LIVE :4195";
      document.getElementById("luna-mocr-mode").style.color = "#00ff66";
      document.getElementById("luna-mocr-stats").innerHTML =
        `CPU: ${d.cpu_pct}% | RAM: ${d.ram_pct}%<br>SatGPU: ${d.satgpu_nodes[0].id} (${d.satgpu_nodes[0].tensor_pct}%)<br>Neural Load: ${d.neural_net.outputs.load_index}`;
    } catch {
      clearTimeout(t);
      document.getElementById("luna-mocr-mode").textContent = "CLOUD SIM";
      document.getElementById("luna-mocr-mode").style.color = "#ffb800";
    }
  }
  refreshDrawer();
  setInterval(refreshDrawer, 3500);
})();
