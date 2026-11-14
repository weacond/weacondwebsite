"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import StructuredData from "../components/StructuredData";
import { howToLd, breadcrumbLd } from "../lib/jsonLd";
import { varSummary, VAR_PRESETS } from "../lib/var";
export const metadata = {
  title: "VaR 风险价值计算器 — Weacond",
  description: "参数法(高斯) + 历史法 VaR 与预期短缺 ES(CVaR)；多置信度/持有期。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
const zh = {
  title: "VaR 风险价值计算器",
  subtitle:
    "参数法(高斯)与历史法求 VaR 与预期短缺 ES(CVaR)；支持多置信度与持有期。教育性参考，非投资建议。",
  howToTitle: "如何使用 VaR 风险价值计算器",
  howTo: [
    "输入头寸价值 P、年化收益 μ、年化波动率 σ、持有期(天)与置信度。",
    "选择 90% / 95% / 99% 置信度，或填入历史收益序列做历史法。",
    "读取 VaR（该置信度下最大损失占比）与 ES（超出 VaR 的平均损失）。",
  ],
  valueLabel: "头寸价值 P", muLabel: "年化收益 μ %", sigmaLabel: "年化波动率 σ %",
  horizonLabel: "持有期（天）", confidenceLabel: "置信度", seriesLabel: "历史收益序列（可选，逗号/空格分隔）",
  presetLabels: {
    equityDaily: "股票 日 95%", equityWeekly99: "股票 周 99%", cryptoDaily: "加密 日 95%",
    bondDaily: "债券 日 95%", stress99: "压力 日 99%",
  },
  resultTitle: "结果", varLabel: "VaR（参数法）", varLossLabel: "VaR 损失金额",
  esLabel: "ES / CVaR（参数法）", esLossLabel: "ES 损失金额", zLabel: "分位数 z",
  volHLabel: "持有期波动 σ_h", bandLabel: "风险等级",
  histVarLabel: "VaR（历史法）", histEsLabel: "ES（历史法）", histCountLabel: "样本数",
  bandText: { low: "低", moderate: "中", high: "高", extreme: "极端", invalid: "无效" },
  learnTitle: "学习",
  learn:
    "VaR（风险价值）衡量在给定置信度与持有期内的最大预期损失：参数法假设收益服从正态分布，VaR = z·σ_h − μ_h，其中 σ_h=σ·√(h/252)、z=Φ⁻¹(置信度)；ES（条件 VaR/预期短缺）是超出 VaR 的尾部平均损失，恒 ≥ VaR，更能刻画极端风险。历史法则直接取收益序列的分位数，不假设正态。两者都依赖波动率与分布假设，对肥尾/相关性突变并不稳健。",
};
const en = {
  title: "Value at Risk (VaR)",
  subtitle:
    "Parametric (Gaussian) and historical VaR plus expected shortfall ES (CVaR); multiple confidence levels and horizons. Educational, not investment advice.",
  howToTitle: "How to use the VaR calculator",
  howTo: [
    "Enter position value P, annualized μ, annualized σ, holding period (days) and confidence.",
    "Pick 90% / 95% / 99% confidence, or paste a return series for the historical method.",
    "Read VaR (max loss at that confidence) and ES (mean loss beyond VaR).",
  ],
  valueLabel: "Position Value P", muLabel: "Annual Return μ %", sigmaLabel: "Annual Vol σ %",
  horizonLabel: "Holding Period (days)", confidenceLabel: "Confidence",
  seriesLabel: "Return series (optional, comma/space separated)",
  presetLabels: {
    equityDaily: "Equity daily 95%", equityWeekly99: "Equity weekly 99%", cryptoDaily: "Crypto daily 95%",
    bondDaily: "Bond daily 95%", stress99: "Stress daily 99%",
  },
  resultTitle: "Results", varLabel: "VaR (parametric)", varLossLabel: "VaR loss",
  esLabel: "ES / CVaR (parametric)", esLossLabel: "ES loss", zLabel: "Quantile z",
  volHLabel: "Holding vol σ_h", bandLabel: "Risk level",
  histVarLabel: "VaR (historical)", histEsLabel: "ES (historical)", histCountLabel: "Samples",
  bandText: { low: "Low", moderate: "Moderate", high: "High", extreme: "Extreme", invalid: "Invalid" },
  learnTitle: "Learn",
  learn:
    "Value at Risk (VaR) measures the maximum expected loss at a given confidence and horizon. The parametric method assumes normal returns: VaR = z·σ_h − μ_h, where σ_h=σ·√(h/252) and z=Φ⁻¹(confidence). Expected shortfall (ES / CVaR) is the average loss beyond VaR; it is always ≥ VaR and better captures tail risk. The historical method takes quantiles of the series without assuming normality. Both rely on volatility and distributional assumptions and are not robust to fat tails or correlation shifts.",
};
function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return "$" + x.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(3) + "%";
}
function fmtX(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(4);
}

