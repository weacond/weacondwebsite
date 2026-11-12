// lib/barrier.js — 双屏障命中概率（Two-barrier hit probability，纯函数，可单元测试）
//
// 给定到目标的距离 a（上方）与到止损的距离 b（下方），以及每步漂移 λ，
// 估算「先触及目标」的概率。经典「两屏障 / 赌徒破产」模型：
//   λ = 0（无漂移）：P(先触目标) = b / (a + b)
//   λ ≠ 0：P = (1 − e^{−2λb}) / (1 − e^{−2λ(a+b)})
// 直觉：无漂移时越近的屏障越先被触及；正向漂移抬升触目标的概率。
// 全部确定性、零外部依赖。

export const STORAGE_KEY = "weacond:barrier:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// a = 到目标距离（>0），b = 到止损距离（>0），drift = 每步漂移（小数，可 0）。
export function barrierProbability(a, b, drift = 0) {
  const A = num(a);
  const B = num(b);
  const lam = num(drift);
  const valid = A > 0 && B > 0;
  if (!valid) return { pTarget: NaN, pStop: NaN, valid: false };
  if (lam === 0) {
    const pTarget = B / (A + B);
    return { pTarget, pStop: 1 - pTarget, valid: true };
  }
  const numerator = 1 - Math.exp(-2 * lam * B);
  const denominator = 1 - Math.exp(-2 * lam * (A + B));
  const pTarget = denominator === 0 ? 0.5 : numerator / denominator;
  return { pTarget: Math.min(1, Math.max(0, pTarget)), pStop: 1 - pTarget, valid: true };
}

// 命中目标概率分级。
export function hitBand(pTarget) {
  if (!Number.isFinite(pTarget)) return "na";
  const p = num(pTarget);
  if (p >= 0.6) return "favorable";
  if (p >= 0.4) return "neutral";
  return "unfavorable";
}

// 综合视图。
export function barrierSummary(inputs = {}) {
  const { target, stop, drift } = inputs;
  const res = barrierProbability(target, stop, drift);
  const band = res.valid ? hitBand(res.pTarget) : "na";
  return { ...res, band, valid: res.valid };
}

// 预设：不同屏障几何与漂移。
export const BARRIER_PRESETS = {
  even: { id: "even", label: "等距", target: 1, stop: 1, drift: 0 },
  tightStop: { id: "tightStop", label: "近止损", target: 2, stop: 1, drift: 0 },
  wideStop: { id: "wideStop", label: "远止损", target: 1, stop: 2, drift: 0 },
  driftUp: { id: "driftUp", label: "正向漂移", target: 1, stop: 1, drift: 0.01 },
};
export { num };