"use client";

import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import { useState } from "react";
import Head from "next/head";
import { retracementLevels, extensionLevels } from "../lib/fibonacci";

export const metadata = {
  title: "斐波那契回撤/扩展 — Weacond",
  description: "由趋势波段的高/低计算斐波那契回撤（0.236~1.0）与扩展（0.382/0.618/1.0/1.618）关键位，含方向解读。",
  robots: { index: true, follow: true },
};

const zh = {
  title: "斐波那契回撤 / 扩展",
  subtitle: "给定一段趋势的波段高/低，计算回撤（回调支撑阻力）与扩展（突破目标）。",
  inputs: "输入",
  swingHigh: "波段高",
  swingLow: "波段低",
  direction: "方向",
  up: "涨势",
  down: "跌势",
  retracement: "回撤档位",
  extension: "扩展档位",
  hint: "回撤 0.618 常为关键反转位；扩展 1.618 为常见顺势目标。示例数据，非投资建议。",
  disclaimer: "斐波那契为技术分析工具，不构成投资建议。",
};
const en = {
  title: "Fibonacci Retracement / Extension",
  subtitle: "Given a trend's swing high/low, compute retracement (reversal S/R) and extension (breakout targets).",
  inputs: "Inputs",
  swingHigh: "Swing High",
  swingLow: "Swing Low",
  direction: "Direction",
  up: "Uptrend",
  down: "Downtrend",
  retracement: "Retracement",
  extension: "Extension",
  hint: "0.618 retracement is the classic reversal zone; 1.618 extension is a common trend target. Sample data, not investment advice.",
  disclaimer: "Fibonacci is a technical tool, not investment advice.",
};

export default function FibonacciPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [high, setHigh] = useState("120");
  const [low, setLow] = useState("100");
  const [direction, setDirection] = useState("up");

  const ret = retracementLevels(Number(high), Number(low));
  const ext = extensionLevels(Number(high), Number(low), direction);
  const fmt = (v) => (Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—");

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-8">{L.subtitle}</p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold mb-4">{L.inputs}</h2>
              <div className="space-y-4">
                <Field label={L.swingHigh} value={high} onChange={setHigh} />
                <Field label={L.swingLow} value={low} onChange={setLow} />
                <label className="block">
                  <span className="text-xs text-slate-400">{L.direction}</span>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white"
                  >
                    <option value="up">{L.up}</option>
                    <option value="down">{L.down}</option>
                  </select>
                </label>
              </div>
              <p className="text-xs text-slate-400 mt-4">{L.hint}</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              {ret ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">{L.retracement}</h3>
                    {ret.levels.map((x) => (
                      <Result key={x.ratio} label={`${(x.ratio * 100).toFixed(1)}%`} value={fmt(x.level)} />
                    ))}
                  </div>
                  <div className="border-t pt-3">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">{L.extension}</h3>
                    {ext.levels.map((x) => (
                      <Result key={x.ratio} label={`${(x.ratio * 100).toFixed(1)}%`} value={fmt(x.level)} cls="text-indigo-600" />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-500">{L.disclaimer}</p>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">{L.disclaimer}</p>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400"
        />
      </div>
    </label>
  );
}

function Result({ label, value, cls }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`font-mono font-semibold ${cls || ""}`}>{value}</span>
    </div>
  );
}
