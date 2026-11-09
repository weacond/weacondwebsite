"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import { computeOptionChain } from "../lib/options.js";
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
};


