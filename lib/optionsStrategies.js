/**
 * lib/optionsStrategies.js — 期权组合盈亏分析（纯函数，确定性，可测试）
 *
 * 基于 lib/options.js 的 Black-Scholes 定价。组合由若干"腿"构成：
 *   leg = { type: 'call' | 'put' | 'share', strike, qty }
 *     - call/put：qty 正=买入(long)、负=卖出(short)；strike 为行权价
 *     - share   ：标的股票，qty 正=多、负=空（无 strike，到期按 qty*S 计）
 *
 * 盈亏口径（到期 t→0）：
 *   P/L(S) = Σ qty * 到期价值 − 净权利金(at 成交价 S0)
 *   其中到期价值：call=max(0,S-K)，put=max(0,K-S)，share=S
 *   净权利金(at S0)：Σ qty * 成交价（call/put 用 B-S，share 用 S0）
 */

import { priceOption, normCdf, optionGreeks } from "./options.js";

function round(n, dp = 2) {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

/**
 * 在成交价 S0 下，组合的净权利金。
 * 返回正值 = 净支出(debit)；负值 = 净收入(credit)。
 */
export function strategyPremium(legs, S0, { r = 0.04, t, iv } = {}) {
  let net = 0;
  for (const leg of legs) {
    if (leg.type === "share") {
      net += leg.qty * S0;
    } else {
      const p = priceOption(leg.type, S0, leg.strike, { r, t, iv });
      net += leg.qty * p.price;
    }
  }
  return round(net, 4);
}

// 到期时组合价值（内在价值）
function expiryValue(legs, S) {
  let v = 0;
  for (const leg of legs) {
    if (leg.type === "share") v += leg.qty * S;
    else if (leg.type === "call") v += leg.qty * Math.max(0, S - leg.strike);
    else v += leg.qty * Math.max(0, leg.strike - S); // put
  }
  return v;
}

/**
 * 标的到期价为 S 时，组合盈亏 = 到期价值 − 净权利金。
 */
export function strategyPayoffAt(legs, S, premium) {
  return round(expiryValue(legs, S) - premium, 2);
}

/**
 * 组合盈亏分析：净权利金、最大盈亏、盈亏平衡点、盈亏曲线。
 * @param {Array} legs
 * @param {object} opts { spot, r, t, iv }
 * @returns {{ premium, maxProfit, maxLoss, breakEvens, unboundedProfit, unboundedLoss, payoffCurve }}
 *   maxProfit/maxLoss 为 null 表示该侧无界（如裸买 call 上端无界、裸卖 call 下端无界）。
 */
export function analyzeStrategy(legs, { spot, r = 0.04, t, iv } = {}) {
  if (!Array.isArray(legs) || legs.length === 0) {
    throw new Error("analyzeStrategy: 至少需要一条腿");
  }

  const premium = strategyPremium(legs, spot, { r, t, iv });

  const strikes = Array.from(new Set(legs.filter((l) => l.type !== "share").map((l) => l.strike)))
    .sort((a, b) => a - b);
  const upper = Math.max(spot * 2, strikes.length ? strikes[strikes.length - 1] * 1.5 : spot * 1.5);

  // kink 点：0 + 各行权价 + 上界（P/L 在 kink 间线性）
  const points = [0, ...strikes, round(upper, 2)].sort((a, b) => a - b);
  const pl = points.map((s) => strategyPayoffAt(legs, s, premium));

  // 上下界是否"仍在延伸"→ 该侧盈亏无界
  const last = pl.length - 1;
  const unboundedProfit = pl[last] > pl[last - 1] + 1e-9; // 上端仍在上升
  const unboundedLoss = pl[last] < pl[last - 1] - 1e-9; // 上端仍在下降（如裸卖 call）

  // 最大盈亏（有界侧取 kink 极值；无界侧为 null）
  let maxProfit = null;
  let maxLoss = null;
  if (!unboundedProfit) maxProfit = round(Math.max(...pl), 2);
  if (!unboundedLoss) maxLoss = round(Math.min(...pl), 2);

  // 盈亏平衡点：相邻 kink P/L 异号处线性插值
  const breakEvens = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [xa, xb] = [points[i], points[i + 1]];
    const [pa, pb] = [pl[i], pl[i + 1]];
    if (pa === 0) { breakEvens.push(round(xa)); continue; }
    if (pa * pb < 0) {
      const x0 = xa - (pa * (xb - xa)) / (pb - pa);
      breakEvens.push(round(x0, 2));
    }
  }

  // 盈亏曲线（用于图表）：0→upper 采样
  const N = 48;
  const payoffCurve = [];
  for (let i = 0; i <= N; i++) {
    const s = round((upper * i) / N, 2);
    payoffCurve.push({ price: s, profit: strategyPayoffAt(legs, s, premium) });
  }

  return { premium, maxProfit, maxLoss, breakEvens, unboundedProfit, unboundedLoss, payoffCurve };
}

