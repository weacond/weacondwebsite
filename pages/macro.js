import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import { useState, useEffect } from "react";
import { assessMacroState, correlationMatrix, classifyCorrelation, SAMPLE_MACRO_SERIES, marketRegime } from "../lib/macro";
import Head from "next/head";

export const metadata = {
  title: "宏观情绪 — Weacond",
  description: "宏观状态识别、风险评分与资产配置建议",
  robots: { index: true, follow: true },
};

// 默认（演示）宏观指标：VIX 可被真实行情覆盖；其余（利率/通胀/就业/信用利差）为演示占位，需 FRED 数据源
const DEMO_INDICATORS = {
  rates: 4.5,
  inflation: 3.2,
  employment: 100,
  vix: 14.2,
  credit_spread: 1.1,
};

// 演示国债收益率曲线（FRED 未配置时的回退；期限 → 收益率 %）
const DEMO_YIELD_CURVE = [
  { term: "1M", yield: 5.3 },
  { term: "3M", yield: 5.3 },
  { term: "6M", yield: 5.2 },
  { term: "2Y", yield: 4.4 },
  { term: "5Y", yield: 4.2 },
  { term: "10Y", yield: 4.3 },
];

// 市场状态（regime）中英标签 + 完整徽章类（避免 Tailwind 动态类被 purge）
const REGIME_LABELS = {
  crisis: { zh: "危机", en: "Crisis", badge: "bg-red-100 text-red-700" },
  stagflation: { zh: "滞胀", en: "Stagflation", badge: "bg-orange-100 text-orange-700" },
  liquidity_blow: { zh: "流动性宽松", en: "Liquidity Boom", badge: "bg-green-100 text-green-700" },
  bull: { zh: "牛市", en: "Bull", badge: "bg-green-100 text-green-700" },
  neutral: { zh: "中性", en: "Neutral", badge: "bg-slate-100 text-slate-700" },
};

// 价格/波动状态（regime）标签：由 marketRegime 输出 bull/bear/range/crisis 映射
const PRICE_REGIME_LABELS = {
  bull: { zh: "趋势上行", en: "Trending Up", badge: "bg-green-100 text-green-700" },
  bear: { zh: "趋势下行", en: "Trending Down", badge: "bg-red-100 text-red-700" },
  range: { zh: "区间震荡", en: "Range-bound", badge: "bg-slate-100 text-slate-700" },
  crisis: { zh: "高波动/危机", en: "High-Vol / Crisis", badge: "bg-red-100 text-red-700" },
};

// 演示用市场日收益序列（确定性、非实时）：温和上行、低波动 → 趋势上行
const DEMO_MARKET_RETURNS = [0.0008, 0.0012, -0.0005, 0.001, 0.0006, 0.0015, -0.0003, 0.0009, 0.0007, 0.0011];

// 风险配色
function riskColor(score) {
  if (score >= 70) return "text-red-600";
  if (score >= 40) return "text-orange-500";
  return "text-green-600";
}

