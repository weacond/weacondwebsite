"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { valueAtRisk, expectedShortfall, maxDrawdown, detectTailEvents, excessKurtosis, skewness, ulcerIndex, monteCarloDrawdown } from "../lib/risk.js";
import { detectBlackSwan } from "../lib/signals.js";

export const metadata = {
  title: "黑天鹅防御 — Weacond",
  description: "尾部风险识别与对冲，从2008到2020的历史复盘",
  robots: { index: true, follow: true },
};

const RISK_FACTORS = [
  { name: "VIX 恐慌指数", value: 18.5, level: "normal", desc: "当前市场恐慌水平" },
  { name: "信用利差", value: "1.2%", level: "normal", desc: "投资级债券利差" },
  { name: "期限利差", value: "1.8%", level: "normal", desc: "10Y-2Y 利差" },
  { name: "融资余额", value: "$610B", level: "elevated", desc: "保证金交易规模" },
  { name: "Put/Call 比率", value: "0.95", level: "normal", desc: "期权市场情绪" },
  { name: "实际利率", value: "2.1%", level: "elevated", desc: "TIPS 收益率" },
];

const HEDGE_SUGGESTIONS = [
  { risk: "VIX > 30", action: "买入 SPY 1.0 Put", cost: "0.5% 权利金", desc: "尾部对冲" },
  { risk: "信用利差 > 2%", action: "增配 TLT (长债)", cost: "分散化", desc: "流动性危机保护" },
  { risk: "期限利差倒挂", action: "减配周期股", cost: "减仓", desc: "衰退预警" },
  { risk: "融资余额 > $700B", action: "降低杠杆", cost: "风控", desc: "强制平仓风险" },
];

// 尾部风险度量样本（确定性示意数据，非实时）
const SAMPLE_EQUITY = [100, 102, 98, 105, 110, 95, 88, 92, 100, 108, 115, 100];
const SAMPLE_RETURNS = [0.01, -0.02, 0.01, -0.03, 0.02, -0.05, 0.01, -0.02, 0.01, -0.1, 0.02, 0.01];
const RISK_METRICS = {
  var95: valueAtRisk(SAMPLE_RETURNS, 0.95),
  cvar95: expectedShortfall(SAMPLE_RETURNS, 0.95),
  mdd: maxDrawdown(SAMPLE_EQUITY),
  tailCount: detectTailEvents(SAMPLE_RETURNS, 3).count,
  kurtosis: excessKurtosis(SAMPLE_RETURNS),
  skew: skewness(SAMPLE_RETURNS),
  ulcer: ulcerIndex(SAMPLE_EQUITY),
};

// 蒙特卡洛压力测试（确定性：seed 固定，结果可复现）：模拟 60 期最大回撤分布 + 路径扇形
const MC_STRESS = monteCarloDrawdown(SAMPLE_RETURNS, {
  nPaths: 2000,
  horizon: 60,
  seed: 1,
  percentiles: [0.05, 0.5, 0.95],
  paths: 40, // 额外返回 40 条代表性路径 + p5/p50/p95 分位带，用于扇形图
});

