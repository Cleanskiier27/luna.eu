const STATIC_SITE = true;
// When served by server.js, go through its cached proxy; when opened as a file, call CoinGecko directly.
const API = STATIC_SITE ? "https://api.coingecko.com/api/v3" : "/api/cg";
const REFRESH_MS = 60_000;
const STORAGE_KEY = "crypto-dashboard-holdings";
const RIGS_KEY = "crypto-dashboard-rigs";
const POWER_KEY = "crypto-dashboard-power-price";
const SELECTED_KEY = "crypto-dashboard-selected";
const PALETTE = ["#58a6ff", "#3fb950", "#d29922", "#f85149", "#a371f7", "#39c5cf", "#db61a2", "#e3b341", "#8b949e"];

const $ = (id) => document.getElementById(id);
const els = {
  currency: $("currency"),
  refresh: $("refresh"),
  updated: $("updated"),
  error: $("error"),
  market: $("market"),
  search: $("search"),
  coinList: $("coin-list"),
  form: $("holding-form"),
  holdingCoin: $("holding-coin"),
  holdingAmount: $("holding-amount"),
  holdings: $("holdings"),
  emptyPortfolio: $("empty-portfolio"),
  totalValue: $("total-value"),
  totalChange: $("total-change"),
  allocationWrap: $("allocation-wrap"),
  priceChart: $("price-chart"),
  chartTip: $("chart-tip"),
  chartMsg: $("chart-msg"),
};

let marketData = [];
let globalData = null;
let holdingPrices = {};
let holdings = loadJson(STORAGE_KEY, {});
let rigs = loadJson(RIGS_KEY, {});
let holdingsTotal = 0;
let selectedId = localStorage.getItem(SELECTED_KEY) || null;
let chartDays = 7;
let chartPoints = [];
const chartCache = new Map();

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveHoldings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
}

// ---------- formatting ----------
const cur = () => els.currency.value;

function fmtMoney(value) {
  if (value == null || Number.isNaN(value)) return "—";
  const digits = Math.abs(value) < 1 ? 6 : 2;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: cur().toUpperCase(), maximumFractionDigits: digits }).format(value);
}

