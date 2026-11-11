// lib/portfolioPresets.js — 组合优化（纯函数、确定性、可单元测试）
//
// 面向「给定一篮子资产，如何分配权重」的场景（与 /compare 的「多策略对比」区分）：
// 用户选一个预设篮子（或自定义 {assets,corr}），本模块给出 5 种配权方案的
// 夏普 / 年化波动 / 年化收益 / HHI / 等效资产数 / 分散化比率，并标出夏普最优方案，
// 再给出风险平价各资产的风险贡献与有效前沿点。
//
// 口径：μ / σ / rf 均为「年化」小数（如 0.10 = 10%）；相关矩阵 M 为 N×N、对角线 1。
// 组合夏普 = (Σwᵢμᵢ − rf) / σ_p（√periods 取 1，因各量已年化）。
//
// 这些是教育性示例权重，非投资建议；预设参数为示意性历史区间估计。

import {
  portfolioSharpe,
  portfolioVolatility,
  portfolioReturn,
  inverseVolWeights,
  riskParityWeights,
  maxSharpeWeights,
  minimumVarianceWeights,
  riskContribution,
  herfindahlIndex,
  effectiveNumAssets,
  efficientFrontier,
} from "./portfolio.js";
import { diversificationRatio } from "./correlation.js";

function round(n, dp = 2) {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  const f = Math.pow(10, dp);
  const r = Math.round(n * f) / f;
  return r === 0 ? 0 : r;
}

function num(v, fallback = 0) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

// 预设篮子：每只资产 { name, nameEn, mu(年化), vol(年化) }；corr 为 N×N 对称相关矩阵。
// 参数为示意性历史区间估计，用于教学演示，非投资建议。
export const PRESETS = [
  {
    id: "stock_bond",
    name: "60/40 经典股债",
    nameEn: "Classic 60/40",
    desc: "美股 + 美债，低相关、长期稳定的经典配置",
    descEn: "US equity + US bond: low correlation, the classic core",
    rf: 0.04,
    assets: [
      { name: "SPY", nameEn: "US Equity", mu: 0.1, vol: 0.15 },
      { name: "TLT", nameEn: "US 10Y Bond", mu: 0.035, vol: 0.1 },
    ],
    corr: [
      [1, 0.05],
      [0.05, 1],
    ],
  },
  {
    id: "global_macro",
    name: "全球宏观分散",
    nameEn: "Global Macro",
    desc: "股/金/债/商品/美元 五资产，追求跨类分散",
    descEn: "Equity / Gold / Bond / Commodity / USD — broad diversification",
    rf: 0.04,
    assets: [
      { name: "SPY", nameEn: "US Equity", mu: 0.1, vol: 0.15 },
      { name: "GLD", nameEn: "Gold", mu: 0.07, vol: 0.14 },
      { name: "TLT", nameEn: "US Bond", mu: 0.03, vol: 0.09 },
      { name: "DBC", nameEn: "Commodities", mu: 0.02, vol: 0.2 },
      { name: "UUP", nameEn: "US Dollar", mu: 0.01, vol: 0.06 },
    ],
    corr: [
      [1, 0.1, 0.05, 0.3, -0.2],
      [0.1, 1, 0.3, 0.4, 0.2],
      [0.05, 0.3, 1, -0.05, 0.1],
      [0.3, 0.4, -0.05, 1, 0.05],
      [-0.2, 0.2, 0.1, 0.05, 1],
    ],
  },
  {
    id: "all_weather",
    name: "全天候 All-Weather",
    nameEn: "All-Weather",
    desc: "股/长债/通胀债/商品，抵御多种宏观情景",
    descEn: "Stocks / LT Bond / TIPS / Commodity — ride any macro regime",
    rf: 0.03,
    assets: [
      { name: "Equity", nameEn: "Stocks", mu: 0.08, vol: 0.16 },
      { name: "LTA", nameEn: "LT Bond", mu: 0.04, vol: 0.12 },
      { name: "TIPS", nameEn: "Inflation Bond", mu: 0.04, vol: 0.11 },
      { name: "COM", nameEn: "Commodities", mu: 0.02, vol: 0.22 },
    ],
    corr: [
      [1, 0.3, 0.2, 0.2],
      [0.3, 1, 0.5, 0.1],
      [0.2, 0.5, 1, 0.4],
      [0.2, 0.1, 0.4, 1],
    ],
  },
  {
    id: "concentrated",
    name: "全股票（集中）",
    nameEn: "All Stocks (concentrated)",
    desc: "美股/新兴/成长，高相关、高波动、高收益",
    descEn: "US / Emerging / Growth — high correlation, high vol, high return",
    rf: 0.04,
    assets: [
      { name: "SPY", nameEn: "US", mu: 0.1, vol: 0.15 },
      { name: "EEM", nameEn: "Emerging", mu: 0.11, vol: 0.22 },
      { name: "IYR", nameEn: "Growth", mu: 0.12, vol: 0.2 },
    ],
    corr: [
      [1, 0.8, 0.85],
      [0.8, 1, 0.8],
      [0.85, 0.8, 1],
    ],
  },
];

/**
 * 校验并规范化相关矩阵：N×N、对角线强制 1、对称、元素截断到 [-1,1]。
 * 非数 / 越界 → 0；i,j 缺一用 j,i 补。
 * @param {number[][]} corr
 * @param {number} n 资产数
 * @returns {number[][]} 规范化后的 N×N 对称矩阵；n≤0 → []
 */