export default function BlackSwanPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  // 实时黑天鹅检测：detectBlackSwan 评估「现在是否正在发生尾部事件」。
  // 默认用演示数据（VIX 18.5 / 分位 50 / 样本收益）保证始终有内容；挂载后拉真实 VIX 覆盖并标 live。
  const DEMO_VERDICT = detectBlackSwan({ vix: 18.5, vixPercentile: 50, returns: SAMPLE_RETURNS, sectorCorrelation: 0.5 });
  const [verdict, setVerdict] = useState(DEMO_VERDICT);
  const [vixLive, setVixLive] = useState(null);
  const [vixPctLive, setVixPctLive] = useState(50);
  const [bsLive, setBsLive] = useState(false);
  const [bsLoading, setBsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setBsLoading(true);
      try {
        const res = await fetch("/api/marketdata?symbol=VIX&interval=Daily&months=12");
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        const candles = data.candles || [];
        if (candles.length < 5) throw new Error("no vix");
        const closes = candles.map((c) => Number(c.close)).filter((x) => Number.isFinite(x));
        const vix = closes[closes.length - 1];
        const pct = (closes.filter((x) => x <= vix).length / closes.length) * 100;
        const v = detectBlackSwan({ vix, vixPercentile: pct, returns: SAMPLE_RETURNS, sectorCorrelation: 0.5 });
        if (cancelled) return;
        setVixLive(vix);
        setVixPctLive(pct);
        setVerdict(v);
        setBsLive(!!data.live);
      } catch {
        // 失败 → 保留演示 verdict，诚实标注为示意
      } finally {
        if (!cancelled) setBsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-8">{L.subtitle}</p>

          {/* 实时黑天鹅检测（detectBlackSwan：VIX 分位 + 尾部事件 + 板块相关性） */}
          <div className={`rounded-xl p-6 shadow-sm border mb-8 ${verdict.triggered ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{L.detectorTitle}</h3>
              <span className="text-xs text-slate-500">
                {bsLoading ? L.detectorLoading : bsLive ? L.detectorLive : L.detectorDemo}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className={`text-2xl font-bold ${verdict.triggered ? "text-red-600" : "text-green-600"}`}>
                {verdict.triggered ? L.detectorTriggered : L.detectorCalm}
              </span>
              <span className="text-xs text-slate-500">
                {L.detectorVix} {vixLive != null ? vixLive.toFixed(1) : "—"} · {L.detectorPct} {vixPctLive.toFixed(0)}%
              </span>
            </div>
            {verdict.triggered ? (
              <>
                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-600 mb-2">{L.detectorTriggers}</div>
                  <ul className="space-y-1 text-sm text-red-700 list-disc list-inside">
                    {verdict.triggers.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-600 mb-2">{L.detectorRecs}</div>
                  <ul className="space-y-1 text-sm text-slate-700 list-decimal list-inside">
                    {verdict.recommendations.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-600">{L.detectorCalmNote}</p>
            )}
          </div>

          {/* 风险因子仪表盘 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-8">
            <h3 className="font-semibold mb-4">{L.riskFactors}</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {RISK_FACTORS.map((f) => (
                <div key={f.name} className={`p-4 rounded-lg border ${f.level === "elevated" ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"}`}>
                  <div className="text-xs text-slate-500">{f.name}</div>
                  <div className="text-2xl font-bold mt-1">{f.value}</div>
                  <div className="text-xs text-slate-400 mt-1">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 对冲建议 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-8">
            <h3 className="font-semibold mb-4">{L.hedgeSuggestions}</h3>
            <div className="space-y-3">
              {HEDGE_SUGGESTIONS.map((h, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-mono text-red-600 bg-red-50 px-2 py-1 rounded">{h.risk}</span>
                  <span className="text-sm font-medium">{h.action}</span>
                  <span className="text-xs text-slate-400">{h.cost} · {h.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 尾部风险度量 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-8">
            <h3 className="font-semibold mb-1">{L.riskMetrics}</h3>
            <p className="text-xs text-slate-400 mb-4">{L.riskMetricsHint}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <RiskStat label={L.varLabel} value={`−${(RISK_METRICS.var95 * 100).toFixed(2)}%`} />
              <RiskStat label={L.cvarLabel} value={`−${(RISK_METRICS.cvar95 * 100).toFixed(2)}%`} />
              <RiskStat label={L.mddLabel} value={`−${(RISK_METRICS.mdd * 100).toFixed(2)}%`} />
              <RiskStat label={L.tailEvents} value={`${RISK_METRICS.tailCount}`} />
              <RiskStat label={L.kurtosisLabel} value={RISK_METRICS.kurtosis.toFixed(2)} />
              <RiskStat label={L.skewLabel} value={RISK_METRICS.skew.toFixed(2)} />
              <RiskStat label={L.ulcerLabel} value={`${(RISK_METRICS.ulcer * 100).toFixed(2)}%`} />
            </div>
          </div>

          {/* 蒙特卡洛压力测试：模拟最大回撤分位（确定性 seed，可复现） */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-8">
            <h3 className="font-semibold mb-1">{L.monteCarlo}</h3>
            <p className="text-xs text-slate-400 mb-4">{L.monteCarloHint}</p>
            <div className="grid grid-cols-3 gap-4">
              {MC_STRESS.maxDrawdown.map((d) => (
                <RiskStat key={d.label} label={d.label} value={`−${(d.value * 100).toFixed(2)}%`} />
              ))}
            </div>
          </div>

          {/* 蒙特卡洛路径扇形图：分位带 p5–p95 + 中位 + 抽样路径 */}
          {MC_STRESS.band &&
            MC_STRESS.samplePaths.length > 0 &&
            (() => {
              const { band, samplePaths, horizon } = MC_STRESS;
              const W = 600, H = 320, padL = 44, padR = 12, padT = 16, padB = 32;
              const pw = W - padL - padR, ph = H - padT - padB;
              // y 轴范围：跨所有分位/抽样路径的财富最小/最大
              let yMin = Infinity, yMax = -Infinity;
              for (const v of band.p5) if (v < yMin) yMin = v;
              for (const v of band.p95) if (v > yMax) yMax = v;
              for (const p of samplePaths) {
                for (const v of p) {
                  if (v < yMin) yMin = v;
                  if (v > yMax) yMax = v;
                }
              }
              if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || yMax === yMin) {
                yMin = 0;
                yMax = 1;
              }
              const yPad = (yMax - yMin) * 0.05 || 0.05;
              yMin -= yPad;
              yMax += yPad;
              const xOf = (t) => padL + (t / horizon) * pw;
              const yOf = (w) => padT + ph - ((w - yMin) / (yMax - yMin || 1)) * ph;
              const line = (arr) => arr.map((v, t) => `${t === 0 ? "M" : "L"}${xOf(t).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ");
              // 分位带填充：p5 从左到右，再 p95 从右到左，闭合
              const bandPath =
                band.p5.map((v, t) => `${t === 0 ? "M" : "L"}${xOf(t).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ") +
                " " +
                band.p95.map((_, t) => `L${xOf(horizon - t).toFixed(1)},${yOf(band.p95[horizon - t]).toFixed(1)}`).join(" ");
              const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => yMin + f * (yMax - yMin));
              const startRow = 1;
              return (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-8">
                  <h3 className="font-semibold mb-1">{L.fanTitle}</h3>
                  <p className="text-xs text-slate-400 mb-4">{L.fanHint}</p>
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} role="img" aria-label="Monte Carlo equity path fan chart">
                    {yTicks.map((yt, i) => (
                      <g key={`yt${i}`}>
                        <line x1={padL} y1={yOf(yt)} x2={W - padR} y2={yOf(yt)} stroke="#f1f5f9" strokeWidth={1} />
                        <text x={padL - 6} y={yOf(yt) + 3} textAnchor="end" fill="#94a3b8" style={{ fontSize: 9 }}>{yt.toFixed(2)}</text>
                      </g>
                    ))}
                    {/* 分位带 p5–p95 */}
                    <path d={bandPath} fill="rgba(244,63,94,0.10)" stroke="none" />
                    {/* 抽样路径（细、半透明） */}
                    {samplePaths.map((p, i) => (
                      <path key={`sp${i}`} d={line(p)} fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth={0.7} />
                    ))}
                    {/* p5 / p95 边界（虚线） */}
                    <path d={line(band.p5)} fill="none" stroke="rgba(244,63,94,0.55)" strokeWidth={1} strokeDasharray="3 2" />
                    <path d={line(band.p95)} fill="none" stroke="rgba(16,185,129,0.55)" strokeWidth={1} strokeDasharray="3 2" />
                    {/* 中位 p50（粗线） */}
                    <path d={line(band.p50)} fill="none" stroke="#e11d48" strokeWidth={2} />
                    {/* 起点财富=1 参考线 */}
                    <line x1={padL} y1={yOf(startRow)} x2={W - padR} y2={yOf(startRow)} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 3" />
                    <text x={W - padR} y={yOf(startRow) - 4} textAnchor="end" fill="#94a3b8" style={{ fontSize: 9 }}>{L.fanStart}</text>
                    <text x={padL} y={H - 8} fill="#94a3b8" style={{ fontSize: 9 }}>0</text>
                    <text x={W - padR} y={H - 8} textAnchor="end" fill="#94a3b8" style={{ fontSize: 9 }}>{horizon}{L.fanPeriodUnit}</text>
                  </svg>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-rose-600" />{L.fanMedian}</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-4 h-2.5 bg-rose-100 border border-rose-200" />{L.fanBand}</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-slate-400" style={{ opacity: 0.45 }} />{L.fanPaths}</span>
                  </div>
                </div>
              );
            })()}

          {/* 历史案例 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold mb-4">{L.history}</h3>
            <div className="space-y-4">
              {[
                { year: "2020", event: "新冠冲击", vixPeak: "82.4", dd: "-33%", recovery: "47d" },
                { year: "2018", event: "贸易战+缩表", vixPeak: "32.0", dd: "-18%", recovery: "12d" },
                { year: "2016", event: "英国脱欧", vixPeak: "35.2", dd: "-12%", recovery: "1d" },
                { year: "2008", event: "金融危机", vixPeak: "89.5", dd: "-50%", recovery: "320d" },
              ].map((e) => (
                <div key={e.year} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-bold">{e.year}</span>
                    <span className="ml-2 text-sm text-slate-500">{e.event}</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-red-500">VIX {e.vixPeak}</span>
                    <span className="text-slate-500">DD {e.dd}</span>
                    <span className="text-green-600">恢复 {e.recovery}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">{L.disclaimer}</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

// 风险度量小卡片
function RiskStat({ label, value }) {
  return (
    <div className="bg-rose-50 rounded-lg p-4 text-center">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-rose-600 tabular-nums">{value}</div>
    </div>
  );
}

const zh = {
  title: "黑天鹅防御",
  subtitle: "尾部风险识别与对冲，从2008到2020的历史复盘",
  detectorTitle: "实时黑天鹅检测",
  detectorLoading: "检测中…",
  detectorLive: "实时 VIX",
  detectorDemo: "示意数据",
  detectorTriggered: "触发 · 尾部风险上升",
  detectorCalm: "未触发 · 相对平静",
  detectorVix: "VIX",
  detectorPct: "分位",
  detectorTriggers: "触发条件",
  detectorRecs: "建议动作",
  detectorCalmNote: "当前未满足黑天鹅触发条件（VIX 分位 < 90 且无显著 3σ 尾部事件）。保持监控。",
  riskFactors: "风险因子仪表盘",
  hedgeSuggestions: "对冲建议",
  riskMetrics: "尾部风险度量",
  riskMetricsHint: "基于样本序列的 VaR / CVaR / 最大回撤（示意数据，非实时）。CVaR 为超过 VaR 的尾部平均损失。",
  varLabel: "95% VaR",
  cvarLabel: "95% CVaR",
  mddLabel: "最大回撤",
  tailEvents: "3σ 尾部事件",
  kurtosisLabel: "超额峰度",
  skewLabel: "偏度",
  ulcerLabel: "溃疡指数",
  monteCarlo: "蒙特卡洛压力测试（最大回撤分位）",
  monteCarloHint: "用样本收益的 μ/σ 模拟 2000 条 60 期路径，取最大回撤的 5% / 50% / 95% 分位（确定性 seed，非实时）。",
  fanTitle: "蒙特卡洛路径扇形",
  fanHint: "2000 条 60 期模拟路径：灰线为抽样路径，红色带为 5%–95% 分位区间，粗红线为中位（确定性 seed，非实时）。",
  fanStart: "起点 = 1",
  fanPeriodUnit: " 期",
  fanMedian: "中位 (50%)",
  fanBand: "5%–95% 分位带",
  fanPaths: "抽样路径",
  history: "历史案例",
  disclaimer: "黑天鹅事件不可预测。历史数据仅供参考，不构成投资建议。",
};
const en = {
  title: "Black Swan Defense",
  subtitle: "Tail risk identification and hedging. 2008-2020 case studies",
  detectorTitle: "Live Black-Swan Detector",
  detectorLoading: "Detecting…",
  detectorLive: "Live VIX",
  detectorDemo: "Demo data",
  detectorTriggered: "Triggered · elevated tail risk",
  detectorCalm: "Calm · no trigger",
  detectorVix: "VIX",
  detectorPct: "percentile",
  detectorTriggers: "Triggers",
  detectorRecs: "Recommended actions",
  detectorCalmNote: "No black-swan trigger right now (VIX percentile < 90 and no significant 3σ tail event). Keep monitoring.",
  riskFactors: "Risk Factor Dashboard",
  hedgeSuggestions: "Hedge Suggestions",
  riskMetrics: "Tail Risk Metrics",
  riskMetricsHint: "VaR / CVaR / Max Drawdown from a sample series (illustrative, not live). CVaR is the average loss beyond VaR.",
  varLabel: "95% VaR",
  cvarLabel: "95% CVaR",
  mddLabel: "Max Drawdown",
  tailEvents: "3σ Tail Events",
  kurtosisLabel: "Excess Kurtosis",
  skewLabel: "Skewness",
  ulcerLabel: "Ulcer Index",
  monteCarlo: "Monte Carlo Stress (Max DD percentiles)",
  monteCarloHint: "Simulates 2000 paths over 60 periods using the sample μ/σ; shows the 5% / 50% / 95% percentile of max drawdown (deterministic seed, not live).",
  fanTitle: "Monte Carlo Path Fan",
  fanHint: "2000 simulated 60-period paths: grey = sample paths, red band = 5%–95% percentile corridor, bold red = median (deterministic seed, not live).",
  fanStart: "start = 1",
  fanPeriodUnit: " periods",
  fanMedian: "Median (50%)",
  fanBand: "5%–95% band",
  fanPaths: "Sample paths",
  history: "Historical Cases",
  disclaimer: "Black swan events are unpredictable. Historical data for reference only. Not investment advice.",
};
