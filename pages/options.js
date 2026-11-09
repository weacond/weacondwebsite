"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import { computeOptionChain } from "../lib/options.js";
import { analyzeStrategy, strategyTemplates } from "../lib/optionsStrategies.js";
import Head from "next/head";
import { useState, useEffect, useMemo } from "react";

// 预置标的 + 默认现货（数据拉取失败时回退，诚实标注 demo）
const PRESET_SYMBOLS = [
  { ticker: "SPY", name: "S&P 500 ETF", spot: 510 },
  { ticker: "AAPL", name: "Apple", spot: 190 },
  { ticker: "NVDA", name: "NVIDIA", spot: 130 },
  { ticker: "TSLA", name: "Tesla", spot: 250 },
  { ticker: "MSFT", name: "Microsoft", spot: 420 },
];

const EXPIRY_DAYS = [30, 60, 90, 180, 365];

export default function OptionsPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [symbol, setSymbol] = useState("SPY");
  const [expiryDays, setExpiryDays] = useState(90);
  const [iv, setIv] = useState(0.25);
  const [r, setR] = useState(0.04);
  const [spot, setSpot] = useState(PRESET_SYMBOLS[0].spot);
  const [spotSource, setSpotSource] = useState("demo"); // "live" | "demo"
  const [loading, setLoading] = useState(false);

  // 拉取现货价（最近收盘价）；失败则回退到预置 demo 值
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const fallback = () => {
      const preset = PRESET_SYMBOLS.find((s) => s.ticker === symbol);
      setSpot(preset ? preset.spot : 100);
      setSpotSource("demo");
    };
    fetch(`/api/marketdata?symbol=${encodeURIComponent(symbol)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad"))))
      .then((data) => {
        if (cancelled) return;
        const candles = data?.candles;
        const last = Array.isArray(candles) && candles.length ? candles[candles.length - 1]?.close : null;
        if (typeof last === "number" && last > 0) {
          setSpot(Math.round(last * 100) / 100);
          setSpotSource("live");
        } else {
          fallback();
        }
      })
      .catch(() => { if (!cancelled) fallback(); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol]);

  const t = expiryDays / 365;
  const chain = useMemo(
    () => computeOptionChain({ symbol, spot, iv, r, t }),
    [symbol, spot, iv, r, expiryDays]
  );

  // ATM：|moneyness| 最小的一档
  const atmStrike = useMemo(() => {
    if (!chain.calls.length) return null;
    return chain.calls.reduce((best, c) =>
      Math.abs(c.moneyness) < Math.abs(best.moneyness) ? c : best
    ).strike;
  }, [chain]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title} — Weacond</title></Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">{L.title}</h1>
              <p className="text-slate-500 text-sm mt-1">{L.subtitle}</p>
            </div>
            <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
              {L.modelBadge}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-white rounded-xl p-5 shadow-sm border border-slate-100 mb-6">
            <label className="text-sm">
              <span className="block text-slate-500 mb-1">{L.symbol}</span>
              <select value={symbol} onChange={(e) => setSymbol(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {PRESET_SYMBOLS.map((s) => (
                  <option key={s.ticker} value={s.ticker}>{s.ticker} · {s.name}</option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="block text-slate-500 mb-1">{L.expiry}</span>
              <select value={expiryDays} onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {EXPIRY_DAYS.map((d) => (
                  <option key={d} value={d}>{L.expiryDays.replace("{d}", d)}</option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="block text-slate-500 mb-1">{L.ivLabel.replace("{v}", (iv * 100).toFixed(0))}</span>
              <input type="range" min="0.05" max="1.0" step="0.01" value={iv}
                onChange={(e) => setIv(Number(e.target.value))}
                className="w-full mt-3 accent-indigo-600" />
            </label>

            <label className="text-sm">
              <span className="block text-slate-500 mb-1">{L.rLabel.replace("{v}", (r * 100).toFixed(1))}</span>
              <input type="range" min="0" max="0.1" step="0.005" value={r}
                onChange={(e) => setR(Number(e.target.value))}
                className="w-full mt-3 accent-indigo-600" />
            </label>

            <div className="text-sm">
              <span className="block text-slate-500 mb-1">{L.spot}</span>
              <div className="flex items-baseline gap-2 h-[38px]">
                <span className="text-lg font-bold tabular-nums">${spot.toFixed(2)}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${spotSource === "live" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {loading ? L.loading : spotSource === "live" ? L.live : L.demo}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <OptionTable side="put" rows={chain.puts} atmStrike={atmStrike} L={L} />
            <OptionTable side="call" rows={chain.calls} atmStrike={atmStrike} L={L} />
          </div>

          {/* 策略组合实验区 */}
          <StrategyLab spot={spot} iv={iv} r={r} t={t} L={L} />

          <div className="mt-6 bg-slate-100 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
            <p className="font-medium text-slate-600 mb-1">{L.disclaimerTitle}</p>
            <p>{L.disclaimer}</p>
            <p className="mt-1">{L.disclaimer2}</p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

// 单侧（Puts 或 Calls）表
function OptionTable({ side, rows, atmStrike, L }) {
  const isCall = side === "call";
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className={`px-5 py-3 font-bold text-white ${isCall ? "bg-emerald-600" : "bg-rose-600"}`}>
        {isCall ? L.calls : L.puts}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2 font-medium">{L.strike}</th>
              <th className="text-right px-3 py-2 font-medium">{L.price}</th>
              <th className="text-right px-3 py-2 font-medium" title={L.deltaTip}>Δ</th>
              <th className="text-right px-3 py-2 font-medium" title={L.gammaTip}>Γ</th>
              <th className="text-right px-3 py-2 font-medium" title={L.thetaTip}>Θ</th>
              <th className="text-right px-3 py-2 font-medium" title={L.vegaTip}>V</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const isAtm = o.strike === atmStrike;
              const itm = isCall ? o.moneyness > 0 : o.moneyness < 0;
              return (
                <tr key={`${o.strike}-${o.type}`}
                  className={`border-t border-slate-50 ${isAtm ? "bg-amber-50 font-semibold" : itm ? "bg-slate-50" : ""}`}>
                  <td className="text-left px-3 py-2">
                    {o.strike.toFixed(0)}
                    {isAtm && <span className="ml-1 text-[10px] bg-amber-200 text-amber-800 px-1 rounded">{L.atm}</span>}
                  </td>
                  <td className="text-right px-3 py-2 font-medium">${o.price.toFixed(2)}</td>
                  <td className="text-right px-3 py-2">{o.delta.toFixed(3)}</td>
                  <td className="text-right px-3 py-2">{o.gamma.toFixed(4)}</td>
                  <td className="text-right px-3 py-2 text-rose-500">{o.theta.toFixed(4)}</td>
                  <td className="text-right px-3 py-2">{o.vega.toFixed(4)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 策略组合实验区：选模板 + 调行权价 → 实时算净权利金/最大盈亏/盈亏平衡/盈亏曲线
function StrategyLab({ spot, iv, r, t, L }) {
  const [templateId, setTemplateId] = useState("bull_call_spread");
  const [k1, setK1] = useState(Math.round(spot * 0.95) || 95);
  const [k2, setK2] = useState(Math.round(spot * 1.05) || 105);

  const templates = strategyTemplates(spot, k1, k2);
  const tpl = templates.find((x) => x.id === templateId) || templates[0];

  const analysis = useMemo(() => {
    try {
      return analyzeStrategy(tpl.legs, { spot, r, t, iv });
    } catch (e) {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, k1, k2, spot, iv, r, t]);

  const fmtMoney = (v) =>
    v === null ? L.unbounded : (v > 0 ? "+" : "") + "$" + v.toFixed(2);
  const isCredit = analysis && analysis.premium < 0;

  return (
    <div className="mt-6 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
      <h2 className="text-lg font-bold mb-1">{L.strategyTitle}</h2>
      <p className="text-slate-500 text-sm mb-4">{L.strategySubtitle}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <label className="text-sm col-span-2">
          <span className="block text-slate-500 mb-1">{L.template}</span>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {templates.map((tp) => (
              <option key={tp.id} value={tp.id}>{tp.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-slate-500 mb-1">{L.k1}</span>
          <input type="number" value={k1} onChange={(e) => setK1(Number(e.target.value))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="text-sm">
          <span className="block text-slate-500 mb-1">{L.k2}</span>
          <input type="number" value={k2} onChange={(e) => setK2(Number(e.target.value))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
      </div>

      {analysis ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Metric label={L.netPremium} value={(isCredit ? "−" : "+") + "$" + Math.abs(analysis.premium).toFixed(2)}
              hint={isCredit ? L.credit : L.debit} tone={isCredit ? "green" : "rose"} />
            <Metric label={L.maxProfit} value={fmtMoney(analysis.maxProfit)} tone="green" />
            <Metric label={L.maxLoss} value={fmtMoney(analysis.maxLoss)} tone="rose" />
            <Metric label={L.breakEven}
              value={analysis.breakEvens.length ? analysis.breakEvens.map((b) => "$" + b).join(" / ") : "—"} />
          </div>

          <div className="mb-4">
            <p className="text-xs text-slate-500 mb-1">{L.legs}</p>
            <div className="flex flex-wrap gap-2">
              {tpl.legs.map((leg, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
                  {leg.qty > 0 ? L.buy : L.sell} {leg.type === "share" ? L.share : (leg.type === "call" ? "Call" : "Put")}
                  {leg.type !== "share" && ` @ $${leg.strike}`}
                </span>
              ))}
            </div>
          </div>

          <PayoffCurve points={analysis.payoffCurve} breakEvens={analysis.breakEvens} L={L} />
        </>
      ) : (
        <p className="text-sm text-rose-500">{L.strategyError}</p>
      )}
    </div>
  );
}

function Metric({ label, value, hint, tone }) {
  const toneCls = tone === "green" ? "text-emerald-600" : tone === "rose" ? "text-rose-600" : "text-slate-800";
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${toneCls}`}>{value}</div>
      {hint && <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}