function fmtCompact(value, money = true) {
  if (value == null) return "—";
  return new Intl.NumberFormat(undefined, {
    ...(money ? { style: "currency", currency: cur().toUpperCase() } : {}),
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function pctCell(pct) {
  if (pct == null) return '<span class="muted">—</span>';
  const cls = pct >= 0 ? "up" : "down";
  return `<span class="${cls}">${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%</span>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function coinCell(coin) {
  return `<div class="coin"><img src="${escapeHtml(coin.image)}" alt="" />${escapeHtml(coin.name)} <span class="sym">${escapeHtml(coin.symbol)}</span></div>`;
}

function showError(msg) {
  els.error.textContent = msg;
  els.error.hidden = !msg;
}

// ---------- data ----------
// Responses are cached in localStorage so multiple tabs/pages share one fetch, and
// stale data is shown instead of an empty page when CoinGecko rate-limits us.
const CACHE_PREFIX = "cg-cache:";
const CACHE_FRESH_MS = 55_000;
const CACHE_MAX_ENTRIES = 25;
let servedStale = false;
let retryTimer;

// Keeps the response cache small so it can never crowd out holdings, trades, and settings.
function cacheResponse(key, data) {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX) && k !== key);
  if (keys.length >= CACHE_MAX_ENTRIES) {
    keys
      .map((k) => [k, loadJson(k, { at: 0 }).at])
      .sort((a, b) => a[1] - b[1])
      .slice(0, keys.length - CACHE_MAX_ENTRIES + 1)
      .forEach(([k]) => localStorage.removeItem(k));
  }
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // Still too big: drop the whole response cache rather than risk user data writes failing.
    keys.forEach((k) => localStorage.removeItem(k));
  }
}

async function getJson(url) {
  const key = CACHE_PREFIX + url;
  const cached = loadJson(key, null);
  if (cached && Date.now() - cached.at < CACHE_FRESH_MS) return cached.data;
  try {
    const res = await fetch(url);
    if (res.status === 429) throw new Error("Rate limited by CoinGecko — data will retry on the next refresh.");
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const data = await res.json();
    cacheResponse(key, data);
    return data;
  } catch (err) {
    if (cached) {
      servedStale = true;
      return cached.data;
    }
    throw err;
  }
}

async function fetchMarket() {
  marketData = await getJson(
    `${API}/coins/markets?vs_currency=${cur()}&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h`
  );
  els.coinList.innerHTML = marketData.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");
}

async function fetchGlobal() {
  globalData = (await getJson(`${API}/global`)).data;
}

// Holdings and rigs may use coins outside the top 50, so fetch their prices separately.
async function fetchHoldingPrices() {
  const wanted = new Set([...Object.keys(holdings), ...Object.values(rigs).map((r) => r.coin)]);
  const ids = [...wanted].filter((id) => !marketData.some((c) => c.id === id));
  holdingPrices = {};
  if (!ids.length) return;
  const data = await getJson(`${API}/simple/price?ids=${encodeURIComponent(ids.join(","))}&vs_currencies=${cur()}&include_24hr_change=true`);
  for (const [id, v] of Object.entries(data)) {
    holdingPrices[id] = { price: v[cur()], change: v[`${cur()}_24h_change`] };
  }
}

async function fetchChart(id, days) {
  const key = `${id}|${days}|${cur()}`;
  const hit = chartCache.get(key);
  if (hit && Date.now() - hit.at < REFRESH_MS) return hit.prices;
  const data = await getJson(`${API}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=${cur()}&days=${days}`);
  chartCache.set(key, { at: Date.now(), prices: data.prices });
  return data.prices;
}

async function fetchCoin(id) {
  const c = await getJson(`${API}/coins/${encodeURIComponent(id)}?localization=false&tickers=false&community_data=false&developer_data=false`);
  const m = c.market_data;
  return {
    id: c.id,
    name: c.name,
    symbol: c.symbol,
    image: c.image?.small,
    current_price: m.current_price[cur()],
    price_change_percentage_24h: m.price_change_percentage_24h,
    market_cap: m.market_cap[cur()],
    total_volume: m.total_volume[cur()],
    high_24h: m.high_24h[cur()],
    low_24h: m.low_24h[cur()],
    ath: m.ath[cur()],
    ath_change_percentage: m.ath_change_percentage[cur()],
    circulating_supply: m.circulating_supply,
    market_cap_rank: c.market_cap_rank,
  };
}

function priceFor(id) {
  const coin = marketData.find((c) => c.id === id);
  if (coin) return { price: coin.current_price, change: coin.price_change_percentage_24h, coin };
  return holdingPrices[id] || null;
}

// ---------- canvas helpers ----------
// The CSS height comes from the original height attribute; it's cached because resizing the
// backing store for high-DPI screens overwrites that attribute.
function cssHeight(canvas) {
  if (!canvas.dataset.h) canvas.dataset.h = canvas.getAttribute("height");
  return Number(canvas.dataset.h);
}

function fitCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const h = cssHeight(canvas);
  const w = canvas.clientWidth || 600;
  canvas.style.height = `${h}px`;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function drawSparkline(canvas, prices) {
  const ctx = canvas.getContext("2d");
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  if (!prices || prices.length < 2) return;
  const min = Math.min(...prices);
  const range = Math.max(...prices) - min || 1;
  ctx.strokeStyle = prices.at(-1) >= prices[0] ? "#3fb950" : "#f85149";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  prices.forEach((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 2) - 1;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.stroke();
}

function drawDonut(canvas, slices, centerText) {
  const ctx = canvas.getContext("2d");
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (!total) return;
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 4;
  let start = -Math.PI / 2;
  slices.forEach((s) => {
    const angle = (s.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    start += angle;
  });
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = "#161b22";
  ctx.fill();
  if (centerText) {
    ctx.fillStyle = "#e6edf3";
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(centerText, cx, cy);
  }
}

function renderLegend(ul, slices, total) {
  ul.innerHTML = slices
    .map((s) => `<li><i style="background:${s.color}"></i>${escapeHtml(s.label)} <span class="muted">${((s.value / total) * 100).toFixed(1)}%</span></li>`)
    .join("");
}

// ---------- market status ----------
function renderStatus() {
  if (globalData) {
    const mcap = globalData.total_market_cap[cur()];
    const change = globalData.market_cap_change_percentage_24h_usd;
    $("stat-mcap").textContent = fmtCompact(mcap);
    $("stat-mcap-change").innerHTML = `${pctCell(change)} <span class="muted">24h</span>`;
    $("stat-volume").textContent = fmtCompact(globalData.total_volume[cur()]);
    const btc = globalData.market_cap_percentage.btc;
    $("stat-btc").textContent = `${btc.toFixed(1)}%`;
    $("meter-btc").style.width = `${btc}%`;

    const mood = $("market-mood");
    const label = change > 1 ? "Bullish" : change < -1 ? "Bearish" : "Neutral";
    mood.textContent = `${label} ${change >= 0 ? "▲" : "▼"} ${Math.abs(change).toFixed(2)}%`;
    mood.className = `pill ${change > 1 ? "up" : change < -1 ? "down" : ""}`;

    const shares = Object.entries(globalData.market_cap_percentage).slice(0, 6);
    const otherPct = 100 - shares.reduce((s, [, v]) => s + v, 0);
    const slices = [
      ...shares.map(([sym, v], i) => ({ label: sym.toUpperCase(), value: v, color: PALETTE[i] })),
      { label: "Other", value: Math.max(otherPct, 0), color: PALETTE[8] },
    ];
    drawDonut($("share-chart"), slices, fmtCompact(mcap));
    renderLegend($("share-legend"), slices, 100);
  }

  if (marketData.length) {
    const gainers = marketData.filter((c) => (c.price_change_percentage_24h ?? 0) >= 0).length;
    $("stat-breadth").innerHTML = `<span class="up">${gainers} ▲</span> / <span class="down">${marketData.length - gainers} ▼</span>`;
    $("meter-gainers").style.width = `${(gainers / marketData.length) * 100}%`;
    drawMovers();
  }
}

function drawMovers() {
  const canvas = $("movers-chart");
  const { ctx, w, h } = fitCanvas(canvas);
  const sorted = [...marketData]
    .filter((c) => c.price_change_percentage_24h != null)
    .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
  const movers = [...sorted.slice(0, 5), ...sorted.slice(-5)];
  if (!movers.length) return;

  const maxAbs = Math.max(...movers.map((c) => Math.abs(c.price_change_percentage_24h))) || 1;
  const labelW = 70, pad = 50;
  const mid = labelW + (w - labelW) / 2;
  const half = (w - labelW) / 2 - pad;
  const rowH = h / movers.length;

  ctx.strokeStyle = "#30363d";
  ctx.beginPath();
  ctx.moveTo(mid, 0);
  ctx.lineTo(mid, h);
  ctx.stroke();

  ctx.font = "12px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  movers.forEach((c, i) => {
    const pct = c.price_change_percentage_24h;
    const y = i * rowH + rowH / 2;
    const len = (Math.abs(pct) / maxAbs) * half;
    const up = pct >= 0;
    ctx.fillStyle = up ? "#3fb950" : "#f85149";
    ctx.fillRect(up ? mid : mid - len, y - rowH * 0.3, len, rowH * 0.6);

    ctx.fillStyle = "#e6edf3";
    ctx.textAlign = "left";
    ctx.fillText(c.symbol.toUpperCase(), 0, y);

    ctx.fillStyle = up ? "#3fb950" : "#f85149";
    ctx.textAlign = up ? "left" : "right";
    ctx.fillText(`${up ? "+" : ""}${pct.toFixed(2)}%`, up ? mid + len + 6 : mid - len - 6, y);
  });
}

// ---------- tables ----------
function renderMarket() {
  const q = els.search.value.trim().toLowerCase();
  const rows = marketData.filter((c) => !q || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
  els.market.innerHTML = rows
    .map(
      (c) => `<tr data-id="${escapeHtml(c.id)}" class="${c.id === selectedId ? "selected" : ""}">
        <td class="muted">${c.market_cap_rank ?? "—"}</td>
        <td>${coinCell(c)}</td>
        <td>${fmtMoney(c.current_price)}</td>
        <td>${pctCell(c.price_change_percentage_24h)}</td>
        <td>${fmtCompact(c.market_cap)}</td>
        <td><canvas class="spark" width="110" height="30"></canvas></td>
      </tr>`
    )
    .join("");
  els.market.querySelectorAll("tr[data-id]").forEach((tr) => {
    const coin = marketData.find((c) => c.id === tr.dataset.id);
    drawSparkline(tr.querySelector("canvas"), coin?.sparkline_in_7d?.price);
  });
}

function renderPortfolio() {
  const ids = Object.keys(holdings);
  els.emptyPortfolio.hidden = ids.length > 0;
  let total = 0;
  let prevTotal = 0;
  const slices = [];

  els.holdings.innerHTML = ids
    .map((id, i) => {
      const amount = holdings[id];
      const info = priceFor(id);
      const value = info?.price != null ? info.price * amount : null;
      if (value != null) {
        total += value;
        prevTotal += info.change != null ? value / (1 + info.change / 100) : value;
        slices.push({ label: info.coin?.symbol?.toUpperCase() || id, value, color: PALETTE[i % PALETTE.length] });
      }
      const label = info?.coin ? coinCell(info.coin) : escapeHtml(id);
      return `<tr data-id="${escapeHtml(id)}" class="${id === selectedId ? "selected" : ""}">
        <td>${label}</td>
        <td>${amount}</td>
        <td>${fmtMoney(info?.price)}</td>
        <td>${fmtMoney(value)}</td>
        <td>${pctCell(info?.change)}</td>
        <td><button class="remove" data-remove="${escapeHtml(id)}" title="Remove">✕</button></td>
      </tr>`;
    })
    .join("");

  els.totalValue.textContent = fmtMoney(total);
  holdingsTotal = total;
  const changePct = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : null;
  els.totalChange.innerHTML = ids.length ? pctCell(changePct) : "—";

  els.allocationWrap.hidden = slices.length === 0;
  if (slices.length) {
    drawDonut($("allocation-chart"), slices, `${slices.length} coin${slices.length > 1 ? "s" : ""}`);
    renderLegend($("allocation-legend"), slices, total);
  }
  renderPositionsCharts(slices);
}

// ---------- coin selection / detail ----------
async function selectCoin(id) {
  selectedId = id;
  localStorage.setItem(SELECTED_KEY, id);
  document.querySelectorAll("tr[data-id], .level[data-id]").forEach((el) => el.classList.toggle("selected", el.dataset.id === id));
  const r = $("detail-card").getBoundingClientRect();
  if (r.bottom < document.querySelector("header").offsetHeight || r.top > window.innerHeight) showTab("overview", "detail-card");
  chartPoints = [];
  await renderDetail();
}

async function renderDetail() {
  if (!selectedId) return;
  $("detail-empty").hidden = true;
  $("detail").hidden = false;

  let coin = marketData.find((c) => c.id === selectedId);
  if (!coin) {
    try {
      coin = await fetchCoin(selectedId);
    } catch (err) {
      showError(`Couldn't load "${selectedId}": ${err.message}`);
      return;
    }
  }

  $("detail-img").src = coin.image || "";
  $("detail-name").textContent = coin.name;
  $("detail-sym").textContent = coin.symbol;
  $("detail-price").textContent = fmtMoney(coin.current_price);
  $("detail-change").innerHTML = `${pctCell(coin.price_change_percentage_24h)} <span class="muted">24h</span>`;
  $("d-mcap").textContent = fmtCompact(coin.market_cap);
  $("d-vol").textContent = fmtCompact(coin.total_volume);
  $("d-range").textContent = `${fmtMoney(coin.low_24h)} – ${fmtMoney(coin.high_24h)}`;
  const span = coin.high_24h - coin.low_24h;
  $("d-range-meter").style.width = span > 0 ? `${((coin.current_price - coin.low_24h) / span) * 100}%` : "50%";
  $("d-ath").textContent = fmtMoney(coin.ath);
  $("d-ath-pct").innerHTML = `${pctCell(coin.ath_change_percentage)} <span class="muted">from ATH</span>`;
  $("d-supply").textContent = `${fmtCompact(coin.circulating_supply, false)} ${coin.symbol.toUpperCase()}`;
  $("d-rank").textContent = coin.market_cap_rank ? `#${coin.market_cap_rank}` : "—";

  await renderPriceChart();
}

let chartRequest = 0;
let chartMode = "price";
let compareSeries = [];
const compareHidden = new Set();

async function renderPriceChart() {
  if (chartMode === "compare") return renderCompareChart();
  const req = ++chartRequest;
  const coin = marketData.find((c) => c.id === selectedId);
  $("big-chart-title").textContent = coin ? `${coin.name} price` : "Price chart";
  $("compare-legend").hidden = true;
  if (!chartPoints.length) {
    els.chartMsg.hidden = false;
    els.chartMsg.textContent = "Loading chart…";
  }
  try {
    const prices = await fetchChart(selectedId, chartDays);
    if (req !== chartRequest) return;
    chartPoints = prices;
    els.chartMsg.hidden = true;
    drawPriceChart();
  } catch (err) {
    if (req !== chartRequest) return;
    chartPoints = [];
    fitCanvas(els.priceChart);
    els.chartMsg.hidden = false;
    els.chartMsg.textContent = err.message;
  }
}

// Compare mode uses the 7-day hourly sparklines already in the markets response, so it costs no extra API calls.
function renderCompareChart() {
  ++chartRequest;
  $("big-chart-title").textContent = "Top coins — % change over 7 days";
  els.chartMsg.hidden = true;
  const now = Date.now();
  compareSeries = levelCoins().map((c, i) => {
    const prices = c.sparkline_in_7d?.price || [];
    const base = prices[0] || 1;
    return {
      id: c.id,
      label: c.symbol.toUpperCase(),
      color: PALETTE[i % PALETTE.length],
      points: prices.map((p, j) => [now - (prices.length - 1 - j) * 3600_000, ((p - base) / base) * 100]),
    };
  });
  const legend = $("compare-legend");
  legend.hidden = false;
  legend.innerHTML = compareSeries
    .map((s) => `<li data-id="${escapeHtml(s.id)}" class="${compareHidden.has(s.id) ? "off" : ""}"><i style="background:${s.color}"></i>${escapeHtml(s.label)} <span class="${(s.points.at(-1)?.[1] ?? 0) >= 0 ? "up" : "down"}">${(s.points.at(-1)?.[1] ?? 0).toFixed(2)}%</span></li>`)
    .join("");
  drawCompareChart();
}

function compareGeometry() {
  const visible = compareSeries.filter((s) => !compareHidden.has(s.id) && s.points.length > 1);
  const w = els.priceChart.clientWidth;
  const h = cssHeight(els.priceChart);
  const pad = { l: 10, r: 70, t: 14, b: 26 };
  const all = visible.flatMap((s) => s.points);
  if (!all.length) return null;
  const vals = all.map((p) => p[1]);
  const min = Math.min(0, ...vals);
  const max = Math.max(0, ...vals);
  const t0 = Math.min(...all.map((p) => p[0]));
  const t1 = Math.max(...all.map((p) => p[0]));
  const x = (t) => pad.l + ((t - t0) / (t1 - t0 || 1)) * (w - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - min) / (max - min || 1)) * (h - pad.t - pad.b);
  return { visible, w, h, pad, min, max, t0, t1, x, y };
}

