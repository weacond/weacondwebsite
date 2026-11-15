// lib/dcf.js — 现金流折现估值 DCF（WACC + 终值）纯计算（无 IO，可单元测试）
//
// 模型：把自由现金流（FCF）按 WACC 折现到当下，加永续增长的终值（Gordon），
// 得内在价值；可选每股价值与相对现价的「上行空间」；并提供乐观/基准/悲观三情景。
//
//   PV(显性期) = Σ_{i=1..n} FCF_i / (1+WACC)^i
//   终值(第 n 期末, Gordon 永续) = FCF_n · (1 + g) / (WACC − g)   （需 g < WACC）
//   PV(终值) = 终值 / (1+WACC)^n
//   内在价值 = PV(显性期) + PV(终值)
//
// 入参（fraction）：
//   fcf0        期初/基年自由现金流（与 fcfs 二选一）
//   growth      显性期 FCF 年增长率（fraction）
//   years       显性期年数
//   terminalGrowth  永续增长率 g（fraction，须 < wacc 才有终值）
//   wacc        折现率（fraction）
//   fcfs        可选：显性期各年 FCF 数组（提供则忽略 fcf0/growth/years 的生成）
//   shares      可选：总股本（求每股价值）
//   price       可选：当前股价（求上行空间）

export function num(x, d = 0) {
  const n = typeof x === "number" ? x : parseFloat(x);
  return Number.isFinite(n) ? n : d;
}

// 由 fcf0 + 年增长率 + 年数生成显性期 FCF 序列（第 1..n 年，期末值）
export function buildFcfs(fcf0, growth, years) {
  const out = [];
  const r = num(growth, 0);
  let base = num(fcf0, 0);
  for (let i = 1; i <= Math.floor(num(years, 0)); i++) {
    base = base * (1 + r);
    out.push(base);
  }
  return out;
}

// 单期折现现值
export function presentValue(cf, t, rate) {
  return num(cf, 0) / Math.pow(1 + num(rate, 0), num(t, 1));
}

// 显性期 FCF 现值之和（FCF_i 在第 i 期末，i=1..n）
export function explicitPv(fcfs, wacc) {
  const list = Array.isArray(fcfs) ? fcfs : [];
  const rate = num(wacc, 0);
  return list.reduce((pv, cf, i) => pv + num(cf, 0) / Math.pow(1 + rate, i + 1), 0);
}

// Gordon 永续终值（第 n 期末）；g ≥ wacc 时不可用 → null
export function terminalValue(fcfLast, g, wacc) {
  const gg = num(g, 0);
  const w = num(wacc, 0);
  if (w <= gg) return null;
  return (num(fcfLast, 0) * (1 + gg)) / (w - gg);
}

// DCF 汇总
export function dcfSummary(inputs = {}) {
  const wacc = num(inputs.wacc, 0);
  const g = num(inputs.terminalGrowth, 0);

  let fcfs;
  if (Array.isArray(inputs.fcfs) && inputs.fcfs.length) {
    fcfs = inputs.fcfs.map((c) => num(c, 0));
  } else {
    fcfs = buildFcfs(inputs.fcf0, inputs.growth, inputs.years);
  }
  const n = fcfs.length;

  const valid = wacc > 0 && n > 0;
  const pvExplicit = valid ? explicitPv(fcfs, wacc) : null;
  const tv = valid ? terminalValue(fcfs[n - 1], g, wacc) : null; // 终值（第 n 期末）
  const pvTerminal = tv != null ? tv / Math.pow(1 + wacc, n) : null;
  const intrinsic = pvTerminal != null ? pvExplicit + pvTerminal : pvExplicit;
  const tvShare = pvTerminal != null && intrinsic > 0 ? pvTerminal / intrinsic : null;

  const shares = num(inputs.shares, 0);
  const perShare = shares > 0 && intrinsic != null ? intrinsic / shares : null;
  const price = num(inputs.price, 0);
  const upside = perShare != null && price > 0 ? (perShare - price) / price : null;

  return {
    valid: Boolean(valid && intrinsic != null),
    wacc,
    terminalGrowth: g,
    periods: n,
    fcfs,
    pvExplicit,
    terminalValue: tv,
    pvTerminal,
    tvShare,
    intrinsicValue: intrinsic,
    perShare,
    upside,
  };
}

// 乐观 / 基准 / 悲观 三情景：以基准 (growth, terminalGrowth, wacc) 为中心扰动
export function dcfThreeScenarios(inputs = {}) {
  const base = num(inputs.growth, 0.05);
  const gBase = num(inputs.terminalGrowth, 0.025);
  const waccBase = num(inputs.wacc, 0.09);
  const fcf0 = num(inputs.fcf0, 100e6);
  const years = num(inputs.years, 10);

  const run = (growth, tg, wacc) =>
    dcfSummary({ fcf0, growth, years, terminalGrowth: tg, wacc, shares: inputs.shares, price: inputs.price });

  return {
    optimist: run(Math.min(base + 0.03, 0.35), Math.min(gBase + 0.008, waccBase - 0.005), Math.max(waccBase - 0.015, 0.02)),
    base: run(base, gBase, waccBase),
    pessimist: run(Math.max(base - 0.03, -0.15), Math.max(gBase - 0.008, -0.05), waccBase + 0.015),
  };
}

// 上行空间分级（upside = (内在−现价)/现价）
export function dcfBand(upside) {
  if (upside == null || !Number.isFinite(upside)) return "n/a";
  if (upside > 0.5) return "deepValue";
  if (upside > 0.1) return "undervalued";
  if (upside >= -0.1) return "fair";
  return "overvalued";
}

// 预设：成长股 / 稳健价值 / 困境下行
export const DCF_PRESETS = {
  growth: { id: "growth", label: "成长股", labelEn: "Growth Co", fcf0: 100e6, growth: 0.12, years: 10, terminalGrowth: 0.03, wacc: 0.1, shares: 100e6, price: 15 },
  stable: { id: "stable", label: "稳健价值", labelEn: "Stable Value", fcf0: 300e6, growth: 0.05, years: 10, terminalGrowth: 0.025, wacc: 0.09, shares: 200e6, price: 18 },
  distressed: { id: "distressed", label: "困境下行", labelEn: "Distressed", fcf0: 50e6, growth: 0.02, years: 7, terminalGrowth: 0.01, wacc: 0.13, shares: 80e6, price: 22 },
};