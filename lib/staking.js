// lib/staking.js — 加密质押收益 / 通胀侵蚀（Crypto staking yield / inflation erosion，纯函数）
//
// 给定本金 P、质押年化收益率 apy、代币通胀率 infl、持有年数 n：
// 总质押奖励 = P·((1+apy)^n − 1)
// 净收益率 = apy − infl（通胀侵蚀后的实际收益）
// 通胀侵蚀后终值 = P·(1+net)^n
// 年度奖励 = P·apy
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:staking:v1";
function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}
// 总质押奖励 = P·((1+apy)^n − 1)。
export function stakingReward(principal, apy, years) {
  const P = num(principal);
  const a = num(apy);
  const n = num(years);
  if (n <= 0) return 0;
  return P * (Math.pow(1 + a, n) - 1);
}
// 净收益率 = apy − infl。
export function netYield(stakingApy, inflationRate) {
  return num(stakingApy) - num(inflationRate);
}
// 通胀侵蚀后终值 = P·(1+net)^n。
export function inflationEroded(principal, netYieldPct, years) {
  const P = num(principal);
  const r = num(netYieldPct);
  const n = num(years);
  return P * Math.pow(1 + r, n);
}
// 年度奖励 = P·apy。
export function annualReward(principal, apy) {
  return num(principal) * num(apy);
}
// 净收益率分级。
export function stakeBand(netYieldPct) {
  const r = num(netYieldPct);
  if (r < 0) return "negative";
  if (r < 0.03) return "low";
  if (r < 0.07) return "moderate";
  return "high";
}
// 综合视图。
export function stakeSummary(inputs = {}) {
  const { principal = 100, apy = 0.04, inflationRate = 0.02, years } = inputs;
  const P = num(principal);
  const a = num(apy);
  const inf = num(inflationRate);
  const n = num(years);
  const valid = P > 0 && a > -1 && inf > -1 && n >= 0;
  if (!valid) return { valid: false };
  const reward = stakingReward(P, a, n);
  const net = netYield(a, inf);
  const eroded = inflationEroded(P, net, n);
  const ann = annualReward(P, a);
  return {
    principal: P,
    apy: a,
    inflationRate: inf,
    years: n,
    stakingReward: reward,
    netYield: net,
    inflationEroded: eroded,
    annualReward: ann,
    band: stakeBand(net),
    valid: true,
  };
}
// 预设：主流质押场景。
export const STAKING_PRESETS = {
  ethStake: { id: "ethStake", label: "ETH 质押", principal: 10, apy: 0.035, inflationRate: 0.02, years: 3 },
  solStake: { id: "solStake", label: "SOL 质押", principal: 100, apy: 0.06, inflationRate: 0.05, years: 3 },
  dotStake: { id: "dotStake", label: "DOT 质押", principal: 1000, apy: 0.1, inflationRate: 0.03, years: 1 },
  highInfl: { id: "highInfl", label: "高通胀代币", principal: 500, apy: 0.08, inflationRate: 0.15, years: 2 },
  longStake: { id: "longStake", label: "长期 5Y", principal: 1000, apy: 0.04, inflationRate: 0.02, years: 5 },
};
export { num };
