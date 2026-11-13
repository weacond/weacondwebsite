"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import { computeOptionChain, impliedVol, ivRank, ivPercentile, classifyIVRank, volSmile, impliedMove } from "../lib/options.js";
import { analyzeStrategy, strategyTemplates, probOfProfit, strategyGreeks, deltaHedge, probInRange } from "../lib/optionsStrategies.js";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
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
      <CalcLd slug="options" />
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

          {/* 反解隐含波动率 */}
          <ReverseIV spot={spot} r={r} t={t} L={L} />

          {/* 波动率微笑 */}
          <VolSmile spot={spot} baseIV={iv} L={L} />

          {/* 策略组合实验区 */}
          <StrategyLab spot={spot} iv={iv} r={r} t={t} L={L} />

          {/* 波动率定位（IV Rank） */}
          <VolPositioning iv={iv} L={L} />

          {/* 到期预期移动（Implied Move / Expected Range） */}
          {(() => {
            const mv = impliedMove({ spot, iv, t });
            if (!mv) return null;
            return (
              <div className="mt-6 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold mb-1">{L.impliedMoveTitle}</h2>
                <p className="text-slate-500 text-sm mb-4">{L.impliedMoveSubtitle}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Metric label={L.oneSigmaRange} value={`${mv.oneSigmaLow}–${mv.oneSigmaHigh}`} tone="indigo" />
                  <Metric label={L.p95Range} value={`${mv.p95Low}–${mv.p95High}`} tone="indigo" />
                  <Metric label={L.oneSigmaPct} value={`±${mv.oneSigmaPct}%`} tone="indigo" />
                  <Metric label={L.atmSpot} value={mv.spot.toFixed(2)} tone="slate" />
                </div>
              </div>
            );
          })()}

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
              <th className="text-right px-3 py-2 font-medium" title={L.rhoTip}>R</th>
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
                  <td className="text-right px-3 py-2">{o.rho.toFixed(4)}</td>
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
      const a = analyzeStrategy(tpl.legs, { spot, r, t, iv });
      a.pop = probOfProfit(tpl.legs, { spot, r, t, iv });
      a.greeks = strategyGreeks(tpl.legs, { spot, r, t, iv });
      a.hedge = deltaHedge(tpl.legs, { spot, r, t, iv });
      // 盈利区概率：标的到期价落入盈亏平衡带 [be1, be2] 的概率（恰有 2 个平衡点时才有意义）
      a.inRange =
        a.breakEvens.length === 2 ? probInRange({ spot, r, t, iv }, a.breakEvens[0], a.breakEvens[1]) : null;
      return a;
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <Metric label={L.netPremium} value={(isCredit ? "−" : "+") + "$" + Math.abs(analysis.premium).toFixed(2)}
              hint={isCredit ? L.credit : L.debit} tone={isCredit ? "green" : "rose"} />
            <Metric label={L.maxProfit} value={fmtMoney(analysis.maxProfit)} tone="green" />
            <Metric label={L.maxLoss} value={fmtMoney(analysis.maxLoss)} tone="rose" />
            <Metric label={L.breakEven}
              value={analysis.breakEvens.length ? analysis.breakEvens.map((b) => "$" + b).join(" / ") : "—"} />
            <Metric label={L.pop}
              value={analysis.pop == null ? "—" : (analysis.pop * 100).toFixed(1) + "%"}
              tone="indigo"
              hint={L.popHint} />
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

          {analysis.greeks && (
            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-1">{L.greeksLabel}</p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">Δ {analysis.greeks.delta.toFixed(3)}</span>
                <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">Γ {analysis.greeks.gamma.toFixed(4)}</span>
                <span className="text-xs px-2 py-1 rounded bg-rose-50 text-rose-600">Θ {analysis.greeks.theta.toFixed(4)}</span>
                <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">V {analysis.greeks.vega.toFixed(4)}</span>
                <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">ρ {analysis.greeks.rho.toFixed(4)}</span>
                <span className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700" title={L.hedgeTip}>
                  {L.hedgeLabel} {analysis.hedge.toFixed(2)} {L.hedgeUnit}
                </span>
                {analysis.inRange != null && (
                  <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700" title={L.inRangeTip}>
                    {L.inRangeLabel} {(analysis.inRange * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          )}

          <PayoffCurve points={analysis.payoffCurve} breakEvens={analysis.breakEvens} L={L} />
        </>
      ) : (
        <p className="text-sm text-rose-500">{L.strategyError}</p>
      )}
    </div>
  );
}

