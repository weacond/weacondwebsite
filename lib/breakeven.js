// lib/breakeven.js — 含手续费的盈亏平衡价与有效盈亏比（纯函数，可单元测试）
//
// 交易者常问「扣手续费后，多少价才打平」。给定入场价与单边手续费率：
//   多头盈亏平衡价 = entry·(1+fee)/(1−fee)
//   空头盈亏平衡价 = entry·(1−fee)/(1+fee)
// 再给出扣双边手续费后的有效 R:R（grossRr 为扣费前）。
// 全部确定性、零外部依赖，便于 SSR 与单元测试。

export const STORAGE_KEY = "weacond:breakeven:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 含双边手续费的盈亏平衡价。feePct 为单边费率（百分数，如 0.1 = 0.1%）。
export function breakeven(side, entry, feePct) {
  const e = num(entry);
  const fee = num(feePct) / 100;
  const short = side === "short";
  const valid = e > 0 && fee >= 0 && fee < 1;
  const breakeven = short ? (e * (1 - fee)) / (1 + fee) : (e * (1 + fee)) / (1 - fee);
  return {
    breakeven,
    fee,
    side,
    valid,
    movePct: valid ? Math.abs(breakeven - e) / e : 0,
  };
}

// 扣双边手续费后的有效盈亏比。feePct 为单边费率（百分数）。
export function rrAfterFees(entry, stop, target, feePct) {
  const fee = num(feePct) / 100;
  const e = num(entry);
  const s = num(stop);
  const t = num(target);
  const risk = Math.abs(e - s);
  const reward = Math.abs(t - e);
  const feeDrag = e * fee * 2; // 进出各一次手续费，近似
  const netRisk = risk + feeDrag;
  const netReward = reward - feeDrag;
  const grossRr = risk > 0 ? reward / risk : 0;
  const rr = netRisk > 0 ? netReward / netRisk : 0;
  return { risk, reward, feeDrag, netRisk, netReward, grossRr, rr, fee };
}

// 综合视图：盈亏平衡价 + 有效盈亏比。
export function breakevenSummary(inputs = {}) {
  const { side, entry, stop, target, feePct } = inputs;
  const be = breakeven(side, entry, feePct);
  const rr = stop != null ? rrAfterFees(entry, stop, target, feePct) : null;
  return { ...be, rr, valid: be.valid };
}

// 盈亏比分级。
export function rrBand(rr) {
  const r = num(rr);
  if (r <= 0) return "poor";
  if (r < 1) return "thin";
  if (r < 2) return "fair";
  return "strong";
}

// 预设：不同市场的手续费情景。
export const BREAKEVEN_PRESETS = {
  stock: { id: "stock", label: "股票（佣金 0.05%）", side: "long", entry: 100, stop: 97, target: 106, feePct: 0.05 },
  crypto: { id: "crypto", label: "币圈（手续费 0.1%）", side: "long", entry: 30000, stop: 29400, target: 31200, feePct: 0.1 },
  short: { id: "short", label: "空头（手续费 0.1%）", side: "short", entry: 200, stop: 206, target: 190, feePct: 0.1 },
  simple: { id: "simple", label: "零手续费", side: "long", entry: 50, stop: 48, target: 53, feePct: 0 },
};
export { num };