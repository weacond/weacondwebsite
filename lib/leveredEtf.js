// lib/leveredEtf.js — 杠杆 ETF 衰减（Leveraged ETF Decay，纯函数，可单元测试）
//
// 每日再平衡的 L 倍杠杆 ETF，其年化收益近似为：
//   杠杆后年化 = L·μ − ½·L·(L−1)·σ²
// 其中第二项 ½·L·(L−1)·σ² 即“杠杆衰减/波动损耗”（volatility drag），
// 即使标的净涨跌为 0，高波动下杠杆 ETF 仍会因复利而亏损。
// 确定性、零外部依赖。

export const STORAGE_KEY = "weacond:leveredEtf:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 杠杆 ETF 年化收益：L·μ − ½·L·(L−1)·σ²。
export function leveredAnnualReturn(L, mu, sigma) {
  const l = num(L);
  const m = num(mu);
  const s = num(sigma);
  return l * m - 0.5 * l * (l - 1) * s * s;
}

// 杠杆衰减（波动损耗）：½·L·(L−1)·σ²，恒 ≥ 0（对 L≥1 或 L≤0）。
export function leverageDecay(L, sigma) {
  const l = num(L);
  const s = num(sigma);
  return 0.5 * l * (l - 1) * s * s;
}

// 标的本金在 μ 复利下 N 年后的价值。
export function underlyingFuture(principal, mu, years) {
  const p = num(principal);
  const m = num(mu);
  const y = num(years);
  return p * Math.pow(1 + m, y);
}

// 杠杆 ETF 本金 N 年后的价值。
export function leveredFuture(principal, mu, sigma, L, years) {
  const ret = leveredAnnualReturn(L, mu, sigma);
  const p = num(principal);
  const y = num(years);
  return p * Math.pow(1 + ret, y);
}

// 衰减分级。
export function decayBand(decay) {
  if (!Number.isFinite(decay)) return "na";
  const d = num(decay);
  if (d <= 0) return "none";
  if (d < 0.02) return "low";
  if (d < 0.05) return "moderate";
  if (d < 0.1) return "high";
  return "extreme";
}

// 综合视图：含杠杆后年化、衰减、标的/杠杆未来值、总损耗。
export function leveredEtfSummary(inputs = {}) {
  const { leverage, mu, sigma, years, principal } = inputs;
  const L = num(leverage);
  const M = num(mu);
  const S = num(sigma);
  const Y = num(years);
  const P = num(principal);
  const valid = P > 0 && Y >= 0;
  if (!valid) return { valid: false };
  const ret = leveredAnnualReturn(L, M, S);
  const decay = leverageDecay(L, S);
  const uFuture = underlyingFuture(P, M, Y);
  const lFuture = leveredFuture(P, M, S, L, Y);
  const loss = uFuture - lFuture;
  return {
    leverage: L,
    leveredReturn: ret,
    decay,
    underlyingFuture: uFuture,
    leveredFuture: lFuture,
    lossFromDecay: loss,
    band: decayBand(decay),
    valid: true,
  };
}

// 预设：不同杠杆/波动情景。
export const LEVERED_PRESETS = {
  twoX: { id: "twoX", label: "2x 长仓", leverage: 2, mu: 0.08, sigma: 0.2, years: 5, principal: 10000 },
  threeX: { id: "threeX", label: "3x 长仓", leverage: 3, mu: 0.08, sigma: 0.25, years: 5, principal: 10000 },
  shortX: { id: "shortX", label: "-1x 空仓", leverage: -1, mu: 0.08, sigma: 0.2, years: 5, principal: 10000 },
  calm: { id: "calm", label: "低波动", leverage: 2, mu: 0.0, sigma: 0.05, years: 3, principal: 10000 },
  volatile: { id: "volatile", label: "高波动", leverage: 3, mu: 0.0, sigma: 0.45, years: 3, principal: 10000 },
};
export { num };