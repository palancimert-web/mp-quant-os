import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity, BarChart3, Brain, Gauge, LineChart, ShieldAlert, Terminal,
  Zap, Search, Plus, Trash2, RefreshCw, Cpu, Layers, WalletCards
} from "lucide-react";
import {
  ResponsiveContainer, LineChart as RLineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, BarChart, Bar
} from "recharts";
import "./styles/app.css";

const DEFAULT_WATCHLIST = ["PLTR", "NVDA", "AVAV", "SOUN", "META"];

const FRAMEWORKS = [
  { key: "citadel", name: "Citadel Alpha", desc: "Catalyst, PEAD, revision, order-flow and crowding logic.", weight: 0.18 },
  { key: "aqr", name: "AQR Factor", desc: "Value, momentum, quality, size and low-vol factor stack.", weight: 0.17 },
  { key: "bridgewater", name: "Bridgewater Macro", desc: "Growth/inflation regime overlay and liquidity cycle adjustment.", weight: 0.13 },
  { key: "twoSigma", name: "Two Sigma Risk", desc: "Drawdown, exposure, concentration, volatility and kill-switch scoring.", weight: 0.16 },
  { key: "deshaw", name: "D.E. Shaw StatArb", desc: "Mean-reversion, z-score feasibility and pair-trade filter.", weight: 0.10 },
  { key: "janeStreet", name: "Jane Street Liquidity", desc: "Spread, depth, ADV participation and market-impact model.", weight: 0.09 },
  { key: "virtu", name: "Virtu Execution", desc: "VWAP/TWAP/IS route selection and cost estimate.", weight: 0.08 },
  { key: "gs", name: "GS QIS", desc: "Risk overlay, factor timing, phase-in sizing and edge decay.", weight: 0.09 }
];

const demoHistory = Array.from({ length: 36 }).map((_, i) => ({
  t: i,
  score: Math.round(58 + Math.sin(i / 3) * 12 + i * 0.35),
  price: Math.round(95 + Math.sin(i / 4) * 8 + i * 1.1)
}));

function clamp(n, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}

function fmtCap(v) {
  if (!v) return "-";
  if (v >= 1e12) return (v / 1e12).toFixed(2) + "T";
  if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  return Math.round(v).toLocaleString();
}

function signal(score) {
  if (score >= 82) return "STRONG BUY";
  if (score >= 67) return "BUY";
  if (score >= 52) return "HOLD";
  if (score >= 38) return "SELL";
  return "STRONG SELL";
}

function computeScores(data, macroRegime = "Goldilocks") {
  const chg = data?.changePercent ?? 0;
  const pe = data?.trailingPE ?? null;
  const marketCap = data?.marketCap ?? null;
  const avgVolume = data?.avgVolume ?? 2_000_000;

  const momentum = clamp(55 + chg * 5);
  const value = pe ? (pe < 12 ? 88 : pe < 20 ? 76 : pe < 32 ? 58 : pe < 50 ? 42 : 25) : 50;
  const size = marketCap ? clamp(28 + Math.log10(marketCap) * 4.5) : 55;
  const liquidity = clamp(avgVolume > 30e6 ? 92 : avgVolume > 8e6 ? 82 : avgVolume > 1e6 ? 68 : 45);
  const macro = macroRegime === "Goldilocks" ? 78 : macroRegime === "Reflation" ? 68 : macroRegime === "Stagflation" ? 42 : 48;
  const risk = clamp(82 - Math.abs(chg) * 3);
  const quality = clamp(62 + (value > 60 ? 8 : 0) + (size > 65 ? 7 : 0));
  const growth = clamp(60 + momentum * 0.25 + (chg > 0 ? 8 : -4));
  const execution = clamp((liquidity * 0.72) + (risk * 0.28));

  const frameworks = {
    citadel: clamp(momentum * 0.38 + growth * 0.24 + quality * 0.16 + liquidity * 0.12 + risk * 0.10),
    aqr: clamp(value * 0.24 + momentum * 0.24 + quality * 0.24 + size * 0.14 + risk * 0.14),
    bridgewater: macro,
    twoSigma: risk,
    deshaw: clamp(58 + risk * 0.20 + liquidity * 0.15 - Math.abs(chg) * 1.2),
    janeStreet: liquidity,
    virtu: execution,
    gs: clamp(risk * 0.38 + macro * 0.22 + momentum * 0.18 + value * 0.12 + liquidity * 0.10)
  };

  const composite = FRAMEWORKS.reduce((acc, f) => acc + frameworks[f.key] * f.weight, 0);

  return { momentum, value, size, liquidity, macro, risk, quality, growth, execution, frameworks, composite };
}