function Metric({ label, value, hint, tone }) {
  const toneCls =
    tone === "green" ? "text-emerald-600" :
    tone === "rose" ? "text-rose-600" :
    tone === "indigo" ? "text-indigo-600" : "text-slate-800";
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

// 波动率微笑：沿 moneyness 的 IV 剖面（凸性 + 偏斜），手写 SVG。
// 默认演示：凸性 0.15、负偏 -0.2（典型股指形态）。非投资建议。
function VolSmile({ spot = 100, baseIV = 0.2, L }) {
  const smile = useMemo(() => volSmile({ spot, baseIV, convexity: 0.15, skew: -0.2, moneynessFrom: 0.8, moneynessTo: 1.2, steps: 11 }), [spot, baseIV]);
  const W = 360, H = 180, pad = 28;
  if (!smile.length) return null;
  const minX = smile[0].moneyness, maxX = smile[smile.length - 1].moneyness;
  const ivs = smile.map((p) => p.iv);
  const minY = Math.min(...ivs), maxY = Math.max(...ivs);
  const sx = (m) => pad + ((m - minX) / (maxX - minX || 1)) * (W - 2 * pad);
  const sy = (iv) => H - pad - ((iv - minY) / (maxY - minY || 1)) * (H - 2 * pad);
  const line = smile.map((p) => `${sx(p.moneyness).toFixed(1)},${sy(p.iv).toFixed(1)}`).join(" ");
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{L.volSmileTitle}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44" role="img" aria-label={L.volSmileTitle}>
        <polyline points={line} fill="none" stroke="#0ea5e9" strokeWidth="2" />
        <text x={pad} y={H - 6} fontSize="10" fill="#94a3b8">m={minX.toFixed(1)}</text>
        <text x={W / 2 - 8} y={H - 6} fontSize="10" fill="#94a3b8">ATM m=1</text>
        <text x={W - pad - 16} y={H - 6} fontSize="10" fill="#94a3b8">m={maxX.toFixed(1)}</text>
        <text x={pad} y={pad - 8} fontSize="10" fill="#0ea5e9">IV {(maxY * 100).toFixed(1)}%</text>
      </svg>
    </div>
  );
}