function drawCompareChart(hoverT = null) {
  const { ctx } = fitCanvas(els.priceChart);
  const g = compareGeometry();
  if (!g) return;
  ctx.font = "11px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 5; i++) {
    const v = g.min + ((g.max - g.min) * i) / 5;
    ctx.strokeStyle = "#21262d";
    ctx.beginPath();
    ctx.moveTo(g.pad.l, g.y(v));
    ctx.lineTo(g.w - g.pad.r, g.y(v));
    ctx.stroke();
    ctx.fillStyle = "#8b949e";
    ctx.textAlign = "left";
    ctx.fillText(`${v >= 0 ? "+" : ""}${v.toFixed(1)}%`, g.w - g.pad.r + 6, g.y(v));
  }
  ctx.strokeStyle = "#8b949e";
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(g.pad.l, g.y(0));
  ctx.lineTo(g.w - g.pad.r, g.y(0));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#8b949e";
  for (let i = 0; i <= 6; i++) {
    const t = g.t0 + ((g.t1 - g.t0) * i) / 6;
    ctx.fillText(new Date(t).toLocaleDateString([], { weekday: "short", day: "numeric" }), Math.min(Math.max(g.x(t), 30), g.w - g.pad.r - 30), g.h - g.pad.b + 8);
  }

  for (const s of g.visible) {
    ctx.beginPath();
    s.points.forEach(([t, v], i) => (i ? ctx.lineTo(g.x(t), g.y(v)) : ctx.moveTo(g.x(t), g.y(v))));
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (hoverT == null) {
    els.chartTip.hidden = true;
    return;
  }
  const hx = g.x(hoverT);
  ctx.strokeStyle = "#8b949e";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(hx, g.pad.t);
  ctx.lineTo(hx, g.h - g.pad.b);
  ctx.stroke();
  ctx.setLineDash([]);
  const rows = g.visible
    .map((s) => {
      const p = s.points.reduce((best, q) => (Math.abs(q[0] - hoverT) < Math.abs(best[0] - hoverT) ? q : best));
      ctx.beginPath();
      ctx.arc(g.x(p[0]), g.y(p[1]), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
      return { s, v: p[1] };
    })
    .sort((a, b) => b.v - a.v);
  els.chartTip.hidden = false;
  els.chartTip.style.left = `${Math.min(Math.max(hx, 90), g.w - 90)}px`;
  els.chartTip.style.top = `${g.pad.t + 40}px`;
  els.chartTip.innerHTML =
    `<span class="muted">${new Date(hoverT).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span><br>` +
    rows.map(({ s, v }) => `<span style="color:${s.color}">●</span> ${escapeHtml(s.label)} <span class="${v >= 0 ? "up" : "down"}">${v >= 0 ? "+" : ""}${v.toFixed(2)}%</span>`).join("<br>");
}

$("compare-legend").addEventListener("click", (e) => {
  const li = e.target.closest("li[data-id]");
  if (!li) return;
  compareHidden.has(li.dataset.id) ? compareHidden.delete(li.dataset.id) : compareHidden.add(li.dataset.id);
  li.classList.toggle("off");
  drawCompareChart();
});

document.querySelector("#big-chart-card .seg:not(.ranges)").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-mode]");
  if (!btn) return;
  chartMode = btn.dataset.mode;
  btn.parentElement.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
  document.querySelectorAll(".ranges button").forEach((b) => {
    b.disabled = chartMode === "compare" && b.dataset.days !== "7";
  });
  renderPriceChart();
});

