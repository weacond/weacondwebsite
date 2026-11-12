// lib/fairValue.js — 公允价值（Fair Value，纯函数，可单元测试）
//
// 两种经典估值口径 + 格雷厄姆安全边际：
//   1. P/E 回归：FV = EPS × 目标 P/E（盈利回归法）
//   2. 戈登增长 / DDM：FV = D₀·(1+g) / (r − g)（仅当 r > g 时有效）
//   安全边际 MoS = (FV − 价格) / FV；上涨空间 upside = (FV − 价格) / 价格
// 确定性、零外部依赖。

export const STORAGE_KEY = "weacond:fairValue:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// P/E 回归法公允价值。
export function peFairValue(eps, targetPE) {
  return num(eps) * num(targetPE);
}

// 戈登增长 / DDM 公允价值。当 r ≤ g 或 r ≤ 0 时无效（分母非正）。
export function ddmFairValue(d0, g, r) {
  const D = num(d0);
  const G = num(g);
  const R = num(r);
  if (R <= G || R <= 0) return NaN;
  return (D * (1 + G)) / (R - G);
}

// 格雷厄姆安全边际：(FV − 价格)/FV。
export function marginOfSafety(fairValue, price) {
  const FV = num(fairValue);
  const P = num(price);
  if (FV <= 0) return NaN;
  return (FV - P) / FV;
}

// 相对当前价上涨空间：(FV − 价格)/价格。
export function upside(fairValue, price) {
  const FV = num(fairValue);
  const P = num(price);
  if (P <= 0) return NaN;
  return (FV - P) / P;
}

// 安全边际分级。
export function mosBand(mos) {
  if (!Number.isFinite(mos)) return "na";
  const m = num(mos);
  if (m < 0) return "overvalued";
  if (m < 0.3) return "fair";
  if (m < 0.5) return "cheap";
  return "deep";
}

// 综合视图：以 P/E 回归为基准，DDM 可选；含安全边际、上涨空间与分级。
export function fairValueSummary(inputs = {}) {
  const { price, eps, targetPE, d0, g, r } = inputs;
  const P = num(price);
  const fv = peFairValue(eps, targetPE);
  const ddm = ddmFairValue(d0, g, r);
  const valid = P > 0 && fv > 0;
  if (!valid) return { valid: false };
  const mos = marginOfSafety(fv, P);
  const up = upside(fv, P);
  const band = mosBand(mos);
  return {
    fairValue: fv,
    ddmFairValue: ddm,
    marginOfSafety: mos,
    upside: up,
    band,
    valid: true,
  };
}

// 预设：不同估值情景。
export const FAIRVALUE_PRESETS = {
  deepValue: { id: "deepValue", label: "深度价值", price: 40, eps: 6, targetPE: 15, d0: 2, g: 0.03, r: 0.08 },
  fair: { id: "fair", label: "合理", price: 75, eps: 5, targetPE: 15, d0: 1.5, g: 0.03, r: 0.08 },
  overvalued: { id: "overvalued", label: "高估", price: 120, eps: 5, targetPE: 12, d0: 1, g: 0.02, r: 0.08 },
  growth: { id: "growth", label: "成长", price: 100, eps: 2, targetPE: 50, d0: 0.4, g: 0.12, r: 0.15 },
};
export { num };