// lib/ruin.js — 破产概率（Risk of Ruin，纯函数，可单元测试）
//
// 给定胜率、盈亏比（R:R）与以「每笔风险 R」计的本金，估算破产概率。
// 每笔：以概率 w 赢 +rr R，以概率 q=1−w 亏 −1 R。
//   单笔期望 e = w·rr − q
//   若 e ≤ 0：长期必亏，破产概率 = 1
//   否则：P(破产) = ((q/w)·(1/rr))^B，B = 本金（R 单位）
// 这是「赌徒破产 / 等比例下注」经典模型；确定性、零外部依赖。

export const STORAGE_KEY = "weacond:ruin:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 破产概率。winRate 为百分数（如 55 = 55%）。
export function riskOfRuin(winRate, rr, bankrollR) {
  const w = num(winRate) / 100;
  const r = num(rr);
  const B = num(bankrollR);
  const valid = w > 0 && w < 1 && r >= 0 && B > 0;
  if (!valid) return { pRuin: NaN, edge: NaN, ratio: NaN, valid: false };
  const q = 1 - w;
  const edge = w * r - q; // 单笔期望（R 单位）
  const ratio = r > 0 ? (q / w) * (1 / r) : Infinity; // (q/p)·(亏/赢)
  let pRuin = edge <= 0 ? 1 : Math.pow(ratio, B);
  pRuin = Math.min(1, Math.max(0, pRuin));
  return { pRuin, edge, ratio, valid: true };
}

// 破产概率分级。
export function ruinBand(pRuin) {
  if (!Number.isFinite(pRuin)) return "na";
  const p = num(pRuin);
  if (p <= 0.01) return "safe";
  if (p <= 0.1) return "low";
  if (p <= 0.5) return "elevated";
  return "high";
}

// 综合视图。
export function ruinSummary(inputs = {}) {
  const { winRate, rr, bankrollR } = inputs;
  const res = riskOfRuin(winRate, rr, bankrollR);
  const band = res.valid ? ruinBand(res.pRuin) : "na";
  return { ...res, band, valid: res.valid };
}

// 预设：不同优势情景。
export const RUIN_PRESETS = {
  edge: { id: "edge", label: "有优势", winRate: 55, rr: 2, bankrollR: 10 },
  breakeven: { id: "breakeven", label: "盈亏平衡", winRate: 50, rr: 1, bankrollR: 10 },
  highWinLowRr: { id: "highWinLowRr", label: "高胜率低赔率", winRate: 70, rr: 0.5, bankrollR: 10 },
  noEdge: { id: "noEdge", label: "无优势", winRate: 40, rr: 1, bankrollR: 10 },
};
export { num };