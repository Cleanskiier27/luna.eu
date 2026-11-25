// Trading tab: paper trading (simulated, USD) and live orders through server.js, with a live
// Coinbase public price feed that also powers the buy/sell pressure ratio.
(() => {
  const PAPER_KEY = "crypto-dashboard-paper";
  const TRADES_KEY = "crypto-dashboard-trades";
  const START_CASH = 10_000;
  const PAPER_FEE = 0.001;
  const FLOW_WINDOW_MS = 5 * 60_000;

  const fmtUsd = (v, digits) =>
    v == null || Number.isNaN(v)
      ? "—"
      : new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: digits ?? (Math.abs(v) < 1 && v !== 0 ? 6 : 2) }).format(v);
  const fmtQty = (v) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 }).format(v);

  let paper = loadJson(PAPER_KEY, null) || freshPaper();
  let trades = loadJson(TRADES_KEY, []);
  let mode = "paper";
  let side = "buy";
  let exchangesInfo = null;
  let coin = null; // { id, symbol, name, image }
  let livePrice = null;
  let ticks = [];
  let flow = [];
  let ws = null;
  let wsProduct = null;
  let usdPrices = {}; // coinId -> USD price, for paper positions not on the live feed

  function freshPaper() {
    return { cash: START_CASH, start: START_CASH, positions: {}, open: [] };
  }
  const savePaper = () => localStorage.setItem(PAPER_KEY, JSON.stringify(paper));
  const saveTrades = () => localStorage.setItem(TRADES_KEY, JSON.stringify(trades));
  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

  // ---------- coin + live feed ----------
  const marketHistory = [];

  // Tradable markets in market-cap order, used by the Prev/Next buttons.
  function marketList() {
    return marketData.filter((c) => !STABLECOINS.has(c.symbol.toLowerCase()));
  }

  function updateMarketNav() {
    const list = marketList();
    const i = coin ? list.findIndex((c) => c.id === coin.id) : -1;
    $("t-pos").textContent = i >= 0 ? `${i + 1} / ${list.length}` : coin ? "not in top list" : "—";
    $("t-back").disabled = marketHistory.length === 0;
    const back = marketHistory.at(-1);
    $("t-back").title = back ? `Back to ${back.toUpperCase()}` : "Back to the previous market you viewed";
  }

  function stepMarket(dir) {
    const list = marketList();
    if (!list.length) return;
    const i = coin ? list.findIndex((c) => c.id === coin.id) : -1;
    // From a coin outside the list, Next starts at the top and Prev at the bottom.
    const next = i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length;
    setCoin(list[next].id);
  }

  async function setCoin(id, { fromHistory = false } = {}) {
    id = (id || "").trim().toLowerCase();
    if (!id || id === coin?.id) return;
    let c = marketData.find((m) => m.id === id);
    if (!c) {
      try {
        c = await fetchCoin(id);
      } catch {
        $("t-msg").textContent = `Unknown coin "${id}". Pick one from the list.`;
        return;
      }
    }
    if (coin && !fromHistory) {
      marketHistory.push(coin.id);
      if (marketHistory.length > 50) marketHistory.shift();
    }
    coin = { id: c.id, symbol: c.symbol.toUpperCase(), name: c.name, image: c.image };
    localStorage.setItem("crypto-dashboard-trade-coin", coin.id);
    $("t-coin").value = coin.id;
    $("t-img").src = coin.image || "";
    $("t-name").textContent = coin.name;
    $("t-sym").textContent = `${coin.symbol}-USD`;
    $("sig-coin").textContent = coin.symbol;
    $("t-msg").textContent = "";
    $("t-amount").value = $("t-usd").value = $("t-limit").value = "";
    livePrice = null;
    lastTickAt = 0;
    ticks = [];
    flow = [];
    updateMarketNav();
    await refreshUsdPrice();
    connectFeed();
    renderAll();
  }

  $("t-prev").addEventListener("click", () => stepMarket(-1));
  $("t-next").addEventListener("click", () => stepMarket(1));
  $("t-back").addEventListener("click", () => {
    const id = marketHistory.pop();
    if (id) setCoin(id, { fromHistory: true });
    updateMarketNav();
  });
  $("t-reconnect").addEventListener("click", () => connectFeed({ force: true }));

  // [ and ] step through markets while the Trading section is in view and you're not typing.
  document.addEventListener("keydown", (e) => {
    if (currentTab !== "trading" || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName)) return;
    if (e.key === "[") stepMarket(-1);
    else if (e.key === "]") stepMarket(1);
  });

  async function refreshUsdPrice() {
    const ids = [...new Set([coin?.id, ...Object.keys(paper.positions), ...paper.open.map((o) => o.coinId)].filter(Boolean))];
    if (!ids.length) return;
    // The markets response already has USD prices when the dashboard is in USD; only fetch the rest.
    const missing = cur() === "usd"
      ? ids.filter((id) => {
          const m = marketData.find((c) => c.id === id);
          if (m && !(id === coin?.id && ws?.readyState === 1)) usdPrices[id] = m.current_price;
          return !m;
        })
      : ids;
    if (missing.length) {
      try {
        const data = await getJson(`${API}/simple/price?ids=${encodeURIComponent(missing.join(","))}&vs_currencies=usd`);
        for (const id of missing) if (data[id]?.usd != null) usdPrices[id] = data[id].usd;
      } catch {
        // Keep the previous prices; the feed will still update the selected coin.
      }
    }
    if (livePrice == null && coin) livePrice = usdPrices[coin.id] ?? null;
  }

  // The heartbeat channel sends a message every second, so silence means the socket is dead even
  // if the browser still reports it open (common after sleep or a network change).
  const FEED_STALE_MS = 15_000;
  let lastFeedMsg = 0;
  let lastTickAt = 0;
  let reconnectTimer = null;
  let feedUnavailable = false;

  function setFeedStatus(text, cls = "") {
    const el = $("t-feed");
    el.textContent = text;
    el.className = `sub muted ${cls}`;
  }

  function connectFeed({ force = false } = {}) {
    if (!coin) return;
    const product = `${coin.symbol}-USD`;
    if (!force && ws && wsProduct === product && ws.readyState <= 1) return;
    clearTimeout(reconnectTimer);
    if (ws) {
      ws.onclose = null;
      ws.onmessage = null;
      ws.close();
    }
    wsProduct = product;
    feedUnavailable = false;
    lastFeedMsg = Date.now();
    setFeedStatus(force ? "refreshing live feed…" : "connecting to live feed…");
    const sock = new WebSocket("wss://ws-feed.exchange.coinbase.com");
    ws = sock;
    sock.onopen = () => sock.send(JSON.stringify({ type: "subscribe", product_ids: [product], channels: ["ticker", "matches", "heartbeat"] }));
    sock.onmessage = (e) => {
      const m = JSON.parse(e.data);
      lastFeedMsg = Date.now();
      if (m.type === "error") {
        feedUnavailable = true;
        setFeedStatus(`No live feed for ${product} — using CoinGecko price`, "stale");
        sock.onclose = null;
        sock.close();
        return;
      }
      if (m.product_id !== wsProduct) return;
      const t = Date.now();
      // Coinbase documents a match's `side` as the MAKER side, so the aggressor (taker) is the opposite.
      // Taker volume is what shows real buying vs selling pressure. `last_match` is a stale replay, so skip it.
      if (m.type === "match") {
        const size = Number(m.size) || 0;
        if (size) flow.push({ t, side: m.side === "sell" ? "buy" : "sell", v: size * Number(m.price) });
        flow = flow.filter((f) => t - f.t < FLOW_WINDOW_MS);
        return;
      }
      if (m.type !== "ticker") return;
      const price = Number(m.price);
      const prev = livePrice;
      livePrice = price;
      usdPrices[coin.id] = price;
      lastTickAt = t;
      ticks.push({ t, p: price });
      if (ticks.length > 400) ticks.shift();
      flow = flow.filter((f) => t - f.t < FLOW_WINDOW_MS);
      updateFeedStatus();
      onTick(prev);
    };
    sock.onclose = () => {
      if (ws !== sock) return;
      setFeedStatus("feed disconnected — reconnecting…", "stale");
      reconnectTimer = setTimeout(() => wsProduct === product && connectFeed({ force: true }), 3000);
    };
  }

  function updateFeedStatus() {
    if (feedUnavailable || !ws || ws.readyState !== 1) return;
    const age = lastTickAt ? Math.round((Date.now() - lastTickAt) / 1000) : null;
    const last = age == null ? "waiting for first trade" : age < 2 ? "just now" : `last trade ${age}s ago`;
    setFeedStatus(`live · Coinbase ${wsProduct} · ${last}`, "live");
  }

  // Watchdog: refresh the age label and reconnect a silent or closed feed.
  setInterval(() => {
    if (!coin || feedUnavailable || document.hidden) return;
    if (!ws || ws.readyState > 1 || Date.now() - lastFeedMsg > FEED_STALE_MS) connectFeed({ force: true });
    else updateFeedStatus();
  }, 3000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && coin && !feedUnavailable && (!ws || ws.readyState > 1 || Date.now() - lastFeedMsg > FEED_STALE_MS)) connectFeed({ force: true });
  });
  window.addEventListener("online", () => coin && connectFeed({ force: true }));

  let lastSignalDraw = 0;
  function onTick(prev) {
    const el = $("t-price");
    el.textContent = fmtUsd(livePrice);
    if (prev != null && livePrice !== prev) {
      el.classList.remove("tick-up", "tick-down");
      void el.offsetWidth;
      el.classList.add(livePrice > prev ? "tick-up" : "tick-down");
    }
    drawTicks();
    checkLimitOrders();
    syncAmountFields("amount");
    if (Date.now() - lastSignalDraw > 1500) {
      lastSignalDraw = Date.now();
      renderSignal();
      if (mode === "paper") renderAccount();
    }
  }

  function drawTicks() {
    const canvas = $("tick-chart");
    if (!canvas.clientWidth) return;
    const { ctx, w, h } = fitCanvas(canvas);
    if (ticks.length < 2) {
      ctx.fillStyle = "#8b949e";
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for live trades…", w / 2, h / 2);
      return;
    }
    const vals = ticks.map((x) => x.p);
    const min = Math.min(...vals), max = Math.max(...vals);
    const x = (i) => (i / (ticks.length - 1)) * (w - 60);
    const y = (v) => 6 + (1 - (v - min) / (max - min || 1)) * (h - 12);
    const up = vals.at(-1) >= vals[0];
    ctx.beginPath();
    vals.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
    ctx.strokeStyle = up ? "#3fb950" : "#f85149";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = "#8b949e";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(fmtUsd(max), w - 56, 8);
    ctx.fillText(fmtUsd(min), w - 56, h - 6);
  }

  // ---------- signal ----------
  function flowShare() {
    const buy = flow.filter((f) => f.side === "buy").reduce((s, f) => s + f.v, 0);
    const sell = flow.filter((f) => f.side === "sell").reduce((s, f) => s + f.v, 0);
    return buy + sell > 0 ? { share: buy / (buy + sell), buy, sell } : null;
  }

  function renderSignal() {
    if (!coin) return;
    const f = flowShare();
    $("ratio-buy").style.width = `${(f?.share ?? 0.5) * 100}%`;
    $("ratio-buy-label").textContent = f ? `Buys ${fmtUsd(f.buy, 0)} (${(f.share * 100).toFixed(0)}%)` : "Buys —";
    $("ratio-sell-label").textContent = f ? `Sells ${fmtUsd(f.sell, 0)} (${((1 - f.share) * 100).toFixed(0)}%)` : "Sells —";
    drawGauge($("ratio-gauge"), f?.share ?? 0.5, {
      label: f ? `${(f.share / Math.max(1 - f.share, 0.001)).toFixed(2)} : 1` : "—",
      sub: f ? "buy : sell volume" : "waiting for trades",
    });

    const m = marketData.find((c) => c.id === coin.id);
    const base = m ? { ...m, current_price: cur() === "usd" && livePrice ? livePrice : m.current_price } : null;
    if (!base) {
      $("sig-rows").innerHTML = '<tr><td colspan="3" class="muted">Technical signals are available for top-50 coins.</td></tr>';
    }
    const sig = base ? computeSignals(base, f?.share ?? null) : { score: f ? Math.round(clamp1((f.share - 0.5) * 4) * 100) : 0, rows: [] };
    const v = verdictFor(sig.score);
    $("sig-verdict").textContent = v.verdict;
    $("sig-verdict").className = `verdict ${v.cls}`;
    if (base) {
      $("sig-rows").innerHTML = sig.rows
        .map((r) => {
          const lean = r.score > 0.15 ? ["bull", "Buy"] : r.score < -0.15 ? ["bear", "Sell"] : ["neutral", "Neutral"];
          return `<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.reading)}</td><td><span class="lean ${lean[0]}">${lean[1]}</span></td></tr>`;
        })
        .join("");
    }
    drawGauge($("score-meter"), (sig.score + 100) / 200, { label: `${sig.score > 0 ? "+" : ""}${sig.score}`, sub: "−100 sell · +100 buy" });
    const strongest = [...sig.rows].sort((a, b) => Math.abs(b.score * b.weight) - Math.abs(a.score * a.weight))[0];
    $("sig-summary").textContent = strongest
      ? `${v.verdict} lean for ${coin.symbol}. Strongest factor: ${strongest.name} (${strongest.reading}).`
      : "";
  }

  // ---------- order ticket ----------
  function syncAmountFields(from) {
    const price = $("t-type").value === "limit" && Number($("t-limit").value) > 0 ? Number($("t-limit").value) : livePrice;
    if (!price) return;
    if (from === "amount" && document.activeElement !== $("t-usd")) {
      const a = Number($("t-amount").value);
      $("t-usd").value = a > 0 ? (a * price).toFixed(2) : "";
    } else if (from === "usd") {
      const u = Number($("t-usd").value);
      $("t-amount").value = u > 0 ? Number((u / price).toFixed(8)) : "";
    }
  }

  $("t-amount").addEventListener("input", () => syncAmountFields("amount"));
  $("t-usd").addEventListener("input", () => syncAmountFields("usd"));
  $("t-limit").addEventListener("input", () => syncAmountFields("amount"));
  $("t-type").addEventListener("change", () => {
    $("t-limit").hidden = $("t-type").value !== "limit";
    if ($("t-type").value === "limit" && livePrice && !$("t-limit").value) $("t-limit").value = Number(livePrice.toPrecision(8));
  });
  $("t-coin").addEventListener("change", () => setCoin($("t-coin").value));

  document.querySelector(".seg.side").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-side]");
    if (!btn) return;
    side = btn.dataset.side;
    btn.parentElement.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    updateSubmit();
  });

  function updateSubmit() {
    const btn = $("t-submit");
    btn.textContent = `${side === "buy" ? "Buy" : "Sell"}${mode === "live" ? " (LIVE)" : ""}`;
    btn.classList.toggle("sell", side === "sell");
    btn.disabled = mode === "live" && !(exchangesInfo?.liveEnabled && currentExchange()?.configured);
  }

  $("trade-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!coin) return;
    const amount = Number($("t-amount").value);
    const type = $("t-type").value;
    const limit = Number($("t-limit").value);
    const msg = $("t-msg");
    if (!(amount > 0)) return (msg.textContent = "Enter an amount.");
    if (type === "limit" && !(limit > 0)) return (msg.textContent = "Enter a limit price.");
    const price = type === "limit" ? limit : livePrice;
    if (!price) return (msg.textContent = "Waiting for a price…");
    const value = amount * price;

    if (mode === "paper") return placePaper({ type, amount, limit, price, value });

    const ex = currentExchange();
    const ok = confirm(
      `LIVE ORDER — real money\n\n${side.toUpperCase()} ${fmtQty(amount)} ${coin.symbol} on ${ex.name}\n` +
        `${type === "limit" ? `Limit price: ${fmtUsd(limit)}` : `Market order at about ${fmtUsd(livePrice)}`}\n` +
        `Estimated value: ${fmtUsd(value)}\n\nPlace this order?`
    );
    if (!ok) return;
    $("t-submit").disabled = true;
    msg.textContent = "Sending order…";
    try {
      const r = await apiPost("/api/trade/order", { exchange: ex.id, coinId: coin.id, symbol: coin.symbol, side, type, amount, limitPrice: limit, confirm: true });
      trades.unshift({ id: newId(), date: new Date().toISOString(), mode: "live", exchange: ex.id, coinId: coin.id, symbol: coin.symbol, side, type, amount, price: type === "limit" ? limit : r.usdPrice, value: r.notional, status: r.status, orderId: r.orderId });
      saveTrades();
      msg.textContent = `✅ ${ex.name} accepted order ${r.orderId || ""}.`;
      loadLiveBalances();
    } catch (err) {
      msg.textContent = `❌ ${err.message}`;
    } finally {
      updateSubmit();
      renderHistory();
      window.dispatchEvent(new CustomEvent("dashboard:trades"));
    }
  });

  function placePaper({ type, amount, limit, price, value }) {
    const msg = $("t-msg");
    const ok = confirm(`Paper ${side} ${fmtQty(amount)} ${coin.symbol} ${type === "limit" ? `at limit ${fmtUsd(limit)}` : `at market (~${fmtUsd(price)})`}?\nEstimated value ${fmtUsd(value)} (simulated, no real money).`);
    if (!ok) return;
    if (type === "limit") {
      paper.open.push({ id: newId(), date: new Date().toISOString(), coinId: coin.id, symbol: coin.symbol, side, amount, limit });
      savePaper();
      msg.textContent = `Paper limit order placed. It fills when ${coin.symbol} ${side === "buy" ? "drops to" : "rises to"} ${fmtUsd(limit)}.`;
      renderAccount();
      return;
    }
    const err = fillPaper({ coinId: coin.id, symbol: coin.symbol, side, amount, price, type: "market" });
    msg.textContent = err || `Paper ${side} filled: ${fmtQty(amount)} ${coin.symbol} at ${fmtUsd(price)}.`;
  }

  function fillPaper({ coinId, symbol, side: s, amount, price, type }) {
    const value = amount * price;
    const fee = value * PAPER_FEE;
    const pos = (paper.positions[coinId] ??= { qty: 0, cost: 0, symbol });
    if (s === "buy") {
      if (value + fee > paper.cash + 1e-9) return `Not enough paper cash (${fmtUsd(paper.cash)} available).`;
      paper.cash -= value + fee;
      pos.qty += amount;
      pos.cost += value + fee;
    } else {
      if (amount > pos.qty + 1e-12) return `You only hold ${fmtQty(pos.qty)} ${symbol} in paper.`;
      const avg = pos.qty ? pos.cost / pos.qty : 0;
      pos.qty -= amount;
      pos.cost -= avg * amount;
      paper.cash += value - fee;
      if (pos.qty < 1e-12) delete paper.positions[coinId];
    }
    savePaper();
    trades.unshift({ id: newId(), date: new Date().toISOString(), mode: "paper", exchange: "paper", coinId, symbol, side: s, type, amount, price, value, fee, status: "filled" });
    saveTrades();
    renderAccount();
    renderHistory();
    window.dispatchEvent(new CustomEvent("dashboard:trades"));
    return null;
  }

  function checkLimitOrders() {
    if (!paper.open.length) return;
    const still = [];
    for (const o of paper.open) {
      const p = usdPrices[o.coinId];
      const hit = p != null && (o.side === "buy" ? p <= o.limit : p >= o.limit);
      if (hit && !fillPaper({ ...o, side: o.side, price: o.limit, type: "limit" })) continue;
      still.push(o);
    }
    if (still.length !== paper.open.length) {
      paper.open = still;
      savePaper();
      renderAccount();
    }
  }

  // ---------- account ----------
  function currentExchange() {
    return exchangesInfo?.exchanges.find((x) => x.id === $("trade-exchange").value);
  }

  function renderAccount() {
    $("paper-reset").hidden = mode !== "paper";
    if (mode === "live") return;
    $("acct-title").textContent = "Paper Account (USD)";
    let posValue = 0;
    const rows = Object.entries(paper.positions).map(([id, p]) => {
      const price = usdPrices[id];
      const value = price != null ? p.qty * price : null;
      posValue += value ?? 0;
      return { label: p.symbol, qty: p.qty, value, pnl: value != null ? value - p.cost : null };
    });
    const equity = paper.cash + posValue;
    const pnl = equity - paper.start;
    $("acct-equity").textContent = fmtUsd(equity);
    $("acct-cash").textContent = fmtUsd(paper.cash);
    $("acct-pnl").innerHTML = `<span class="${pnl >= 0 ? "up" : "down"}">${pnl >= 0 ? "+" : ""}${fmtUsd(pnl)} (${((pnl / paper.start) * 100).toFixed(2)}%)</span>`;
    $("acct-balances").innerHTML =
      `<tr><td class="muted">1</td><td>USD cash</td><td>—</td><td>${fmtUsd(paper.cash)}</td></tr>` +
      rows
        .map((r, i) => `<tr><td class="muted">${i + 2}</td><td>${escapeHtml(r.label)}</td><td>${fmtQty(r.qty)}</td><td>${fmtUsd(r.value)} ${r.pnl != null ? `<span class="${r.pnl >= 0 ? "up" : "down"} small-text">${r.pnl >= 0 ? "+" : ""}${fmtUsd(r.pnl)}</span>` : ""}</td></tr>`)
        .join("");
    drawAccountBars([{ label: "USD", value: paper.cash }, ...rows.filter((r) => r.value).map((r) => ({ label: r.label, value: r.value }))]);
    $("open-orders").innerHTML = paper.open.length
      ? paper.open
          .map((o) => `<tr><td>${new Date(o.date).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</td><td>${escapeHtml(o.symbol)}</td><td class="${o.side === "buy" ? "up" : "down"}">${o.side}</td><td>${fmtQty(o.amount)}</td><td>${fmtUsd(o.limit)}</td><td><button class="remove" data-cancel="${o.id}" title="Cancel">✕</button></td></tr>`)
          .join("")
      : '<tr><td colspan="6" class="muted">No open orders.</td></tr>';
  }

  function drawAccountBars(items) {
    const canvas = $("acct-bars");
    items = items.filter((i) => i.value > 0);
    canvas.hidden = items.length === 0;
    if (!items.length || !canvas.clientWidth) return;
    const { ctx, w, h } = fitCanvas(canvas);
    const total = items.reduce((s, i) => s + i.value, 0);
    let x = 0;
    items.forEach((it, i) => {
      const bw = (it.value / total) * w;
      ctx.fillStyle = PALETTE[i % PALETTE.length];
      ctx.fillRect(x, 10, Math.max(bw - 2, 1), 34);
      if (bw > 50) {
        ctx.fillStyle = "#0d1117";
        ctx.font = "600 12px system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillText(`${it.label} ${((it.value / total) * 100).toFixed(0)}%`, x + 6, 27);
      }
      x += bw;
    });
    ctx.fillStyle = "#8b949e";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Position mix by value", 0, 54);
  }

  $("open-orders").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cancel]");
    if (!b) return;
    paper.open = paper.open.filter((o) => o.id !== b.dataset.cancel);
    savePaper();
    renderAccount();
  });

  $("paper-reset").addEventListener("click", () => {
    if (!confirm(`Reset the paper account to ${fmtUsd(START_CASH)} and clear paper positions? Trade history is kept.`)) return;
    paper = freshPaper();
    savePaper();
    renderAccount();
  });

  async function loadLiveBalances() {
    const ex = currentExchange();
    $("acct-title").textContent = ex ? `${ex.name} Balances` : "Live Balances";
    $("open-orders").innerHTML = '<tr><td colspan="6" class="muted">Open live orders are managed on the exchange.</td></tr>';
    $("acct-equity").textContent = $("acct-cash").textContent = $("acct-pnl").textContent = "—";
    if (!ex?.configured) {
      $("acct-balances").innerHTML = '<tr><td colspan="4" class="muted">Add this exchange\'s API keys to .env to see balances.</td></tr>';
      $("acct-bars").hidden = true;
      return;
    }
    $("acct-balances").innerHTML = '<tr><td colspan="4" class="muted">Loading…</td></tr>';
    try {
      const balances = await apiGet(`/api/trade/balances?exchange=${ex.id}`);
      let total = 0;
      const rows = balances.map((b) => {
        const qty = b.free + b.locked;
        const usd = b.asset === "USD" ? qty : (() => {
          const m = marketData.find((c) => c.symbol.toUpperCase() === b.asset);
          return m && cur() === "usd" ? qty * m.current_price : null;
        })();
        total += usd ?? 0;
        return { ...b, qty, usd };
      });
      $("acct-equity").textContent = fmtUsd(total);
      $("acct-cash").textContent = fmtUsd(rows.find((r) => r.asset === "USD")?.qty ?? 0);
      $("acct-balances").innerHTML = rows.length
        ? rows.map((r, i) => `<tr><td class="muted">${i + 1}</td><td>${escapeHtml(r.asset)}</td><td>${fmtQty(r.qty)}${r.locked ? ` <span class="muted small-text">(${fmtQty(r.locked)} on hold)</span>` : ""}</td><td>${fmtUsd(r.usd)}</td></tr>`).join("")
        : '<tr><td colspan="4" class="muted">No balances.</td></tr>';
      drawAccountBars(rows.map((r) => ({ label: r.asset, value: r.usd })));
    } catch (err) {
      $("acct-balances").innerHTML = `<tr><td colspan="4" class="error">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  $("acct-refresh").addEventListener("click", async () => {
    if (mode === "live") return loadLiveBalances();
    await refreshUsdPrice();
    renderAccount();
  });

  // ---------- mode ----------
  async function loadExchanges() {
    try {
      exchangesInfo = await apiGet("/api/trade/exchanges");
    } catch {
      exchangesInfo = { liveEnabled: false, maxOrderUsd: 0, exchanges: [] };
    }
    const sel = $("trade-exchange");
    const prev = sel.value;
    sel.innerHTML = exchangesInfo.exchanges.map((x) => `<option value="${x.id}">${escapeHtml(x.name)}${x.configured ? "" : " (no keys)"}</option>`).join("");
    const firstReady = exchangesInfo.exchanges.find((x) => x.configured);
    sel.value = prev || firstReady?.id || exchangesInfo.exchanges[0]?.id || "";
    updateLiveMsg();
  }

  function updateLiveMsg() {
    const ex = currentExchange();
    const m = $("live-msg");
    if (STATIC_SITE) m.textContent = "Live trading needs the local server (start-dashboard.cmd).";
    else if (!exchangesInfo?.liveEnabled) m.innerHTML = "Live trading is <strong>off</strong>. To enable it, set <code>TRADING_LIVE_ENABLED=true</code> and your exchange API keys in <code>.env</code>, then restart the server.";
    else if (!ex?.configured) m.textContent = `${ex?.name || "This exchange"} has no API keys in .env.`;
    else m.innerHTML = `<span class="down">⚠ Real-money orders.</span> Max ${fmtUsd(exchangesInfo.maxOrderUsd)} per order (TRADING_MAX_ORDER_USD). Every order asks for confirmation.`;
    updateSubmit();
  }

  $("trade-exchange").addEventListener("change", () => {
    updateLiveMsg();
    if (mode === "live") loadLiveBalances();
  });

  document.querySelector("#ticket-card .seg").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-trade-mode]");
    if (!btn) return;
    mode = btn.dataset.tradeMode;
    btn.parentElement.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    $("live-controls").hidden = mode !== "live";
    $("t-msg").textContent = "";
    updateSubmit();
    if (mode === "live") {
      loadExchanges().then(loadLiveBalances);
    } else renderAccount();
  });

  // ---------- history ----------
  function renderHistory() {
    const f = $("trade-filter").value;
    const rows = trades.filter((t) => !f || t.mode === f);
    $("empty-trades").hidden = trades.length > 0;
    $("trade-history").innerHTML = rows
      .slice(0, 300)
      .map(
        (t) => `<tr>
        <td>${new Date(t.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</td>
        <td><span class="chip ${t.mode}">${t.mode === "live" ? escapeHtml(t.exchange) : "paper"}</span></td>
        <td>${escapeHtml(t.symbol)}</td>
        <td class="${t.side === "buy" ? "up" : "down"}">${t.side}</td>
        <td>${t.type}</td>
        <td>${fmtQty(t.amount)}</td>
        <td>${fmtUsd(t.price)}</td>
        <td>${fmtUsd(t.value)}</td>
        <td class="muted">${escapeHtml(t.status)}${t.orderId ? ` · ${escapeHtml(String(t.orderId).slice(0, 10))}` : ""}</td>
      </tr>`
      )
      .join("");
  }
  $("trade-filter").addEventListener("change", renderHistory);

  function renderAll() {
    if (livePrice) $("t-price").textContent = fmtUsd(livePrice);
    updateMarketNav();
    drawTicks();
    renderSignal();
    if (mode === "paper") renderAccount();
    renderHistory();
    updateSubmit();
  }

  window.addEventListener("dashboard:trade", (e) => e.detail?.coinId && setCoin(e.detail.coinId));
  window.addEventListener("dashboard:tab", (e) => e.detail.tab === "trading" && renderAll());
  window.addEventListener("dashboard:data", async () => {
    if (!coin) await setCoin(localStorage.getItem("crypto-dashboard-trade-coin") || selectedId || "bitcoin");
    else {
      await refreshUsdPrice();
      checkLimitOrders();
      renderAll();
    }
  });

  loadExchanges();
  renderHistory();
})();
