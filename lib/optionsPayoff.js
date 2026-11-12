// lib/optionsPayoff.js — 期权盈亏 / 盈亏平衡点（Options payoff / break-even，单腿，纯函数）
//
// 到期时点盈亏（单腿、单份，已扣权利金）：
//   买权 call: max(S−K,0) − 权利金      卖权 call: 权利金 − max(S−K,0)
//   买权 put : max(K−S,0) − 权利金      卖权 put : 权利金 − max(K−S,0)
// 盈亏平衡：long call K+P / short call K−P / long put K−P / short put K+P。
// 最大亏损/盈利：多头有限、空头 call 无限。
// 确定性、零外部依赖。教育性参考，非投资建议。

export const STORAGE_KEY = "weacond:optionsPayoff:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 期权内在价值（到期）。
export function intrinsic(type, spot, strike) {
  const S = num(spot);
  const K = num(strike);
  return type === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
}

// 到期盈亏（单腿、单份，已扣权利金）。多头 = 内在价值 − 权利金；空头 = 权利金 − 内在价值。
export function optionPayoff(type, side, spot, strike, premium) {
  const iv = intrinsic(type, spot, strike);
  const p = num(premium);
  return side === "short" ? p - iv : iv - p;
}

// 盈亏平衡点。
export function breakEven(type, side, strike, premium) {
  const K = num(strike);
  const p = num(premium);
  if (type === "call") return side === "short" ? K - p : K + p;
  return side === "short" ? K + p : K - p;
}

// 最大亏损：多头 = −权利金；空头 call = −∞；空头 put = −(K−权利金)。
export function maxLoss(type, side, strike, premium) {
  const K = num(strike);
  const p = num(premium);
  if (side === "long") return -p;
  if (type === "call") return -Infinity;
  return -(K - p);
}

// 最大盈利：买 call = +∞；买 put = K−权利金；空头 = 权利金。
export function maxProfit(type, side, strike, premium) {
  const K = num(strike);
  const p = num(premium);
  if (side === "long") return type === "call" ? Infinity : K - p;
  return p;
}

// 综合视图。
export function payoffSummary(inputs = {}) {
  const { type = "call", side = "long", spot = 100, strike = 100, premium = 0 } = inputs;
  const K = num(strike);
  const p = num(premium);
  const S = num(spot);
  let valid = type === "call" || type === "put";
  valid = valid && (side === "long" || side === "short");
  valid = valid && K > 0 && p >= 0 && S >= 0;
  if (!valid) return { valid: false };
  const be = breakEven(type, side, K, p);
  const ml = maxLoss(type, side, K, p);
  const mp = maxProfit(type, side, K, p);
  return {
    type,
    side,
    spot: S,
    strike: K,
    premium: p,
    intrinsic: intrinsic(type, S, K),
    breakEven: be,
    maxLoss: ml,
    maxProfit: mp,
    currentPayoff: optionPayoff(type, side, S, K, p),
    atTheMoney: Math.abs(S - K) <= p,
    valid: true,
  };
}

// 预设：典型单腿情景。
export const PAYOFF_PRESETS = {
  longCall:  { id: "longCall",  label: "买权 call", type: "call", side: "long",  spot: 105, strike: 100, premium: 3 },
  shortPut:  { id: "shortPut",  label: "卖权 put",  type: "put",  side: "short", spot: 100, strike: 90,  premium: 2 },
  longPut:   { id: "longPut",   label: "买权 put",  type: "put",  side: "long",  spot: 98,  strike: 100, premium: 3 },
  shortCall: { id: "shortCall", label: "卖权 call", type: "call", side: "short", spot: 100, strike: 110, premium: 2 },
  itmCall:   { id: "itmCall",   label: "实值 call", type: "call", side: "long",  spot: 120, strike: 100, premium: 15 },
};
export { num };
