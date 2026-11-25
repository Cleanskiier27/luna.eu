// Easy Trade Platform — Unified Crypto, Forex, Stock Market, Mining & Earnings Import
(() => {
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "preciseliens-easy-trade-v1";
  const DEFAULT_CASH = 25000;
  // Luna's static preview has no broker or miner backend, even on localhost.
  const IS_LOCAL_SERVER = false;
  const LUNA_ORIGIN = "https://cleanskiier27.github.io/luna.eu";

  const FALLBACK_STOCKS = [
    { symbol: "AAPL", name: "Apple Inc.", sector: "Tech", price: 228.5, changePct: 1.12 },
    { symbol: "NVDA", name: "NVIDIA Corp.", sector: "AI / Chips", price: 138.4, changePct: 3.24 },
    { symbol: "MSFT", name: "Microsoft Corp.", sector: "Tech", price: 424.2, changePct: 0.78 },
    { symbol: "TSLA", name: "Tesla Inc.", sector: "Auto / AI", price: 262.8, changePct: 2.65 },
    { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Cloud / Retail", price: 204.6, changePct: 1.44 },
    { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Tech", price: 174.9, changePct: 0.92 },
    { symbol: "META", name: "Meta Platforms", sector: "Tech", price: 586.3, changePct: 1.35 },
    { symbol: "AMD", name: "Advanced Micro Devices", sector: "Chips", price: 146.5, changePct: -0.64 },
    { symbol: "SPY", name: "SPDR S&P 500 ETF", sector: "Index ETF", price: 594.2, changePct: 0.52 },
    { symbol: "QQQ", name: "Invesco QQQ Trust", sector: "Nasdaq ETF", price: 506.7, changePct: 0.89 },
    { symbol: "COIN", name: "Coinbase Global", sector: "Crypto Equity", price: 248.0, changePct: 4.18 },
    { symbol: "MSTR", name: "Strategy (MicroStrategy)", sector: "Crypto Equity", price: 318.5, changePct: 5.02 },
    { symbol: "MARA", name: "MARA Holdings (BTC Mining)", sector: "Mining Stock", price: 21.4, changePct: 3.45 },
    { symbol: "RIOT", name: "Riot Platforms (BTC Mining)", sector: "Mining Stock", price: 12.6, changePct: 2.15 },
    { symbol: "CLSK", name: "CleanSpark (BTC Mining)", sector: "Mining Stock", price: 14.2, changePct: 2.88 },
  ];

  // ---------- Fallback catalogs (used only if live APIs are offline/throttled) ----------
  const FALLBACK_CRYPTO = [
    { id: "bitcoin", symbol: "BTC", name: "Bitcoin", price: 91450, changePct: 2.34, high: 92800, low: 89100, mcap: 1.8e12 },
    { id: "ethereum", symbol: "ETH", name: "Ethereum", price: 3240, changePct: 1.82, high: 3310, low: 3150, mcap: 3.9e11 },
    { id: "solana", symbol: "SOL", name: "Solana", price: 214.5, changePct: 4.15, high: 221.0, low: 204.2, mcap: 1.0e11 },
    { id: "monero", symbol: "XMR", name: "Monero", price: 186.4, changePct: 1.12, high: 191.0, low: 181.5, mcap: 3.4e9 },
    { id: "ripple", symbol: "XRP", name: "XRP", price: 1.42, changePct: 3.05, high: 1.48, low: 1.36, mcap: 8.1e10 },
    { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", price: 0.382, changePct: -1.24, high: 0.398, low: 0.371, mcap: 5.6e10 },
    { id: "litecoin", symbol: "LTC", name: "Litecoin", price: 96.2, changePct: 0.88, high: 98.4, low: 94.1, mcap: 7.2e9 },
    { id: "cardano", symbol: "ADA", name: "Cardano", price: 0.89, changePct: 2.1, high: 0.92, low: 0.85, mcap: 3.1e10 },
    { id: "chainlink", symbol: "LINK", name: "Chainlink", price: 18.7, changePct: 2.75, high: 19.3, low: 18.0, mcap: 1.1e10 },
    { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", price: 42.3, changePct: -0.65, high: 43.9, low: 41.2, mcap: 1.7e10 },
  ];

  const FX_PAIRS = [
    { base: "EUR", quote: "USD", name: "Euro / US Dollar", spreadPips: 0.8, fallback: 1.0845 },
    { base: "GBP", quote: "USD", name: "British Pound / US Dollar", spreadPips: 1.1, fallback: 1.2712 },
    { base: "USD", quote: "JPY", name: "US Dollar / Japanese Yen", spreadPips: 0.9, fallback: 152.40 },
    { base: "USD", quote: "CHF", name: "US Dollar / Swiss Franc", spreadPips: 1.2, fallback: 0.8815 },
    { base: "AUD", quote: "USD", name: "Australian Dollar / USD", spreadPips: 1.0, fallback: 0.6584 },
    { base: "USD", quote: "CAD", name: "US Dollar / Canadian Dollar", spreadPips: 1.3, fallback: 1.3895 },
    { base: "NZD", quote: "USD", name: "New Zealand Dollar / USD", spreadPips: 1.4, fallback: 0.5982 },
    { base: "EUR", quote: "GBP", name: "Euro / British Pound", spreadPips: 1.3, fallback: 0.8531 },
    { base: "EUR", quote: "JPY", name: "Euro / Japanese Yen", spreadPips: 1.5, fallback: 165.28 },
    { base: "GBP", quote: "JPY", name: "British Pound / Japanese Yen", spreadPips: 2.1, fallback: 193.72 },
  ];

  const RIG_CATALOG = [
    { id: "cpu-xmr", name: "CPU Monero Node", coinKey: "crypto:monero", coinSym: "XMR", hashrate: 4800, hashLabel: "4.8 kH/s", cost: 450, dailyUsd: 6.8, desc: "Low-power RandomX CPU miner" },
    { id: "gpu-eth-alt", name: "GPU Multi-Coin Rig", coinKey: "crypto:solana", coinSym: "SOL", hashrate: 185000, hashLabel: "185 MH/s", cost: 1800, dailyUsd: 31.5, desc: "6x GPU rig with auto-profit switching" },
    { id: "asic-btc", name: "BTC ASIC S21 Pro", coinKey: "crypto:bitcoin", coinSym: "BTC", hashrate: 234000000, hashLabel: "234 TH/s", cost: 4800, dailyUsd: 96.0, desc: "SHA-256 enterprise Bitcoin ASIC" },
    { id: "hydro-farm", name: "Hydro Immersion Pod", coinKey: "crypto:bitcoin", coinSym: "BTC", hashrate: 850000000, hashLabel: "850 TH/s", cost: 14500, dailyUsd: 315.0, desc: "Liquid-cooled multi-ASIC cluster" },
  ];

  const MINING_STOCK_SYMS = new Set(["MARA", "RIOT", "CLSK", "COIN", "MSTR"]);

  // ---------- Persistent State ----------
  function defaultState() {
    return {
      cash: DEFAULT_CASH,
      initialCash: DEFAULT_CASH,
      realizedPnl: 0,
      importedUsdTotal: 0,
      positions: {}, // key -> { key, symbol, name, category, qty, avgPrice, coinId? }
      orders: [], // { id, key, symbol, category, kind:'limit'|'sl'|'tp', side:'buy'|'sell', targetPrice, qty, usd, createdAt }
      history: [], // { id, time, type, key, symbol, category, qty, price, valueUsd, note }
      rigs: {}, // rigId -> count
      unclaimedByCoin: {}, // coinKey -> usdAccrued
      autoSellMining: false,
      importedIds: [], // dedupe tokens for imported earnings
      lastRigTick: Date.now(),
    };
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!raw || typeof raw !== "object") return defaultState();
      return { ...defaultState(), ...raw };
    } catch {
      return defaultState();
    }
  }

  let state = loadState();
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }

  // ---------- Runtime State ----------
  const assets = new Map(); // key -> unified asset object
  let activeCategory = "all";
  let searchQuery = "";
  let selectedKey = "crypto:bitcoin";
  let chartRange = "30d";
  let chartPoints = [];
  let ticketSide = "buy"; // buy | sell | swap
  let inputMode = "usd"; // usd | units
  let brokerStatus = null;
  let hwStatus = null;
  let ws = null;
  let wsPrices = new Map();
  let pendingFileRows = [];
  let scannedDashboardItems = [];

  // ---------- Formatting helpers ----------
  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function fmtUsd(v, digits) {
    if (v == null || Number.isNaN(v)) return "—";
    const d = digits != null ? digits : Math.abs(v) < 1 && v !== 0 ? 4 : 2;
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", minimumFractionDigits: Math.min(d, 2), maximumFractionDigits: d }).format(v);
  }

  function fmtPrice(a, p = a?.price) {
    if (p == null || Number.isNaN(p)) return "—";
    if (a?.category === "forex") {
      const dec = a.quote === "JPY" ? 3 : 5;
      return Number(p).toFixed(dec);
    }
    if (p >= 1000) return fmtUsd(p, 2);
    if (p >= 1) return fmtUsd(p, 2);
    if (p >= 0.01) return fmtUsd(p, 4);
    return fmtUsd(p, 6);
  }

  function fmtQty(v) {
    if (v == null || Number.isNaN(v)) return "0";
    const abs = Math.abs(v);
    const maxD = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: maxD }).format(v);
  }

  function fmtPct(v) {
    if (v == null || Number.isNaN(v)) return "0.00%";
    return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
  }

  function fmtHashrate(h) {
    if (!h) return "0 H/s";
    if (h >= 1e9) return `${(h / 1e9).toFixed(2)} PH/s`;
    if (h >= 1e6) return `${(h / 1e6).toFixed(2)} TH/s`;
    if (h >= 1e3) return `${(h / 1e3).toFixed(2)} kH/s`;
    return `${h.toFixed(0)} H/s`;
  }

  function toast(msg, kind = "") {
    const el = document.createElement("div");
    el.className = `et-toast ${kind}`;
    el.textContent = msg;
    $("et-toasts").appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  async function apiGet(path) {
    if (path.startsWith("/api/")) throw new Error("Requires the desktop dashboard server");
    const res = await fetch(path, { headers: { Accept: "application/json" } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  async function apiPost(path, body = {}) {
    if (path.startsWith("/api/")) throw new Error("Requires the desktop dashboard server");
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Dashboard": "1" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  // ---------- Unified Market Feeds ----------
  function upsertAsset(a) {
    const prev = assets.get(a.key);
    assets.set(a.key, { ...(prev || {}), ...a });
  }

  async function loadCryptoFeed() {
    try {
      const cgUrl = IS_LOCAL_SERVER
        ? "/api/cg/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=25&page=1&sparkline=false&price_change_percentage=24h"
        : "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=25&page=1&sparkline=false&price_change_percentage=24h";
      const data = await apiGet(cgUrl);
      if (!Array.isArray(data) || !data.length) throw new Error("Empty CoinGecko");
      for (const c of data) {
        const sym = c.symbol.toUpperCase();
        const key = `crypto:${c.id}`;
        const wsLive = wsPrices.get(`${sym}-USD`);
        const price = wsLive ?? c.current_price;
        upsertAsset({
          key,
          id: c.id,
          symbol: sym,
          name: c.name,
          category: "crypto",
          isMiningRelated: sym === "BTC" || sym === "XMR" || sym === "LTC" || sym === "DOGE",
          price,
          changePct: c.price_change_percentage_24h ?? 0,
          high: c.high_24h ?? price,
          low: c.low_24h ?? price,
          extraLabel: "Market Cap",
          extraVal: c.market_cap ? `$${(c.market_cap / 1e9).toFixed(1)}B` : "—",
          image: c.image,
          source: wsLive ? "Coinbase WS" : "CoinGecko",
        });
      }
      return true;
    } catch {
      for (const c of FALLBACK_CRYPTO) {
        const key = `crypto:${c.id}`;
        const wsLive = wsPrices.get(`${c.symbol}-USD`);
        upsertAsset({
          key,
          id: c.id,
          symbol: c.symbol,
          name: c.name,
          category: "crypto",
          isMiningRelated: ["BTC", "XMR", "LTC", "DOGE"].includes(c.symbol),
          price: wsLive ?? c.price,
          changePct: c.changePct,
          high: c.high,
          low: c.low,
          extraLabel: "Market Cap",
          extraVal: `$${(c.mcap / 1e9).toFixed(1)}B`,
          source: wsLive ? "Coinbase WS" : "Cached/Sim",
        });
      }
      return false;
    }
  }

  async function loadForexFeed() {
    try {
      const [latest, series] = IS_LOCAL_SERVER
        ? await Promise.all([
            apiGet("/api/fx/latest?base=USD"),
            apiGet("/api/fx/series?days=10").catch(() => null),
          ])
        : await Promise.all([
            apiGet("https://open.er-api.com/v6/latest/USD").then((d) => ({ rates: d.rates || {}, source: "ExchangeRate-API (Direct)" })),
            apiGet(`https://api.frankfurter.app/${new Date(Date.now() - 10 * 86400_000).toISOString().slice(0, 10)}..?from=USD&to=EUR,GBP,JPY,CHF,CAD,AUD,NZD`).catch(() => null),
          ]);
      const rates = latest.rates || {};
      const dates = series?.rates ? Object.keys(series.rates).sort() : [];
      const prevRates = dates.length >= 2 ? series.rates[dates[dates.length - 2]] : null;

      for (const p of FX_PAIRS) {
        const rb = p.base === "USD" ? 1 : rates[p.base];
        const rq = p.quote === "USD" ? 1 : rates[p.quote];
        const price = rb && rq ? rq / rb : p.fallback;
        let changePct = 0;
        if (prevRates) {
          const pb = p.base === "USD" ? 1 : prevRates[p.base];
          const pq = p.quote === "USD" ? 1 : prevRates[p.quote];
          if (pb && pq) {
            const prev = pq / pb;
            changePct = ((price - prev) / prev) * 100;
          }
        }
        const pip = p.quote === "JPY" ? 0.01 : 0.0001;
        const spread = p.spreadPips * pip;
        // For Easy Trade USD pricing: 1 FX unit = 1 Mini-unit priced in USD notional (1000 units = $1000 base equivalent, simplified to price per 100-unit contract so paper trading feels intuitive)
        upsertAsset({
          key: `forex:${p.base}_${p.quote}`,
          symbol: `${p.base}/${p.quote}`,
          base: p.base,
          quote: p.quote,
          name: p.name,
          category: "forex",
          price,
          usdPerUnit: p.quote === "USD" ? price : p.base === "USD" ? 1 : (rates[p.base] ? 1 / rates[p.base] : 1),
          changePct,
          high: price + spread * 12,
          low: price - spread * 12,
          spreadPips: p.spreadPips,
          extraLabel: "Est. Spread",
          extraVal: `${p.spreadPips.toFixed(1)} pips`,
          source: latest.source || "ECB FX",
        });
      }
      return true;
    } catch {
      for (const p of FX_PAIRS) {
        const pip = p.quote === "JPY" ? 0.01 : 0.0001;
        upsertAsset({
          key: `forex:${p.base}_${p.quote}`,
          symbol: `${p.base}/${p.quote}`,
          base: p.base,
          quote: p.quote,
          name: p.name,
          category: "forex",
          price: p.fallback,
          usdPerUnit: p.quote === "USD" ? p.fallback : 1,
          changePct: 0.12,
          high: p.fallback + pip * 25,
          low: p.fallback - pip * 25,
          spreadPips: p.spreadPips,
          extraLabel: "Est. Spread",
          extraVal: `${p.spreadPips.toFixed(1)} pips`,
          source: "FX Fallback",
        });
      }
      return false;
    }
  }

  async function loadStocksFeed() {
    try {
      if (!IS_LOCAL_SERVER) throw new Error("Static GitHub Pages host");
      const data = await apiGet("/api/stocks/quotes");
      for (const q of data.quotes || []) {
        const isMining = MINING_STOCK_SYMS.has(q.symbol);
        upsertAsset({
          key: `stocks:${q.symbol}`,
          symbol: q.symbol,
          name: q.name,
          sector: q.sector,
          category: "stocks",
          isMiningRelated: isMining,
          price: q.price,
          changePct: q.changePct ?? 0,
          high: q.high ?? q.price,
          low: q.low ?? q.price,
          extraLabel: "Sector",
          extraVal: q.sector || "Equity",
          source: q.source || "Stocks",
        });
      }
      return true;
    } catch {
      const minuteBucket = Math.floor(Date.now() / 60_000);
      for (const q of FALLBACK_STOCKS) {
        const isMining = MINING_STOCK_SYMS.has(q.symbol);
        const wave = Math.sin((minuteBucket + q.symbol.charCodeAt(0)) / 12) * 0.008;
        const price = Number((q.price * (1 + wave)).toFixed(2));
        upsertAsset({
          key: `stocks:${q.symbol}`,
          symbol: q.symbol,
          name: q.name,
          sector: q.sector,
          category: "stocks",
          isMiningRelated: isMining,
          price,
          changePct: Number((q.changePct + wave * 100).toFixed(2)),
          high: Number((price * 1.012).toFixed(2)),
          low: Number((price * 0.988).toFixed(2)),
          extraLabel: "Sector",
          extraVal: q.sector || "Equity",
          source: "Simulated",
        });
      }
      return false;
    }
  }

  // Live Coinbase WebSocket for instant crypto ticks
  function connectCoinbaseWs() {
    try {
      if (ws) ws.close();
      ws = new WebSocket("wss://ws-feed.exchange.coinbase.com");
      const products = ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD", "DOGE-USD", "LTC-USD", "ADA-USD", "LINK-USD", "AVAX-USD"];
      const symToId = { BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "ripple", DOGE: "dogecoin", LTC: "litecoin", ADA: "cardano", LINK: "chainlink", AVAX: "avalanche-2" };
      ws.addEventListener("open", () => {
        ws.send(JSON.stringify({ type: "subscribe", product_ids: products, channels: ["ticker"] }));
      });
      ws.addEventListener("message", (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type !== "ticker" || !msg.price) return;
        const price = Number(msg.price);
        if (!(price > 0)) return;
        wsPrices.set(msg.product_id, price);
        const sym = msg.product_id.split("-")[0];
        const key = `crypto:${symToId[sym]}`;
        const a = assets.get(key);
        if (!a) return;
        const old = a.price;
        a.price = price;
        a.source = "Coinbase WS";
        if (msg.open_24h) a.changePct = ((price - Number(msg.open_24h)) / Number(msg.open_24h)) * 100;
        if (msg.high_24h) a.high = Number(msg.high_24h);
        if (msg.low_24h) a.low = Number(msg.low_24h);
        if (key === selectedKey) {
          const el = $("et-sel-price");
          el.textContent = fmtPrice(a);
          el.classList.remove("flash-up", "flash-down");
          if (old && price !== old) {
            void el.offsetWidth;
            el.classList.add(price > old ? "flash-up" : "flash-down");
          }
          updateTicketPreview();
        }
        evaluatePendingOrders();
        updateHeaderWallet();
      });
    } catch {
      // WebSocket optional
    }
  }

  // Price in USD for 1 unit of an asset
  function unitUsdPrice(asset) {
    if (!asset) return 0;
    if (asset.category === "forex") return asset.usdPerUnit || asset.price || 1;
    return asset.price || 0;
  }

  // ---------- Portfolio Math ----------
  function computeTotals() {
    let holdingsVal = 0;
    let costBasis = 0;
    let cryptoVal = 0;
    let forexVal = 0;
    let stocksVal = 0;

    for (const pos of Object.values(state.positions)) {
      if (!(pos.qty > 1e-10)) continue;
      const a = assets.get(pos.key);
      const liveP = a ? unitUsdPrice(a) : pos.avgPrice;
      const val = pos.qty * liveP;
      holdingsVal += val;
      costBasis += pos.qty * pos.avgPrice;
      if (pos.category === "crypto") cryptoVal += val;
      else if (pos.category === "forex") forexVal += val;
      else stocksVal += val;
    }

    let rigsVal = 0;
    for (const rig of RIG_CATALOG) {
      rigsVal += (state.rigs[rig.id] || 0) * rig.cost;
    }
    const unclaimedUsd = Object.values(state.unclaimedByCoin).reduce((s, v) => s + v, 0);
    const equity = state.cash + holdingsVal + rigsVal + unclaimedUsd;
    const baseline = state.initialCash + (state.importedUsdTotal || 0);
    const totalPnl = equity - baseline;
    const totalPnlPct = baseline > 0 ? (totalPnl / baseline) * 100 : 0;

    return { equity, cash: state.cash, holdingsVal, costBasis, rigsVal, unclaimedUsd, totalPnl, totalPnlPct, cryptoVal, forexVal, stocksVal };
  }

  function updateHeaderWallet() {
    const t = computeTotals();
    $("et-equity").textContent = fmtUsd(t.equity);
    $("et-cash").textContent = fmtUsd(t.cash);
    const pnlEl = $("et-pnl");
    pnlEl.textContent = `${t.totalPnl >= 0 ? "+" : ""}${fmtUsd(t.totalPnl)} (${fmtPct(t.totalPnlPct)})`;
    pnlEl.className = `v fx-mono ${t.totalPnl >= 0 ? "up" : "down"}`;
  }

  // ---------- Watchlist Rendering ----------
  function filteredAssets() {
    const q = searchQuery.trim().toLowerCase();
    return [...assets.values()].filter((a) => {
      if (activeCategory === "mining") {
        if (!a.isMiningRelated) return false;
      } else if (activeCategory !== "all" && a.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.category.includes(q);
    });
  }

  function renderWatchlist() {
    const list = filteredAssets();
    $("et-asset-count").textContent = list.length;
    const container = $("et-market-list");
    if (!list.length) {
      container.innerHTML = `<div class="muted small-text" style="padding:1rem;text-align:center">No markets match "${escapeHtml(searchQuery)}".</div>`;
      return;
    }
    container.innerHTML = list
      .map((a) => {
        const up = (a.changePct ?? 0) >= 0;
        const badgeCls = a.isMiningRelated && activeCategory === "mining" ? "mining" : a.category;
        const badgeTxt = a.isMiningRelated && activeCategory === "mining" ? "MINE" : a.category.toUpperCase();
        const iconHtml = a.image
          ? `<img src="${escapeHtml(a.image)}" alt="" />`
          : escapeHtml(a.symbol.slice(0, 3));
        return `
          <div class="et-asset-row ${a.key === selectedKey ? "active" : ""}" data-key="${escapeHtml(a.key)}">
            <div class="et-asset-left">
              <div class="et-asset-icon ${badgeCls}">${iconHtml}</div>
              <div class="et-asset-title">
                <span class="et-asset-sym">${escapeHtml(a.symbol)} <span class="et-badge ${badgeCls}">${badgeTxt}</span></span>
                <span class="et-asset-name">${escapeHtml(a.name)}</span>
              </div>
            </div>
            <div class="et-asset-right">
              <div class="et-asset-price">${fmtPrice(a)}</div>
              <div class="et-asset-chg ${up ? "up" : "down"}">${fmtPct(a.changePct)}</div>
            </div>
          </div>`;
      })
      .join("");
  }

  // ---------- Selected Asset Hero & Chart ----------
  function renderHero() {
    const a = assets.get(selectedKey);
    if (!a) return;
    const badge = $("et-sel-badge");
    badge.className = `et-badge ${a.category}`;
    badge.textContent = a.category.toUpperCase();
    $("et-sel-symbol").textContent = a.symbol;
    $("et-sel-name").textContent = a.name;
    $("et-sel-source").textContent = a.source || "Live";
    $("et-sel-price").textContent = fmtPrice(a);

    const chg = a.changePct ?? 0;
    const chgEl = $("et-sel-change");
    chgEl.textContent = `${fmtPct(chg)} (24h/1D)`;
    chgEl.className = `small-text fx-mono ${chg >= 0 ? "up" : "down"}`;

    $("et-sel-high").textContent = fmtPrice(a, a.high);
    $("et-sel-low").textContent = fmtPrice(a, a.low);
    $("et-sel-extra-label").textContent = a.extraLabel || "Market Info";
    $("et-sel-extra").textContent = a.extraVal || "—";

    const pos = state.positions[a.key];
    const qty = pos?.qty || 0;
    const posVal = qty * unitUsdPrice(a);
    $("et-sel-holding").textContent = `Owned: ${fmtQty(qty)} ${a.symbol}`;
    $("et-sel-posval").textContent = fmtUsd(posVal);

    // Simple beginner-friendly market pulse
    const sigEl = $("et-sel-signal");
    if (chg >= 3) {
      sigEl.textContent = "Pulse: Strong Momentum ↑";
      sigEl.className = "lean bull";
    } else if (chg >= 0.4) {
      sigEl.textContent = "Pulse: Bullish Trend";
      sigEl.className = "lean bull";
    } else if (chg <= -3) {
      sigEl.textContent = "Pulse: Dip Opportunity / Bearish ↓";
      sigEl.className = "lean bear";
    } else if (chg <= -0.4) {
      sigEl.textContent = "Pulse: Mild Pullback";
      sigEl.className = "lean bear";
    } else {
      sigEl.textContent = "Pulse: Sideways / Calm";
      sigEl.className = "lean neutral";
    }

    updateTicketPreview();
  }

  function synthChartPoints(basePrice, range) {
    const days = range === "1d" ? 1 : range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const n = 48;
    const now = Date.now();
    const step = (days * 86400_000) / n;
    const pts = [];
    let p = basePrice * 0.96;
    for (let i = n; i >= 0; i--) {
      const wave = Math.sin(i / 4) * 0.008 + Math.cos(i / 7) * 0.005;
      p = i === 0 ? basePrice : Math.max(basePrice * 0.7, p * (1 + wave));
      pts.push([now - i * step, p]);
    }
    return pts;
  }

  async function loadChart() {
    const a = assets.get(selectedKey);
    if (!a) return;
    $("et-chart-status").textContent = "Loading chart…";
    try {
      let pts = [];
      if (a.category === "crypto") {
        const days = chartRange === "1d" ? 1 : chartRange === "7d" ? 7 : chartRange === "90d" ? 90 : 30;
        const base = IS_LOCAL_SERVER ? "/api/cg" : "https://api.coingecko.com/api/v3";
        const data = await apiGet(`${base}/coins/${encodeURIComponent(a.id)}/market_chart?vs_currency=usd&days=${days}`);
        pts = data.prices || [];
      } else if (a.category === "forex") {
        const days = chartRange === "1d" ? 7 : chartRange === "7d" ? 14 : chartRange === "90d" ? 90 : 30;
        if (IS_LOCAL_SERVER) {
          const data = await apiGet(`/api/fx/history?base=${a.base}&quote=${a.quote}&days=${days}`);
          pts = data.points || [];
        } else {
          const start = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
          const data = await apiGet(`https://api.frankfurter.app/${start}..?from=${a.base}&to=${a.quote}`);
          pts = Object.entries(data.rates || {}).map(([d, o]) => [Date.parse(`${d}T16:00:00Z`), o[a.quote]]).filter(([, v]) => typeof v === "number");
        }
      } else if (a.category === "stocks" && IS_LOCAL_SERVER) {
        const data = await apiGet(`/api/stocks/history?symbol=${encodeURIComponent(a.symbol)}&range=${chartRange}`);
        pts = data.points || [];
      }
      chartPoints = pts.length >= 2 ? pts : synthChartPoints(a.price, chartRange);
      $("et-chart-status").textContent = `${a.symbol} · ${chartRange.toUpperCase()} (${chartPoints.length} pts)`;
    } catch {
      chartPoints = synthChartPoints(a.price, chartRange);
      $("et-chart-status").textContent = `${a.symbol} · ${chartRange.toUpperCase()} (estimated curve)`;
    }
    drawChart();
  }

  function drawChart(hoverIdx = -1) {
    const canvas = $("et-chart");
    const a = assets.get(selectedKey);
    if (!canvas || !a) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 600;
    const h = canvas.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (chartPoints.length < 2) {
      ctx.fillStyle = "#8b949e";
      ctx.font = "13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No chart data yet", w / 2, h / 2);
      return;
    }

    const pad = { l: 10, r: 74, t: 16, b: 24 };
    const vals = chartPoints.map((p) => p[1]);
    let min = Math.min(...vals);
    let max = Math.max(...vals);
    if (min === max) { min *= 0.99; max *= 1.01; }
    const span = max - min;
    min -= span * 0.06;
    max += span * 0.06;

    const x = (i) => pad.l + (i / (chartPoints.length - 1)) * (w - pad.l - pad.r);
    const y = (v) => pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b);

    const isUp = vals[vals.length - 1] >= vals[0];
    const stroke = isUp ? "#3fb950" : "#f85149";

    // Gridlines
    ctx.font = "11px ui-monospace, monospace";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
      const v = min + ((max - min) * i) / 4;
      const py = y(v);
      ctx.strokeStyle = "#21262d";
      ctx.beginPath();
      ctx.moveTo(pad.l, py);
      ctx.lineTo(w - pad.r, py);
      ctx.stroke();
      ctx.fillStyle = "#8b949e";
      ctx.textAlign = "left";
      ctx.fillText(fmtPrice(a, v), w - pad.r + 6, py);
    }

    // Area gradient
    const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
    grad.addColorStop(0, isUp ? "rgba(63,185,80,0.32)" : "rgba(248,81,73,0.32)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    chartPoints.forEach((p, i) => (i === 0 ? ctx.moveTo(x(i), y(p[1])) : ctx.lineTo(x(i), y(p[1]))));
    ctx.lineTo(x(chartPoints.length - 1), h - pad.b);
    ctx.lineTo(x(0), h - pad.b);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    chartPoints.forEach((p, i) => (i === 0 ? ctx.moveTo(x(i), y(p[1])) : ctx.lineTo(x(i), y(p[1]))));
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Hover crosshair
    if (hoverIdx >= 0 && hoverIdx < chartPoints.length) {
      const hx = x(hoverIdx);
      const hy = y(chartPoints[hoverIdx][1]);
      ctx.strokeStyle = "rgba(230,237,243,0.35)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(hx, pad.t);
      ctx.lineTo(hx, h - pad.b);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = stroke;
      ctx.beginPath();
      ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------- 1-Click Trade Ticket & Quick Swap ----------
  function updateTicketPreview() {
    const a = assets.get(selectedKey);
    if (!a) return;
    const priceUsd = unitUsdPrice(a);
    const pos = state.positions[a.key];
    const ownedQty = pos?.qty || 0;

    $("et-sum-asset").textContent = `${a.symbol} (${a.category.toUpperCase()})`;
    $("et-est-price").textContent = fmtPrice(a);

    const execMode = $("et-exec-mode").value;
    const isLive = execMode.startsWith("live-");
    const orderType = $("et-order-type").value;
    const limitP = Number($("et-limit-price").value);
    const effPrice = orderType === "limit" && limitP > 0 ? limitP : priceUsd;

    const raw = Number($("et-amount").value) || 0;
    const qty = inputMode === "usd" ? (effPrice > 0 ? raw / effPrice : 0) : raw;
    const totalUsd = inputMode === "usd" ? raw : raw * effPrice;

    $("et-amount-label").textContent = inputMode === "usd" ? "Amount in USD" : `Quantity in ${a.symbol}`;
    $("et-amount-unit").textContent = inputMode === "usd" ? "USD" : a.symbol;
    $("et-input-mode-btn").textContent = inputMode === "usd" ? `Switch to ${a.symbol}` : "Switch to USD";

    const spreadFee = a.category === "forex" ? totalUsd * 0.0002 : 0;
    $("et-est-qty").textContent = `${fmtQty(qty)} ${a.symbol}`;
    $("et-est-fee").textContent = isLive ? "Exchange fee" : spreadFee > 0 ? `${fmtUsd(spreadFee)} (FX spread)` : "$0.00 (0% Paper)";
    $("et-total-label").textContent = ticketSide === "buy" ? "Total Cost" : "Est. Proceeds";
    $("et-est-total").textContent = fmtUsd(ticketSide === "buy" ? totalUsd + spreadFee : Math.max(0, totalUsd - spreadFee));

    if (ticketSide === "buy") {
      $("et-avail-label").textContent = "Available Cash";
      $("et-avail-val").textContent = fmtUsd(state.cash);
    } else {
      $("et-avail-label").textContent = `Owned ${a.symbol}`;
      $("et-avail-val").textContent = `${fmtQty(ownedQty)} (${fmtUsd(ownedQty * priceUsd)})`;
    }

    const btn = $("et-submit-btn");
    btn.className = `et-cta ${ticketSide}`;
    const modeTag = isLive ? " (LIVE)" : orderType === "limit" ? " (Limit)" : " Now";
    btn.textContent = `${ticketSide === "buy" ? "Buy" : "Sell"} ${a.symbol}${modeTag}`;

    renderSwapPreview();
  }

  function recordHistory(entry) {
    state.history.unshift({
      id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      time: new Date().toISOString(),
      ...entry,
    });
    if (state.history.length > 300) state.history.length = 300;
  }

  function applyBuy(asset, qty, execPrice, note = "Easy Trade Market") {
    const cost = qty * execPrice;
    if (!(qty > 0) || cost > state.cash + 1e-6) {
      throw new Error(`Insufficient cash. Need ${fmtUsd(cost)}, available ${fmtUsd(state.cash)}.`);
    }
    state.cash = Math.max(0, state.cash - cost);
    const prev = state.positions[asset.key];
    if (prev && prev.qty > 0) {
      const newQty = prev.qty + qty;
      prev.avgPrice = (prev.qty * prev.avgPrice + cost) / newQty;
      prev.qty = newQty;
    } else {
      state.positions[asset.key] = {
        key: asset.key,
        symbol: asset.symbol,
        name: asset.name,
        category: asset.category,
        qty,
        avgPrice: execPrice,
      };
    }
    recordHistory({ type: "buy", key: asset.key, symbol: asset.symbol, category: asset.category, qty, price: execPrice, valueUsd: cost, note });
  }

  function applySell(asset, qty, execPrice, note = "Easy Trade Market") {
    const pos = state.positions[asset.key];
    if (!pos || pos.qty < qty - 1e-8) {
      throw new Error(`Not enough ${asset.symbol} to sell.`);
    }
    const sellQty = Math.min(qty, pos.qty);
    const proceeds = sellQty * execPrice;
    const pnl = (execPrice - pos.avgPrice) * sellQty;
    state.cash += proceeds;
    state.realizedPnl += pnl;
    pos.qty -= sellQty;
    if (pos.qty <= 1e-9) delete state.positions[asset.key];
    recordHistory({
      type: "sell",
      key: asset.key,
      symbol: asset.symbol,
      category: asset.category,
      qty: sellQty,
      price: execPrice,
      valueUsd: proceeds,
      note: `${note} (${pnl >= 0 ? "+" : ""}${fmtUsd(pnl)} P&L)`,
    });
    return { proceeds, pnl };
  }

  async function submitTrade() {
    const a = assets.get(selectedKey);
    if (!a) return;
    const msgEl = $("et-ticket-msg");
    msgEl.textContent = "";

    const execMode = $("et-exec-mode").value;
    const orderType = $("et-order-type").value;
    const limitP = Number($("et-limit-price").value);
    const slPct = Number($("et-sl-pct").value) || 0;
    const tpPct = Number($("et-tp-pct").value) || 0;
    const raw = Number($("et-amount").value) || 0;

    if (!(raw > 0)) {
      msgEl.textContent = "Enter an amount greater than 0.";
      return;
    }

    const livePrice = unitUsdPrice(a);
    const effPrice = orderType === "limit" && limitP > 0 ? limitP : livePrice;
    const qty = inputMode === "usd" ? raw / effPrice : raw;

    // Optional live crypto order routing
    if (execMode.startsWith("live-")) {
      if (a.category !== "crypto") {
        msgEl.textContent = "Live exchange routing supports Crypto assets only. Switch to Paper for Forex/Stocks.";
        return;
      }
      const exchange = execMode.replace("live-", "");
      const estUsd = qty * effPrice;
      const ok = confirm(`Place REAL ${ticketSide.toUpperCase()} order on ${exchange}?\n\n${fmtQty(qty)} ${a.symbol} ≈ ${fmtUsd(estUsd)}\nType: ${orderType}`);
      if (!ok) return;
      try {
        const res = await apiPost("/api/trade/order", {
          exchange,
          symbol: a.symbol,
          coinId: a.id,
          side: ticketSide,
          type: orderType,
          amount: qty,
          limitPrice: orderType === "limit" ? limitP : undefined,
          confirm: true,
        });
        recordHistory({ type: ticketSide, key: a.key, symbol: a.symbol, category: a.category, qty, price: res.usdPrice || effPrice, valueUsd: res.notional || estUsd, note: `LIVE ${exchange} #${res.orderId}` });
        saveState();
        toast(`LIVE ${ticketSide.toUpperCase()} submitted on ${exchange} (#${res.orderId})`, "up");
        renderAllPortfolio();
      } catch (err) {
        msgEl.textContent = err.message;
        toast(err.message, "down");
      }
      return;
    }

    // Paper Limit Order
    if (orderType === "limit") {
      if (!(limitP > 0)) {
        msgEl.textContent = "Enter a valid Limit Price.";
        return;
      }
      state.orders.push({
        id: `ord_${Date.now()}`,
        key: a.key,
        symbol: a.symbol,
        category: a.category,
        kind: "limit",
        side: ticketSide,
        targetPrice: limitP,
        qty,
        usd: qty * limitP,
        createdAt: new Date().toISOString(),
      });
      saveState();
      toast(`Limit ${ticketSide.toUpperCase()} set for ${fmtQty(qty)} ${a.symbol} @ ${fmtPrice(a, limitP)}`, "up");
      renderAllPortfolio();
      return;
    }

    // Instant Paper Market Order
    try {
      if (ticketSide === "buy") {
        applyBuy(a, qty, livePrice, "Easy Trade Instant");
        if (slPct > 0) {
          state.orders.push({
            id: `sl_${Date.now()}`,
            key: a.key,
            symbol: a.symbol,
            category: a.category,
            kind: "sl",
            side: "sell",
            targetPrice: livePrice * (1 - slPct / 100),
            qty,
            usd: qty * livePrice * (1 - slPct / 100),
            createdAt: new Date().toISOString(),
          });
        }
        if (tpPct > 0) {
          state.orders.push({
            id: `tp_${Date.now() + 1}`,
            key: a.key,
            symbol: a.symbol,
            category: a.category,
            kind: "tp",
            side: "sell",
            targetPrice: livePrice * (1 + tpPct / 100),
            qty,
            usd: qty * livePrice * (1 + tpPct / 100),
            createdAt: new Date().toISOString(),
          });
        }
        toast(`Bought ${fmtQty(qty)} ${a.symbol} for ${fmtUsd(qty * livePrice)}`, "up");
      } else {
        const { proceeds, pnl } = applySell(a, qty, livePrice, "Easy Trade Instant");
        toast(`Sold ${fmtQty(qty)} ${a.symbol} for ${fmtUsd(proceeds)} (${pnl >= 0 ? "+" : ""}${fmtUsd(pnl)})`, pnl >= 0 ? "up" : "down");
      }
      saveState();
      renderHero();
      renderAllPortfolio();
      populateSwapSelectors();
    } catch (err) {
      msgEl.textContent = err.message;
      toast(err.message, "down");
    }
  }

  // Evaluate Limit / Stop-Loss / Take-Profit triggers against live prices
  function evaluatePendingOrders() {
    if (!state.orders.length) return;
    let changed = false;
    const remaining = [];
    for (const o of state.orders) {
      const a = assets.get(o.key);
      if (!a) { remaining.push(o); continue; }
      const p = unitUsdPrice(a);
      const hit =
        (o.kind === "limit" && o.side === "buy" && p <= o.targetPrice) ||
        (o.kind === "limit" && o.side === "sell" && p >= o.targetPrice) ||
        (o.kind === "sl" && p <= o.targetPrice) ||
        (o.kind === "tp" && p >= o.targetPrice);
      if (!hit) {
        remaining.push(o);
        continue;
      }
      try {
        if (o.side === "buy") {
          applyBuy(a, o.qty, p, `Triggered ${o.kind.toUpperCase()}`);
          toast(`${o.kind.toUpperCase()} Buy filled: ${fmtQty(o.qty)} ${a.symbol} @ ${fmtPrice(a, p)}`, "up");
        } else {
          const pos = state.positions[a.key];
          if (pos && pos.qty > 0) {
            const q = Math.min(o.qty, pos.qty);
            applySell(a, q, p, `Triggered ${o.kind.toUpperCase()}`);
            toast(`${o.kind.toUpperCase()} Sell filled: ${fmtQty(q)} ${a.symbol} @ ${fmtPrice(a, p)}`, o.kind === "tp" ? "up" : "down");
          }
        }
        changed = true;
      } catch {
        remaining.push(o);
      }
    }
    if (changed) {
      state.orders = remaining;
      saveState();
      renderHero();
      renderAllPortfolio();
    }
  }

  // ---------- Quick Swap ----------
  function populateSwapSelectors() {
    const fromSel = $("et-swap-from");
    const toSel = $("et-swap-to");
    const prevFrom = fromSel.value || "USD";
    const prevTo = toSel.value || selectedKey || "crypto:bitcoin";

    const fromOpts = [`<option value="USD">USD (${fmtUsd(state.cash)})</option>`];
    for (const pos of Object.values(state.positions)) {
      if (pos.qty > 1e-9) {
        fromOpts.push(`<option value="${escapeHtml(pos.key)}">${escapeHtml(pos.symbol)} (${fmtQty(pos.qty)})</option>`);
      }
    }
    fromSel.innerHTML = fromOpts.join("");
    if ([...fromSel.options].some((o) => o.value === prevFrom)) fromSel.value = prevFrom;

    const toOpts = [`<option value="USD">USD Cash</option>`];
    for (const a of assets.values()) {
      toOpts.push(`<option value="${escapeHtml(a.key)}">${escapeHtml(a.symbol)} · ${a.category.toUpperCase()}</option>`);
    }
    toSel.innerHTML = toOpts.join("");
    if ([...toSel.options].some((o) => o.value === prevTo)) toSel.value = prevTo;
    else if (toSel.options.length > 1) toSel.selectedIndex = 1;

    renderSwapPreview();
  }

  function renderSwapPreview() {
    const fromKey = $("et-swap-from").value;
    const toKey = $("et-swap-to").value;
    const amt = Number($("et-swap-from-amt").value) || 0;
    const fromPrice = fromKey === "USD" ? 1 : unitUsdPrice(assets.get(fromKey));
    const toPrice = toKey === "USD" ? 1 : unitUsdPrice(assets.get(toKey));
    const usdVal = amt * fromPrice;
    const outQty = toPrice > 0 ? usdVal / toPrice : 0;
    const fromSym = fromKey === "USD" ? "USD" : assets.get(fromKey)?.symbol || fromKey;
    const toSym = toKey === "USD" ? "USD" : assets.get(toKey)?.symbol || toKey;
    $("et-swap-to-est").value = outQty > 0 ? `${fmtQty(outQty)} ${toSym}` : "0.00";
    $("et-swap-rate").textContent = fromPrice > 0 && toPrice > 0 ? `1 ${fromSym} ≈ ${fmtQty(fromPrice / toPrice)} ${toSym}` : "—";
  }

  function executeSwap() {
    const fromKey = $("et-swap-from").value;
    const toKey = $("et-swap-to").value;
    const amt = Number($("et-swap-from-amt").value) || 0;
    if (fromKey === toKey) return toast("Pick two different assets to swap.", "down");
    if (!(amt > 0)) return toast("Enter a swap amount.", "down");

    try {
      let usdValue = 0;
      if (fromKey === "USD") {
        if (amt > state.cash + 1e-6) throw new Error("Insufficient USD cash.");
        usdValue = amt;
      } else {
        const fromAsset = assets.get(fromKey);
        const { proceeds } = applySell(fromAsset, amt, unitUsdPrice(fromAsset), "Quick Swap Out");
        usdValue = proceeds;
      }

      if (toKey !== "USD") {
        const toAsset = assets.get(toKey);
        const toPrice = unitUsdPrice(toAsset);
        const toQty = usdValue / toPrice;
        applyBuy(toAsset, toQty, toPrice, "Quick Swap In");
        toast(`Swapped into ${fmtQty(toQty)} ${toAsset.symbol} (${fmtUsd(usdValue)})`, "up");
      } else {
        toast(`Converted to ${fmtUsd(usdValue)} USD cash`, "up");
      }
      saveState();
      renderHero();
      renderAllPortfolio();
      populateSwapSelectors();
    } catch (err) {
      toast(err.message, "down");
    }
  }

  // ---------- Mining Hub (Hardware XMRig + Instant Virtual Rigs) ----------
  function renderRigShop() {
    $("et-rig-shop").innerHTML = RIG_CATALOG.map((rig) => {
      const count = state.rigs[rig.id] || 0;
      return `
        <div class="et-rig-card">
          <div class="et-rig-head">
            <span>${escapeHtml(rig.name)}</span>
            <span class="et-badge mining">${rig.coinSym}</span>
          </div>
          <div class="et-rig-meta">${escapeHtml(rig.desc)}</div>
          <div class="et-rig-meta fx-mono">${rig.hashLabel} · ~${fmtUsd(rig.dailyUsd)}/day</div>
          <div class="et-rig-footer">
            <strong class="fx-mono">${fmtUsd(rig.cost, 0)}</strong>
            <button type="button" class="et-quick-buy-btn" data-buy-rig="${rig.id}">Deploy ${count ? `(${count})` : ""}</button>
          </div>
        </div>`;
    }).join("");

    const owned = RIG_CATALOG.filter((r) => (state.rigs[r.id] || 0) > 0);
    if (!owned.length) {
      $("et-owned-rigs").innerHTML = "No virtual rigs deployed yet — deploy one above using paper USD to start earning live crypto yield.";
    } else {
      $("et-owned-rigs").innerHTML = owned
        .map((r) => {
          const n = state.rigs[r.id];
          return `<span class="pill up" style="margin-right:0.4rem;display:inline-flex;align-items:center;gap:0.35rem">${n}× ${escapeHtml(r.name)} (${fmtUsd(r.dailyUsd * n)}/d) <button type="button" data-sell-rig="${r.id}" style="padding:0 0.35rem;font-size:0.7rem;border-color:var(--down);color:var(--down)">Sell 85%</button></span>`;
        })
        .join("");
    }
    updateMiningStatsUi();
  }

  function tickVirtualMining() {
    const now = Date.now();
    const dtSec = Math.min((now - (state.lastRigTick || now)) / 1000, 86400);
    state.lastRigTick = now;
    if (dtSec <= 0) return;

    let added = 0;
    for (const rig of RIG_CATALOG) {
      const n = state.rigs[rig.id] || 0;
      if (!n) continue;
      // 60x demo time-acceleration on virtual paper rigs so user sees live yield tick smoothly
      const earnedUsd = (rig.dailyUsd * n * dtSec * 60) / 86400;
      state.unclaimedByCoin[rig.coinKey] = (state.unclaimedByCoin[rig.coinKey] || 0) + earnedUsd;
      added += earnedUsd;
    }

    if (added > 0 && state.autoSellMining) {
      const total = Object.values(state.unclaimedByCoin).reduce((s, v) => s + v, 0);
      if (total >= 1.0) harvestMining(true);
    }
    updateMiningStatsUi();
    updateHeaderWallet();
  }

  function updateMiningStatsUi() {
    let totalHash = 0;
    let totalDaily = 0;
    for (const rig of RIG_CATALOG) {
      const n = state.rigs[rig.id] || 0;
      totalHash += rig.hashrate * n;
      totalDaily += rig.dailyUsd * n;
    }
    const unclaimed = Object.values(state.unclaimedByCoin).reduce((s, v) => s + v, 0);
    $("et-sim-hashrate").textContent = fmtHashrate(totalHash);
    $("et-sim-daily").textContent = `Est. ${fmtUsd(totalDaily)} / day`;
    $("et-sim-unclaimed").textContent = `Unclaimed: $${unclaimed.toFixed(4)}`;
    $("et-sim-harvest-btn").textContent = `Harvest ${fmtUsd(unclaimed)}`;
    $("et-sim-autosell").checked = Boolean(state.autoSellMining);
  }

  function harvestMining(silent = false) {
    const entries = Object.entries(state.unclaimedByCoin).filter(([, usd]) => usd > 0.0001);
    if (!entries.length) {
      if (!silent) toast("Nothing to harvest yet — deploy a rig first.", "down");
      return;
    }
    let totalHarvested = 0;
    for (const [coinKey, usd] of entries) {
      totalHarvested += usd;
      if (state.autoSellMining) {
        state.cash += usd;
        recordHistory({ type: "mining", key: "USD", symbol: "USD", category: "mining", qty: usd, price: 1, valueUsd: usd, note: "Auto-converted mining yield" });
      } else {
        const a = assets.get(coinKey) || { key: coinKey, symbol: coinKey.split(":")[1].toUpperCase(), name: coinKey, category: "crypto", price: 100 };
        const p = unitUsdPrice(a) || 1;
        const qty = usd / p;
        const prev = state.positions[a.key];
        if (prev && prev.qty > 0) {
          const newQty = prev.qty + qty;
          prev.avgPrice = (prev.qty * prev.avgPrice) / newQty; // mined coins have $0 cost basis
          prev.qty = newQty;
        } else {
          state.positions[a.key] = { key: a.key, symbol: a.symbol, name: a.name, category: "crypto", qty, avgPrice: 0 };
        }
        recordHistory({ type: "mining", key: a.key, symbol: a.symbol, category: "mining", qty, price: p, valueUsd: usd, note: "Virtual rig harvest" });
      }
      state.unclaimedByCoin[coinKey] = 0;
    }
    saveState();
    updateMiningStatsUi();
    renderHero();
    renderAllPortfolio();
    populateSwapSelectors();
    if (!silent) toast(`Harvested ${fmtUsd(totalHarvested)} in mining yield!`, "up");
  }

  // Real Local XMRig Miner Control
  async function pollHardwareMiner() {
    if (!IS_LOCAL_SERVER) {
      $("et-hw-pill").textContent = "luna.eu Cloud Mode";
      $("et-hw-pill").className = "pill up";
      $("et-hw-msg").textContent = `Running on ${LUNA_ORIGIN} — Virtual Rigs are live. Run local agy server to control local XMRig CPU mining.`;
      $("et-hw-toggle").disabled = true;
      return;
    }
    try {
      const [st, pool] = await Promise.all([
        apiGet("/api/miner/status"),
        apiGet("/api/miner/pool").catch(() => ({ supported: false })),
      ]);
      hwStatus = st;
      const running = st.running;
      $("et-hw-pill").textContent = running ? "Mining Live" : st.configured ? "Ready" : "Setup Needed";
      $("et-hw-pill").className = `pill ${running ? "up" : st.configured ? "" : "down"}`;
      $("et-hw-msg").textContent = !st.configured
        ? st.problems.join(" · ")
        : running
          ? `Mining XMR (${st.cpuPercent}% CPU) on ${st.pool}`
          : `Ready to mine real Monero (XMR) on ${st.pool}`;
      const hr = st.summary?.hashrate?.[0];
      $("et-hw-hr").textContent = running && hr != null ? fmtHashrate(hr) : "0 H/s";
      $("et-hw-pending").textContent = pool.supported && pool.pending != null ? `Pending: ${pool.pending.toFixed(6)} XMR` : "";
      const btn = $("et-hw-toggle");
      btn.textContent = running ? "Stop XMRig" : "Start XMRig";
      btn.classList.toggle("running", running);
      btn.disabled = !st.configured && !running;
    } catch {
      $("et-hw-pill").textContent = "Server Offline";
      $("et-hw-msg").textContent = "Run server.js locally to control XMRig.";
    }
  }

  // ---------- Portfolio, Orders, History & Allocation ----------
  function renderAllPortfolio() {
    updateHeaderWallet();
    const posList = Object.values(state.positions).filter((p) => p.qty > 1e-9);
    $("et-pos-count").textContent = posList.length;
    $("et-positions-empty").hidden = posList.length > 0;
    $("et-positions-body").innerHTML = posList
      .map((pos) => {
        const a = assets.get(pos.key);
        const liveP = a ? unitUsdPrice(a) : pos.avgPrice;
        const val = pos.qty * liveP;
        const pnl = (liveP - pos.avgPrice) * pos.qty;
        const pnlPct = pos.avgPrice > 0 ? ((liveP - pos.avgPrice) / pos.avgPrice) * 100 : 100;
        return `
          <tr>
            <td><strong>${escapeHtml(pos.symbol)}</strong> <span class="muted small-text">${escapeHtml(pos.name || "")}</span></td>
            <td><span class="et-badge ${pos.category}">${pos.category.toUpperCase()}</span></td>
            <td class="fx-mono">${fmtQty(pos.qty)}</td>
            <td class="fx-mono">${fmtUsd(pos.avgPrice)}</td>
            <td class="fx-mono">${a ? fmtPrice(a) : fmtUsd(liveP)}</td>
            <td class="fx-mono"><strong>${fmtUsd(val)}</strong></td>
            <td class="fx-mono ${pnl >= 0 ? "up" : "down"}">${pnl >= 0 ? "+" : ""}${fmtUsd(pnl)} (${fmtPct(pnlPct)})</td>
            <td>
              <button type="button" class="et-quick-buy-btn" data-select-pos="${escapeHtml(pos.key)}">Trade</button>
              <button type="button" class="et-quick-sell-btn" data-close-pos="${escapeHtml(pos.key)}">Sell All</button>
            </td>
          </tr>`;
      })
      .join("");

    $("et-ord-count").textContent = state.orders.length;
    $("et-orders-empty").hidden = state.orders.length > 0;
    $("et-orders-body").innerHTML = state.orders
      .map((o) => {
        const a = assets.get(o.key);
        const curP = a ? unitUsdPrice(a) : 0;
        return `
          <tr>
            <td><strong>${escapeHtml(o.symbol)}</strong></td>
            <td><span class="pill">${o.kind.toUpperCase()}</span></td>
            <td class="${o.side === "buy" ? "up" : "down"}">${o.side.toUpperCase()}</td>
            <td class="fx-mono">${a ? fmtPrice(a, o.targetPrice) : fmtUsd(o.targetPrice)}</td>
            <td class="fx-mono">${a ? fmtPrice(a) : "—"}</td>
            <td class="fx-mono">${fmtQty(o.qty)} (${fmtUsd(o.usd)})</td>
            <td><button type="button" class="et-quick-sell-btn" data-cancel-ord="${escapeHtml(o.id)}">Cancel</button></td>
          </tr>`;
      })
      .join("");

    $("et-hist-count").textContent = state.history.length;
    $("et-history-empty").hidden = state.history.length > 0;
    $("et-history-body").innerHTML = state.history
      .slice(0, 120)
      .map((h) => {
        const chipCls = h.type === "sell" ? "sell" : h.type === "mining" || h.type === "earnings" ? "mining" : "buy";
        return `
          <tr>
            <td class="muted small-text">${new Date(h.time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
            <td><span class="chip ${chipCls}">${escapeHtml(h.type.toUpperCase())}</span></td>
            <td><strong>${escapeHtml(h.symbol)}</strong></td>
            <td><span class="et-badge ${h.category === "earnings" ? "mining" : h.category}">${escapeHtml(h.category)}</span></td>
            <td class="fx-mono">${fmtQty(h.qty)}</td>
            <td class="fx-mono">${fmtUsd(h.price)}</td>
            <td class="fx-mono">${fmtUsd(h.valueUsd)}</td>
            <td class="muted small-text">${escapeHtml(h.note || "")}</td>
          </tr>`;
      })
      .join("");

    drawAllocation();
  }

  function drawAllocation() {
    const t = computeTotals();
    const slices = [
      { label: "USD Cash", value: t.cash, color: "#8b949e" },
      { label: "Crypto", value: t.cryptoVal, color: "#f7b731" },
      { label: "Forex", value: t.forexVal, color: "#2dd4bf" },
      { label: "Stocks", value: t.stocksVal, color: "#58a6ff" },
      { label: "Mining Rigs & Yield", value: t.rigsVal + t.unclaimedUsd, color: "#3fb950" },
    ].filter((s) => s.value > 0.01);

    const canvas = $("et-alloc-canvas");
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const total = slices.reduce((s, x) => s + x.value, 0) || 1;
    let angle = -Math.PI / 2;
    for (const s of slices) {
      const sweep = (s.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.arc(w / 2, h / 2, Math.min(w, h) / 2 - 8, angle, angle + sweep);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      angle += sweep;
    }
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) / 2 - 42, 0, Math.PI * 2);
    ctx.fillStyle = "#161b22";
    ctx.fill();
    ctx.fillStyle = "#e6edf3";
    ctx.font = "700 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(fmtUsd(t.equity, 0), w / 2, h / 2);

    $("et-alloc-legend").innerHTML = slices
      .map((s) => `<li><i style="background:${s.color}"></i><span>${escapeHtml(s.label)}</span><strong class="fx-mono" style="margin-left:auto">${fmtUsd(s.value)} (${((s.value / total) * 100).toFixed(1)}%)</strong></li>`)
      .join("");

    $("et-perf-stats").innerHTML = `
      <div class="stat"><span class="label">Starting Capital</span><span class="fx-mono">${fmtUsd(state.initialCash)}</span></div>
      <div class="stat"><span class="label">Imported Earnings</span><span class="fx-mono up">+${fmtUsd(state.importedUsdTotal || 0)}</span></div>
      <div class="stat"><span class="label">Realized P&amp;L</span><span class="fx-mono ${state.realizedPnl >= 0 ? "up" : "down"}">${state.realizedPnl >= 0 ? "+" : ""}${fmtUsd(state.realizedPnl)}</span></div>
      <div class="stat"><span class="label">Total Equity</span><span class="fx-mono">${fmtUsd(t.equity)}</span></div>
    `;
  }

  // ---------- Broker Readiness Modal ----------
  async function loadBrokerStatus() {
    if (!IS_LOCAL_SERVER) {
      $("et-mode-pill").textContent = "luna.eu Paper Mode";
      $("et-broker-list").innerHTML = `<div class="et-broker-row"><div><strong>Hosted on luna.eu (Static)</strong><div class="muted small-text">Live Crypto (CoinGecko + Coinbase WS), Live Forex (ECB + ER-API), Stocks, Virtual Mining &amp; Import Earnings are active. Launch via <code>launch-agy.cmd</code> locally to connect .env exchange keys or XMRig.</div></div><span class="pill up">Live</span></div>`;
      return;
    }
    try {
      brokerStatus = await apiGet("/api/easy-trade/status");
      const modePill = $("et-mode-pill");
      if (brokerStatus.liveTradingEnabled) {
        modePill.textContent = "Paper + Live Ready";
        modePill.classList.add("live");
      } else {
        modePill.textContent = "Paper Mode";
        modePill.classList.remove("live");
      }
      const sel = $("et-exec-mode");
      for (const ex of brokerStatus.exchanges || []) {
        const opt = sel.querySelector(`option[value="live-${ex.id}"]`);
        if (opt) opt.disabled = !(brokerStatus.liveTradingEnabled && ex.configured);
      }
      renderBrokerModalList();
    } catch {
      // keep default paper mode
    }
  }

  function renderBrokerModalList() {
    if (!brokerStatus) {
      $("et-broker-list").innerHTML = `<div class="muted small-text">Server status unavailable.</div>`;
      return;
    }
    const rows = [
      ...(brokerStatus.exchanges || []).map((e) => ({
        name: `${e.name} (Crypto)`,
        ok: e.configured && brokerStatus.liveTradingEnabled,
        detail: e.configured ? (brokerStatus.liveTradingEnabled ? `Live enabled (max $${brokerStatus.maxOrderUsd})` : "Keys set · set TRADING_LIVE_ENABLED=true") : "Not configured in .env",
      })),
      {
        name: `OANDA v20 (Forex · ${brokerStatus.oanda?.env || "practice"})`,
        ok: Boolean(brokerStatus.oanda?.configured),
        detail: brokerStatus.oanda?.configured ? "Connected" : "Optional — ECB + ER-API live feed active",
      },
      {
        name: "XMRig Local Miner (Monero)",
        ok: Boolean(brokerStatus.miner?.configured),
        detail: brokerStatus.miner?.running ? "Mining active" : brokerStatus.miner?.configured ? `Ready (${brokerStatus.miner.pool})` : (brokerStatus.miner?.problems?.[0] || "Setup needed"),
      },
    ];
    $("et-broker-list").innerHTML = rows
      .map((r) => `<div class="et-broker-row"><div><strong>${escapeHtml(r.name)}</strong><div class="muted small-text">${escapeHtml(r.detail)}</div></div><span class="pill ${r.ok ? "up" : ""}">${r.ok ? "Ready" : "Paper"}</span></div>`)
      .join("");
  }

  // ---------- IMPORT EARNINGS (Dashboard Sources + CSV/JSON + Manual) ----------
  function readLocal(key, fb = []) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fb;
    } catch {
      return fb;
    }
  }

  async function scanDashboardEarnings() {
    const container = $("et-import-sources");
    container.innerHTML = `<div class="muted small-text">Scanning dashboard sources…</div>`;
    const importedSet = new Set(state.importedIds || []);
    const found = [];

    // 1. Dashboard Ledger mining payouts & transfers_in
    const ledger = readLocal("crypto-dashboard-transactions", []);
    ledger.forEach((t, idx) => {
      if (t.type !== "mining" && t.type !== "transfer_in") return;
      const usd = Number(t.amount || 0) * Number(t.price || 0);
      if (!(usd > 0)) return;
      const token = `ledger:${t.id || `${t.date}:${t.coin}:${t.amount}:${idx}`}`;
      found.push({
        token,
        already: importedSet.has(token),
        source: "Dashboard Ledger",
        label: `${t.type === "mining" ? "Mining payout" : "Transfer in"}: ${fmtQty(t.amount)} ${String(t.coin || "").toUpperCase()}`,
        usd,
        date: t.date || new Date().toISOString(),
        note: t.note || "Imported from Transactions Ledger",
      });
    });

    // 2. Forex Paper realized profits
    const fxHist = readLocal("crypto-dashboard-fx-history", []);
    fxHist.forEach((t, idx) => {
      const pnl = Number(t.pnlUsd || 0);
      if (!(pnl > 0)) return;
      const token = `fx:${t.id || `${t.closedAt || t.openedAt}:${t.pair}:${pnl}:${idx}`}`;
      found.push({
        token,
        already: importedSet.has(token),
        source: "Forex Paper P&L",
        label: `FX ${String(t.side || "").toUpperCase()} ${t.pair} (+${Number(t.pips || 0).toFixed(1)} pips)`,
        usd: pnl,
        date: t.closedAt || t.openedAt || new Date().toISOString(),
        note: "Imported Forex realized profit",
      });
    });

    // 3. Crypto Trading profits (from trading.js history)
    const trades = readLocal("crypto-dashboard-trades", []);
    trades.forEach((t, idx) => {
      if (t.side !== "sell" || !(Number(t.pnl || 0) > 0)) return;
      const pnl = Number(t.pnl);
      const token = `trade:${t.id || `${t.date}:${t.symbol}:${pnl}:${idx}`}`;
      found.push({
        token,
        already: importedSet.has(token),
        source: "Crypto Trading",
        label: `Realized gain on ${t.symbol}`,
        usd: pnl,
        date: t.date || new Date().toISOString(),
        note: "Imported Crypto trading profit",
      });
    });

    // 4. SupportXMR Mining Pool Payouts
    try {
      const pool = await apiGet("/api/miner/pool");
      const xmrPrice = assets.get("crypto:monero")?.price || 185;
      if (pool.supported && Array.isArray(pool.payments)) {
        for (const p of pool.payments) {
          const usd = Number(p.amount || 0) * xmrPrice;
          if (!(usd > 0)) continue;
          const token = `pool:${p.tx || `${p.date}:${p.amount}`}`;
          found.push({
            token,
            already: importedSet.has(token),
            source: "SupportXMR Pool",
            label: `Pool payout ${Number(p.amount).toFixed(6)} XMR`,
            usd,
            assetKey: "crypto:monero",
            assetQty: Number(p.amount),
            date: new Date(p.date).toISOString(),
            note: `XMR Pool tx ${String(p.tx || "").slice(0, 10)}`,
          });
        }
      }
    } catch {
      // optional
    }

    // 5. PayPal Merchant Net Inflows
    try {
      const pp = await apiGet("/api/paypal/transactions?days=90");
      if (Array.isArray(pp)) {
        for (const p of pp) {
          const net = Number(p.amount || 0) + Number(p.fee || 0);
          if (!(net > 0)) continue;
          const token = `paypal:${p.id}`;
          found.push({
            token,
            already: importedSet.has(token),
            source: "PayPal",
            label: [p.subject || p.event || "PayPal Payment", p.counterparty].filter(Boolean).join(" · "),
            usd: net,
            date: p.date || new Date().toISOString(),
            note: `PayPal ${p.id}`,
          });
        }
      }
    } catch {
      // optional
    }

    scannedDashboardItems = found;
    const newOnes = found.filter((f) => !f.already);
    if (!found.length) {
      container.innerHTML = `<div class="et-broker-row"><span class="muted">No external dashboard earnings found yet (no Ledger payouts, Forex gains, Pool payouts, or PayPal inflows). You can import a CSV/JSON file or add earnings manually below.</span></div>`;
      $("et-import-sync-summary").textContent = "0 new items";
      return;
    }

    container.innerHTML = found
      .map((item, idx) => `
        <label class="et-broker-row" style="cursor:pointer;opacity:${item.already ? 0.55 : 1}">
          <div style="display:flex;align-items:center;gap:0.55rem">
            <input type="checkbox" data-imp-idx="${idx}" ${item.already ? "disabled" : "checked"} />
            <div>
              <strong>${escapeHtml(item.label)}</strong>
              <div class="muted small-text">${escapeHtml(item.source)} · ${new Date(item.date).toLocaleDateString()}</div>
            </div>
          </div>
          <span class="fx-mono up">${item.already ? "Imported" : `+${fmtUsd(item.usd)}`}</span>
        </label>`)
      .join("");

    const sumNew = newOnes.reduce((s, i) => s + i.usd, 0);
    $("et-import-sync-summary").textContent = `${newOnes.length} new item(s) totaling +${fmtUsd(sumNew)}`;
  }

  function creditEarningsItem({ source, usd, assetKey, assetQty, note }) {
    const valUsd = Number(usd) || 0;
    if (assetKey && assetKey !== "USD" && assetQty > 0) {
      const a = assets.get(assetKey) || { key: assetKey, symbol: assetKey.split(":")[1].toUpperCase(), name: assetKey, category: "crypto", price: 1 };
      const p = unitUsdPrice(a) || 1;
      const computedUsd = valUsd > 0 ? valUsd : assetQty * p;
      const prev = state.positions[a.key];
      if (prev && prev.qty > 0) {
        prev.qty += assetQty;
      } else {
        state.positions[a.key] = { key: a.key, symbol: a.symbol, name: a.name, category: a.category, qty: assetQty, avgPrice: p };
      }
      state.importedUsdTotal = (state.importedUsdTotal || 0) + computedUsd;
      recordHistory({ type: "earnings", key: a.key, symbol: a.symbol, category: "earnings", qty: assetQty, price: p, valueUsd: computedUsd, note: `${source}${note ? ` · ${note}` : ""}` });
      return computedUsd;
    }
    state.cash += valUsd;
    state.importedUsdTotal = (state.importedUsdTotal || 0) + valUsd;
    recordHistory({ type: "earnings", key: "USD", symbol: "USD", category: "earnings", qty: valUsd, price: 1, valueUsd: valUsd, note: `${source}${note ? ` · ${note}` : ""}` });
    return valUsd;
  }

  function parseCsvText(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const splitRow = (line) => {
      const out = [];
      let cur = "";
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') inQ = !inQ;
        else if (ch === "," && !inQ) { out.push(cur.trim()); cur = ""; }
        else cur += ch;
      }
      out.push(cur.trim());
      return out;
    };
    const headers = splitRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
    return lines.slice(1).map((line) => {
      const cols = splitRow(line);
      const obj = {};
      headers.forEach((h, i) => (obj[h] = cols[i] ?? ""));
      return obj;
    });
  }

  function normalizeImportedRows(rows) {
    const out = [];
    for (const r of rows) {
      const usdRaw = Number(r.usd ?? r.valueusd ?? r.earnings ?? r.pnl ?? r.profit ?? r.amount ?? r.value ?? 0);
      const qtyRaw = Number(r.qty ?? r.quantity ?? r.units ?? 0);
      const assetStr = String(r.asset ?? r.coin ?? r.symbol ?? "USD").trim().toUpperCase();
      const source = String(r.source ?? r.type ?? r.platform ?? "CSV/JSON Import").trim() || "Import";
      const note = String(r.note ?? r.description ?? r.memo ?? "").trim();

      let assetKey = "USD";
      if (assetStr && assetStr !== "USD") {
        const match = [...assets.values()].find((a) => a.symbol.toUpperCase() === assetStr);
        if (match) assetKey = match.key;
      }

      if (assetKey !== "USD" && qtyRaw > 0) {
        const a = assets.get(assetKey);
        const p = unitUsdPrice(a) || 1;
        out.push({ source, assetKey, assetQty: qtyRaw, usd: usdRaw > 0 ? usdRaw : qtyRaw * p, note });
      } else if (usdRaw > 0) {
        out.push({ source, assetKey: "USD", assetQty: 0, usd: usdRaw, note });
      }
    }
    return out;
  }

  // ---------- CSV Export ----------
  function exportHistoryCsv() {
    const rows = [["Time", "Type", "Symbol", "Category", "Quantity", "Price", "ValueUSD", "Note"].join(",")];
    for (const h of state.history) {
      rows.push([h.time, h.type, h.symbol, h.category, h.qty, h.price, h.valueUsd.toFixed(2), `"${String(h.note || "").replace(/"/g, '""')}"`].join(","));
    }
    const blob = new Blob([rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `easy-trade-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  // ---------- Event Wiring ----------
  function bindEvents() {
    // Market category tabs
    $("et-cat-tabs").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-cat]");
      if (!btn) return;
      activeCategory = btn.dataset.cat;
      $("et-cat-tabs").querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
      renderWatchlist();
      if (activeCategory === "mining") {
        $("et-mining-hub").scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });

    $("et-search").addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderWatchlist();
    });

    // Watchlist asset click
    $("et-market-list").addEventListener("click", (e) => {
      const row = e.target.closest(".et-asset-row[data-key]");
      if (!row) return;
      selectedKey = row.dataset.key;
      renderWatchlist();
      renderHero();
      loadChart();
    });

    // Chart timeframe
    $("et-ranges").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-range]");
      if (!btn) return;
      chartRange = btn.dataset.range;
      $("et-ranges").querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
      loadChart();
    });

    // Chart hover tooltip
    const chartCanvas = $("et-chart");
    chartCanvas.addEventListener("mousemove", (e) => {
      if (chartPoints.length < 2) return;
      const rect = chartCanvas.getBoundingClientRect();
      const relX = (e.clientX - rect.left - 10) / Math.max(1, rect.width - 84);
      const idx = Math.max(0, Math.min(chartPoints.length - 1, Math.round(relX * (chartPoints.length - 1))));
      drawChart(idx);
      const a = assets.get(selectedKey);
      const [ts, val] = chartPoints[idx];
      const tip = $("et-chart-tip");
      tip.hidden = false;
      tip.style.left = `${Math.max(60, Math.min(rect.width - 60, e.clientX - rect.left))}px`;
      tip.style.top = `${Math.max(36, e.clientY - rect.top)}px`;
      tip.innerHTML = `<strong>${fmtPrice(a, val)}</strong><br><span class="muted">${new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>`;
    });
    chartCanvas.addEventListener("mouseleave", () => {
      $("et-chart-tip").hidden = true;
      drawChart(-1);
    });

    // Ticket tabs (Buy / Sell / Quick Swap)
    $("et-ticket-tabs").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-side]");
      if (!btn) return;
      ticketSide = btn.dataset.side;
      $("et-ticket-tabs").querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
      $("et-bs-panel").hidden = ticketSide === "swap";
      $("et-swap-panel").hidden = ticketSide !== "swap";
      if (ticketSide === "swap") populateSwapSelectors();
      else updateTicketPreview();
    });

    $("et-input-mode-btn").addEventListener("click", () => {
      inputMode = inputMode === "usd" ? "units" : "usd";
      updateTicketPreview();
    });

    $("et-amount").addEventListener("input", updateTicketPreview);
    $("et-exec-mode").addEventListener("change", updateTicketPreview);
    $("et-order-type").addEventListener("change", updateTicketPreview);
    $("et-limit-price").addEventListener("input", updateTicketPreview);

    $("et-presets").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-preset]");
      if (!btn) return;
      const a = assets.get(selectedKey);
      if (!a) return;
      const p = unitUsdPrice(a);
      const val = btn.dataset.preset;
      if (val.endsWith("%")) {
        const frac = parseFloat(val) / 100;
        if (ticketSide === "buy") {
          const usd = state.cash * frac;
          $("et-amount").value = (inputMode === "usd" ? usd : usd / p).toFixed(inputMode === "usd" ? 2 : 6);
        } else {
          const qty = (state.positions[a.key]?.qty || 0) * frac;
          $("et-amount").value = (inputMode === "usd" ? qty * p : qty).toFixed(inputMode === "usd" ? 2 : 6);
        }
      } else {
        const usd = Number(val);
        $("et-amount").value = inputMode === "usd" ? usd : (usd / p).toFixed(6);
      }
      updateTicketPreview();
    });

    $("et-adv-toggle").addEventListener("click", () => {
      const box = $("et-adv-box");
      box.hidden = !box.hidden;
      $("et-adv-toggle").textContent = `${box.hidden ? "▸" : "▾"} Optional: Limit Price, Stop-Loss & Take-Profit`;
    });

    $("et-submit-btn").addEventListener("click", submitTrade);

    // Quick Swap controls
    $("et-swap-from").addEventListener("change", renderSwapPreview);
    $("et-swap-to").addEventListener("change", renderSwapPreview);
    $("et-swap-from-amt").addEventListener("input", renderSwapPreview);
    $("et-swap-max-btn").addEventListener("click", () => {
      const fromKey = $("et-swap-from").value;
      $("et-swap-from-amt").value = fromKey === "USD" ? state.cash.toFixed(2) : (state.positions[fromKey]?.qty || 0);
      renderSwapPreview();
    });
    $("et-swap-flip-btn").addEventListener("click", () => {
      const a = $("et-swap-from").value;
      const b = $("et-swap-to").value;
      if ([...$("et-swap-from").options].some((o) => o.value === b)) {
        $("et-swap-from").value = b;
        $("et-swap-to").value = a;
        renderSwapPreview();
      }
    });
    $("et-swap-btn").addEventListener("click", executeSwap);

    // Mining Hub controls
    $("et-rig-shop").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-buy-rig]");
      if (!btn) return;
      const rig = RIG_CATALOG.find((r) => r.id === btn.dataset.buyRig);
      if (!rig) return;
      if (state.cash < rig.cost) return toast(`Need ${fmtUsd(rig.cost)} cash to deploy ${rig.name}.`, "down");
      state.cash -= rig.cost;
      state.rigs[rig.id] = (state.rigs[rig.id] || 0) + 1;
      recordHistory({ type: "buy", key: `rig:${rig.id}`, symbol: rig.name, category: "mining", qty: 1, price: rig.cost, valueUsd: rig.cost, note: `Deployed ${rig.hashLabel} rig` });
      saveState();
      renderRigShop();
      renderAllPortfolio();
      toast(`Deployed ${rig.name} (${rig.hashLabel}) — mining yield started!`, "up");
    });

    $("et-owned-rigs").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-sell-rig]");
      if (!btn) return;
      const rig = RIG_CATALOG.find((r) => r.id === btn.dataset.sellRig);
      if (!rig || !(state.rigs[rig.id] > 0)) return;
      const refund = rig.cost * 0.85;
      state.rigs[rig.id] -= 1;
      state.cash += refund;
      recordHistory({ type: "sell", key: `rig:${rig.id}`, symbol: rig.name, category: "mining", qty: 1, price: refund, valueUsd: refund, note: "Sold rig (85% resale)" });
      saveState();
      renderRigShop();
      renderAllPortfolio();
      toast(`Sold 1× ${rig.name} for ${fmtUsd(refund)}`, "up");
    });

    $("et-sim-harvest-btn").addEventListener("click", () => harvestMining(false));
    $("et-sim-autosell").addEventListener("change", (e) => {
      state.autoSellMining = e.target.checked;
      saveState();
    });

    // Hardware XMRig Miner
    $("et-hw-cpu").addEventListener("input", (e) => {
      $("et-hw-cpu-val").textContent = `${e.target.value}%`;
    });
    $("et-hw-toggle").addEventListener("click", async () => {
      const btn = $("et-hw-toggle");
      btn.disabled = true;
      try {
        if (hwStatus?.running) {
          await apiPost("/api/miner/stop");
          toast("XMRig hardware miner stopped.");
        } else {
          await apiPost("/api/miner/start", { cpuPercent: Number($("et-hw-cpu").value) });
          toast("XMRig hardware miner started!", "up");
        }
      } catch (err) {
        toast(err.message, "down");
      } finally {
        setTimeout(pollHardwareMiner, 700);
      }
    });

    // Bottom tabs
    $("et-bottom-tabs").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-btab]");
      if (!btn) return;
      const target = btn.dataset.btab;
      $("et-bottom-tabs").querySelectorAll("button[data-btab]").forEach((b) => b.classList.toggle("active", b === btn));
      ["positions", "orders", "history", "allocation"].forEach((id) => {
        $(`et-btab-${id}`).hidden = id !== target;
      });
      if (target === "allocation") drawAllocation();
    });

    // Quick Position actions
    $("et-positions-body").addEventListener("click", (e) => {
      const sel = e.target.closest("button[data-select-pos]");
      if (sel) {
        selectedKey = sel.dataset.selectPos;
        renderWatchlist();
        renderHero();
        loadChart();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const closeBtn = e.target.closest("button[data-close-pos]");
      if (closeBtn) {
        const key = closeBtn.dataset.closePos;
        const pos = state.positions[key];
        const a = assets.get(key);
        if (!pos || !a) return;
        const { proceeds, pnl } = applySell(a, pos.qty, unitUsdPrice(a), "1-Click Close");
        saveState();
        renderHero();
        renderAllPortfolio();
        populateSwapSelectors();
        toast(`Closed ${a.symbol} for ${fmtUsd(proceeds)} (${pnl >= 0 ? "+" : ""}${fmtUsd(pnl)})`, pnl >= 0 ? "up" : "down");
      }
    });

    $("et-orders-body").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-cancel-ord]");
      if (!btn) return;
      state.orders = state.orders.filter((o) => o.id !== btn.dataset.cancelOrd);
      saveState();
      renderAllPortfolio();
      toast("Pending order cancelled.");
    });

    $("et-export-csv").addEventListener("click", exportHistoryCsv);
    $("et-refresh-btn").addEventListener("click", refreshAllFeeds);

    // Paper Wallet & Broker Modal
    const openBrokerModal = () => { $("et-modal").hidden = false; loadBrokerStatus(); };
    $("et-mode-pill").addEventListener("click", openBrokerModal);
    $("et-broker-btn").addEventListener("click", openBrokerModal);
    $("et-modal-close").addEventListener("click", () => ($("et-modal").hidden = true));
    $("et-modal").addEventListener("click", (e) => { if (e.target === $("et-modal")) $("et-modal").hidden = true; });

    $("et-topup-btn").addEventListener("click", () => {
      const amt = Number($("et-topup-amt").value) || 0;
      if (!(amt > 0)) return;
      state.cash += amt;
      state.initialCash += amt;
      recordHistory({ type: "earnings", key: "USD", symbol: "USD", category: "earnings", qty: amt, price: 1, valueUsd: amt, note: "Paper wallet top-up" });
      saveState();
      renderAllPortfolio();
      updateTicketPreview();
      toast(`Added ${fmtUsd(amt)} paper USD!`, "up");
    });

    $("et-reset-confirm-btn").addEventListener("click", () => {
      if (!confirm("Reset your Easy Trade paper portfolio, rigs, and history back to $25,000?")) return;
      state = defaultState();
      saveState();
      renderRigShop();
      renderHero();
      renderAllPortfolio();
      populateSwapSelectors();
      $("et-modal").hidden = true;
      toast("Paper account reset to $25,000.00");
    });

    // Import Earnings Modal
    $("et-import-btn").addEventListener("click", () => {
      $("et-import-modal").hidden = false;
      $("et-import-msg").textContent = "";
      scanDashboardEarnings();
    });
    $("et-import-close").addEventListener("click", () => ($("et-import-modal").hidden = true));
    $("et-import-modal").addEventListener("click", (e) => { if (e.target === $("et-import-modal")) $("et-import-modal").hidden = true; });
    $("et-import-rescan-btn").addEventListener("click", scanDashboardEarnings);

    $("et-import-sync-btn").addEventListener("click", () => {
      const checks = [...$("et-import-sources").querySelectorAll("input[type='checkbox']:checked:not(:disabled)")];
      if (!checks.length) {
        $("et-import-msg").textContent = "No new dashboard earnings selected.";
        return;
      }
      let totalUsd = 0;
      for (const chk of checks) {
        const item = scannedDashboardItems[Number(chk.dataset.impIdx)];
        if (!item || item.already) continue;
        totalUsd += creditEarningsItem({
          source: item.source,
          usd: item.usd,
          assetKey: item.assetKey,
          assetQty: item.assetQty,
          note: item.note,
        });
        state.importedIds.push(item.token);
      }
      saveState();
      renderHero();
      renderAllPortfolio();
      populateSwapSelectors();
      scanDashboardEarnings();
      $("et-import-msg").textContent = `Imported ${checks.length} earnings item(s) totaling +${fmtUsd(totalUsd)}!`;
      toast(`Imported +${fmtUsd(totalUsd)} in earnings!`, "up");
    });

    $("et-import-sample-btn").addEventListener("click", () => {
      const sample = [
        "date,source,asset,quantity,usd,note",
        "2026-11-20,Mining Pool,XMR,0.45,,SupportXMR payout",
        "2026-11-22,Stock Dividend,USD,,185.50,NVDA & SPY dividend",
        "2026-11-24,Forex Profit,USD,,420.00,EUR/USD swing profit",
        "2026-11-25,Crypto Staking,SOL,1.25,,SOL validator reward",
      ].join("\r\n");
      const blob = new Blob([sample], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "easy-trade-earnings-sample.csv";
      a.click();
    });

    $("et-import-file").addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const rawRows = file.name.toLowerCase().endsWith(".json") ? JSON.parse(text) : parseCsvText(text);
        const arr = Array.isArray(rawRows) ? rawRows : rawRows.earnings || rawRows.transactions || [];
        pendingFileRows = normalizeImportedRows(arr);
        const total = pendingFileRows.reduce((s, r) => s + r.usd, 0);
        $("et-import-file-preview").textContent = pendingFileRows.length
          ? `Ready to import ${pendingFileRows.length} row(s) totaling +${fmtUsd(total)} from ${file.name}.`
          : `No positive earnings rows detected in ${file.name}.`;
        $("et-import-file-btn").hidden = pendingFileRows.length === 0;
      } catch (err) {
        $("et-import-file-preview").textContent = `Could not parse file: ${err.message}`;
        $("et-import-file-btn").hidden = true;
      }
    });

    $("et-import-file-btn").addEventListener("click", () => {
      if (!pendingFileRows.length) return;
      let total = 0;
      for (const r of pendingFileRows) total += creditEarningsItem(r);
      const count = pendingFileRows.length;
      pendingFileRows = [];
      $("et-import-file").value = "";
      $("et-import-file-btn").hidden = true;
      $("et-import-file-preview").textContent = `Credited ${count} row(s) (+${fmtUsd(total)}).`;
      saveState();
      renderHero();
      renderAllPortfolio();
      populateSwapSelectors();
      toast(`Imported +${fmtUsd(total)} from file!`, "up");
    });

    $("et-import-manual-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const source = $("et-imp-source").value;
      const assetKey = $("et-imp-asset").value;
      const amt = Number($("et-imp-amount").value) || 0;
      const note = $("et-imp-note").value.trim();
      if (!(amt > 0)) return;
      const credited = assetKey === "USD"
        ? creditEarningsItem({ source, usd: amt, note })
        : creditEarningsItem({ source, assetKey, assetQty: amt, note });
      $("et-imp-amount").value = "";
      $("et-imp-note").value = "";
      saveState();
      renderHero();
      renderAllPortfolio();
      populateSwapSelectors();
      $("et-import-msg").textContent = `Credited +${fmtUsd(credited)} (${source}) to your Easy Trade wallet.`;
      toast(`Credited +${fmtUsd(credited)} earnings!`, "up");
    });
  }

  // ---------- Bootstrap ----------
  async function refreshAllFeeds() {
    $("et-feed-status").textContent = "Refreshing…";
    await Promise.all([loadCryptoFeed(), loadForexFeed(), loadStocksFeed()]);
    if (!assets.has(selectedKey) && assets.size) selectedKey = assets.keys().next().value;
    renderWatchlist();
    renderHero();
    renderAllPortfolio();
    populateSwapSelectors();
    evaluatePendingOrders();
    $("et-feed-status").textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
  }

  async function init() {
    bindEvents();
    renderRigShop();
    await refreshAllFeeds();
    await loadChart();
    loadBrokerStatus();
    pollHardwareMiner();
    connectCoinbaseWs();

    setInterval(tickVirtualMining, 2000);
    setInterval(refreshAllFeeds, 60_000);
    setInterval(pollHardwareMiner, 10_000);
    window.addEventListener("resize", () => drawChart(-1));
  }

  init();
})();
