// Money Trail: one timeline of every money movement the dashboard knows about.
(() => {
  const SOURCES = {
    ledger: { label: "Ledger", cls: "ledger", color: "#58a6ff" },
    earnings: { label: "Imported earnings", cls: "earnings", color: "#10b981" },
    forex: { label: "Forex paper", cls: "forex", color: "#2dd4bf" },
    live: { label: "Live trades", cls: "live", color: "#d29922" },
    paper: { label: "Paper trades", cls: "paper", color: "#a371f7" },
    "mining-pool": { label: "Mining payouts", cls: "mining-pool", color: "#3fb950" },
    paypal: { label: "PayPal", cls: "paypal", color: "#39c5cf" },
  };
  const OFF_KEY = "crypto-dashboard-trail-off";
  const off = new Set(loadJson(OFF_KEY, ["paper"]));
  let paypalTx = [];
  let paypalNote = "";
  let entries = [];

  const money = (v, c = "USD") =>
    v == null ? "" : new Intl.NumberFormat(undefined, { style: "currency", currency: c, maximumFractionDigits: 2 }).format(v);

  function collect() {
    const out = [];
    const ledgerCur = cur().toUpperCase();
    for (const t of loadJson("crypto-dashboard-transactions", [])) {
      const gross = t.amount * (t.price || 0);
      const fee = t.fee || 0;
      const sym = t.coin;
      const map = {
        buy: [-(gross + fee), `Bought ${t.amount} ${sym}`],
        sell: [gross - fee, `Sold ${t.amount} ${sym}`],
        mining: [gross, `Mining payout ${t.amount} ${sym}`],
        transfer_in: [gross, `Transfer in ${t.amount} ${sym}`],
        transfer_out: [-gross, `Transfer out ${t.amount} ${sym}`],
      };
      const [amount, desc] = map[t.type] || [0, t.type];
      out.push({ date: t.date, source: "ledger", desc: t.note ? `${desc} — ${t.note}` : desc, amount, currency: ledgerCur });
    }
    for (const e of loadJson("crypto-dashboard-earnings", [])) {
      const net = (e.amount || 0) - (e.fee || 0);
      out.push({
        date: e.date,
        source: "earnings",
        desc: `${e.source} (${e.category})${e.note ? ` — ${e.note}` : ""}`,
        amount: net,
        currency: (e.currency || "USD").toUpperCase(),
      });
    }
    for (const t of loadJson("crypto-dashboard-fx-history", [])) {
      if (t.pnlUsd == null) continue;
      out.push({
        date: t.closedAt || t.openedAt,
        source: "forex",
        desc: `FX ${t.side.toUpperCase()} ${t.lots} lot ${t.pair} (${t.pips >= 0 ? "+" : ""}${t.pips.toFixed(1)} pips)`,
        amount: t.pnlUsd,
        currency: "USD",
      });
    }
    for (const t of loadJson("crypto-dashboard-trades", [])) {
      if (!t.value) continue;
      const where = t.mode === "live" ? t.exchange : "paper";
      out.push({
        date: t.date,
        source: t.mode === "live" ? "live" : "paper",
        desc: `${t.side === "buy" ? "Bought" : "Sold"} ${t.amount} ${t.symbol} (${t.type}, ${where})${t.status && t.status !== "filled" ? ` · ${t.status}` : ""}`,
        amount: (t.side === "buy" ? -1 : 1) * (t.value + (t.side === "buy" ? t.fee || 0 : -(t.fee || 0))),
        currency: "USD",
      });
    }
    const xmr = marketData.find((c) => c.id === "monero");
    for (const p of window.minerPayments || []) {
      out.push({
        date: new Date(p.date).toISOString(),
        source: "mining-pool",
        desc: `Pool payout ${p.amount.toFixed(6)} XMR${xmr ? " (valued at today's price)" : ""}`,
        amount: xmr ? p.amount * xmr.current_price : 0,
        currency: cur().toUpperCase(),
      });
    }
    for (const p of paypalTx) {
      out.push({
        date: p.date,
        source: "paypal",
        desc: [p.subject || p.event, p.counterparty].filter(Boolean).join(" · ") || "PayPal transaction",
        amount: p.amount + (p.fee || 0),
        currency: p.currency || "USD",
      });
    }
    return out.filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date));
  }

  async function loadPaypal() {
    if (STATIC_SITE) return;
    const days = Number($("trail-days").value) || 365;
    try {
      paypalTx = await apiGet(`/api/paypal/transactions?days=${Math.min(days, 365)}`);
      paypalNote = "";
    } catch (err) {
      paypalTx = [];
      paypalNote = err.message.includes("not configured") ? "not connected" : "unavailable";
    }
  }

  function renderChips() {
    $("trail-sources").innerHTML = Object.entries(SOURCES)
      .map(([id, s]) => {
        const n = entries.filter((e) => e.source === id).length;
        const note = id === "paypal" && paypalNote ? ` · ${paypalNote}` : "";
        return `<span class="chip toggle ${s.cls} ${off.has(id) ? "off" : ""}" data-src="${id}" title="Click to show/hide">${s.label} (${n})${note}</span>`;
      })
      .join("");
  }

  function visible() {
    const days = Number($("trail-days").value);
    const since = days ? Date.now() - days * 86400000 : 0;
    const q = $("trail-search").value.trim().toLowerCase();
    return entries.filter((e) => !off.has(e.source) && new Date(e.date).getTime() >= since && (!q || e.desc.toLowerCase().includes(q)));
  }

  function render() {
    entries = collect();
    renderChips();
    const rows = visible();
    const mainCur = cur().toUpperCase();
    const counted = rows.filter((e) => e.currency === mainCur || e.currency === "USD");
    const other = rows.length - counted.length;
    const inSum = counted.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
    const outSum = Math.abs(counted.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0));
    const net = inSum - outSum;
    $("trail-in").textContent = money(inSum, mainCur);
    $("trail-out").textContent = money(outSum, mainCur);
    $("trail-net").innerHTML = `<span class="${net >= 0 ? "up" : "down"}">${net >= 0 ? "+" : ""}${money(net, mainCur)}</span>`;
    $("trail-meter").style.width = inSum + outSum ? `${(inSum / (inSum + outSum)) * 100}%` : "50%";
    $("trail-count").textContent = rows.length;
    $("trail-span").textContent = rows.length ? `${new Date(rows[0].date).toLocaleDateString()} → ${new Date(rows.at(-1).date).toLocaleDateString()}${other ? ` · ${other} in other currencies not totaled` : ""}` : "";
    const pill = $("trail-pill");
    pill.textContent = rows.length ? `Net ${net >= 0 ? "+" : ""}${money(net, mainCur)}` : "No activity";
    pill.className = `pill ${!rows.length ? "" : net >= 0 ? "up" : "down"}`;

    let running = 0;
    const withRunning = rows.map((e) => {
      if (e.currency === mainCur || e.currency === "USD") running += e.amount;
      return { ...e, running };
    });
    $("trail-empty").hidden = rows.length > 0;
    $("trail-list").innerHTML = withRunning
      .slice()
      .reverse()
      .slice(0, 500)
      .map(
        (e) => `<tr>
        <td>${new Date(e.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</td>
        <td><span class="chip ${SOURCES[e.source].cls}">${SOURCES[e.source].label}</span></td>
        <td>${escapeHtml(e.desc)}</td>
        <td class="up">${e.amount > 0 ? money(e.amount, e.currency) : ""}</td>
        <td class="down">${e.amount < 0 ? money(-e.amount, e.currency) : ""}</td>
        <td class="${e.running >= 0 ? "up" : "down"}">${money(e.running, mainCur)}</td>
      </tr>`
      )
      .join("");
    drawCumulative(withRunning, mainCur);
    drawBySource(counted, mainCur);
  }

  function drawCumulative(rows, c) {
    const canvas = $("trail-chart");
    if (!canvas.clientWidth) return;
    const { ctx, w, h } = fitCanvas(canvas);
    if (rows.length < 1) {
      ctx.fillStyle = "#8b949e";
      ctx.font = "13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No money movements in this range", w / 2, h / 2);
      return;
    }
    const pts = [[new Date(rows[0].date).getTime() - 1, 0], ...rows.map((r) => [new Date(r.date).getTime(), r.running])];
    const vals = pts.map((p) => p[1]);
    const min = Math.min(0, ...vals), max = Math.max(0, ...vals);
    const t0 = pts[0][0], t1 = Math.max(pts.at(-1)[0], t0 + 1);
    const pad = { l: 8, r: 80, t: 10, b: 22 };
    const x = (t) => pad.l + ((t - t0) / (t1 - t0)) * (w - pad.l - pad.r);
    const y = (v) => pad.t + (1 - (v - min) / (max - min || 1)) * (h - pad.t - pad.b);
    ctx.font = "11px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
      const v = min + ((max - min) * i) / 4;
      ctx.strokeStyle = "#21262d";
      ctx.beginPath();
      ctx.moveTo(pad.l, y(v));
      ctx.lineTo(w - pad.r, y(v));
      ctx.stroke();
      ctx.fillStyle = "#8b949e";
      ctx.textAlign = "left";
      ctx.fillText(money(v, c), w - pad.r + 6, y(v));
    }
    ctx.strokeStyle = "#8b949e";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pad.l, y(0));
    ctx.lineTo(w - pad.r, y(0));
    ctx.stroke();
    ctx.setLineDash([]);
    // Step line: the balance holds until the next movement.
    ctx.beginPath();
    pts.forEach(([t, v], i) => {
      if (!i) return ctx.moveTo(x(t), y(v));
      ctx.lineTo(x(t), y(pts[i - 1][1]));
      ctx.lineTo(x(t), y(v));
    });
    ctx.lineTo(x(t1), y(pts.at(-1)[1]));
    const end = pts.at(-1)[1];
    ctx.strokeStyle = end >= 0 ? "#3fb950" : "#f85149";
    ctx.lineWidth = 2;
    ctx.stroke();
    rows.forEach((r) => {
      ctx.beginPath();
      ctx.arc(x(new Date(r.date).getTime()), y(r.running), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = SOURCES[r.source].color;
      ctx.fill();
    });
    ctx.fillStyle = "#8b949e";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i <= 4; i++) {
      const t = t0 + ((t1 - t0) * i) / 4;
      ctx.fillText(new Date(t).toLocaleDateString([], { month: "short", day: "numeric" }), Math.min(Math.max(x(t), 30), w - pad.r - 30), h - pad.b + 6);
    }
  }

  function drawBySource(rows, c) {
    const canvas = $("trail-sources-chart");
    if (!canvas.clientWidth) return;
    const { ctx, w, h } = fitCanvas(canvas);
    const groups = Object.keys(SOURCES)
      .filter((id) => !off.has(id))
      .map((id) => {
        const r = rows.filter((e) => e.source === id);
        return { id, in: r.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0), out: -r.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0) };
      });
    const max = Math.max(...groups.flatMap((g) => [g.in, g.out]), 1);
    const rowH = h / Math.max(groups.length, 1);
    const labelW = 110;
    const mid = labelW + (w - labelW) / 2;
    const half = (w - labelW) / 2 - 60;
    ctx.strokeStyle = "#30363d";
    ctx.beginPath();
    ctx.moveTo(mid, 0);
    ctx.lineTo(mid, h);
    ctx.stroke();
    ctx.font = "12px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    groups.forEach((g, i) => {
      const yy = i * rowH + rowH / 2;
      ctx.fillStyle = SOURCES[g.id].color;
      ctx.textAlign = "left";
      ctx.fillText(SOURCES[g.id].label, 0, yy);
      const lo = (g.out / max) * half, li = (g.in / max) * half;
      ctx.fillStyle = "#f85149";
      ctx.fillRect(mid - lo, yy - rowH * 0.25, lo, rowH * 0.5);
      ctx.fillStyle = "#3fb950";
      ctx.fillRect(mid, yy - rowH * 0.25, li, rowH * 0.5);
      ctx.fillStyle = "#8b949e";
      ctx.font = "11px system-ui, sans-serif";
      if (g.out) {
        ctx.textAlign = "right";
        ctx.fillText(money(g.out, c), mid - lo - 4, yy);
      }
      if (g.in) {
        ctx.textAlign = "left";
        ctx.fillText(money(g.in, c), mid + li + 4, yy);
      }
      ctx.font = "12px system-ui, sans-serif";
    });
    ctx.fillStyle = "#8b949e";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("◀ out   in ▶", mid, 0);
  }

  $("trail-sources").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-src]");
    if (!chip) return;
    off.has(chip.dataset.src) ? off.delete(chip.dataset.src) : off.add(chip.dataset.src);
    localStorage.setItem(OFF_KEY, JSON.stringify([...off]));
    render();
  });
  $("trail-search").addEventListener("input", render);
  $("trail-days").addEventListener("change", async () => {
    await loadPaypal();
    render();
  });
  $("trail-refresh").addEventListener("click", async () => {
    await loadPaypal();
    render();
  });
  $("trail-export").addEventListener("click", () => {
    const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const csv = ["date,source,description,amount,currency", ...visible().map((e) => [e.date, SOURCES[e.source].label, e.desc, e.amount.toFixed(2), e.currency].map(esc).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `money-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  window.addEventListener("dashboard:tab", async (e) => {
    if (e.detail.tab !== "trail") return;
    render();
    await loadPaypal();
    render();
  });
  window.addEventListener("dashboard:trades", render);
  window.addEventListener("dashboard:miner-payments", render);
  window.addEventListener("dashboard:data", render);
  let trailResize;
  window.addEventListener("resize", () => {
    clearTimeout(trailResize);
    trailResize = setTimeout(render, 150);
  });
})();