export function normalizeCorr(corr, n) {
  if (n <= 0) return [];
  const out = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    out[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      let v = corr?.[i]?.[j];
      if (typeof v !== "number" || !Number.isFinite(v)) v = corr?.[j]?.[i];
      v = typeof v === "number" && Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0;
      out[i][j] = v;
      out[j][i] = v;
    }
  }
  return out;
}

/**
 * 由一篮子资产（μ/σ + 相关矩阵）生成 5 种配权方案与关键风险/分散指标。
 * @param {{assets?:Array, corr?:number[][], rf?:number}} basket
 *   - assets：[{ name, nameEn, mu, vol }]，mu/vol 为年化小数
 *   - corr：N×N 相关矩阵（缺省 → 不相关）
 *   - rf：无风险利率（年化小数，缺省 0.04）
 * @param {object} [opts] { grid?, frontierPoints? }
 * @returns {object} { nAssets, assets, rf, plans[], best, riskContribution[], frontier|null }
 * @throws 至少需要 1 个资产
 */
export function buildPortfolioPlan(basket, opts = {}) {
  const b = basket || {};
  const assets = Array.isArray(b.assets) ? b.assets : [];
  const n = assets.length;
  if (n === 0) throw new Error("buildPortfolioPlan: 至少需要 1 个资产");

  const grid = opts.grid && opts.grid > 0 ? Math.floor(opts.grid) : 40;
  const nPoints = opts.frontierPoints && opts.frontierPoints > 0 ? Math.floor(opts.frontierPoints) : 21;

  const vols = assets.map((a) => num(a.vol, 0));
  const mus = assets.map((a) => num(a.mu, 0));
  const rf = num(b.rf, 0.04);
  // 组合夏普口径为年化：μ/σ/rf 均年化，故 periods=1（√1=1）。
  const M = normalizeCorr(b.corr, n);
  // 每序列单元素 → seriesMean 即 μ，供 portfolioSharpe 取组合均值。
  const returnsList = mus.map((m) => [m]);
  const eq = Array.from({ length: n }, () => 1 / n);

  const ivW = n > 1 ? inverseVolWeights(vols) : eq;
  const rpW = n > 1 ? riskParityWeights(vols, M) : eq;
  const maxW = n > 1 ? maxSharpeWeights(returnsList, vols, M, { grid }) : eq;
  const minW = n > 1 ? minimumVarianceWeights(vols, M, { grid }) : eq;

  const planFor = (key, label, labelEn, w) => {
    const wN = Array.isArray(w) && w.length === n ? w : eq;
    const sharpe = portfolioSharpe(returnsList, vols, M, wN, rf, 1);
    const vol = portfolioVolatility(vols, M, wN);
    const ret = portfolioReturn(returnsList, wN);
    return {
      key,
      label,
      labelEn,
      weights: wN.map((x) => round(x * 100, 1)),
      weightsRaw: wN,
      sharpe: round(sharpe, 2),
      vol: round(vol * 100, 2),
      ret: round(ret * 100, 2),
      hhi: round(herfindahlIndex(wN), 3),
      ena: round(effectiveNumAssets(wN), 2),
      dr: round(diversificationRatio(M, vols, wN), 3),
    };
  };

  const plans = [
    planFor("equal", "等权", "Equal", eq),
    planFor("inverseVol", "逆波动", "Inv-Vol", ivW),
    planFor("riskParity", "风险平价", "Risk Parity", rpW),
    planFor("maxSharpe", "最大夏普", "Max Sharpe", maxW),
    planFor("minVariance", "最小方差", "Min Var", minW),
  ];

  let best = plans[0];
  for (const p of plans) if (p.sharpe > best.sharpe) best = p;

  const rc = n > 1 ? riskContribution(vols, M, rpW) : eq.slice();
  const rcTotal = rc.reduce((a, x) => a + x, 0);
  const rcPct = rcTotal > 0 ? rc.map((x) => round((x / rcTotal) * 100, 1)) : eq.map((e) => round(e * 100, 1));

  const frontier = n > 1 ? efficientFrontier(returnsList, vols, M, { nPoints, rf, periods: 1, grid }) : null;

  return {
    nAssets: n,
    assets: assets.map((a) => ({
      name: a.name,
      nameEn: a.nameEn || a.name,
      vol: round(num(a.vol) * 100, 2),
      mu: round(num(a.mu) * 100, 2),
    })),
    rf: round(rf * 100, 2),
    plans,
    best,
    riskContribution: rcPct,
    frontier,
  };
}

/**
 * 取预设篮子（按 id）；未知 id → 第一个预设。
 * @param {string} [id]
 * @returns {object} 预设对象
 */
export function getPreset(id) {
  if (!id) return PRESETS[0];
  return PRESETS.find((p) => p.id === id) || PRESETS[0];
}

/**
 * 由预设 id 生成组合优化方案（getPreset + buildPortfolioPlan 的便捷组合），
 * 并在结果上附加预设元信息。
 * @param {string} id
 * @param {object} [opts]
 * @returns {object} buildPortfolioPlan 返回值 + { presetId, presetName, presetNameEn, desc, descEn }
 */
export function planForPreset(id, opts) {
  const preset = getPreset(id);
  const plan = buildPortfolioPlan(preset, opts);
  return {
    ...plan,
    presetId: preset.id,
    presetName: preset.name,
    presetNameEn: preset.nameEn,
    desc: preset.desc,
    descEn: preset.descEn,
  };
}