function chartGeometry() {
  const canvas = els.priceChart;
  const w = canvas.clientWidth;
  const h = cssHeight(canvas);
  const pad = { l: 10, r: 80, t: 10, b: 24 };
  const vals = chartPoints.map((p) => p[1]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const t0 = chartPoints[0][0];
  const t1 = chartPoints.at(-1)[0];
  const x = (t) => pad.l + ((t - t0) / (t1 - t0 || 1)) * (w - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - min) / (max - min || 1)) * (h - pad.t - pad.b);
  return { w, h, pad, min, max, t0, t1, x, y };
}

function drawPriceChart(hoverIdx = null) {
  const { ctx } = fitCanvas(els.priceChart);
  if (chartPoints.length < 2) return;
  const g = chartGeometry();
  const up = chartPoints.at(-1)[1] >= chartPoints[0][1];
  const color = up ? "#3fb950" : "#f85149";

  ctx.font = "11px system-ui, sans-serif";
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
    ctx.fillText(fmtMoney(v), g.w - g.pad.r + 6, yy);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i = 0; i <= 4; i++) {
    const t = g.t0 + ((g.t1 - g.t0) * i) / 4;
    const d = new Date(t);
    const label = chartDays <= 1 ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString([], { month: "short", day: "numeric" });
    ctx.fillText(label, Math.min(Math.max(g.x(t), 30), g.w - g.pad.r - 30), g.h - g.pad.b + 6);
  }

  const grad = ctx.createLinearGradient(0, g.pad.t, 0, g.h - g.pad.b);
  grad.addColorStop(0, up ? "rgba(63,185,80,0.35)" : "rgba(248,81,73,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  chartPoints.forEach(([t, v], i) => (i ? ctx.lineTo(g.x(t), g.y(v)) : ctx.moveTo(g.x(t), g.y(v))));
  ctx.lineTo(g.x(g.t1), g.h - g.pad.b);
  ctx.lineTo(g.x(g.t0), g.h - g.pad.b);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  chartPoints.forEach(([t, v], i) => (i ? ctx.lineTo(g.x(t), g.y(v)) : ctx.moveTo(g.x(t), g.y(v))));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  if (hoverIdx != null) {
    const [t, v] = chartPoints[hoverIdx];
    const hx = g.x(t), hy = g.y(v);
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

    els.chartTip.hidden = false;
    els.chartTip.style.left = `${hx}px`;
    els.chartTip.style.top = `${hy}px`;
    els.chartTip.innerHTML = `<strong>${fmtMoney(v)}</strong><br><span class="muted">${new Date(t).toLocaleString()}</span>`;
  } else {
    els.chartTip.hidden = true;
  }
}