// 纯 SVG 盈亏曲线（无图表库依赖）
function PayoffCurve({ points, breakEvens, L }) {
  if (!points || points.length < 2) return null;
  const W = 560, H = 180, pad = 28;
  const xs = points.map((p) => p.price);
  const ys = points.map((p) => p.profit);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys, 0), maxY = Math.max(...ys, 0);
  const sx = (x) => pad + ((x - minX) / (maxX - minX || 1)) * (W - 2 * pad);
  const sy = (y) => H - pad - ((y - minY) / (maxY - minY || 1)) * (H - 2 * pad);
  const line = points.map((p) => `${sx(p.price).toFixed(1)},${sy(p.profit).toFixed(1)}`).join(" ");
  const zeroY = sy(0);

  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{L.payoffTitle}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44" role="img" aria-label={L.payoffTitle}>
        <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
        {breakEvens.map((b, i) =>
          b >= minX && b <= maxX ? (
            <line key={`be${i}`} x1={sx(b)} y1={pad} x2={sx(b)} y2={H - pad}
              stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" />
          ) : null
        )}
        <polyline points={line} fill="none" stroke="#4f46e5" strokeWidth="2" />
        <text x={pad} y={H - 6} fontSize="10" fill="#94a3b8">{minX.toFixed(0)}</text>
        <text x={W - pad - 16} y={H - 6} fontSize="10" fill="#94a3b8">{maxX.toFixed(0)}</text>
        <text x={pad} y={pad - 8} fontSize="10" fill="#16a34a">+{maxY.toFixed(0)}</text>
        {minY < 0 && <text x={pad} y={H - pad + 12} fontSize="10" fill="#dc2626">{minY.toFixed(0)}</text>}
      </svg>
    </div>
  );
}

