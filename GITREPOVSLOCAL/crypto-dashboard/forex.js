// Real Forex Markets module:
// Live institutional FX pairs (ECB Frankfurter + ExchangeRate-API + optional OANDA v20 bid/ask),
// global trading sessions (Sydney / Tokyo / London / New York + London-NY overlap & weekend detection),
// 8-currency strength meter, cross-rate matrix, interactive historical chart with SMA(7)/SMA(20),
// pip/lot/margin calculator, and simulated Forex margin paper trading account.
(() => {
  const FX_ACCT_KEY = "crypto-dashboard-fx-account";
  const FX_HIST_KEY = "crypto-dashboard-fx-history";
  const FX_PAIR_KEY = "crypto-dashboard-fx-selected";
  const FX_START_BALANCE = 100_000;
  const MAJORS = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD"];

  // Curated institutional pairs with typical interbank indicative spreads (in pips)
  // used when OANDA live bid/ask streaming is not configured.
  const PAIRS = [
    { pair: "EUR/USD", base: "EUR", quote: "USD", cat: "major", spreadPips: 0.8 },
    { pair: "GBP/USD", base: "GBP", quote: "USD", cat: "major", spreadPips: 1.1 },
    { pair: "USD/JPY", base: "USD", quote: "JPY", cat: "major", spreadPips: 0.9 },
    { pair: "USD/CHF", base: "USD", quote: "CHF", cat: "major", spreadPips: 1.2 },
    { pair: "AUD/USD", base: "AUD", quote: "USD", cat: "major", spreadPips: 1.0 },
    { pair: "USD/CAD", base: "USD", quote: "CAD", cat: "major", spreadPips: 1.3 },
    { pair: "NZD/USD", base: "NZD", quote: "USD", cat: "major", spreadPips: 1.4 },
    { pair: "EUR/GBP", base: "EUR", quote: "GBP", cat: "cross", spreadPips: 1.3 },
    { pair: "EUR/JPY", base: "EUR", quote: "JPY", cat: "cross", spreadPips: 1.5 },
    { pair: "GBP/JPY", base: "GBP", quote: "JPY", cat: "cross", spreadPips: 2.1 },
    { pair: "EUR/CHF", base: "EUR", quote: "CHF", cat: "cross", spreadPips: 1.5 },
    { pair: "AUD/JPY", base: "AUD", quote: "JPY", cat: "cross", spreadPips: 1.8 },
    { pair: "CAD/JPY", base: "CAD", quote: "JPY", cat: "cross", spreadPips: 2.0 },
    { pair: "CHF/JPY", base: "CHF", quote: "JPY", cat: "cross", spreadPips: 2.2 },
    { pair: "EUR/AUD", base: "EUR", quote: "AUD", cat: "cross", spreadPips: 2.0 },
    { pair: "GBP/CHF", base: "GBP", quote: "CHF", cat: "cross", spreadPips: 2.4 },
    { pair: "USD/MXN", base: "USD", quote: "MXN", cat: "exotic", spreadPips: 18.0 },
    { pair: "USD/SGD", base: "USD", quote: "SGD", cat: "exotic", spreadPips: 2.5 },
    { pair: "USD/HKD", base: "USD", quote: "HKD", cat: "exotic", spreadPips: 2.8 },
    { pair: "USD/SEK", base: "USD", quote: "SEK", cat: "exotic", spreadPips: 22.0 },
    { pair: "USD/NOK", base: "USD", quote: "NOK", cat: "exotic", spreadPips: 24.0 },
    { pair: "USD/ZAR", base: "USD", quote: "ZAR", cat: "exotic", spreadPips: 45.0 },
    { pair: "USD/CNY", base: "USD", quote: "CNY", cat: "exotic", spreadPips: 12.0 },
    { pair: "USD/INR", base: "USD", quote: "INR", cat: "exotic", spreadPips: 15.0 },
    { pair: "USD/TRY", base: "USD", quote: "TRY", cat: "exotic", spreadPips: 60.0 },
    { pair: "USD/BRL", base: "USD", quote: "BRL", cat: "exotic", spreadPips: 35.0 },
  ];

  const SESSIONS = [
    { name: "Sydney", tz: "Australia/Sydney", openUtc: 22, closeUtc: 7, pair: "AUD / NZD" },
    { name: "Tokyo", tz: "Asia/Tokyo", openUtc: 0, closeUtc: 9, pair: "JPY / AUD" },
    { name: "London", tz: "Europe/London", openUtc: 8, closeUtc: 17, pair: "EUR / GBP / CHF" },
    { name: "New York", tz: "America/New_York", openUtc: 13, closeUtc: 22, pair: "USD / CAD" },
  ];

  let usdRates = {}; // currency -> units per 1 USD
  let seriesDates = []; // sorted YYYY-MM-DD from Frankfurter
  let seriesByDate = {}; // date -> { EUR: ..., JPY: ... }
  let oandaPrices = {}; // "EUR/USD" -> { bid, ask, mid, time }
  let oandaConfigured = false;
  let fxMeta = { date: "—", source: "Loading…" };
  let selectedPair = localStorage.getItem(FX_PAIR_KEY) || "EUR/USD";
  let catFilter = "all";
  let chartDays = 35;
  let strengthWindow = 7;
  let fxSide = "buy";
  let pairHistory = []; // [[ms, rate], ...]
  let fxAccount = loadJson(FX_ACCT_KEY, null) || freshFxAccount();
  let fxClosed = loadJson(FX_HIST_KEY, []);

  function freshFxAccount() {
    return { balance: FX_START_BALANCE, realized: 0, positions: [] };
  }
  const saveFxAccount = () => localStorage.setItem(FX_ACCT_KEY, JSON.stringify(fxAccount));
  const saveFxClosed = () => localStorage.setItem(FX_HIST_KEY, JSON.stringify(fxClosed));
  const fxId = () => (crypto.randomUUID ? crypto.randomUUID() : `fx-${Date.now()}-${Math.random()}`);

  const isJpyQuote = (quote) => quote === "JPY";
  const pipSizeFor = (quote) => (isJpyQuote(quote) ? 0.01 : 0.0001);
  const decimalsFor = (quote) => (isJpyQuote(quote) ? 3 : 5);

  function fmtRate(rate, quote) {
    if (rate == null || Number.isNaN(rate)) return "—";
    return Number(rate).toFixed(decimalsFor(quote));
  }

  function fmtUsdFx(v) {
    if (v == null || Number.isNaN(v)) return "—";
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
  }

  function crossRate(base, quote, ratesMap = usdRates) {
    if (base === quote) return 1;
    const rb = base === "USD" ? 1 : ratesMap[base];
    const rq = quote === "USD" ? 1 : ratesMap[quote];
    if (!rb || !rq) return null;
    return rq / rb;
  }

  function pairSpec(pairName) {
    const found = PAIRS.find((p) => p.pair === pairName);
    if (found) return found;
    const [base, quote] = pairName.split("/");
    return { pair: pairName, base, quote, cat: "cross", spreadPips: isJpyQuote(quote) ? 2.0 : 1.8 };
  }

  function pairQuote(pairName) {
    const spec = pairSpec(pairName);
    const live = oandaPrices[pairName];
    if (live) {
      const pip = pipSizeFor(spec.quote);
      return {
        ...spec,
        bid: live.bid,
        ask: live.ask,
        mid: live.mid,
        spreadPips: (live.ask - live.bid) / pip,
        isOanda: true,
      };
    }
    const mid = crossRate(spec.base, spec.quote);
    if (mid == null) return null;
    const pip = pipSizeFor(spec.quote);
    const half = (spec.spreadPips * pip) / 2;
    return { ...spec, bid: mid - half, ask: mid + half, mid, isOanda: false };
  }

  function pairSeries(base, quote) {
    const out = [];
    for (const d of seriesDates) {
      const r = crossRate(base, quote, seriesByDate[d] || {});
      if (r != null) out.push([Date.parse(`${d}T16:00:00Z`), r]);
    }
    return out;
  }

  // ---------- Global FX Sessions ----------
  function isFxWeekend(now) {
    const day = now.getUTCDay(); // 0=Sun, 5=Fri, 6=Sat
    const hr = now.getUTCHours();
    if (day === 6) return true;
    if (day === 5 && hr >= 22) return true;
    if (day === 0 && hr < 22) return true;
    return false;
  }

  function sessionOpen(s, utcHour, weekend) {
    if (weekend) return false;
    return s.openUtc < s.closeUtc
      ? utcHour >= s.openUtc && utcHour < s.closeUtc
      : utcHour >= s.openUtc || utcHour < s.closeUtc;
  }

  function renderSessions() {
    const now = new Date();
    const weekend = isFxWeekend(now);
    const hr = now.getUTCHours() + now.getUTCMinutes() / 60;
    const overlap = !weekend && hr >= 13 && hr < 17;

    $("fx-utc-clock").textContent = `UTC ${now.toISOString().slice(11, 19)}`;
    const stateEl = $("fx-market-state");
    if (weekend) {
      stateEl.textContent = "Weekend Closed (Reopens Sun 22:00 UTC)";
      stateEl.className = "pill down";
    } else if (overlap) {
      stateEl.textContent = "LIVE · London–NY Peak Overlap";
      stateEl.className = "pill up";
    } else {
      stateEl.textContent = "LIVE · 24/5 Interbank Open";
      stateEl.className = "pill up";
    }

    $("fx-sessions").innerHTML = SESSIONS.map((s) => {
      const open = sessionOpen(s, hr, weekend);
      const localTime = new Intl.DateTimeFormat(undefined, { timeZone: s.tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
      const badge = overlap && (s.name === "London" || s.name === "New York")
        ? '<span class="fx-badge overlap">Overlap</span>'
        : open
          ? '<span class="fx-badge open">Open</span>'
          : '<span class="fx-badge closed">Closed</span>';
      return `<div class="fx-session ${open ? "open" : ""}">
        <div class="fx-session-head"><span>${s.name}</span>${badge}</div>
        <div class="fx-mono" style="font-size:1.05rem">${localTime} <span class="muted small-text">local</span></div>
        <div class="muted small-text">${String(s.openUtc).padStart(2, "0")}:00–${String(s.closeUtc).padStart(2, "0")}:00 UTC · ${s.pair}</div>
      </div>`;
    }).join("");
  }

  // ---------- Fetching Real FX Data ----------
  async function fxApi(path, directUrl) {
    const url = STATIC_SITE ? directUrl : path;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`FX API error (${res.status})`);
    return res.json();
  }

  async function loadFxData() {
    $("fx-refresh").disabled = true;
    try {
      const isoStart = new Date(Date.now() - 35 * 86400_000).toISOString().slice(0, 10);
      const syms = ["EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "MXN", "SGD", "HKD", "SEK", "NOK", "ZAR", "CNY", "INR", "TRY", "BRL"].join(",");

      const [latest, series] = await Promise.all([
        STATIC_SITE
          ? Promise.all([
              fetch("https://api.frankfurter.dev/v1/latest?from=USD").then((r) => r.json()).catch(() => null),
              fetch("https://open.er-api.com/v6/latest/USD").then((r) => r.json()).catch(() => null),
            ]).then(([ecb, er]) => ({
              base: "USD",
              date: ecb?.date || new Date().toISOString().slice(0, 10),
              source: ecb && er ? "ECB (Frankfurter) + ExchangeRate-API" : ecb ? "ECB (Frankfurter)" : "ExchangeRate-API",
              rates: { ...(er?.rates || {}), ...(ecb?.rates || {}), USD: 1 },
            }))
          : fxApi("/api/fx/latest?base=USD"),
        fxApi("/api/fx/series?days=35", `https://api.frankfurter.dev/v1/${isoStart}..?from=USD&to=${syms}`).catch(err => {
          console.warn("FX history unavailable:", err.message);
          return { rates: {} };
        }),
      ]);

      usdRates = latest.rates || {};
      if (!usdRates.EUR) throw new Error("Public FX quotes are unavailable. Try Refresh FX later.");
      fxMeta = { date: latest.date || "—", source: latest.source || "ECB" };
      seriesByDate = series.rates || {};
      seriesDates = Object.keys(seriesByDate).sort();

      // Optional OANDA v20 institutional bid/ask
      if (!STATIC_SITE) {
        try {
          const st = await apiGet("/api/fx/oanda/status");
          oandaConfigured = Boolean(st.configured);
          if (oandaConfigured) {
            const inst = PAIRS.slice(0, 16).map((p) => `${p.base}_${p.quote}`).join(",");
            const list = await apiGet(`/api/fx/oanda/prices?instruments=${encodeURIComponent(inst)}`);
            oandaPrices = {};
            for (const p of list) oandaPrices[p.pair] = p;
            $("fx-source-pill").textContent = `OANDA v20 (${st.env}) + ECB`;
            $("fx-oanda-pill").textContent = `OANDA ${st.env}`;
            $("fx-oanda-pill").className = "pill up";
          } else {
            $("fx-source-pill").textContent = `${fxMeta.source} · ${fxMeta.date}`;
            $("fx-oanda-pill").textContent = "Paper FX (ECB/ER)";
          }
        } catch {
          $("fx-source-pill").textContent = `${fxMeta.source} · ${fxMeta.date}`;
        }
      } else {
        $("fx-source-pill").textContent = `${fxMeta.source} · ${fxMeta.date}`;
      }

      renderFxKpis();
      renderPairsTable();
      renderMatrix();
      renderStrength();
      renderTicket();
      renderFxAccount();
      await loadPairHistory();
    } catch (err) {
      $("fx-source-pill").textContent = `FX load error: ${err.message}`;
    } finally {
      $("fx-refresh").disabled = false;
    }
  }

  async function loadPairHistory() {
    const spec = pairSpec(selectedPair);
    $("fx-chart-title").textContent = `${spec.pair} — Real Historical Rate Chart (ECB)`;
    $("fx-chart-msg").hidden = false;
    $("fx-chart-msg").textContent = "Loading historical ECB rates…";
    try {
      const start = new Date(Date.now() - chartDays * 86400_000).toISOString().slice(0, 10);
      let points = [];
      if (STATIC_SITE) {
        const res = await fetch(`https://api.frankfurter.dev/v1/${start}..?from=${spec.base}&to=${spec.quote}`);
        if (!res.ok) throw new Error(`No ECB history for ${spec.pair}`);
        const data = await res.json();
        points = Object.entries(data.rates || {})
          .map(([d, o]) => [Date.parse(`${d}T16:00:00Z`), o[spec.quote]])
          .filter(([, v]) => typeof v === "number")
          .sort((a, b) => a[0] - b[0]);
      } else {
        const data = await apiGet(`/api/fx/history?base=${spec.base}&quote=${spec.quote}&days=${chartDays}`);
        points = data.points || [];
      }
      // Append current live mid if newer than last ECB fix
      const q = pairQuote(spec.pair);
      if (q && points.length && Date.now() - points.at(-1)[0] > 3600_000) {
        points.push([Date.now(), q.mid]);
      }
      pairHistory = points;
      $("fx-chart-msg").hidden = points.length >= 2;
      if (points.length < 2) $("fx-chart-msg").textContent = `Historical series unavailable for ${spec.pair}.`;
      renderPairStats(spec, points);
      drawFxChart();
    } catch (err) {
      // Fallback to multi-currency 35D series if single pair failed
      const fallback = pairSeries(spec.base, spec.quote);
      pairHistory = fallback;
      $("fx-chart-msg").hidden = fallback.length >= 2;
      if (fallback.length < 2) $("fx-chart-msg").textContent = err.message;
      renderPairStats(spec, fallback);
      drawFxChart();
    }
  }

  // ---------- KPIs & Pairs Board ----------
  function pairChange(base, quote) {
    const pts = pairSeries(base, quote);
    const q = pairQuote(`${base}/${quote}`);
    if (!q || pts.length < 2) return { pct: null, pips: null, spark: pts.map((p) => p[1]) };
    // Compare live/latest rate vs prior ECB session close
    const prev = pts.length >= 2 ? pts[pts.length - 2][1] : pts[0][1];
    const diff = q.mid - prev;
    const pip = pipSizeFor(quote);
    return {
      pct: (diff / prev) * 100,
      pips: diff / pip,
      spark: [...pts.map((p) => p[1]), q.mid],
    };
  }

  function pairSignal(base, quote) {
    const pts = pairSeries(base, quote).map((p) => p[1]);
    const q = pairQuote(`${base}/${quote}`);
    if (!q || pts.length < 15) return { score: 0, verdict: "Hold", cls: "hold", rsiVal: null };
    const vals = [...pts, q.mid];
    const r = rsi(vals, 14);
    const sma20 = vals.slice(-20).reduce((s, v) => s + v, 0) / Math.min(20, vals.length);
    const smaDiff = ((q.mid - sma20) / sma20) * 100;
    const hi = Math.max(...vals), lo = Math.min(...vals);
    const rangePos = hi > lo ? (q.mid - lo) / (hi - lo) : 0.5;
    const chg = ((q.mid - vals[vals.length - 2]) / vals[vals.length - 2]) * 100;
    const score = Math.round(
      (clamp1((50 - (r ?? 50)) / 22) * 0.35 +
        clamp1(smaDiff / 1.5) * 0.35 +
        clamp1(chg / 0.8) * 0.2 +
        clamp1((0.5 - rangePos) * 1.6) * 0.1) *
        100
    );
    return { score, rsiVal: r, ...verdictFor(score) };
  }

  function renderFxKpis() {
    const setKpi = (pair, valId, subId) => {
      const q = pairQuote(pair);
      if (!q) return;
      const ch = pairChange(q.base, q.quote);
      $(valId).textContent = fmtRate(q.mid, q.quote);
      $(subId).innerHTML = ch.pct != null
        ? `<span class="${ch.pct >= 0 ? "up" : "down"}">${ch.pips >= 0 ? "+" : ""}${ch.pips.toFixed(1)} pips (${ch.pct >= 0 ? "+" : ""}${ch.pct.toFixed(2)}%)</span>`
        : `<span class="muted">Spread ${q.spreadPips.toFixed(1)}p</span>`;
    };
    setKpi("EUR/USD", "fx-kpi-eurusd", "fx-kpi-eurusd-sub");
    setKpi("USD/JPY", "fx-kpi-usdjpy", "fx-kpi-usdjpy-sub");
    setKpi("GBP/USD", "fx-kpi-gbpusd", "fx-kpi-gbpusd-sub");
    $("fx-kpi-date").textContent = `ECB fix: ${fxMeta.date}`;
  }

  function renderPairsTable() {
    const query = ($("fx-search").value || "").trim().toLowerCase();
    const list = PAIRS.filter((p) => (catFilter === "all" || p.cat === catFilter) && (!query || p.pair.toLowerCase().includes(query)));
    $("fx-pairs-body").innerHTML = list.map((p) => {
      const q = pairQuote(p.pair);
      if (!q) return "";
      const ch = pairChange(p.base, p.quote);
      const sig = pairSignal(p.base, p.quote);
      const pipsHtml = ch.pips == null
        ? '<span class="muted">—</span>'
        : `<span class="${ch.pips >= 0 ? "up" : "down"} fx-mono">${ch.pips >= 0 ? "+" : ""}${ch.pips.toFixed(1)}p <small>(${ch.pct >= 0 ? "+" : ""}${ch.pct.toFixed(2)}%)</small></span>`;
      return `<tr data-fx-pair="${p.pair}" class="${p.pair === selectedPair ? "selected" : ""}">
        <td><div class="fx-pair-cell">${p.pair}</div></td>
        <td><span class="fx-cat ${p.cat}">${p.cat}</span></td>
        <td class="fx-mono">${fmtRate(q.bid, p.quote)}</td>
        <td class="fx-mono">${fmtRate(q.ask, p.quote)}</td>
        <td class="fx-mono muted">${q.spreadPips.toFixed(1)}p</td>
        <td>${pipsHtml}</td>
        <td><canvas class="spark" width="84" height="26"></canvas></td>
        <td><span class="verdict ${sig.cls}" style="font-size:0.7rem;padding:0.12rem 0.5rem">${sig.verdict}</span></td>
      </tr>`;
    }).join("");

    $("fx-pairs-body").querySelectorAll("tr[data-fx-pair]").forEach((tr) => {
      const spec = pairSpec(tr.dataset.fxPair);
      const ch = pairChange(spec.base, spec.quote);
      drawSparkline(tr.querySelector("canvas"), ch.spark);
    });
  }

  // ---------- Currency Strength Meter ----------
  function computeStrength(windowDays = 7) {
    if (seriesDates.length < 2) return [];
    const latestDate = seriesDates.at(-1);
    const targetIdx = Math.max(0, seriesDates.length - 1 - Math.round((windowDays * 5) / 7));
    const baseDate = seriesDates[targetIdx];
    const startMap = { ...(seriesByDate[baseDate] || {}), USD: 1 };
    const endMap = { ...usdRates, ...(seriesByDate[latestDate] || {}), USD: 1 };

    return MAJORS.map((ccy) => {
      let sum = 0, count = 0;
      for (const other of MAJORS) {
        if (other === ccy) continue;
        const r0 = crossRate(ccy, other, startMap);
        const r1 = crossRate(ccy, other, endMap);
        if (r0 && r1) {
          sum += ((r1 - r0) / r0) * 100;
          count++;
        }
      }
      return { ccy, score: count ? sum / count : 0 };
    }).sort((a, b) => b.score - a.score);
  }

  function renderStrength() {
    const scores = computeStrength(strengthWindow);
    if (!scores.length) return;
    $("fx-kpi-strength").innerHTML = `<span class="up">${scores[0].ccy} ${scores[0].score >= 0 ? "+" : ""}${scores[0].score.toFixed(2)}%</span> / <span class="down">${scores.at(-1).ccy} ${scores.at(-1).score.toFixed(2)}%</span>`;

    const canvas = $("fx-strength-chart");
    if (!canvas.clientWidth) return;
    const { ctx, w, h } = fitCanvas(canvas);
    const maxAbs = Math.max(...scores.map((s) => Math.abs(s.score)), 0.25);
    const labelW = 48, padR = 64;
    const mid = labelW + (w - labelW - padR) / 2;
    const half = (w - labelW - padR) / 2 - 10;
    const rowH = h / scores.length;

    ctx.strokeStyle = "#30363d";
    ctx.beginPath();
    ctx.moveTo(mid, 4);
    ctx.lineTo(mid, h - 4);
    ctx.stroke();

    ctx.font = "600 12px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    scores.forEach((s, i) => {
      const y = i * rowH + rowH / 2;
      const len = (Math.abs(s.score) / maxAbs) * half;
      const up = s.score >= 0;
      ctx.fillStyle = "#e6edf3";
      ctx.textAlign = "left";
      ctx.fillText(s.ccy, 4, y);

      ctx.fillStyle = up ? "#3fb950" : "#f85149";
      ctx.fillRect(up ? mid : mid - len, y - rowH * 0.28, Math.max(2, len), rowH * 0.56);

      ctx.textAlign = "right";
      ctx.fillText(`${up ? "+" : ""}${s.score.toFixed(2)}%`, w - 4, y);
    });
  }

  // ---------- 8x8 Cross-Rate Matrix ----------
  function renderMatrix() {
    const tbl = $("fx-matrix");
    const head = `<thead><tr><th>Base \\ Quote</th>${MAJORS.map((c) => `<th>${c}</th>`).join("")}</tr></thead>`;
    const body = MAJORS.map((b) => {
      const cells = MAJORS.map((q) => {
        if (b === q) return '<td class="diag">1.0000</td>';
        const r = crossRate(b, q);
        const pair = `${b}/${q}`;
        const active = pair === selectedPair ? " active-pair" : "";
        return `<td class="cell fx-mono${active}" data-matrix-pair="${pair}" title="Load ${pair}">${r != null ? fmtRate(r, q) : "—"}</td>`;
      }).join("");
      return `<tr><th>${b}</th>${cells}</tr>`;
    }).join("");
    tbl.innerHTML = `${head}<tbody>${body}</tbody>`;
  }

  // ---------- Historical FX Chart with SMA(7) & SMA(20) ----------
  function smaSeries(points, n) {
    const out = [];
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
      sum += points[i][1];
      if (i >= n) sum -= points[i - n][1];
      if (i >= n - 1) out.push([points[i][0], sum / n]);
    }
    return out;
  }

  function renderPairStats(spec, points) {
    if (points.length < 2) {
      $("fx-stat-high").textContent = $("fx-stat-low").textContent = $("fx-stat-chg").textContent = $("fx-stat-adr").textContent = $("fx-stat-rsi").textContent = "—";
      $("fx-stat-verdict").textContent = "—";
      return;
    }
    const vals = points.map((p) => p[1]);
    const hi = Math.max(...vals), lo = Math.min(...vals);
    const first = vals[0], last = vals.at(-1);
    const pip = pipSizeFor(spec.quote);
    const pipChg = (last - first) / pip;
    const pct = ((last - first) / first) * 100;

    let absMoves = 0;
    for (let i = 1; i < vals.length; i++) absMoves += Math.abs(vals[i] - vals[i - 1]) / pip;
    const adr = absMoves / Math.max(1, vals.length - 1);
    const r = rsi(vals, 14);
    const sig = pairSignal(spec.base, spec.quote);

    $("fx-stat-high").textContent = fmtRate(hi, spec.quote);
    $("fx-stat-low").textContent = fmtRate(lo, spec.quote);
    $("fx-stat-chg").innerHTML = `<span class="${pipChg >= 0 ? "up" : "down"}">${pipChg >= 0 ? "+" : ""}${pipChg.toFixed(1)}p (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)</span>`;
    $("fx-stat-adr").textContent = `${adr.toFixed(1)} pips/day`;
    $("fx-stat-rsi").textContent = r != null ? r.toFixed(1) : "—";
    $("fx-stat-verdict").innerHTML = `<span class="verdict ${sig.cls}" style="font-size:0.75rem;padding:0.15rem 0.55rem">${sig.verdict} (${sig.score > 0 ? "+" : ""}${sig.score})</span>`;
  }

  function fxChartGeo() {
    const canvas = $("fx-chart");
    const w = canvas.clientWidth || 600;
    const h = cssHeight(canvas);
    const pad = { l: 10, r: 78, t: 14, b: 24 };
    const vals = pairHistory.map((p) => p[1]);
    const min = Math.min(...vals), max = Math.max(...vals);
    const t0 = pairHistory[0][0], t1 = pairHistory.at(-1)[0];
    const x = (t) => pad.l + ((t - t0) / (t1 - t0 || 1)) * (w - pad.l - pad.r);
    const y = (v) => pad.t + (1 - (v - min) / (max - min || 1)) * (h - pad.t - pad.b);
    return { w, h, pad, min, max, t0, t1, x, y };
  }

  function drawFxChart(hoverIdx = null) {
    const canvas = $("fx-chart");
    if (!canvas.clientWidth) return;
    const { ctx } = fitCanvas(canvas);
    if (pairHistory.length < 2) return;
    const spec = pairSpec(selectedPair);
    const g = fxChartGeo();
    const up = pairHistory.at(-1)[1] >= pairHistory[0][1];
    const color = up ? "#3fb950" : "#f85149";

    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = "#8b949e";
    ctx.strokeStyle = "#21262d";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    for (let i = 0; i <= 4; i++) {
      const v = g.min + ((g.max - g.min) * i) / 4;
      const yy = g.y(v);
      ctx.beginPath();
      ctx.moveTo(g.pad.l, yy);
      ctx.lineTo(g.w - g.pad.r, yy);
      ctx.stroke();
      ctx.fillText(fmtRate(v, spec.quote), g.w - g.pad.r + 6, yy);
    }

    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i <= 4; i++) {
      const t = g.t0 + ((g.t1 - g.t0) * i) / 4;
      const label = new Date(t).toLocaleDateString([], { month: "short", day: "numeric" });
      ctx.fillText(label, Math.min(Math.max(g.x(t), 34), g.w - g.pad.r - 34), g.h - g.pad.b + 6);
    }

    const grad = ctx.createLinearGradient(0, g.pad.t, 0, g.h - g.pad.b);
    grad.addColorStop(0, up ? "rgba(63,185,80,0.28)" : "rgba(248,81,73,0.28)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    pairHistory.forEach(([t, v], i) => (i ? ctx.lineTo(g.x(t), g.y(v)) : ctx.moveTo(g.x(t), g.y(v))));
    ctx.lineTo(g.x(g.t1), g.h - g.pad.b);
    ctx.lineTo(g.x(g.t0), g.h - g.pad.b);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    pairHistory.forEach(([t, v], i) => (i ? ctx.lineTo(g.x(t), g.y(v)) : ctx.moveTo(g.x(t), g.y(v))));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    if ($("fx-sma-toggle").checked) {
      const drawOverlay = (pts, stroke) => {
        if (pts.length < 2) return;
        ctx.beginPath();
        pts.forEach(([t, v], i) => (i ? ctx.lineTo(g.x(t), g.y(v)) : ctx.moveTo(g.x(t), g.y(v))));
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      };
      drawOverlay(smaSeries(pairHistory, 7), "#58a6ff");
      drawOverlay(smaSeries(pairHistory, 20), "#d29922");
    }

    const tip = $("fx-chart-tip");
    if (hoverIdx != null) {
      const [t, v] = pairHistory[hoverIdx];
      const hx = g.x(t), hy = g.y(v);
      const pip = pipSizeFor(spec.quote);
      const dPips = (v - pairHistory[0][1]) / pip;
      ctx.strokeStyle = "#8b949e";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(hx, g.pad.t);
      ctx.lineTo(hx, g.h - g.pad.b);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      tip.hidden = false;
      tip.style.left = `${Math.min(Math.max(hx, 80), g.w - 90)}px`;
      tip.style.top = `${Math.max(hy, 40)}px`;
      tip.innerHTML = `<strong class="fx-mono">${fmtRate(v, spec.quote)}</strong> <span class="${dPips >= 0 ? "up" : "down"}">(${dPips >= 0 ? "+" : ""}${dPips.toFixed(1)}p)</span><br><span class="muted">${new Date(t).toLocaleDateString()}</span>`;
    } else {
      tip.hidden = true;
    }
  }

  // ---------- Pip / Margin Calculator & Paper FX Trading ----------
  function usdValuePerPip(spec, lots) {
    const units = lots * 100_000;
    const pip = pipSizeFor(spec.quote);
    const quoteToUsd = crossRate(spec.quote, "USD");
    if (!quoteToUsd) return null;
    return units * pip * quoteToUsd;
  }

  function marginRequiredUsd(spec, lots, leverage) {
    const units = lots * 100_000;
    const baseToUsd = crossRate(spec.base, "USD");
    if (!baseToUsd) return null;
    return (units * baseToUsd) / leverage;
  }

  function renderTicket() {
    const q = pairQuote(selectedPair);
    $("fx-ticket-pair").textContent = selectedPair;
    $("fx-submit").textContent = `${fxSide === "buy" ? "Buy / Long" : "Sell / Short"} ${selectedPair}`;
    $("fx-submit").classList.toggle("sell", fxSide === "sell");
    if (!q) return;

    $("fx-bid").textContent = fmtRate(q.bid, q.quote);
    $("fx-ask").textContent = fmtRate(q.ask, q.quote);
    $("fx-pip-size").textContent = `1 pip = ${pipSizeFor(q.quote)}`;
    $("fx-spread-val").textContent = `Spread: ${q.spreadPips.toFixed(1)} pips${q.isOanda ? " (OANDA live)" : " (indicative)"}`;

    const lots = Math.max(0.01, Number($("fx-lots").value) || 0.1);
    const lev = Number($("fx-leverage").value) || 30;
    const sl = Math.max(0, Number($("fx-sl-pips").value) || 0);
    const tp = Math.max(0, Number($("fx-tp-pips").value) || 0);
    const pipVal = usdValuePerPip(q, lots);
    const margin = marginRequiredUsd(q, lots, lev);

    $("fx-calc-units").textContent = Math.round(lots * 100_000).toLocaleString();
    $("fx-calc-pipval").textContent = pipVal != null ? `${fmtUsdFx(pipVal)}/pip` : "—";
    $("fx-calc-margin").textContent = margin != null ? fmtUsdFx(margin) : "—";
    const riskUsd = sl && pipVal != null ? sl * pipVal : null;
    const rr = sl > 0 && tp > 0 ? `1:${(tp / sl).toFixed(2)}` : "—";
    $("fx-calc-rr").textContent = riskUsd != null ? `${fmtUsdFx(riskUsd)} · ${rr}` : rr;
  }

  function positionPnl(pos) {
    const q = pairQuote(pos.pair);
    if (!q) return { curPrice: pos.entry, pips: 0, usd: 0 };
    const curPrice = pos.side === "buy" ? q.bid : q.ask;
    const pip = pipSizeFor(pos.quote);
    const pips = ((pos.side === "buy" ? curPrice - pos.entry : pos.entry - curPrice) / pip);
    const pipVal = usdValuePerPip(q, pos.lots) || 0;
    return { curPrice, pips, usd: pips * pipVal };
  }

  function renderFxAccount() {
    let floating = 0, used = 0;
    const rows = fxAccount.positions.map((pos) => {
      const m = positionPnl(pos);
      floating += m.usd;
      used += pos.margin;
      return { pos, ...m };
    });
    const equity = fxAccount.balance + floating;
    const free = equity - used;
    const marginLevel = used > 0 ? (equity / used) * 100 : null;

    $("fx-acct-balance").textContent = fmtUsdFx(fxAccount.balance);
    $("fx-acct-equity").textContent = fmtUsdFx(equity);
    $("fx-acct-pnl").innerHTML = `<span class="${floating >= 0 ? "up" : "down"}">${floating >= 0 ? "+" : ""}${fmtUsdFx(floating)}</span>`;
    $("fx-acct-used").textContent = fmtUsdFx(used);
    $("fx-acct-free").textContent = fmtUsdFx(free);
    $("fx-acct-realized").innerHTML = `<span class="${fxAccount.realized >= 0 ? "up" : "down"}">${fxAccount.realized >= 0 ? "+" : ""}${fmtUsdFx(fxAccount.realized)}</span>`;

    const pill = $("fx-margin-pill");
    pill.textContent = marginLevel != null ? `Margin Level ${marginLevel.toFixed(0)}%` : `${fxAccount.positions.length} open`;
    pill.className = `pill ${marginLevel == null ? "" : marginLevel > 200 ? "up" : "down"}`;

    $("fx-positions-body").innerHTML = rows.length
      ? rows.map(({ pos, curPrice, pips, usd }) => `<tr>
          <td>${new Date(pos.openedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</td>
          <td class="fx-mono"><strong>${pos.pair}</strong></td>
          <td class="${pos.side === "buy" ? "up" : "down"}">${pos.side.toUpperCase()}</td>
          <td class="fx-mono">${pos.lots.toFixed(2)}</td>
          <td class="fx-mono">${fmtRate(pos.entry, pos.quote)}</td>
          <td class="fx-mono">${fmtRate(curPrice, pos.quote)}</td>
          <td class="fx-mono muted">${pos.sl ? fmtRate(pos.sl, pos.quote) : "—"} / ${pos.tp ? fmtRate(pos.tp, pos.quote) : "—"}</td>
          <td class="fx-mono ${pips >= 0 ? "up" : "down"}">${pips >= 0 ? "+" : ""}${pips.toFixed(1)}p</td>
          <td class="fx-mono ${usd >= 0 ? "up" : "down"}">${usd >= 0 ? "+" : ""}${fmtUsdFx(usd)}</td>
          <td><button class="remove" data-fx-close="${pos.id}" title="Close position">Close</button></td>
        </tr>`).join("")
      : '<tr><td colspan="10" class="muted">No open FX positions. Place a paper trade above.</td></tr>';
  }

  function selectPair(pairName) {
    selectedPair = pairName;
    localStorage.setItem(FX_PAIR_KEY, pairName);
    renderPairsTable();
    renderMatrix();
    renderTicket();
    loadPairHistory();
  }

  // ---------- Event Listeners ----------
  $("fx-refresh").addEventListener("click", loadFxData);
  $("fx-search").addEventListener("input", renderPairsTable);

  $("fx-cat-filter").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-cat]");
    if (!btn) return;
    catFilter = btn.dataset.cat;
    btn.parentElement.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    renderPairsTable();
  });

  $("fx-pairs-body").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-fx-pair]");
    if (tr) selectPair(tr.dataset.fxPair);
  });

  $("fx-matrix").addEventListener("click", (e) => {
    const td = e.target.closest("td[data-matrix-pair]");
    if (td) selectPair(td.dataset.matrixPair);
  });

  $("fx-ranges").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-fx-days]");
    if (!btn) return;
    chartDays = Number(btn.dataset.fxDays);
    btn.parentElement.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    loadPairHistory();
  });

  $("fx-sma-toggle").addEventListener("change", () => drawFxChart());

  $("fx-strength-window").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-sw]");
    if (!btn) return;
    strengthWindow = Number(btn.dataset.sw);
    btn.parentElement.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    renderStrength();
  });

  $("fx-chart").addEventListener("mousemove", (e) => {
    if (pairHistory.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const g = fxChartGeo();
    const t = g.t0 + ((mx - g.pad.l) / (g.w - g.pad.l - g.pad.r)) * (g.t1 - g.t0);
    let best = 0;
    for (let i = 1; i < pairHistory.length; i++) {
      if (Math.abs(pairHistory[i][0] - t) < Math.abs(pairHistory[best][0] - t)) best = i;
    }
    drawFxChart(best);
  });
  $("fx-chart").addEventListener("mouseleave", () => drawFxChart());

  $("fx-side-seg").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-fx-side]");
    if (!btn) return;
    fxSide = btn.dataset.fxSide;
    btn.parentElement.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    renderTicket();
  });

  document.querySelector(".fx-lot-presets").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-lot]");
    if (!btn) return;
    $("fx-lots").value = btn.dataset.lot;
    renderTicket();
  });

  for (const id of ["fx-lots", "fx-leverage", "fx-sl-pips", "fx-tp-pips"]) {
    $(id).addEventListener("input", renderTicket);
    $(id).addEventListener("change", renderTicket);
  }

  $("fx-order-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = pairQuote(selectedPair);
    const msg = $("fx-order-msg");
    if (!q) return (msg.textContent = "Waiting for FX quote…");
    const lots = Number($("fx-lots").value);
    const lev = Number($("fx-leverage").value) || 30;
    const slPips = Number($("fx-sl-pips").value) || 0;
    const tpPips = Number($("fx-tp-pips").value) || 0;
    if (!(lots > 0)) return (msg.textContent = "Enter a valid lot size.");

    const margin = marginRequiredUsd(q, lots, lev);
    const used = fxAccount.positions.reduce((s, p) => s + p.margin, 0);
    const floating = fxAccount.positions.reduce((s, p) => s + positionPnl(p).usd, 0);
    const freeMargin = fxAccount.balance + floating - used;
    if (margin > freeMargin) return (msg.textContent = `Insufficient free margin (${fmtUsdFx(freeMargin)} available, need ${fmtUsdFx(margin)}).`);

    const entry = fxSide === "buy" ? q.ask : q.bid;
    const pip = pipSizeFor(q.quote);
    const sl = slPips > 0 ? (fxSide === "buy" ? entry - slPips * pip : entry + slPips * pip) : null;
    const tp = tpPips > 0 ? (fxSide === "buy" ? entry + tpPips * pip : entry - tpPips * pip) : null;

    fxAccount.positions.unshift({
      id: fxId(),
      openedAt: new Date().toISOString(),
      pair: q.pair,
      base: q.base,
      quote: q.quote,
      side: fxSide,
      lots,
      leverage: lev,
      entry,
      sl,
      tp,
      margin,
    });
    saveFxAccount();
    renderFxAccount();
    msg.textContent = `Opened paper ${fxSide.toUpperCase()} ${lots.toFixed(2)} lots ${q.pair} @ ${fmtRate(entry, q.quote)} (Margin ${fmtUsdFx(margin)}).`;
  });

  $("fx-positions-body").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-fx-close]");
    if (!btn) return;
    const idx = fxAccount.positions.findIndex((p) => p.id === btn.dataset.fxClose);
    if (idx < 0) return;
    const pos = fxAccount.positions[idx];
    const m = positionPnl(pos);
    fxAccount.positions.splice(idx, 1);
    fxAccount.balance += m.usd;
    fxAccount.realized += m.usd;
    saveFxAccount();
    fxClosed.unshift({
      ...pos,
      closedAt: new Date().toISOString(),
      exit: m.curPrice,
      pips: m.pips,
      pnlUsd: m.usd,
    });
    if (fxClosed.length > 300) fxClosed.length = 300;
    saveFxClosed();
    renderFxAccount();
    $("fx-order-msg").textContent = `Closed ${pos.pair} (${m.pips >= 0 ? "+" : ""}${m.pips.toFixed(1)} pips · ${m.usd >= 0 ? "+" : ""}${fmtUsdFx(m.usd)}).`;
    window.dispatchEvent(new CustomEvent("dashboard:trades"));
  });

  $("fx-account-reset").addEventListener("click", () => {
    if (!confirm("Reset Forex paper margin account to $100,000 and close all open positions?")) return;
    fxAccount = freshFxAccount();
    saveFxAccount();
    renderFxAccount();
  });

  window.addEventListener("resize", () => {
    if (pairHistory.length) drawFxChart();
    if (seriesDates.length) renderStrength();
  });

  renderSessions();
  setInterval(renderSessions, 1000);
  loadFxData();
  setInterval(() => { if (!document.hidden) loadFxData(); }, 60_000);
})();