els.priceChart.addEventListener("mousemove", (e) => {
  const rect = els.priceChart.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  if (chartMode === "compare") {
    const g = compareGeometry();
    if (!g) return;
    const t = g.t0 + ((Math.min(Math.max(mx, g.pad.l), g.w - g.pad.r) - g.pad.l) / (g.w - g.pad.l - g.pad.r)) * (g.t1 - g.t0);
    return drawCompareChart(t);
  }
  if (chartPoints.length < 2) return;
  const g = chartGeometry();
  const t = g.t0 + ((mx - g.pad.l) / (g.w - g.pad.l - g.pad.r)) * (g.t1 - g.t0);
  let best = 0;
  for (let i = 1; i < chartPoints.length; i++) {
    if (Math.abs(chartPoints[i][0] - t) < Math.abs(chartPoints[best][0] - t)) best = i;
  }
  drawPriceChart(best);
});
els.priceChart.addEventListener("mouseleave", () => (chartMode === "compare" ? drawCompareChart() : drawPriceChart()));

document.querySelector(".ranges").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-days]");
  if (!btn || btn.disabled) return;
  chartDays = Number(btn.dataset.days);
  document.querySelectorAll(".ranges button").forEach((b) => b.classList.toggle("active", b === btn));
  chartPoints = [];
  renderPriceChart();
});

$("detail-add").addEventListener("click", () => {
  showTab("portfolio", "holding-form");
  els.holdingCoin.value = selectedId;
  els.holdingAmount.value = holdings[selectedId] ?? "";
  els.holdingAmount.focus({ preventScroll: true });
});

$("detail-trade").addEventListener("click", () => {
  showTab("trading", "ticket-card");
  window.dispatchEvent(new CustomEvent("dashboard:trade", { detail: { coinId: selectedId } }));
});

// ---------- tabs ----------
let currentTab = "overview";

// The header is sticky, so sections need a scroll offset equal to its height to land below it.
function syncHeaderHeight() {
  document.documentElement.style.setProperty("--header-h", `${document.querySelector("header").offsetHeight}px`);
}
syncHeaderHeight();
window.addEventListener("resize", syncHeaderHeight);

function scrollToSection(target) {
  const el = typeof target === "string" ? $(target) : target;
  if (!el) return;
  // Run after the newly shown panel has layout, and land just below the sticky header.
  setTimeout(() => {
    const top = el.getBoundingClientRect().top + window.scrollY - document.querySelector("header").offsetHeight - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: document.hidden ? "instant" : "smooth" });
  }, 0);
}

// `scrollTarget`: element id to scroll to, true for the top of the section, or omitted for no scroll.
// All sections stay on one page; the nav buttons scroll to them and the highlight follows scrolling.
function showTab(name, scrollTarget) {
  if (!document.querySelector(`[data-panel="${name}"]`)) name = "overview";
  const panel = document.querySelector(`[data-panel="${name}"]`);
  setActiveTab(name);
  if (location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
  if (scrollTarget) scrollToSection(scrollTarget === true ? panel : scrollTarget);
}

function setActiveTab(name) {
  document.querySelectorAll("nav [data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  if (name === currentTab) return;
  currentTab = name;
  localStorage.setItem("crypto-dashboard-tab", name);
  window.dispatchEvent(new CustomEvent("dashboard:tab", { detail: { tab: name } }));
}

// Scroll spy: the section whose top has passed just under the header is the active one.
let spyTimer;
window.addEventListener("scroll", () => {
  clearTimeout(spyTimer);
  spyTimer = setTimeout(() => {
    const line = document.querySelector("header").offsetHeight + 60;
    let active = "overview";
    for (const p of document.querySelectorAll("[data-panel]")) {
      if (p.getBoundingClientRect().top <= line) active = p.dataset.panel;
    }
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
      active = [...document.querySelectorAll("[data-panel]")].at(-1).dataset.panel;
    }
    setActiveTab(active);
    if (location.hash !== `#${active}`) history.replaceState(null, "", `#${active}`);
  }, 80);
}, { passive: true });

document.querySelector("nav.tabs").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-tab]");
  if (btn) showTab(btn.dataset.tab, true);
});

// ---------- shared helpers for other modules ----------
async function apiPost() { throw new Error("Desktop server required"); }

async function apiGet() { throw new Error("Desktop server required"); }

const STABLECOINS = new Set(["usdt", "usdc", "dai", "fdusd", "usde", "tusd", "usdd", "pyusd", "busd", "usds", "usd1", "susde", "bsc-usd", "usdt0", "buidl", "usdtb", "rlusd", "steth", "wbtc", "weth", "wsteth", "wbeth", "weeth", "cbbtc", "u", "figr_heloc", "usyc", "ustb", "ousg", "usdf", "gho", "frax", "usdg", "xaut", "paxg"]);

function levelCoins() {
  return marketData.filter((c) => !STABLECOINS.has(c.symbol.toLowerCase())).slice(0, 8);
}

// ---------- buy/sell signal engine (shared with trading.js) ----------
function rsi(prices, period = 14) {
  if (!prices || prices.length <= period) return null;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    d >= 0 ? (gain += d) : (loss -= d);
  }
  gain /= period;
  loss /= period;
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
  }
  return loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
}

const clamp1 = (v) => Math.max(-1, Math.min(1, v));