export default function VarPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [value, setValue] = useState(1000000);
  const [mu, setMu] = useState(10);
  const [sigma, setSigma] = useState(20);
  const [horizon, setHorizon] = useState(1);
  const [confidence, setConfidence] = useState(95);
  const [series, setSeries] = useState("");

  const res = useMemo(
    () =>
      varSummary({
        positionValue: value,
        mu: mu / 100,
        sigma: sigma / 100,
        horizonDays: horizon,
        confidence: confidence / 100,
        series: series.trim() ? series : undefined,
      }),
    [value, mu, sigma, horizon, confidence, series],
  );
  const applyPreset = (p) => {
    setValue(p.positionValue);
    setMu(p.mu * 100);
    setSigma(p.sigma * 100);
    setHorizon(p.horizonDays);
    setConfidence(Math.round(p.confidence * 100));
  };
  const band = res.valid ? res.band : "invalid";
  const bandColor =
    band === "low" ? "text-emerald-600" :
    band === "moderate" ? "text-amber-600" :
    band === "high" ? "text-orange-600" :
    band === "extreme" ? "text-rose-600" :
    "text-slate-400";
  const hist = res.valid ? res.historical : null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="var" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/var"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Value at Risk", href: "/var" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(VAR_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels[p.id] || p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <label className="block">
              <span className="text-xs text-slate-500">{L.valueLabel}</span>
              <input type="number" value={value} min={0} step={1000}
                onChange={(e) => setValue(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.muLabel}</span>
              <input type="number" value={mu} step={0.1}
                onChange={(e) => setMu(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.sigmaLabel}</span>
              <input type="number" value={sigma} min={0} step={0.1}
                onChange={(e) => setSigma(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.horizonLabel}</span>
              <input type="number" value={horizon} min={0} step={1}
                onChange={(e) => setHorizon(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <div className="col-span-2">
              <span className="text-xs text-slate-500">{L.confidenceLabel}</span>
              <div className="flex gap-2 mt-1">
                {[90, 95, 99].map((c) => (
                  <button key={c} onClick={() => setConfidence(c)}
                    className={"flex-1 px-3 py-2 rounded-lg text-sm border transition " +
                      (confidence === c ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 hover:border-indigo-300")}>
                    {c}%
                  </button>
                ))}
              </div>
            </div>
            <label className="block col-span-2">
              <span className="text-xs text-slate-500">{L.seriesLabel}</span>
              <input type="text" value={series} placeholder="0.01, -0.02, 0.03, ..."
                onChange={(e) => setSeries(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">{L.resultTitle}</h2>
            {res.valid ? (
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-slate-400">{L.varLabel}</div><div className="font-mono text-lg text-indigo-600">{fmtPct(res.varPct)}</div></div>
                <div><div className="text-xs text-slate-400">{L.varLossLabel}</div><div className="font-mono text-lg">{fmtMoney(res.varLoss)}</div></div>
                <div><div className="text-xs text-slate-400">{L.esLabel}</div><div className="font-mono text-lg text-rose-600">{fmtPct(res.esPct)}</div></div>
                <div><div className="text-xs text-slate-400">{L.esLossLabel}</div><div className="font-mono text-lg">{fmtMoney(res.esLoss)}</div></div>
                <div><div className="text-xs text-slate-400">{L.zLabel}</div><div className="font-mono text-lg">{fmtX(res.z)}</div></div>
                <div><div className="text-xs text-slate-400">{L.volHLabel}</div><div className="font-mono text-lg">{fmtPct(res.sigmaH)}</div></div>
                <div>
                  <div className="text-xs text-slate-400">{L.bandLabel}</div>
                  <div className={"font-semibold " + bandColor}>{L.bandText[band] || band}</div>
                </div>
              </div>
            ) : <p className="text-slate-400 text-sm">{L.subtitle}</p>}
            {hist && hist.valid && (
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3">
                <div><div className="text-xs text-slate-400">{L.histVarLabel}</div><div className="font-mono text-lg">{fmtPct(hist.varPct)}</div></div>
                <div><div className="text-xs text-slate-400">{L.histEsLabel}</div><div className="font-mono text-lg">{fmtPct(hist.esPct)}</div></div>
                <div><div className="text-xs text-slate-400">{L.histCountLabel}</div><div className="font-mono text-lg">{hist.count}</div></div>
              </div>
            )}
          </div>
          <div className="bg-indigo-50 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-indigo-900 mb-2">{L.learnTitle}</h2>
            <p className="text-sm text-indigo-800 leading-relaxed">{L.learn}</p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

