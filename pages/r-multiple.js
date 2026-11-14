"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import FaqLd from "../components/FaqLd";
import FaqSection from "../components/FaqSection";
import Link from "next/link";
import {
  validRMultiple, rMultiple, rGrade, expectancyFromR,
  rMultipleInsight, R_PRESETS,
} from "../lib/rMultiple";

export const metadata = {
  title: "R 倍数计算器 — Weacond",
  description: "把每笔盈亏表达为 R（初始风险单位），算实际 R、分级与 R 口径期望。教育性参考。",
  robots: { index: true, follow: true },
};

export default function RMultiplePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [entry, setEntry] = useState(100);
  const [stop, setStop] = useState(95);
  const [price, setPrice] = useState(110);
  const [side, setSide] = useState("long");

  // R 口径期望子计算器
  const [winRate, setWinRate] = useState(55);
  const [winR, setWinR] = useState(2);
  const [lossR, setLossR] = useState(1);

  const valid = validRMultiple(entry, stop, price);
  const res = useMemo(() => {
    if (!valid) return null;
    const r = rMultiple(entry, stop, price, side);
    return { r, grade: rGrade(r), insight: rMultipleInsight(entry, stop, price, side) };
  }, [entry, stop, price, side]);

  const expRes = useMemo(() => {
    const w = winRate / 100;
    if (!(w >= 0 && w <= 1) || !(winR > 0) || !(lossR > 0)) return null;
    return expectancyFromR(w, winR, lossR);
  }, [winRate, winR, lossR]);

  const applyPreset = (p) => {
    setEntry(p.entry);
    setStop(p.stop);
    setPrice(p.price);
    setSide(p.side || "long");
  };

  const gradeColor =
    res?.grade.color === "rose" ? "text-red-600" :
    res?.grade.color === "orange" ? "text-orange-600" :
    res?.grade.color === "amber" ? "text-amber-600" :
    res?.grade.color === "slate" ? "text-slate-500" : "text-emerald-600";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="r-multiple" />
      <FaqLd questions={L.faqs} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {R_PRESETS.map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.entryLabel}</span>
              <input type="number" value={entry} step={0.1}
                onChange={(e) => setEntry(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.stopLabel}</span>
              <input type="number" value={stop} step={0.1}
                onChange={(e) => setStop(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.priceLabel}</span>
              <input type="number" value={price} step={0.1}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          <div className="flex gap-1 mb-6">
            <span className="text-xs text-slate-500 self-center mr-1">{L.sideLabel}</span>
            {["long", "short"].map((s) => (
              <button key={s} onClick={() => setSide(s)}
                className={`px-4 py-2 rounded-lg text-sm border transition ${side === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-600"}`}>
                {L.sides ? L.sides[s] : s}
              </button>
            ))}
          </div>

          {!valid && <p className="text-xs text-red-500 mb-4">{L.invalid}</p>}

          {res && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.rLabel}</div>
                <div className={`text-4xl font-bold mb-1 ${gradeColor}`}>
                  {res.r >= 0 ? "+" : ""}{res.r.toFixed(2)}R
                </div>
                <div className="text-xs text-slate-500 mb-4">
                  {L.gradeLabel}:{" "}
                  <span className={`font-semibold ${gradeColor}`}>{lang === "en" ? res.grade.labelEn : res.grade.label}</span>
                </div>
                <p className="text-sm text-slate-500">{res.insight}</p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 mb-6">
                <h2 className="text-sm font-bold mb-3">{L.expTitle}</h2>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <label className="block">
                    <span className="text-xs text-slate-500">{L.winRateLabel}</span>
                    <input type="number" value={winRate} min={0} max={100} step={1}
                      onChange={(e) => setWinRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 text-sm font-mono" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500">{L.winRLabel}</span>
                    <input type="number" value={winR} min={0.1} step={0.5}
                      onChange={(e) => setWinR(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                      className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 text-sm font-mono" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500">{L.lossRLabel}</span>
                    <input type="number" value={lossR} min={0.1} step={0.5}
                      onChange={(e) => setLossR(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                      className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 text-sm font-mono" />
                  </label>
                </div>
                {expRes != null ? (
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-1">{L.expPerTrade}</div>
                    <div className={`text-2xl font-bold ${expRes > 0 ? "text-green-600" : expRes < 0 ? "text-red-600" : "text-slate-500"}`}>
                      {expRes >= 0 ? "+" : ""}{expRes.toFixed(3)}R
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-red-500 text-center">{L.expInvalid}</p>
                )}
              </div>

              <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
              <p className="text-center text-xs">
                <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
                {" · "}
                <Link href="/position-size" className="text-indigo-500 hover:underline">→ {L.linkPosition}</Link>
                {" · "}
                <Link href="/leverage" className="text-indigo-500 hover:underline">→ {L.linkLeverage}</Link>
              </p>
              <FaqSection faqs={L.faqs} title={L.faqTitle} />
            </>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "R 倍数计算器",
  subtitle: "把每笔盈亏表达为 R（初始风险单位）。1R = 入场到止损距离。算实际 R、分级与 R 口径期望。",
  entryLabel: "入场价",
  stopLabel: "止损价",
  priceLabel: "现价/出场",
  sideLabel: "方向",
  invalid: "入场价须与止损价不同。",
  rLabel: "实际 R",
  gradeLabel: "分级",
  expTitle: "R 口径期望",
  winRateLabel: "胜率 %",
  winRLabel: "平均盈 R",
  lossRLabel: "平均亏 R",
  expPerTrade: "每笔期望（R）",
  expInvalid: "胜率 0~100，R > 0。",
  disclaimer: "R 为相对风险单位，与账户规模无关；1R=初始风险。教育演示，不构成投资建议。",
  linkRisk: "风险仪表盘",
  linkPosition: "头寸管理",
  linkLeverage: "杠杆强平",
  sides: { long: "多", short: "空" },
  presetLabels: { smallWin: "小盈 +0.5R", win: "盈利 +2R", bigWin: "大盈 +4R", stopped: "止损 −1R", shortWin: "空头 +1.5R" },
  faqTitle: "常见问题",
  faqs: [
    { q: "R 倍数是什么？", a: "R = 每笔盈亏 ÷ 初始风险单位（1R = 入场到止损距离）。用 R 衡量盈亏可剥离账户规模，直接比较策略质量。" },
    { q: "多少 R 算好的交易？", a: "单笔 +2R 已优于多数策略；关键看长期 R 口径期望是否为正：期望 = 胜率×平均盈R − 败率×平均亏R。" },
    { q: "负 R 怎么办？", a: "亏损记为 −R；策略好坏看长期 R 口径期望，而非单笔胜负。" },
    { q: "R 倍数和 R:R 一样吗？", a: "不同。R:R 是目标/止损的静态比值；R 倍数是实际盈亏（含滑点/出场），更真实。" },
  ],
};
const en = {
  title: "R-Multiple Calculator",
  subtitle: "Express each P&L in R (initial risk units). 1R = entry-to-stop distance. Compute realized R, grade and expectancy-in-R.",
  entryLabel: "Entry",
  stopLabel: "Stop",
  priceLabel: "Price / exit",
  sideLabel: "Side",
  invalid: "Entry must differ from stop.",
  rLabel: "Realized R",
  gradeLabel: "Grade",
  expTitle: "Expectancy in R",
  winRateLabel: "Win rate %",
  winRLabel: "Avg win R",
  lossRLabel: "Avg loss R",
  expPerTrade: "Expectancy / trade (R)",
  expInvalid: "Win rate 0–100, R > 0.",
  disclaimer: "R is a relative risk unit, account-size independent; 1R = initial risk. Educational demo, not investment advice.",
  linkRisk: "Risk dashboard",
  linkPosition: "Position sizing",
  linkLeverage: "Leverage",
  sides: { long: "Long", short: "Short" },
  presetLabels: { smallWin: "Small +0.5R", win: "Win +2R", bigWin: "Big +4R", stopped: "Stop −1R", shortWin: "Short +1.5R" },
  faqTitle: "FAQ",
  faqs: [
    { q: "What is R-multiple?", a: "R = P&L ÷ initial risk (1R = entry-to-stop distance). Measuring in R strips out account size to compare strategy quality." },
    { q: "What is a good R per trade?", a: "+2R beats most trades, but what matters is positive long-run expectancy-in-R: winRate × avgWinR − loseRate × avgLossR." },
    { q: "What about negative R?", a: "Record losses as −R. A strategy's quality is its long-run expectancy-in-R, not any single win/loss." },
    { q: "Is R-multiple the same as R:R?", a: "No. R:R is the static target/stop ratio; R-multiple is the realized P&L (incl. slippage/exit) and is more honest." },
  ],
};
