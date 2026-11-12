// lib/atrStop.js — ATR 止损与按 ATR 的头寸规模（纯函数，可单元测试）
//
// ATR（Average True Range）衡量波动大小，含跳空。常用它定止损距离与头寸：
// 止损 = 入场 ± N·ATR；头寸 = 风险金额 / 止损距离。
// 全部确定性、零外部依赖，便于 SSR 与单元测试。

export const STORAGE_KEY = "weacond:atrStop:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 真实波幅：max(H−L, |H−前收|, |L−前收|)。无前收时退化为 H−L。
export function trueRange(bar, prevClose) {
  const h = num(bar?.high);
  const l = num(bar?.low);
  if (prevClose == null || !Number.isFinite(num(prevClose))) return Math.max(0, h - l);
  const pc = num(prevClose);
  return Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
}

// Wilder's ATR：种子为前 p 个 TR 的均值，其后做 Wilder 平滑。
export function atr(bars, period = 14) {
  const clean = (Array.isArray(bars) ? bars : [])
    .filter((b) => b && Number.isFinite(num(b.high)) && Number.isFinite(num(b.low)));
  const n = clean.length;
  if (n === 0) return { value: NaN, valid: false, n: 0 };
  const p = Math.max(1, Math.floor(num(period)));
  const trs = [];
  for (let i = 0; i < n; i++) {
    const prev = i > 0 ? clean[i - 1].close : null;
    trs.push(trueRange(clean[i], prev));
  }
  const seedCount = Math.min(p, trs.length);
  let value = trs.slice(0, seedCount).reduce((s, t) => s + t, 0) / seedCount;
  for (let i = seedCount; i < trs.length; i++) {
    value = (value * (p - 1) + trs[i]) / p;
  }
  return { value, valid: value > 0, n, trs, period: p };
}

// ATR 止损价：多头 = 入场 − N·ATR；空头 = 入场 + N·ATR。
export function atrStop(side, entry, atrVal, mult = 1) {
  const e = num(entry);
  const a = num(atrVal);
  const m = Math.max(0, num(mult));
  const dist = m * a;
  const stop = side === "short" ? e + dist : e - dist;
  return { stop, dist, side, valid: dist > 0 && Number.isFinite(stop) };
}

// 每份风险 = |入场 − 止损|。
export function riskPerShare(entry, stop) {
  return Math.abs(num(entry) - num(stop));
}

// 按 ATR 的头寸规模：风险金额 / 止损距离。
export function positionSizeByAtr(account, riskPct, atrVal, mult = 1) {
  const risk = num(account) * num(riskPct) / 100;
  const stopDist = Math.max(0, num(mult)) * num(atrVal);
  const shares = stopDist > 0 ? risk / stopDist : 0;
  return { risk, stopDist, shares, valid: stopDist > 0 };
}

// 组合视图：止损 + 头寸 + （可选）盈亏比。
export function atrSummary(inputs = {}) {
  const { account, riskPct, side, entry, atrVal, mult, target } = inputs;
  const stop = atrStop(side, entry, atrVal, mult);
  const size = positionSizeByAtr(account, riskPct, atrVal, mult);
  const rr = target != null
    ? {
        risk: stop.dist,
        reward: Math.abs(num(target) - num(entry)),
        ratio: stop.dist > 0 ? Math.abs(num(target) - num(entry)) / stop.dist : NaN,
      }
    : null;
  return { stop, size, rr, valid: stop.valid && size.valid };
}

// 盈亏比分级。
export function rrBand(ratio) {
  const r = num(ratio);
  if (r <= 0) return "poor";
  if (r < 1) return "thin";
  if (r < 2) return "fair";
  return "strong";
}

// 预设：不同 ATR 止损场景。
export const ATR_PRESETS = {
  dayLong: { id: "dayLong", label: "日内多头", account: 10000, riskPct: 1, side: "long", entry: 100, atrVal: 1.5, mult: 1.5, target: 104 },
  swingShort: { id: "swingShort", label: "波段空头", account: 50000, riskPct: 0.5, side: "short", entry: 200, atrVal: 3, mult: 2, target: 190 },
  cryptoLong: { id: "cryptoLong", label: "币圈多头", account: 2000, riskPct: 2, side: "long", entry: 30000, atrVal: 800, mult: 2, target: 32000 },
  simple: { id: "simple", label: "简单示例", account: 10000, riskPct: 1, side: "long", entry: 50, atrVal: 1, mult: 1, target: 52 },
};
export { num };