// Returns a -100..100 score; positive leans buy. `flow` is the live taker buy share (0..1) if known.
function computeSignals(coin, flow = null) {
  const rows = [];
  const add = (name, reading, score, weight) => rows.push({ name, reading, score: clamp1(score), weight });
  const spark = coin.sparkline_in_7d?.price;
  const price = coin.current_price;

  const r = rsi(spark);
  if (r != null) add("RSI (14h)", r.toFixed(1), (50 - r) / 20, 0.25);
  if (spark?.length) {
    const sma = spark.reduce((s, p) => s + p, 0) / spark.length;
    const diff = ((price - sma) / sma) * 100;
    add("Price vs 7d average", `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}%`, diff / 5, 0.2);
  }
  if (coin.price_change_percentage_24h != null) {
    add("24h momentum", `${coin.price_change_percentage_24h.toFixed(2)}%`, coin.price_change_percentage_24h / 8, 0.15);
  }
  if (coin.high_24h > coin.low_24h) {
    const pos = (price - coin.low_24h) / (coin.high_24h - coin.low_24h);
    const reading = pos < 0 ? "below 24h low" : pos > 1 ? "above 24h high" : `${(pos * 100).toFixed(0)}%`;
    add("Position in 24h range", reading, (0.5 - Math.min(Math.max(pos, 0), 1)) * 1.5, 0.1);
  }
  if (coin.ath_change_percentage != null) {
    add("Distance from ATH", `${coin.ath_change_percentage.toFixed(1)}%`, (-coin.ath_change_percentage - 40) / 40, 0.1);
  }
  if (flow != null) add("Live buy/sell ratio", `${(flow * 100).toFixed(0)}% buys`, (flow - 0.5) * 4, 0.2);

  const totalW = rows.reduce((s, x) => s + x.weight, 0) || 1;
  const score = Math.round((rows.reduce((s, x) => s + x.score * x.weight, 0) / totalW) * 100);
  return { score, rows, ...verdictFor(score) };
}

function verdictFor(score) {
  if (score >= 50) return { verdict: "Strong Buy", cls: "strong-buy" };
  if (score >= 15) return { verdict: "Buy", cls: "buy" };
  if (score > -15) return { verdict: "Hold", cls: "hold" };
  if (score > -50) return { verdict: "Sell", cls: "sell" };
  return { verdict: "Strong Sell", cls: "strong-sell" };
}

// Semicircle gauge: value 0..1 from left to right, used for range levels and scores.
function drawGauge(canvas, value, { label = "", colors = ["#f85149", "#d29922", "#3fb950"], sub = "" } = {}) {
  const ctx = canvas.getContext("2d");
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h - 18, r = Math.min(w / 2, h) - 14;
  const grad = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
  colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
  ctx.lineWidth = Math.max(8, r * 0.18);
  ctx.lineCap = "round";
  ctx.strokeStyle = "#30363d";
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.stroke();
  ctx.strokeStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * Math.max(0.001, Math.min(1, value)));
  ctx.stroke();
  const a = Math.PI + Math.PI * Math.min(1, Math.max(0, value));
  ctx.strokeStyle = "#e6edf3";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
  ctx.stroke();
  ctx.fillStyle = "#e6edf3";
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  if (label) {
    ctx.font = `600 ${Math.max(12, r * 0.28)}px system-ui, sans-serif`;
    ctx.fillText(label, cx, cy - r * 0.35);
  }
  if (sub) {
    ctx.fillStyle = "#8b949e";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(sub, cx, h - 2);
  }
}

// ---------- currency levels ----------
function renderLevels() {
  const coins = levelCoins();
  $("levels").innerHTML = coins
    .map((c) => {
      const sig = computeSignals(c);
      const fromAth = c.ath_change_percentage ?? 0;
      return `<div class="level ${c.id === selectedId ? "selected" : ""}" data-id="${escapeHtml(c.id)}" title="Click to chart ${escapeHtml(c.name)}">
        <div class="top"><div class="coin"><img src="${escapeHtml(c.image)}" alt="" /><strong>${escapeHtml(c.symbol.toUpperCase())}</strong></div>
          <span class="verdict ${sig.cls}" style="font-size:0.7rem;padding:0.1rem 0.5rem">${sig.verdict}</span></div>
        <span class="price">${fmtMoney(c.current_price)}</span>
        <span>${pctCell(c.price_change_percentage_24h)} <span class="muted small-text">24h</span></span>
        <canvas class="gauge" width="170" height="95"></canvas>
        <div class="mini"><span>L ${fmtCompact(c.low_24h)}</span><span>24h level</span><span>H ${fmtCompact(c.high_24h)}</span></div>
        <canvas class="spark7" width="170" height="36"></canvas>
        <div class="mini"><span>From ATH</span><span class="${fromAth > -10 ? "up" : "down"}">${fromAth.toFixed(1)}%</span></div>
        <div class="ath-bar"><div style="width:${Math.max(2, 100 + fromAth)}%"></div></div>
      </div>`;
    })
    .join("");
  $("levels").querySelectorAll(".level").forEach((el) => {
    const c = coins.find((x) => x.id === el.dataset.id);
    const pos = c.high_24h > c.low_24h ? (c.current_price - c.low_24h) / (c.high_24h - c.low_24h) : 0.5;
    drawGauge(el.querySelector(".gauge"), pos, { label: `${Math.round(pos * 100)}%` });
    drawSparkline(el.querySelector(".spark7"), c.sparkline_in_7d?.price);
  });
}

$("levels").addEventListener("click", (e) => {
  const tile = e.target.closest(".level[data-id]");
  if (!tile) return;
  if (chartMode === "compare") document.querySelector('#big-chart-card [data-mode="price"]').click();
  selectCoin(tile.dataset.id);
});