// 反解隐含波动率：输入市场价 → 输出使 B-S 价相等的 IV
function ReverseIV({ spot, r, t, L }) {
  const [type, setType] = useState("call");
  const [strike, setStrike] = useState(Math.round(spot));
  const [mktPrice, setMktPrice] = useState("");

  const res = useMemo(() => {
    const p = parseFloat(mktPrice);
    if (!(p > 0) || !(strike > 0)) return null;
    try {
      return impliedVol(p, spot, strike, { type, r, t });
    } catch (e) {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mktPrice, type, strike, spot, r, t]);

  return (
    <div className="mt-6 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
      <h2 className="text-lg font-bold mb-1">{L.reverseTitle}</h2>
      <p className="text-slate-500 text-sm mb-4">{L.reverseSubtitle}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label className="text-sm">
          <span className="block text-slate-500 mb-1">{L.direction}</span>
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="call">Call</option>
            <option value="put">Put</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-slate-500 mb-1">{L.strikeInput}</span>
          <input type="number" value={strike} onChange={(e) => setStrike(Number(e.target.value))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="text-sm">
          <span className="block text-slate-500 mb-1">{L.mktPrice}</span>
          <input type="number" step="0.01" value={mktPrice} placeholder="e.g. 10.45"
            onChange={(e) => setMktPrice(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <div className="text-sm flex items-end">
          {res ? (
            res.ok ? (
              <div className="bg-emerald-50 rounded-lg px-3 py-2 w-full">
                <div className="text-xs text-slate-500">{L.impliedIV}</div>
                <div className="text-lg font-bold text-emerald-600 tabular-nums">
                  {(res.iv * 100).toFixed(2)}%
                </div>
              </div>
            ) : (
              <div className="bg-rose-50 rounded-lg px-3 py-2 w-full">
                <div className="text-xs text-slate-500">{L.cannotResolve}</div>
                <div className="text-sm text-rose-600">{L.reasons[res.reason] || res.reason}</div>
              </div>
            )
          ) : (
            <div className="text-xs text-slate-400 pb-2">{L.reverseHint}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// 波动率定位：把当前 IV 放到历史区间 [min,max]，给出 IV Rank 与买方/卖方建议
function VolPositioning({ iv, L }) {
  const [minIv, setMinIv] = useState(10);
  const [maxIv, setMaxIv] = useState(40);

  const curPct = Math.round(iv * 100);
  const rank = ivRank(curPct, [minIv, maxIv]);
  const pct = ivPercentile(curPct, [minIv, maxIv]);
  const cls = classifyIVRank(rank);
  const verdict = cls === "low" ? L.volLow : cls === "high" ? L.volHigh : L.volNeutral;
  const verdictTone = cls === "low" ? "green" : cls === "high" ? "rose" : "slate";

  return (
    <div className="mt-6 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
      <h2 className="text-lg font-bold mb-1">{L.volTitle}</h2>
      <p className="text-slate-500 text-sm mb-4">{L.volSubtitle}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label className="text-sm">
          <span className="block text-slate-500 mb-1">{L.histLow}</span>
          <input type="number" value={minIv} onChange={(e) => setMinIv(Number(e.target.value))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="text-sm">
          <span className="block text-slate-500 mb-1">{L.histHigh}</span>
          <input type="number" value={maxIv} onChange={(e) => setMaxIv(Number(e.target.value))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <Metric label="IV Rank" value={`${rank}%`} tone="indigo" />
        <Metric label={L.ivPercentile} value={`${pct}%`} tone="indigo" />
      </div>

      <div className="mt-4">
        {/* 进度条 */}
        <div className="relative h-3 rounded-full bg-gradient-to-r from-emerald-300 via-amber-200 to-rose-300">
          <div className="absolute -top-1 h-5 w-1 bg-slate-800 rounded"
            style={{ left: `${Math.min(100, Math.max(0, rank))}%` }} />
        </div>
        <div className="flex justify-between text-[11px] text-slate-400 mt-1">
          <span>{L.volLow}</span>
          <span>{L.volHigh}</span>
        </div>
      </div>

      <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${
        verdictTone === "green" ? "bg-emerald-50 text-emerald-700"
        : verdictTone === "rose" ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-600"}`}>
        {verdict}
      </div>
    </div>
  );
}

const zh = {
  title: "期权链 · 波动面",
  subtitle: "Black-Scholes 模型估算 · 价格与希腊字母（Δ Γ Θ V ρ）",
  modelBadge: "模型估算 · 非实时",
  symbol: "标的",
  expiry: "到期",
  expiryDays: "{d} 天",
  ivLabel: "隐含波动率 IV {v}%",
  rLabel: "无风险利率 {v}%",
  spot: "现货价",
  volSmileTitle: "波动率微笑（演示：凸性 + 负偏）— 非投资建议",
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
  rhoTip: "Rho：无风险利率每变动 1% 的价格变化",
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
  greeksLabel: "净希腊字母（Δ Γ Θ V ρ）",
  hedgeLabel: "Δ 中性对冲",
  hedgeUnit: "股",
  hedgeTip: "使净 delta 归零所需标的股数：正数做多、负数做空",
  inRangeLabel: "盈利区概率",
  inRangeTip: "标的到期价落入盈亏平衡带 [be1, be2] 的概率（恰有 2 个平衡点的策略才展示）",
  payoffTitle: "到期盈亏曲线（橙色虚线=盈亏平衡点）",
  unbounded: "∞ 无界",
  credit: "净收入",
  debit: "净支出",
  strategyError: "参数无效，请检查行权价。",
  pop: "盈利概率 POP",
  popHint: "风险中性测度下到期 P/L>0 的概率（lognormal 近似）",
  // 波动率定位
  volTitle: "📈 波动率定位 · IV Rank",
  volSubtitle: "把当前 IV 放到历史区间 [低,高]，定位其在历史中的位置（0-100），指导买/卖方策略。",
  histLow: "历史 IV 低值(%)",
  histHigh: "历史 IV 高值(%)",
  ivPercentile: "IV 百分位",
  impliedMoveTitle: "🎯 到期预期移动 · Implied Move",
  impliedMoveSubtitle: "市场隐含的对数正态到期分布：spot ± spot·iv·√t。非投资建议。",
  oneSigmaRange: "1σ 区间(≈68%)",
  p95Range: "95% 区间(±1.96σ)",
  oneSigmaPct: "1σ 移动",
  atmSpot: "现价",
  volLow: "低 IV · 买方优势",
  volHigh: "高 IV · 卖方优势",
  volNeutral: "中性 · IV 适中",
  // 反解隐含波动率
  reverseTitle: "🔎 反解隐含波动率 (IV)",
  reverseSubtitle: "输入市场价，反解使 Black-Scholes 价相等的隐含波动率（前向 IV→价 的逆运算）。",
  direction: "方向",
  strikeInput: "行权价 K",
  mktPrice: "市场价",
  impliedIV: "隐含波动率",
  cannotResolve: "无法反解",
  reverseHint: "输入市场价以反解 IV…",
  reasons: {
    below_intrinsic: "市场价低于内在价值（非法报价）",
    above_cap: "市场价过高，超出 500% IV 上限",
    floor: "IV 已触底（≈0）",
    degenerate: "参数无效（需 t>0、现价>0）",
  },
};
const en = {
  title: "Options Chain · Volatility Surface",
  subtitle: "Black-Scholes model estimate · price & greeks (Δ Γ Θ V ρ)",
  modelBadge: "Model · Not Live",
  symbol: "Symbol",
  expiry: "Expiry",
  expiryDays: "{d} days",
  ivLabel: "Implied Vol IV {v}%",
  rLabel: "Risk-free rate {v}%",
  spot: "Spot",
  volSmileTitle: "Volatility Smile (demo: convexity + negative skew) — not advice",
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
  rhoTip: "Rho: price change per 1% change in risk-free rate",
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
  greeksLabel: "Net greeks (Δ Γ Θ V ρ)",
  hedgeLabel: "Δ-neutral",
  hedgeUnit: "sh",
  hedgeTip: "Shares to make net delta zero: +long / −short",
  inRangeLabel: "Profit-zone prob.",
  inRangeTip: "Probability the underlying expires inside the break-even band [be1, be2] (shown only for 2 break-even strategies)",
  payoffTitle: "Payoff at expiration (orange dashed = break-even)",
  unbounded: "∞ unbounded",
  credit: "Credit",
  debit: "Debit",
  strategyError: "Invalid parameters, check the strikes.",
  pop: "Prob. of profit (POP)",
  popHint: "Risk-neutral prob that P/L>0 at expiry (lognormal approx.)",
  // Volatility positioning
  volTitle: "📈 Volatility Positioning · IV Rank",
  volSubtitle: "Place the current IV in its historical range [low, high] to rank it (0-100) and guide buy/sell strategy.",
  histLow: "Historical IV low (%)",
  histHigh: "Historical IV high (%)",
  ivPercentile: "IV Percentile",
  impliedMoveTitle: "🎯 Implied Move · Expected Range at Expiry",
  impliedMoveSubtitle: "Lognormal expiry distribution implied by the market: spot ± spot·iv·√t. Not investment advice.",
  oneSigmaRange: "1σ Range (~68%)",
  p95Range: "95% Range (±1.96σ)",
  oneSigmaPct: "1σ Move",
  atmSpot: "Spot",
  volLow: "Low IV · buyer's edge",
  volHigh: "High IV · seller's edge",
  volNeutral: "Neutral · moderate IV",
  // Reverse implied vol
  reverseTitle: "🔎 Reverse Implied Vol (IV)",
  reverseSubtitle: "Enter a market price to back out the IV that makes the Black-Scholes price match (inverse of IV→price).",
  direction: "Direction",
  strikeInput: "Strike K",
  mktPrice: "Market price",
  impliedIV: "Implied vol",
  cannotResolve: "Cannot resolve",
  reverseHint: "Enter a market price to back out IV…",
  reasons: {
    below_intrinsic: "Market price below intrinsic value (invalid quote)",
    above_cap: "Price too high, exceeds 500% IV cap",
    floor: "IV floored at ≈0",
    degenerate: "Invalid parameters (need t>0, spot>0)",
  },
};


