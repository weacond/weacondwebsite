// lib/winProbability.js — 「卖确定性的概率」引擎（纯函数，SSR/Edge 安全，可单元测试）
//
// 手册核心卖点：把三引擎合成评分（edge）转成「盈利的概率 + 置信区间 + 假设清单」。
// 这是把「评分」升级成「概率 + 可信度」的独立框架，对齐手册：
//   - §1「卖的是确定性的概率 + 极简操作」
//   - §3 幻觉控制（每个概率都带假设清单 + 肥尾警示，不夸大）
//   - §9 黑天鹅（正态近似会高估胜率，必须提示肥尾）
//
// 模型（透明、可核验）：在 horizon 期内，终端收益近似正态 N(μ_total, σ_total²)：
//   μ_total = μ_per × horizon
//   μ_per   = (score − 0.5) × gain × |σ_per|     // 评分(edge) 映射为单期期望收益
//   σ_total = |σ_per| × √horizon
// 盈亏平衡 breakeven（如卖 Put：权利金/本金占用比，正数代表需先回本的成本）。
//   P(盈利) = P(终端收益 > breakeven) = 1 − Φ((breakeven − μ_total) / σ_total)
//
// 重要：真实收益肥尾，正态近似会高估胜率 → 输出始终附「假设清单 + 肥尾警示」。

export const STORAGE_KEY = "weacond:winProbability:v1";

// ── 1) 标准正态 CDF（erf 的 Abramowitz–Stegun 近似，精度 ~1e-7）──
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return sign * y;
}

// 标准正态分布累积分布函数 Φ(x)
export function normalCdf(x) {
  if (!Number.isFinite(x)) return x > 0 ? 1 : 0;
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

// ── 辅助 ──
function clamp01(x) {
  if (!Number.isFinite(x)) return 0.5;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function clamp(x, lo, hi) {
  return x < lo ? lo : x > hi ? hi : x;
}

// ── 2) 评分(edge) → 单期期望收益（披露的启发式）──
// edge = score − 0.5 ∈ [−0.5, 0.5]；μ_per = edge × gain × |σ_per|。
// gain 默认 1.5：评分每高于 0.5 一个点，单期期望收益约 1.5×单期波动。
export function edgeToMuPer(score, sigmaPer, gain = 1.5) {
  const edge = clamp((Number(score) || 0.5) - 0.5, -0.5, 0.5);
  return edge * gain * Math.abs(Number(sigmaPer) || 0);
}

// ── 3) 核心：胜率 + 期望收益 + 置信区间 + 假设清单 ──
// 参数（全部可选，给默认值）：
//   score     0–1 合成评分（默认 0.5 = 中性）
//   sigmaPer  单期波动（小数，如 0.05 = 日 σ 5%；默认 0.05）
//   horizon   期数（如 1 个月 ≈ 21 交易日；默认 21）
//   breakeven 盈亏平衡收益（正数=需先回本的成本/权利金占用；默认 0）
//   gain      评分→期望收益放大系数（默认 1.5）
//   highThreshold 判定「高胜率」的阈值（默认 0.6）
export function winProbability(params = {}) {
  const {
    score = 0.5,
    sigmaPer = 0.05,
    horizon = 21,
    breakeven = 0,
    gain = 1.5,
    highThreshold = 0.6,
  } = params;

  const H = Math.max(1, Math.floor(Number(horizon) || 1));
  const muPer = edgeToMuPer(score, sigmaPer, gain);
  const muTotal = muPer * H;
  const sigmaTotal = Math.abs(Number(sigmaPer) || 0) * Math.sqrt(H);

  // 无方差时退化为 0.5（无法给概率）
  const be = Number(breakeven) || 0;
  const prob = sigmaTotal > 0 ? 1 - normalCdf((be - muTotal) / sigmaTotal) : 0.5;
  const p = clamp01(prob);

  // 置信区间：把 horizon 当作样本量代理，用 Wilson 近似 ±1.96σ 给 95% 带
  const se = Math.sqrt((p * (1 - p)) / H);
  const band = [clamp01(p - 1.96 * se), clamp01(p + 1.96 * se)];

  return {
    probOfProfit: p,
    expectedReturn: muTotal,
    confidenceBand: band,
    confidenceLevel: "95%",
    verdict: winVerdict(p, { high: highThreshold, mid: 0.5 }),
    highWin: p >= highThreshold,
    assumptions: buildAssumptions(params, { muTotal, sigmaTotal }),
    // 对齐 §9：正态近似会高估胜率，真实肥尾下实际更低
    fatTailWarning: true,
  };
}

// ── 4) 概率分级（高/中/低胜率）──
export function winVerdict(prob, thresholds = { high: 0.6, mid: 0.5 }) {
  const p = Number(prob);
  if (!Number.isFinite(p)) return "unknown";
  if (p >= thresholds.high) return "high";
  if (p >= thresholds.mid) return "mid";
  return "low";
}

// ── 5) 按胜率排序（供「高胜率信号」榜单使用）──
// 每个 item 可自带 { score, sigmaPer, breakeven, ... }，并与 opts 合并（item 优先）。
export function rankByWinProbability(signals, opts = {}) {
  if (!Array.isArray(signals)) return [];
  return signals
    .map((s) => {
      const merged = { ...opts, ...(s || {}) };
      const r = winProbability(merged);
      return {
        ...s,
        winProbability: r,
        probOfProfit: r.probOfProfit,
        verdict: r.verdict,
        highWin: r.highWin,
      };
    })
    .sort((a, b) => b.probOfProfit - a.probOfProfit);
}

// ── 6) 假设清单（每个概率都必须可核验、可披露 —— 反幻觉）──
function buildAssumptions(p, { muTotal, sigmaTotal }) {
  const H = Math.max(1, Math.floor(Number(p.horizon) || 1));
  return [
    "模型：终端收益近似正态 N(μ_total, σ_total²)，在 " + H + " 期内聚合。",
    "μ_total = (评分−0.5)×" + p.gain + "×|σ_per|×期数 = " + round(muTotal) + "；σ_total = |σ_per|×√期数 = " + round(sigmaTotal) + "。",
    "盈亏平衡 breakeven = " + round(p.breakeven) + "（正数=需先回本的成本/权利金占用）。",
    "真实收益肥尾：正态近似会高估胜率，极端行情下实际胜率更低（见黑天鹅模块）。",
    "教育性参考，非投资建议；结果因人而异。",
  ];
}

function round(x) {
  return Number.isFinite(x) ? Math.round(x * 10000) / 10000 : 0;
}

export default winProbability;