// 相关性矩阵（确定性演示序列；接入真实多指标后替换 SAMPLE_MACRO_SERIES 即可）
const CORR = correlationMatrix(SAMPLE_MACRO_SERIES);
const CORRELATION_LABELS = {
  利率: { zh: "利率", en: "Rates" },
  信用利差: { zh: "信用利差", en: "Credit Spread" },
  VIX: { zh: "VIX", en: "VIX" },
  股市: { zh: "股市", en: "Equity" },
};
const CORRELATION_STRENGTH = {
  strong: { zh: "强", en: "Strong" },
  moderate: { zh: "中", en: "Moderate" },
  weak: { zh: "弱", en: "Weak" },
  "n/a": { zh: "—", en: "—" },
};
export default function MacroPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [vix, setVix] = useState(DEMO_INDICATORS.vix);
  const [dataSource, setDataSource] = useState("demo");
  const [loadingVix, setLoadingVix] = useState(false);
  const [vixNote, setVixNote] = useState("");
  const [vixSeries, setVixSeries] = useState([]);
  const [fred, setFred] = useState(null);
  const [fredLive, setFredLive] = useState(null);
  const [fredNote, setFredNote] = useState("");
  const [yieldCurve, setYieldCurve] = useState(DEMO_YIELD_CURVE);
  const [yieldLive, setYieldLive] = useState(null);
  const [yieldNote, setYieldNote] = useState("");

  // 用当前 VIX（演示或真实）重新评估宏观状态；其余指标暂用演示占位
  const MACRO = assessMacroState({ ...DEMO_INDICATORS, vix });
  const regime = REGIME_LABELS[MACRO.regime] || REGIME_LABELS.neutral;
  // 价格/波动状态：由演示收益序列 + 当前 VIX 判定（与因子状态互补）
  const priceRegime = marketRegime(DEMO_MARKET_RETURNS, { vix, periods: 252 });
  const priceRegimeLabel = PRICE_REGIME_LABELS[priceRegime.regime] || PRICE_REGIME_LABELS.range;

  // 拉取真实 VIX（Alpha Vantage）；无 key 时接口返回演示数据并标 live:false，此处诚实标注
  const loadRealVix = async () => {
    setLoadingVix(true); setVixNote("");
    try {
      const res = await fetch("/api/marketdata?symbol=VIX&interval=Daily&months=3");
      if (!res.ok) throw new Error(`${lang === "en" ? "Market API returned" : "行情接口返回"} ${res.status}`);
      const data = await res.json();
      const candles = data.candles || [];
      const last = candles[candles.length - 1];
      if (!last || !last.close) throw new Error(lang === "en" ? "No VIX data returned" : "未获取到 VIX 数据");
      setVixSeries(candles.map((c) => ({ date: c.date, close: Number(c.close) })));
      setVix(Number(last.close));
      setDataSource(data.live ? "live" : "demo");
      setVixNote(data.live
        ? (lang === "en" ? `VIX ${last.close} (live, ${last.date?.slice(0, 10)})` : `VIX ${last.close}（实时 · ${last.date?.slice(0, 10)}）`)
        : (lang === "en" ? "No API key configured — showing demo VIX" : "未配置 API key — 显示演示 VIX"));
    } catch (e) {
      setVixNote(e.message || "Failed to load VIX");
    } finally {
      setLoadingVix(false);
    }
  };

  // 拉取 FRED 宏观系列（利率/通胀/就业/信用利差）；无 key 时接口可能返回空，诚实标注
  const loadFred = async () => {
    try {
      const res = await fetch("/api/marketdata?fred=DFF,CPIAUCSL,UNRATE,BAMLC0A0CM");
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const series = data.series || {};
      setFred(series);
      setFredLive(!!data.live);
      const got = Object.keys(series).length;
      setFredNote(
        got === 0
          ? (lang === "en"
              ? "FRED macro data unavailable (set FREDSERIESKEY / ALPHA_VANTAGE_API_KEY to enable)."
              : "FRED 宏观数据暂不可用（配置 FREDSERIESKEY / ALPHA_VANTAGE_API_KEY 后可启用）。")
          : (lang === "en"
              ? `Live FRED macro data: ${got}/4 series.`
              : `FRED 实时宏观数据：已获取 ${got}/4 系列。`)
      );
    } catch {
      setFred(null);
      setFredLive(null);
      setFredNote("");
    }
  };

  // 拉取 FRED 国债收益率曲线（DGS1MO/3MO/6MO/2/5/10）：期限 → 最新收益率；无 key 回退演示曲线
  const loadYieldCurve = async () => {
    try {
      const res = await fetch("/api/marketdata?fred=DGS1MO,DGS3MO,DGS6MO,DGS2,DGS5,DGS10");
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const series = data.series || {};
      const terms = [
        { id: "DGS1MO", label: "1M" },
        { id: "DGS3MO", label: "3M" },
        { id: "DGS6MO", label: "6M" },
        { id: "DGS2", label: "2Y" },
        { id: "DGS5", label: "5Y" },
        { id: "DGS10", label: "10Y" },
      ];
      const curve = terms
        .map((t) => {
          const arr = series[t.id];
          if (!arr || !arr.length) return null;
          const last = arr[arr.length - 1];
          return { term: t.label, yield: Number(last.value), date: last.date };
        })
        .filter(Boolean);
      if (curve.length >= 2) {
        setYieldCurve(curve);
        setYieldLive(!!data.live);
        setYieldNote(data.live
          ? (lang === "en" ? `Live treasury yields · ${curve[curve.length - 1].date?.slice(0, 10) || ""}` : `实时国债收益率 · ${curve[curve.length - 1].date?.slice(0, 10) || ""}`)
          : (lang === "en" ? "Demo yields — no FRED key configured" : "演示收益率 — 未配置 FRED key"));
      } else {
        setYieldLive(data.live ? false : null);
        setYieldNote(data.live
          ? (lang === "en" ? "No FRED treasury data returned" : "FRED 未返回国债数据")
          : (lang === "en" ? "Demo yields — no FRED key configured" : "演示收益率 — 未配置 FRED key"));
      }
    } catch (e) {
      setYieldNote(e.message || "Failed to load yield curve");
    }
  };

  useEffect(() => { loadFred(); loadYieldCurve(); }, []);

  // FRED 系列辅助：取最近值 + 近 3 月变化（趋势箭头）；数据不足返回 null → 演示兜底
  const fredCard = (id, decimals = 2, suffix = "") => {
    const s = fred && fred[id];
    if (!s || s.length < 2) return null;
    const last = s[s.length - 1].value;
    const prev = s[Math.max(0, s.length - 4)].value;
    const change = prev ? ((last - prev) / prev) * 100 : 0;
    return { value: last.toFixed(decimals) + suffix, trend: change >= 0 ? "up" : "down", live: !!fredLive };
  };
  const fRates = fredCard("DFF", 2, "%");
  const fInflation = fredCard("CPIAUCSL", 1, "");
  const fCredit = fredCard("BAMLC0A0CM", 1, "%");
  const fEmployment = fredCard("UNRATE", 1, "%");

  // 宏观指标（带单位 + 解读）；rates/inflation/credit/employment 用 FRED 实时值，无 key 时演示兜底
  const indicators = [
    { key: "rates", label: lang === "en" ? "Fed Funds Rate" : "联邦基金利率", value: fRates ? fRates.value : MACRO.indicators.rates, unit: "", trend: fRates ? fRates.trend : null, live: fRates ? fRates.live : null },
    { key: "inflation", label: lang === "en" ? "Inflation (CPI)" : "通胀 CPI", value: fInflation ? fInflation.value : MACRO.indicators.inflation, unit: "", trend: fInflation ? fInflation.trend : null, live: fInflation ? fInflation.live : null },
    { key: "vix", label: "VIX", value: MACRO.indicators.vix, unit: "", trend: null, live: dataSource === "live" },
    { key: "credit_spread", label: lang === "en" ? "Credit Spread" : "信用利差", value: fCredit ? fCredit.value : MACRO.indicators.credit_spread, unit: "", trend: fCredit ? fCredit.trend : null, live: fCredit ? fCredit.live : null },
    { key: "employment", label: lang === "en" ? "Unemployment Rate" : "失业率", value: fEmployment ? fEmployment.value : MACRO.indicators.employment, unit: "", trend: fEmployment ? fEmployment.trend : null, live: fEmployment ? fEmployment.live : null },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">{L.title}</h1>
              <p className="text-slate-500 text-sm mt-1">{L.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadRealVix} disabled={loadingVix}
                className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {loadingVix ? "…" : (lang === "en" ? "Load live VIX" : "加载实时 VIX")}
              </button>
              <span className={`text-xs px-3 py-1 rounded-full ${dataSource === "live" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                {dataSource === "live" ? (lang === "en" ? "Live VIX" : "实时 VIX") : L.demoLabel}
              </span>
            </div>
          </div>

          {/* 状态 + 风险分 */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="text-sm text-slate-400 mb-1">{L.regime}</div>
              <div className="text-3xl font-bold">
                <span className={`px-3 py-1 rounded-full ${regime.badge}`}>
                  {lang === "en" ? regime.en : regime.zh}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xs text-slate-400 mb-1">{L.priceRegime}</div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-sm ${priceRegimeLabel.badge}`}>
                    {lang === "en" ? priceRegimeLabel.en : priceRegimeLabel.zh}
                  </span>
                  <span className="text-xs text-slate-400">vol {(priceRegime.vol * 100).toFixed(1)}%</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-3">{L.summary}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="text-sm text-slate-400 mb-1">{L.riskScore}</div>
              <div className={`text-3xl font-bold ${riskColor(MACRO.riskScore)}`}>
                {MACRO.riskScore}
                <span className="text-base text-slate-400 font-normal"> / 100</span>
              </div>
              <p className="text-sm text-slate-500 mt-3">{L.riskNote}</p>
            </div>
          </div>

          {/* 宏观指标 */}
          <h2 className="text-lg font-bold mb-3">{L.indicators}</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {indicators.map((i) => (
              <div key={i.key} className="bg-white rounded-lg p-4 border border-slate-100 text-center">
                <div className="text-xs text-slate-400 mb-1">{i.label}</div>
                <div className="text-2xl font-bold">{i.value}{i.unit}{i.trend === "up" ? " ▲" : i.trend === "down" ? " ▼" : ""}</div>
                {i.live !== null && (
                  <div className={`text-xs mt-1 ${i.live ? "text-green-600 font-medium" : "text-slate-400"}`}>
                    {i.live ? (lang === "en" ? "live FRED" : "实时 FRED") : (lang === "en" ? "demo" : "演示")}
                  </div>
                )}
              </div>
            ))}
          </div>
          {vixNote && (
            <p className={`text-xs mb-8 ${dataSource === "live" ? "text-green-600" : "text-amber-600"}`}>{vixNote}</p>
          )}
          {fredNote && (
            <p className={`text-xs mb-8 ${fredLive ? "text-green-600" : "text-amber-600"}`}>{fredNote}</p>
          )}

          {/* VIX 走势迷你图 */}
          {vixSeries.length > 1 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{L.vixTrend}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${dataSource === "live" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {dataSource === "live" ? (lang === "en" ? "Live" : "实时") : (lang === "en" ? "Demo" : "演示")}
                </span>
              </div>
              <VixSparkline data={vixSeries} />
              <div className="flex gap-4 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-amber-500" />{lang === "en" ? "VIX 20 (elevated)" : "VIX 20（偏高）"}</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-red-500" />{lang === "en" ? "VIX 30 (crisis)" : "VIX 30（危机）"}</span>
              </div>
            </div>
          )}

          {/* 国债收益率曲线（FRED）：期限 → 收益率；倒挂 = 衰退信号 */}
          {yieldCurve.length > 1 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{L.yieldCurve}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${yieldLive === true ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {yieldLive === true ? (lang === "en" ? "Live" : "实时") : (lang === "en" ? "Demo" : "演示")}
                </span>
              </div>
              <YieldCurveSvg data={yieldCurve} />
              {yieldNote && <p className="text-xs text-slate-400 mt-2">{yieldNote}</p>}
            </div>
          )}

          {/* 相关性矩阵 */}
          <h2 className="text-lg font-bold mt-8 mb-3">{L.correlationTitle}</h2>
          <p className="text-xs text-slate-400 mb-3">{L.correlationHint}</p>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <CorrelationMatrix names={CORR.names} matrix={CORR.matrix} lang={lang} />
            <p className="mt-3 text-xs text-slate-500">
              {L.strongestPair}{" "}
              <b>
                {CORRELATION_LABELS[CORR.strongest.a]?.[lang] || CORR.strongest.a} ↔{" "}
                {CORRELATION_LABELS[CORR.strongest.b]?.[lang] || CORR.strongest.b}
              </b>{" "}
              r={CORR.strongest.r?.toFixed?.(2)}
              （{CORRELATION_STRENGTH[classifyCorrelation(CORR.strongest.r).magnitude]?.[lang]}）
            </p>
          </div>

          {/* 配置建议 */}
          <h2 className="text-lg font-bold mb-3">{L.allocation}</h2>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b">
                  <th className="pb-2 font-medium">{L.asset}</th>
                  <th className="pb-2 font-medium">{L.allocation}</th>
                  <th className="pb-2 font-medium">{L.reason}</th>
                </tr>
              </thead>
              <tbody>
                {MACRO.suggestions.map((s, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 font-medium">{s.asset}</td>
                    <td className="py-2 text-indigo-600 font-semibold">{s.allocation}</td>
                    <td className="py-2 text-slate-500">{s.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-400 mt-6 text-center">{L.disclaimer}</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

// VIX 走势迷你图（含 20/30 阈值参考线）
function VixSparkline({ data }) {
  const W = 800;
  const H = 120;
  const pad = 6;
  const closes = data.map((d) => d.close);
  const min = Math.min(...closes, 15);
  const max = Math.max(...closes, 30);
  const range = max - min || 1;
  const x = (i) => (i / (data.length - 1)) * W;
  const y = (v) => H - pad - ((v - min) / range) * (H - pad * 2);
  const points = data.map((d, i) => `${x(i).toFixed(1)},${y(d.close).toFixed(1)}`).join(" ");
  const y20 = y(20);
  const y30 = y(30);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
      {20 >= min && 20 <= max && <line x1="0" y1={y20} x2={W} y2={y20} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" />}
      {30 >= min && 30 <= max && <line x1="0" y1={y30} x2={W} y2={y30} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 3" />}
      <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="1.5" />
    </svg>
  );
}

/** 国债收益率曲线：期限(1M…10Y) → 收益率；2Y>10Y 倒挂标红（衰退信号） */
function YieldCurveSvg({ data }) {
  const W = 800, H = 160, padX = 40, padY = 26;
  const ys = data.map((d) => d.yield);
  const min = Math.min(...ys, 0);
  const max = Math.max(...ys, 6);
  const range = max - min || 1;
  const n = data.length;
  const x = (i) => padX + (i / (n - 1)) * (W - 2 * padX);
  const y = (v) => padY + ((max - v) / range) * (H - 2 * padY);
  const points = data.map((d, i) => `${x(i).toFixed(1)},${y(d.yield).toFixed(1)}`).join(" ");
  const twoY = data.find((d) => d.term === "2Y");
  const tenY = data.find((d) => d.term === "10Y");
  const inverted = twoY && tenY ? twoY.yield > tenY.yield : false;
  const stroke = inverted ? "#ef4444" : "#6366f1";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" />
      {data.map((d, i) => (
        <g key={d.term}>
          <circle cx={x(i)} cy={y(d.yield)} r="3.5" fill={stroke} />
          <text x={x(i)} y={y(d.yield) - 9} textAnchor="middle" fontSize="11" fill="#334155">{d.yield.toFixed(2)}</text>
          <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.term}</text>
        </g>
      ))}
    </svg>
  );
}

/** 相关性矩阵热力图：对角线灰；正相关绿、负相关红，色深 ∝ |r|。|r|≥0.4 字用白色。 */
function CorrelationMatrix({ names, matrix, lang }) {
  const cellStyle = (r, i, j) => {
    if (i === j) return { background: "rgb(226,232,240)" };
    if (Number.isNaN(r)) return { background: "rgb(248,250,252)" };
    const a = Math.abs(r);
    const strength = a >= 0.7 ? 0.9 : a >= 0.4 ? 0.55 : 0.25;
    return { background: r > 0 ? `rgba(16,185,129,${strength})` : `rgba(239,68,68,${strength})` };
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-slate-400 font-normal"></th>
            {names.map((n) => (
              <th key={n} className="p-2 text-slate-600 font-medium">
                {CORRELATION_LABELS[n]?.[lang] || n}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={names[i]}>
              <td className="p-2 text-slate-600 font-medium">{CORRELATION_LABELS[names[i]]?.[lang] || names[i]}</td>
              {row.map((r, j) => (
                <td
                  key={j}
                  className="p-2 text-center tabular-nums"
                  style={cellStyle(r, i, j)}
                >
                  <span
                    className={
                      i === j
                        ? "text-slate-400"
                        : Math.abs(r) >= 0.4
                        ? "text-white"
                        : "text-slate-700"
                    }
                  >
                    {Number.isNaN(r) ? "—" : r.toFixed(2)}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const zh = {
  title: "宏观情绪",
  subtitle: "市场状态识别 · 风险评分 · 资产配置建议（引擎评估）",
  demoLabel: "示例数据 · 非实时",
  regime: "当前市场状态",
  priceRegime: "价格/波动状态（趋势·波动）",
  riskScore: "风险评分",
  riskNote: "综合 VIX、信用利差、通胀与利率；越高越需防御与现金。",
  summary: "状态决定配置基调：危机/滞胀偏防御，宽松/牛市偏进攻，中性均衡。",
  indicators: "宏观指标",
  vixTrend: "VIX 走势",
  yieldCurve: "国债收益率曲线",
  allocation: "资产配置建议",
  correlationTitle: "宏观指标相关性矩阵",
  correlationHint: "Pearson 相关系数 r∈[-1,1]。正相关=同向（绿），负相关=反向（红），色深 ∝ |r|。演示序列，接入真实多指标后替换。",
  strongestPair: "最强相关：",
  asset: "资产",
  reason: "理由",
  disclaimer: "基于 lib/macro 引擎评估；VIX 可加载实时行情，其余指标为演示占位。配置建议非投资建议。",
};
const en = {
  title: "Market Sentiment",
  subtitle: "Regime detection · Risk score · Allocation (engine-evaluated)",
  demoLabel: "Demo Data · Not Live",
  regime: "Current Regime",
  priceRegime: "Price / Vol Regime (trend · vol)",
  riskScore: "Risk Score",
  riskNote: "Composite of VIX, credit spread, inflation & rates; higher = more defensive.",
  summary: "Regime sets the tone: crisis/stagflation lean defensive, boom/bull lean aggressive, neutral is balanced.",
  indicators: "Macro Indicators",
  vixTrend: "VIX Trend",
  yieldCurve: "Yield Curve",
  allocation: "Allocation Suggestions",
  correlationTitle: "Macro Indicator Correlation Matrix",
  correlationHint: "Pearson correlation r∈[-1,1]. Positive=co-movement (green), negative=inverse (red), shade ∝ |r|. Demo series; swap in live multi-indicator data.",
  strongestPair: "Strongest pair:",
  asset: "Asset",
  reason: "Reason",
  disclaimer: "Evaluated by lib/macro; VIX can load live data, other indicators are demo placeholders. Allocation suggestions are not investment advice.",
};