/**
 * 常见策略模板（供 UI 快速选择）。spot 为现价，K1<K2。
 * 每个模板返回 legs；配合 analyzeStrategy 计算盈亏。
 * width 为蝶式翼宽（可选，默认 (K2−K1)/2）。
 */
export function strategyTemplates(spot, K1, K2, width) {
  const k1 = Math.round(K1 * 100) / 100;
  const k2 = Math.round(K2 * 100) / 100;
  const w = width != null ? Math.round(width * 100) / 100 : Math.max(0.5, (k2 - k1) / 2);
  const wingLow = Math.round((k1 - w) * 100) / 100;
  const wingHigh = Math.round((k2 + w) * 100) / 100;
  const mid = Math.round(((k1 + k2) / 2) * 100) / 100; // 蝶式中轴 strike = (k1+k2)/2
  return [
    { id: "long_call", name: "买入看涨 (Long Call)", legs: [{ type: "call", strike: k1, qty: 1 }] },
    { id: "long_put", name: "买入看跌 (Long Put)", legs: [{ type: "put", strike: k1, qty: 1 }] },
    { id: "bull_call_spread", name: "牛市看涨价差", legs: [{ type: "call", strike: k1, qty: 1 }, { type: "call", strike: k2, qty: -1 }] },
    { id: "bear_put_spread", name: "熊市看跌价差", legs: [{ type: "put", strike: k2, qty: 1 }, { type: "put", strike: k1, qty: -1 }] },
    { id: "long_straddle", name: "买入跨式 (Long Straddle)", legs: [{ type: "call", strike: k1, qty: 1 }, { type: "put", strike: k1, qty: 1 }] },
    { id: "covered_call", name: "备兑看涨 (Covered Call)", legs: [{ type: "share", qty: 1 }, { type: "call", strike: k2, qty: -1 }] },
    // 新增：风险定义的蝶式/跨式/反转
    { id: "short_straddle", name: "卖出跨式 (Short Straddle)", legs: [{ type: "call", strike: k1, qty: -1 }, { type: "put", strike: k1, qty: -1 }] },
    {
      id: "iron_condor",
      name: "铁蝶 (Iron Condor)",
      legs: [
        { type: "put", strike: wingLow, qty: 1 },
        { type: "put", strike: k1, qty: -1 },
        { type: "call", strike: k2, qty: -1 },
        { type: "call", strike: wingHigh, qty: 1 },
      ],
    },
    { id: "risk_reversal", name: "风险反转 (Bullish RR)", legs: [{ type: "call", strike: k2, qty: 1 }, { type: "put", strike: k1, qty: -1 }] },
    // 蝶式：3 腿，中轴 strike = (k1+k2)/2，上/下盈亏皆有界（收权利金、押窄幅震荡）
    {
      id: "call_butterfly",
      name: "看涨蝶式 (Call Butterfly)",
      legs: [
        { type: "call", strike: k1, qty: 1 },
        { type: "call", strike: mid, qty: -2 },
        { type: "call", strike: k2, qty: 1 },
      ],
    },
    {
      id: "put_butterfly",
      name: "看跌蝶式 (Put Butterfly)",
      legs: [
        { type: "put", strike: k2, qty: 1 },
        { type: "put", strike: mid, qty: -2 },
        { type: "put", strike: k1, qty: 1 },
      ],
    },
  ];
}

// S_T ~ lognormal：ln(S_T) ~ N(ln S + (r − 0.5σ²)t, σ²t)，σ=iv·√t
function lognormCdf(x, spot, r, t, iv) {
  const sigma = iv * Math.sqrt(t);
  const m = Math.log(spot) + (r - 0.5 * iv * iv) * t;
  return normCdf((Math.log(x) - m) / sigma);
}

/**
 * 到期盈利概率 POP = P(到期 P/L > 0)。
 * 用 lognormal 对数正态分布 + 盈亏平衡区间积分（近似，教学用途）。
 * 退化(t≤0 / iv≤0)：无分布，返回 null。
 * @returns {number|null} ∈[0,1]，或 null（退化）
 */
