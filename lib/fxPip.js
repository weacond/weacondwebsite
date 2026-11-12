// lib/fxPip.js — FX 点值 / 名义头寸（Pip Value / Notional，纯函数，可单元测试）
//
// 简化教科书模型（账户货币≈报价货币，或以 rate 换算）：
//   每点价值  pipValue = pipSize × positionSize / rate
//   名义头寸  notional = positionSize × rate
//   盈亏      pnl      = pips × pipValue
//   价格变动% pipPct   = pips × pipSize / rate × 100
// 确定性、零外部依赖。教育性参考，非交易建议。

export const STORAGE_KEY = "weacond:fxPip:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 每点价值（pip size × 头寸 / 汇率）。
export function pipValue(pipSize, positionSize, rate) {
  const P = num(pipSize);
  const N = num(positionSize);
  const R = num(rate);
  if (R <= 0) return 0;
  return (P * N) / R;
}

// 名义头寸（单位 × 汇率）。
export function notional(positionSize, rate) {
  return num(positionSize) * num(rate);
}

// 由点数换算盈亏。
export function pnlFromPips(pips, pipSize, positionSize, rate) {
  return num(pips) * pipValue(pipSize, positionSize, rate);
}

// 点数对应的价格变动百分比。
export function pipPercent(pips, pipSize, rate) {
  const P = num(pips);
  const S = num(pipSize);
  const R = num(rate);
  if (R <= 0) return 0;
  return (P * S) / R * 100;
}

// 头寸暴露分级（按价格变动绝对百分比）。
export function exposureBand(pipPercent) {
  const p = Math.abs(num(pipPercent));
  if (p <= 0) return "none";
  if (p < 0.1) return "low";
  if (p < 0.5) return "moderate";
  return "high";
}

// 综合视图。
export function fxSummary(inputs = {}) {
  const { pipSize, positionSize, rate, pips } = inputs;
  const P = num(pipSize);
  const N = num(positionSize);
  const R = num(rate);
  const valid = N > 0 && P > 0 && R > 0;
  if (!valid) return { valid: false };
  const pv = pipValue(P, N, R);
  const pp = pipPercent(num(pips), P, R);
  return {
    pipSize: P,
    positionSize: N,
    rate: R,
    pips: num(pips),
    lots: N / 100000,
    pipValue: pv,
    notional: notional(N, R),
    pnl: pnlFromPips(num(pips), P, N, R),
    pipPercent: pp,
    band: exposureBand(pp),
    valid: true,
  };
}

// 预设：主流货币对与手数。
export const FX_PRESETS = {
  eurUsd:   { id: "eurUsd",   label: "EUR/USD 标准手", pipSize: 0.0001, positionSize: 100000, rate: 1.085, pips: 30 },
  gbpUsd:   { id: "gbpUsd",   label: "GBP/USD 半手",   pipSize: 0.0001, positionSize: 50000,  rate: 1.27,  pips: 50 },
  usdJpy:   { id: "usdJpy",   label: "USD/JPY 标准手", pipSize: 0.01,   positionSize: 100000, rate: 150,   pips: 100 },
  miniLot:  { id: "miniLot",  label: "迷你手",          pipSize: 0.0001, positionSize: 10000,  rate: 1.085, pips: 30 },
  microLot: { id: "microLot", label: "微型手",          pipSize: 0.0001, positionSize: 1000,   rate: 1.085, pips: 30 },
};
export { num };