const zh = {
  title: "期权链 · 波动面",
  subtitle: "Black-Scholes 模型估算 · 价格与希腊字母（Δ Γ Θ V）",
  modelBadge: "模型估算 · 非实时",
  symbol: "标的",
  expiry: "到期",
  expiryDays: "{d} 天",
  ivLabel: "隐含波动率 IV {v}%",
  rLabel: "无风险利率 {v}%",
  spot: "现货价",
  loading: "拉取中…",
  live: "实时",
  demo: "示例",
  calls: "Call（看涨）",
  puts: "Put（看跌）",
  strike: "行权价",
  price: "理论价",
  atm: "ATM",
  deltaTip: "Delta：标的每涨 $1 的期权价变化",
  gammaTip: "Gamma：Delta 对标的价格的变化",
  thetaTip: "Theta：每日时间衰减",
  vegaTip: "Vega：IV 每变动 1% 的价格变化",
  disclaimerTitle: "⚠️ 数据与模型说明",
  disclaimer: "本表为 Black-Scholes-Merton 解析模型估算，非交易所实时期权报价。希腊字母用于教学与示意，实际交易需考虑 bid/ask 价差、跳空、流动性等。",
  disclaimer2: "现货价取最近收盘价（未配置行情密钥时回退为示例值，标注『示例』）。本页面不构成投资建议。",
  // 策略组合实验区
  strategyTitle: "🧮 策略组合实验区",
  strategySubtitle: "选模板、调行权价，实时算净权利金 / 最大盈亏 / 盈亏平衡 / 盈亏曲线（同 Black-Scholes 模型）。",
  template: "策略模板",
  k1: "行权价 K1",
  k2: "行权价 K2",
  netPremium: "净权利金",
  maxProfit: "最大盈利",
  maxLoss: "最大亏损",
  breakEven: "盈亏平衡",
  legs: "组合构成",
  buy: "买",
  sell: "卖",
  share: "正股",
  payoffTitle: "到期盈亏曲线（橙色虚线=盈亏平衡点）",
  unbounded: "∞ 无界",
  credit: "净收入",
  debit: "净支出",
  strategyError: "参数无效，请检查行权价。",
};
const en = {
  title: "Options Chain · Volatility Surface",
  subtitle: "Black-Scholes model estimate · price & greeks (Δ Γ Θ V)",
  modelBadge: "Model · Not Live",
  symbol: "Symbol",
  expiry: "Expiry",
  expiryDays: "{d} days",
  ivLabel: "Implied Vol IV {v}%",
  rLabel: "Risk-free rate {v}%",
  spot: "Spot",
  loading: "loading…",
  live: "Live",
  demo: "Demo",
  calls: "Call",
  puts: "Put",
  strike: "Strike",
  price: "Fair Price",
  atm: "ATM",
  deltaTip: "Delta: option price change per $1 move in underlying",
  gammaTip: "Gamma: change in delta per underlying move",
  thetaTip: "Theta: daily time decay",
  vegaTip: "Vega: price change per 1% change in IV",
  disclaimerTitle: "⚠️ Data & Model Notice",
  disclaimer: "This table is a Black-Scholes-Merton analytical estimate, not a live exchange quote. Greeks are for teaching/illustration; real trading must account for bid/ask spread, gaps, liquidity, etc.",
  disclaimer2: "Spot uses the most recent close (falls back to a demo value when no market-data key is configured, marked 'Demo'). This page is not investment advice.",
  // Strategy lab
  strategyTitle: "🧮 Strategy Lab",
  strategySubtitle: "Pick a template, tune strikes, and instantly see net premium / max profit / max loss / break-even / payoff (same Black-Scholes model).",
  template: "Strategy template",
  k1: "Strike K1",
  k2: "Strike K2",
  netPremium: "Net premium",
  maxProfit: "Max profit",
  maxLoss: "Max loss",
  breakEven: "Break-even",
  legs: "Position legs",
  buy: "Buy",
  sell: "Sell",
  share: "Share",
  payoffTitle: "Payoff at expiration (orange dashed = break-even)",
  unbounded: "∞ unbounded",
  credit: "Credit",
  debit: "Debit",
  strategyError: "Invalid parameters, check the strikes.",
};


