// lib/avgEntry.js — 加仓后均价与盈亏平衡（纯函数，可单元测试）
//
// 把「原持仓」与「加仓」两笔合并，算新的加权平均入场价、现价盈亏、到目标价距离。
// 加仓会摊平或抬高成本，决定盈亏平衡点与到目标的距离——交易里最常见的复盘动作。
// 全部确定性、零外部依赖，便于 SSR 与单元测试。

export const STORAGE_KEY = "weacond:avgEntry:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 加权平均入场价：合并原持仓与加仓。addShares=0 时即原均价。
export function blendedAvg(existingShares, existingPrice, addShares, addPrice) {
  const es = Math.max(0, num(existingShares));
  const ep = Math.max(0, num(existingPrice));
  const as = Math.max(0, num(addShares));
  const ap = Math.max(0, num(addPrice));
  const existingCost = es * ep;
  const addCost = as * ap;
  const totalShares = es + as;
  const totalCost = existingCost + addCost;
  const avg = totalShares > 0 ? totalCost / totalShares : NaN;
  const addSharesPct = totalShares > 0 ? (as / totalShares) * 100 : 0;
  const addCostPct = totalCost > 0 ? (addCost / totalCost) * 100 : 0;
  // 加仓把均价从原 ep 拉到 avg 的偏移（%），负=摊平向下
  const avgShiftPct = ep > 0 ? ((avg - ep) / ep) * 100 : 0;
  return {
    totalShares,
    totalCost,
    avg,
    addSharesPct,
    addCostPct,
    avgShiftPct,
    valid: totalShares > 0,
  };
}

// 现价盈亏（相对均价）：profit 为绝对盈亏，profitPct 为相对均价的 %。
export function positionPnl(avg, current, shares) {
  const a = num(avg);
  const c = num(current);
  const s = Math.max(0, num(shares));
  const priceChange = c - a;
  const profit = priceChange * s;
  const profitPct = a > 0 ? (priceChange / a) * 100 : 0;
  return { priceChange, profit, profitPct, valid: a > 0 };
}

// 从现价到目标价的距离：方向 + 绝对幅度 + 百分比。
export function distanceTo(current, target) {
  const c = num(current);
  const t = num(target);
  const absMove = t - c;
  const pctMove = c > 0 ? (absMove / c) * 100 : 0;
  const direction = absMove > 0 ? "up" : absMove < 0 ? "down" : "flat";
  return { absMove, pctMove, direction, valid: c > 0 };
}

// 组合视图：合并 → 现价盈亏 → 到目标距离。
export function positionSummary(inputs = {}) {
  const { existingShares, existingPrice, addShares, addPrice, current, target } = inputs;
  const blended = blendedAvg(existingShares, existingPrice, addShares, addPrice);
  const spot = current != null && num(current) !== 0 ? current : addPrice;
  const pnl = positionPnl(blended.avg, spot, blended.totalShares);
  const toTarget = target != null ? distanceTo(num(current) > 0 ? current : blended.avg, target) : null;
  return { blended, pnl, toTarget };
}

// 盈亏状态：profit / loss / flat / invalid。
export function pnlStatus(pnl) {
  if (!pnl || !pnl.valid) return "invalid";
  if (pnl.profitPct > 0.01) return "profit";
  if (pnl.profitPct < -0.01) return "loss";
  return "flat";
}

// 预设：不同加仓场景。
export const AVG_ENTRY_PRESETS = {
  averageUp: {
    id: "averageUp", label: "顺势加仓",
    existingShares: 100, existingPrice: 100, addShares: 50, addPrice: 110, current: 112, target: 120,
  },
  averageDown: {
    id: "averageDown", label: "补仓摊平",
    existingShares: 100, existingPrice: 100, addShares: 50, addPrice: 90, current: 95, target: 100,
  },
  cryptoAdd: {
    id: "cryptoAdd", label: "币圈加仓",
    existingShares: 1, existingPrice: 20000, addShares: 0.5, addPrice: 17000, current: 18500, target: 22000,
  },
  initialOnly: {
    id: "initialOnly", label: "仅原持仓",
    existingShares: 200, existingPrice: 50, addShares: 0, addPrice: 50, current: 53, target: 55,
  },
};
export { num };