function App() {
  const [ticker, setTicker] = useState("PLTR");
  const [watchlist, setWatchlist] = useState(DEFAULT_WATCHLIST);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(false);
  const [macroRegime, setMacroRegime] = useState("Goldilocks");
  const [portfolio, setPortfolio] = useState([
    { ticker: "PLTR", weight: 24, beta: 1.7 },
    { ticker: "NVDA", weight: 28, beta: 1.8 },
    { ticker: "AVAV", weight: 18, beta: 1.1 },
    { ticker: "META", weight: 20, beta: 1.2 },
    { ticker: "Cash", weight: 10, beta: 0 }
  ]);

  const scores = useMemo(() => computeScores(data, macroRegime), [data, macroRegime]);
  const finalSignal = signal(scores.composite);

  async function fetchTicker(symbol = ticker) {
    const clean = symbol.trim().toUpperCase();
    if (!clean) return;
    setTicker(clean);
    setLoading(true);
    setStatus("Live backend çağrılıyor...");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(`/.netlify/functions/market?ticker=${encodeURIComponent(clean)}`, { signal: controller.signal });
      if (!res.ok) throw new Error("Backend HTTP " + res.status);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setStatus(`✓ ${clean} live data alındı`);
      if (!watchlist.includes(clean)) setWatchlist([clean, ...watchlist].slice(0, 12));
    } catch (err) {
      setStatus(err.name === "AbortError" ? "Backend timeout" : err.message);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  function addWatch() {
    const clean = ticker.trim().toUpperCase();
    if (clean && !watchlist.includes(clean)) setWatchlist([clean, ...watchlist].slice(0, 15));
  }

  const portfolioBeta = portfolio.reduce((a, x) => a + (x.weight / 100) * x.beta, 0);
  const concentration = Math.max(...portfolio.map(x => x.weight));
  const health = clamp(100 - Math.max(0, portfolioBeta - 1) * 22 - Math.max(0, concentration - 25) * 1.6);

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">MP</div>
          <div>
            <h1>MP Quant OS</h1>
            <p>v4.0 Alpha Research Terminal</p>
          </div>
        </div>
        <nav>
          <a href="#dashboard"><Terminal size={16}/> Dashboard</a>
          <a href="#stock"><Search size={16}/> Stock Research</a>
          <a href="#frameworks"><Layers size={16}/> Framework Engine</a>
          <a href="#portfolio"><WalletCards size={16}/> Portfolio</a>
          <a href="#risk"><ShieldAlert size={16}/> Risk</a>
          <a href="#ai"><Brain size={16}/> AI IC</a>
        </nav>
        <div className="sideNote">
          Research/simulation only. Not investment advice.
        </div>
      </aside>

      <main>
        <section className="hero" id="dashboard">
          <div>
            <p className="eyebrow">Institutional AI Research Terminal</p>
            <h2>MP Quant OS v4.0 Alpha</h2>
            <p className="muted">Live market data + hedge-fund style framework scoring + portfolio risk layer.</p>
          </div>
          <button onClick={() => fetchTicker(ticker)} disabled={loading}>
            {loading ? <RefreshCw className="spin" size={16}/> : <Zap size={16}/>}
            Run Full Stack
          </button>
        </section>

        <section className="kpiGrid">
          <Kpi title="Composite Signal" value={finalSignal} sub={`Score ${scores.composite.toFixed(1)}`} tone={scores.composite >= 67 ? "green" : scores.composite >= 52 ? "blue" : "red"} />
          <Kpi title="Macro Regime" value={macroRegime} sub={`Macro ${scores.macro.toFixed(0)}/100`} />
          <Kpi title="Risk State" value={health >= 75 ? "NORMAL" : health >= 55 ? "WATCH" : "CUT RISK"} sub={`Portfolio health ${health.toFixed(0)}`} tone={health >= 75 ? "green" : health >= 55 ? "yellow" : "red"} />
          <Kpi title="Execution" value={scores.execution >= 75 ? "LIQUID" : "CAREFUL"} sub={`Execution ${scores.execution.toFixed(0)}/100`} />
        </section>

        <section className="panel" id="stock">
          <PanelHead icon={<BarChart3/>} eyebrow="Live Stock Engine" title="Stock Research" />
          <div className="searchRow">
            <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && fetchTicker()} />
            <button onClick={() => fetchTicker()} disabled={loading}>Veri Çek</button>
            <button className="secondary" onClick={addWatch}><Plus size={16}/> Watchlist</button>
            <span className={`status ${status.startsWith("✓") ? "ok" : status.includes("HTTP") || status.includes("timeout") ? "err" : ""}`}>{status}</span>
          </div>

          <div className="marketGrid">
            <DataTile label="Price" value={data ? `$${data.price.toFixed(2)}` : "-"} sub={data ? `${data.change >= 0 ? "+" : ""}${data.change.toFixed(2)} (${data.changePercent.toFixed(2)}%)` : "-"} tone={data?.change >= 0 ? "green" : "red"} />
            <DataTile label="Market Cap" value={fmtCap(data?.marketCap)} sub="Size filter" />
            <DataTile label="P/E" value={data?.trailingPE ? data.trailingPE.toFixed(1) + "x" : "-"} sub="Value proxy" />
            <DataTile label="52W High" value={data?.fiftyTwoWeekHigh ? "$" + data.fiftyTwoWeekHigh.toFixed(2) : "-"} sub="Momentum band" />
            <DataTile label="52W Low" value={data?.fiftyTwoWeekLow ? "$" + data.fiftyTwoWeekLow.toFixed(2) : "-"} sub="Downside band" />
          </div>

          <div className="scoreStrip">
            {[
              ["Growth", scores.growth],
              ["Quality", scores.quality],
              ["Value", scores.value],
              ["Momentum", scores.momentum],
              ["Liquidity", scores.liquidity],
              ["Risk", scores.risk],
              ["Final", scores.composite]
            ].map(([name, val]) => <ScorePill key={name} name={name} val={val} />)}
          </div>

          <div className="chartBox">
            <ResponsiveContainer width="100%" height={260}>
              <RLineChart data={demoHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.07)" />
                <XAxis dataKey="t" hide />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#0c111b", border: "1px solid #263044", color: "#e8eef8" }} />
                <Line type="monotone" dataKey="score" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="price" strokeWidth={2} dot={false} />
              </RLineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel" id="frameworks">
          <PanelHead icon={<Cpu/>} eyebrow="Hedge Fund Framework Engine" title="Strategy Modules" />
          <div className="frameworkGrid">
            {FRAMEWORKS.map(f => (
              <div className="frameworkCard" key={f.key}>
                <div className="frameworkTop">
                  <h3>{f.name}</h3>
                  <strong>{scores.frameworks[f.key].toFixed(0)}</strong>
                </div>
                <p>{f.desc}</p>
                <div className="progress"><i style={{ width: `${scores.frameworks[f.key]}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel" id="portfolio">
          <PanelHead icon={<WalletCards/>} eyebrow="Portfolio Manager" title="Portfolio Health" />
          <div className="portfolioGrid">
            <div className="chartBox small">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={portfolio}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.07)" />
                  <XAxis dataKey="ticker" stroke="#738197" />
                  <YAxis stroke="#738197" />
                  <Tooltip contentStyle={{ background: "#0c111b", border: "1px solid #263044", color: "#e8eef8" }} />
                  <Bar dataKey="weight" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="terminalBox">
{`[PORTFOLIO RISK]
Portfolio beta       : ${portfolioBeta.toFixed(2)}
Max concentration    : ${concentration.toFixed(0)}%
Health score         : ${health.toFixed(1)}/100
Risk state           : ${health >= 75 ? "NORMAL" : health >= 55 ? "WATCH" : "CUT RISK"}

Rules:
- Max single position target: 25%
- If drawdown > 10%: reduce gross exposure
- If beta > 1.35: add cash / lower beta hedge
- If health < 55: no new aggressive entries`}
            </div>
          </div>
        </section>

        <section className="panel" id="risk">
          <PanelHead icon={<ShieldAlert/>} eyebrow="Risk Engine" title="Two Sigma / GS QIS Risk Layer" />
          <div className="terminalBox">
{`[RISK ENGINE OUTPUT]
Ticker               : ${ticker}
Composite score      : ${scores.composite.toFixed(1)}
Signal               : ${finalSignal}
Risk score           : ${scores.risk.toFixed(1)}
Liquidity score      : ${scores.liquidity.toFixed(1)}
Execution score      : ${scores.execution.toFixed(1)}

Suggested discipline:
${scores.composite >= 75 ? "- Strong setup, but phase in entries." : "- No full-size entry without confirmation."}
- Never let one name dominate portfolio heat.
- Avoid adding if market regime turns Stagflation/Deflation.
- Use strict stop and position cap on high-beta names.`}
          </div>
        </section>

        <section className="panel" id="ai">
          <PanelHead icon={<Brain/>} eyebrow="AI Investment Committee" title="Multi-Analyst Verdict" />
          <div className="committeeGrid">
            {[
              ["Growth Analyst", scores.growth, "Revenue/momentum bias"],
              ["Value Analyst", scores.value, "Valuation discipline"],
              ["Quant Analyst", scores.frameworks.aqr, "Factor stack"],
              ["Macro Analyst", scores.macro, "Regime overlay"],
              ["Risk Officer", scores.risk, "Drawdown control"]
            ].map(([role, val, desc]) => (
              <div className="committeeCard" key={role}>
                <span>{role}</span>
                <strong>{val.toFixed(0)}</strong>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Kpi({ title, value, sub, tone = "blue" }) {
  return <article className={`kpi ${tone}`}><span>{title}</span><strong>{value}</strong><small>{sub}</small></article>;
}
function DataTile({ label, value, sub, tone = "" }) {
  return <div className={`dataTile ${tone}`}><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>;
}
function ScorePill({ name, val }) {
  return <div className="scorePill"><span>{name}</span><b>{val.toFixed(0)}</b><i><em style={{ width: `${clamp(val)}%` }} /></i></div>;
}
function PanelHead({ icon, eyebrow, title }) {
  return <div className="panelHead"><div className="panelIcon">{icon}</div><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div></div>;
}

createRoot(document.getElementById("root")).render(<App />);