// ---------- portfolio positions charts ----------
function renderPositionsCharts(slices) {
  const withSpark = Object.keys(holdings)
    .map((id) => ({ id, coin: marketData.find((c) => c.id === id), qty: holdings[id] }))
    .filter((p) => p.coin?.sparkline_in_7d?.price?.length);
  $("positions-visuals").hidden = slices.length === 0;
  if (!slices.length) return;

  // Stacked area of position values over the 7-day sparkline window.
  const canvas = $("positions-chart");
  const { ctx, w, h } = fitCanvas(canvas);
  const len = Math.min(...withSpark.map((p) => p.coin.sparkline_in_7d.price.length));
  if (withSpark.length && len > 1) {
    const series = withSpark.map((p, i) => ({
      label: p.coin.symbol.toUpperCase(),
      color: PALETTE[Object.keys(holdings).indexOf(p.id) % PALETTE.length],
      values: p.coin.sparkline_in_7d.price.slice(-len).map((v) => v * p.qty),
    }));
    const totals = Array.from({ length: len }, (_, j) => series.reduce((s, x) => s + x.values[j], 0));
    const max = Math.max(...totals) || 1;
    const pad = { l: 8, r: 70, t: 10, b: 22 };
    const x = (j) => pad.l + (j / (len - 1)) * (w - pad.l - pad.r);
    const y = (v) => pad.t + (1 - v / max) * (h - pad.t - pad.b);
    canvas._pos = { series, totals, len, pad, x, w };

    ctx.font = "11px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
      const v = (max * i) / 4;
      ctx.strokeStyle = "#21262d";
      ctx.beginPath();
      ctx.moveTo(pad.l, y(v));
      ctx.lineTo(w - pad.r, y(v));
      ctx.stroke();
      ctx.fillStyle = "#8b949e";
      ctx.textAlign = "left";
      ctx.fillText(fmtCompact(v), w - pad.r + 6, y(v));
    }
    const base = new Array(len).fill(0);
    series.forEach((s) => {
      ctx.beginPath();
      s.values.forEach((v, j) => (j ? ctx.lineTo(x(j), y(base[j] + v)) : ctx.moveTo(x(j), y(base[j] + v))));
      for (let j = len - 1; j >= 0; j--) ctx.lineTo(x(j), y(base[j]));
      ctx.closePath();
      ctx.fillStyle = `${s.color}99`;
      ctx.fill();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      s.values.forEach((v, j) => (j ? ctx.lineTo(x(j), y(base[j] + v)) : ctx.moveTo(x(j), y(base[j] + v))));
      ctx.stroke();
      s.values.forEach((v, j) => (base[j] += v));
    });
    ctx.fillStyle = "#8b949e";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ["7d ago", "5d", "3d", "1d", "now"].forEach((t, i) => ctx.fillText(t, x(Math.round(((len - 1) * i) / 4)), h - pad.b + 6));
  } else {
    canvas._pos = null;
    ctx.fillStyle = "#8b949e";
    ctx.textAlign = "center";
    ctx.fillText("History is available for top-50 coins only", w / 2, h / 2);
  }

  // Horizontal bars of current position values.
  const bars = $("positions-bars");
  const b = fitCanvas(bars);
  const sorted = [...slices].sort((a, c) => c.value - a.value);
  const maxV = sorted[0]?.value || 1;
  const rowH = Math.min(40, b.h / sorted.length);
  b.ctx.font = "12px system-ui, sans-serif";
  b.ctx.textBaseline = "middle";
  sorted.forEach((s, i) => {
    const yy = i * rowH + rowH / 2;
    const len2 = (s.value / maxV) * (b.w - 170);
    b.ctx.fillStyle = "#e6edf3";
    b.ctx.textAlign = "left";
    b.ctx.fillText(s.label, 0, yy);
    b.ctx.fillStyle = s.color;
    b.ctx.fillRect(60, yy - rowH * 0.3, Math.max(2, len2), rowH * 0.6);
    b.ctx.fillStyle = "#8b949e";
    b.ctx.fillText(fmtMoney(s.value), 66 + len2, yy);
  });
}

$("positions-chart").addEventListener("mousemove", (e) => {
  const c = e.currentTarget;
  const p = c._pos;
  if (!p) return;
  const mx = e.clientX - c.getBoundingClientRect().left;
  const j = Math.round(((Math.min(Math.max(mx, p.pad.l), p.w - p.pad.r) - p.pad.l) / (p.w - p.pad.l - p.pad.r)) * (p.len - 1));
  const tip = $("positions-tip");
  tip.hidden = false;
  tip.style.left = `${p.x(j)}px`;
  tip.style.top = "60px";
  const hoursAgo = p.len - 1 - j;
  tip.innerHTML =
    `<strong>${fmtMoney(p.totals[j])}</strong> <span class="muted">${hoursAgo ? `${hoursAgo}h ago` : "now"}</span><br>` +
    p.series.map((s) => `<span style="color:${s.color}">●</span> ${escapeHtml(s.label)} ${fmtMoney(s.values[j])}`).join("<br>");
});
$("positions-chart").addEventListener("mouseleave", () => ($("positions-tip").hidden = true));

// ---------- miner portfolio ----------
const powerPriceInput = $("power-price");
powerPriceInput.value = localStorage.getItem(POWER_KEY) ?? powerPriceInput.value;

function rigNumbers(rig) {
  const info = priceFor(rig.coin);
  const revenue = info?.price != null ? info.price * rig.rate : null;
  const cost = (rig.watts / 1000) * 24 * (parseFloat(powerPriceInput.value) || 0);
  return { info, revenue, cost, profit: revenue != null ? revenue - cost : null };
}

function signedMoney(v) {
  if (v == null) return "—";
  return `<span class="${v >= 0 ? "up" : "down"}">${fmtMoney(v)}</span>`;
}

function renderMiner() {
  const list = Object.entries(rigs);
  $("empty-rigs").hidden = list.length > 0;
  $("miner-visuals").hidden = list.length === 0;

  let revenue = 0, cost = 0;
  const rows = list.map(([key, rig]) => {
    const n = rigNumbers(rig);
    revenue += n.revenue ?? 0;
    cost += n.cost;
    return { key, rig, ...n };
  });

  $("rigs").innerHTML = rows
    .map(
      ({ key, rig, info, revenue: r, cost: c, profit: p }) => `<tr data-id="${escapeHtml(rig.coin)}" class="${rig.coin === selectedId ? "selected" : ""}">
        <td>${escapeHtml(rig.name)}</td>
        <td>${info?.coin ? coinCell(info.coin) : escapeHtml(rig.coin)}</td>
        <td>${rig.rate}</td>
        <td>${rig.watts} W</td>
        <td>${fmtMoney(r)}</td>
        <td>${fmtMoney(c)}</td>
        <td>${signedMoney(p)}</td>
        <td><button class="remove" data-remove-rig="${escapeHtml(key)}" title="Remove">✕</button></td>
      </tr>`
    )
    .join("");

  const profit = revenue - cost;
  $("m-holdings").textContent = fmtMoney(holdingsTotal);
  $("m-revenue").textContent = list.length ? fmtMoney(revenue) : "—";
  $("m-cost").textContent = list.length ? fmtMoney(cost) : "—";
  $("m-profit").innerHTML = list.length ? signedMoney(profit) : "—";
  $("m-month").textContent = list.length ? `${fmtMoney(profit * 30)} / 30 days` : "";
  $("m-combined").textContent = fmtMoney(holdingsTotal + (list.length ? profit * 30 : 0));

  const pill = $("miner-pill");
  pill.textContent = !list.length ? "No rigs" : profit >= 0 ? "Profitable" : "Unprofitable";
  pill.className = `pill ${!list.length ? "" : profit >= 0 ? "up" : "down"}`;

  if (list.length) {
    drawRigBars(rows);
    const slices = rows
      .filter((r) => r.revenue > 0)
      .map((r, i) => ({ label: r.rig.name, value: r.revenue, color: PALETTE[i % PALETTE.length] }));
    drawDonut($("rig-share"), slices, fmtMoney(revenue));
    renderLegend($("rig-legend"), slices, revenue || 1);
  }
}