export function probOfProfit(legs, { spot, r = 0.04, t, iv } = {}) {
  if (!(t > 0) || !(iv > 0) || spot <= 0) return null;

  const { breakEvens } = analyzeStrategy(legs, { spot, r, t, iv });
  if (breakEvens.length === 0) {
    // 无盈亏平衡 → 全区间同符号：用一个大 S 处的 P/L 判定恒盈/恒亏
    const premium = strategyPremium(legs, spot, { r, t, iv });
    const always = expiryValue(legs, spot * 5) - premium;
    return always > 0 ? 1 : 0;
  }

  const K = breakEvens.length;
  // 左右最外层区间的盈利符号：S→0 与 S→∞
  const premium = strategyPremium(legs, spot, { r, t, iv });
  const leftProfit = expiryValue(legs, 0.0001) - premium > 0;
  const rightProfit = expiryValue(legs, spot * 10) - premium > 0;

  let pop = 0;
  // 区间 0：[0, be1]
  if (leftProfit) pop += lognormCdf(breakEvens[0], spot, r, t, iv);
  // 中间区间 (be_i, be_{i+1})，符号交替
  for (let i = 0; i < K - 1; i++) {
    const profit = i % 2 === 0 ? !leftProfit : leftProfit;
    if (profit) pop += lognormCdf(breakEvens[i + 1], spot, r, t, iv) - lognormCdf(breakEvens[i], spot, r, t, iv);
  }
  // 区间 K：(beK, ∞)
  if (rightProfit) pop += 1 - lognormCdf(breakEvens[K - 1], spot, r, t, iv);

  return round(Math.min(1, Math.max(0, pop)), 4);
}

/**
 * 多腿组合的净希腊字母：把各腿希腊按 qty 线性叠加，得整组合的净 delta/gamma/theta/vega/rho。
 * 用于衡量策略层面的整体风险敞口（如价差的对冲比、跨式的零 delta 等）。
 *   - call/put 腿：optionGreeks(type, S, K) × qty（含 theta÷365、vega/rho÷100 口径）
 *   - share   腿：delta += qty（股票 delta=1/股），gamma/theta/vega/rho 为 0
 * 退化：非有限 spot 时期权腿希腊视为 0（仅 share 贡献 delta）；非有限/缺失 qty 的腿跳过。
 * @param {Array<{type:string,strike?:number,qty:number}>} legs
 * @param {{spot?:number, r?:number, t?:number, iv?:number}} [opts]
 * @returns {{delta:number,gamma:number,theta:number,vega:number,rho:number}} 全 round(4)
 */
export function strategyGreeks(legs, { spot, r = 0.04, t, iv } = {}) {
  const acc = { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  if (!Array.isArray(legs)) return acc;
  const optOK = typeof spot === "number" && Number.isFinite(spot) && spot > 0;
  for (const leg of legs) {
    if (!leg || typeof leg.qty !== "number" || !Number.isFinite(leg.qty)) continue;
    if (leg.type === "share") {
      acc.delta += leg.qty; // 股票 delta = 1 股
      continue;
    }
    if (leg.type !== "call" && leg.type !== "put") continue;
    if (!optOK) continue; // 非有效 spot → 期权腿希腊视为 0
    const g = optionGreeks(leg.type, spot, leg.strike, { r, t, iv });
    acc.delta += g.delta * leg.qty;
    acc.gamma += g.gamma * leg.qty;
    acc.theta += g.theta * leg.qty;
    acc.vega += g.vega * leg.qty;
    acc.rho += g.rho * leg.qty;
  }
  return {
    delta: round(acc.delta, 4),
    gamma: round(acc.gamma, 4),
    theta: round(acc.theta, 4),
    vega: round(acc.vega, 4),
    rho: round(acc.rho, 4),
  };
}

/**
 * Delta 对冲股数：使组合净 delta 归零所需的标的股数 = −净 delta（取自 strategyGreeks）。
 * 用于把期权组合做 delta 中性：shares > 0 需做多标的、shares < 0 需做空标的。
 * 口径与 strategyGreeks 完全一致；空/非法 legs 或退化 → 0。
 * @param {Array<{type:string,strike?:number,qty:number}>} legs
 * @param {{spot?:number, r?:number, t?:number, iv?:number}} [opts]
 * @returns {number} 对冲股数（round 4），正=多、负=空
 */
export function deltaHedge(legs, opts) {
  const h = round(-strategyGreeks(legs, opts).delta, 4);
  return h === 0 ? 0 : h; // 规范化 −0 → 0
}