function drawRigBars(rows) {
  const { ctx, w, h } = fitCanvas($("rig-chart"));
  const max = Math.max(...rows.flatMap((r) => [r.revenue ?? 0, r.cost])) || 1;
  const pad = { l: 10, r: 10, t: 20, b: 28 };
  const groupW = (w - pad.l - pad.r) / rows.length;
  const barW = Math.min(40, groupW / 3);
  const plotH = h - pad.t - pad.b;

  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "center";
  rows.forEach((r, i) => {
    const cx = pad.l + groupW * i + groupW / 2;
    [[r.revenue ?? 0, "#3fb950", -1], [r.cost, "#f85149", 1]].forEach(([v, color, side]) => {
      const bh = (v / max) * plotH;
      const x = cx + (side < 0 ? -barW - 2 : 2);
      ctx.fillStyle = color;
      ctx.fillRect(x, pad.t + plotH - bh, barW, bh);
      ctx.fillStyle = "#8b949e";
      ctx.textBaseline = "bottom";
      ctx.fillText(fmtCompact(v), x + barW / 2, pad.t + plotH - bh - 2);
    });
    ctx.fillStyle = "#e6edf3";
    ctx.textBaseline = "top";
    ctx.fillText(r.rig.name.slice(0, 18), cx, h - pad.b + 8);
  });

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#3fb950";
  ctx.fillRect(w - 150, 2, 10, 10);
  ctx.fillStyle = "#8b949e";
  ctx.fillText("Revenue", w - 136, 1);
  ctx.fillStyle = "#f85149";
  ctx.fillRect(w - 76, 2, 10, 10);
  ctx.fillStyle = "#8b949e";
  ctx.fillText("Power", w - 62, 1);
}

$("rig-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("rig-name").value.trim();
  const coin = $("rig-coin").value.trim().toLowerCase();
  const rate = parseFloat($("rig-rate").value);
  const watts = parseFloat($("rig-watts").value);
  if (!name || !coin || !(rate >= 0) || !(watts >= 0)) return;
  rigs[name.toLowerCase()] = { name, coin, rate, watts };
  localStorage.setItem(RIGS_KEY, JSON.stringify(rigs));
  e.target.reset();
  try {
    await fetchHoldingPrices();
  } catch (err) {
    showError(err.message);
  }
  renderMiner();
});

$("rigs").addEventListener("click", (e) => {
  const remove = e.target.closest("[data-remove-rig]");
  if (remove) {
    delete rigs[remove.dataset.removeRig];
    localStorage.setItem(RIGS_KEY, JSON.stringify(rigs));
    renderMiner();
    return;
  }
  const row = e.target.closest("tr[data-id]");
  if (row) selectCoin(row.dataset.id);
});

powerPriceInput.addEventListener("input", () => {
  localStorage.setItem(POWER_KEY, powerPriceInput.value);
  renderMiner();
});

// ---------- refresh / events ----------
async function refresh() {
  els.refresh.disabled = true;
  showError("");
  servedStale = false;
  try {
    await Promise.all([fetchMarket(), fetchGlobal()]);
    await fetchHoldingPrices();
    if (!selectedId && marketData.length) selectedId = marketData[0].id;
    renderStatus();
    renderLevels();
    renderMarket();
    renderPortfolio();
    renderMiner();
    if (selectedId) await renderDetail();
    window.dispatchEvent(new CustomEvent("dashboard:data"));
    els.updated.textContent = servedStale ? "Showing cached data (rate limited)" : `Updated ${new Date().toLocaleTimeString()}`;
  } catch (err) {
    showError(err.message);
    els.updated.textContent = "Update failed — retrying in 20s";
    clearTimeout(retryTimer);
    retryTimer = setTimeout(refresh, 20_000);
  } finally {
    els.refresh.disabled = false;
  }
}

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = els.holdingCoin.value.trim().toLowerCase();
  const amount = parseFloat(els.holdingAmount.value);
  if (!id || !(amount >= 0)) return;
  if (amount === 0) delete holdings[id];
  else holdings[id] = amount;
  saveHoldings();
  els.form.reset();
  try {
    await fetchHoldingPrices();
  } catch (err) {
    showError(err.message);
  }
  renderPortfolio();
  renderMiner();
});

els.holdings.addEventListener("click", (e) => {
  const remove = e.target.closest("[data-remove]");
  if (remove) {
    delete holdings[remove.dataset.remove];
    saveHoldings();
    renderPortfolio();
    renderMiner();
    return;
  }
  const row = e.target.closest("tr[data-id]");
  if (row) selectCoin(row.dataset.id);
});

els.market.addEventListener("click", (e) => {
  const row = e.target.closest("tr[data-id]");
  if (row) selectCoin(row.dataset.id);
});

els.search.addEventListener("input", renderMarket);
els.refresh.addEventListener("click", refresh);
els.currency.value = localStorage.getItem("crypto-dashboard-currency") || "usd";
els.currency.addEventListener("change", () => {
  localStorage.setItem("crypto-dashboard-currency", els.currency.value);
  chartCache.clear();
  refresh();
});

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (marketData.length) drawMovers();
    if (chartMode === "compare") drawCompareChart();
    else if (chartPoints.length) drawPriceChart();
    if (Object.keys(rigs).length) renderMiner();
    if (Object.keys(holdings).length && marketData.length) renderPortfolio();
  }, 150);
});

const initialSection = (location.hash || "").slice(1) || "forex";
setActiveTab(document.querySelector(`[data-panel="${initialSection}"]`) ? initialSection : "forex");
// Wait until forex.js/mining.js/trading.js/trail.js have registered their listeners: with a warm cache the
// first refresh can finish within the current task and its "dashboard:data" event would be missed.
// Scroll to a #section link only after data has rendered, so the page height is final.
document.addEventListener("DOMContentLoaded", async () => {
  await refresh();
  if (initialSection !== "forex") showTab(initialSection, true);
});

// Poll only while the tab is visible; background tabs otherwise burn CoinGecko's free rate limit.
let lastRefresh = Date.now();
setInterval(() => {
  if (document.hidden) return;
  lastRefresh = Date.now();
  refresh();
}, REFRESH_MS);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && Date.now() - lastRefresh > REFRESH_MS) {
    lastRefresh = Date.now();
    refresh();
  }
});
