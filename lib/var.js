// lib/var.js — Value at Risk / 风险价值（VaR）+ 预期短缺（CVaR/ES），纯函数
//
// 概念：
//   参数法（高斯）在持有期 h（按 252 交易日年化）：
//     μ_h = μ·(h/252)
//     σ_h = σ·√(h/252)
//     z   = Φ⁻¹(confidence)（95% → 1.645，99% → 2.326）
//     VaR = z·σ_h − μ_h                 （损失占比，正数=预期损失）
//     ES  = σ_h·φ(z)/(1−c) − μ_h        （条件在 VaR 之外的平均损失，恒 ≥ VaR）
//   历史法：对收益序列升序取 (1−c) 分位为 VaR，取最尾 (1−c) 的平均为 ES。
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:var:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 标准正态 CDF：Φ(x)=½·(1+erf(x/√2))，erf 用 A&S 7.1.25 近似（对称，x=0 处精确为 0.5）
export function stdNormalCdf(x) {
  const arg = x / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * Math.abs(arg));
  const poly =
    0.254829592 * t -
    0.284496736 * t * t +
    1.421413741 * t ** 3 -
    1.453152027 * t ** 4 +
    1.061405429 * t ** 5;
  const erf = 1 - poly * Math.exp(-arg * arg);
  return 0.5 * (1 + (arg >= 0 ? erf : -erf));
}

// 标准正态 PDF
export function stdNormalPdf(x) {
  return Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
}

// 逆标准正态 CDF：在单调 CDF 上二分法精修（稳健、与实现无关，精度受 CDF ~1e-7 限制）
export function stdNormalQuantile(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  let lo = -8,
    hi = 8;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (stdNormalCdf(mid) < p) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-10) break;
  }
  return (lo + hi) / 2;
}

// 参数法（高斯）：给定年化 μ/σ、持有期(天)、置信度，求 VaR/ES 损失占比。
// 返回 null 表示输入非法（σ≤0 / 置信度越界 / 持有期≤0）。
export function parametricVar({ mu = 0, sigma = 0, horizonDays = 1, confidence = 0.95 } = {}) {
  const m = num(mu);
  const s = num(sigma);
  const c = num(confidence);
  const h = num(horizonDays);
  if (!(s > 0) || !(c > 0) || !(c < 1) || !(h > 0)) return null;
  const years = h / 252;
  const muH = m * years;
  const sigmaH = s * Math.sqrt(years);
  const z = stdNormalQuantile(c);
  const varPct = z * sigmaH - muH; // 损失占比（正=预期损失）
  const alpha = 1 - c; // 尾部概率
  const esPct = (sigmaH * stdNormalPdf(z)) / alpha - muH; // 预期短缺 ES
  return { muH, sigmaH, z, varPct, esPct, valid: true };
}

// 历史法：对收益序列求历史 VaR/ES（升序分位 + 尾部均值）。
// series 可为数组或逗号/空格分隔字符串；点数 <10 或置信度越界 → { valid:false }。
export function historicalVar(returns, confidence = 0.95) {
  const arr = (Array.isArray(returns) ? returns : String(returns).split(/[,\s]+/))
    .map((x) => num(x))
    .filter((x) => Number.isFinite(x));
  const c = num(confidence);
  if (arr.length < 10 || !(c > 0) || !(c < 1)) return { valid: false, count: arr.length };
  const sorted = [...arr].sort((a, b) => a - b);
  const alpha = 1 - c;
  const idx = Math.min(Math.max(0, Math.floor(alpha * sorted.length) - 1), sorted.length - 1);
  const varPct = -sorted[idx];
  const tailCount = Math.max(1, Math.round(alpha * sorted.length));
  const tail = sorted.slice(0, tailCount);
  const esPct = -(tail.reduce((s, x) => s + x, 0) / tail.length);
  return { varPct, esPct, count: arr.length, valid: true };
}

// 按 |VaR 损失占比| 分级。
export function varBand(varPct) {
  const v = Math.abs(num(varPct));
  if (v < 0.01) return "low";
  if (v < 0.03) return "moderate";
  if (v < 0.06) return "high";
  return "extreme";
}

// 综合视图：参数法为主，附带历史法（给定 series 时）。
export function varSummary(inputs = {}) {
  const {
    positionValue = 0,
    mu = 0,
    sigma = 0,
    horizonDays = 1,
    confidence = 0.95,
    series,
  } = inputs;
  const P = num(positionValue);
  const p = parametricVar({ mu, sigma, horizonDays, confidence });
  if (!p || !(P > 0)) return { valid: false };
  const varLoss = P * p.varPct;
  const esLoss = P * p.esPct;
  const historical = series ? historicalVar(series, confidence) : null;
  return {
    positionValue: P,
    mu: num(mu),
    sigma: num(sigma),
    horizonDays: num(horizonDays),
    confidence: num(confidence),
    muH: p.muH,
    sigmaH: p.sigmaH,
    z: p.z,
    varPct: p.varPct,
    esPct: p.esPct,
    varLoss,
    esLoss,
    historical,
    band: varBand(p.varPct),
    valid: true,
  };
}

// 预设：常见风险情景。
export const VAR_PRESETS = {
  equityDaily: { id: "equityDaily", label: "股票 日 95%", positionValue: 1000000, mu: 0.1, sigma: 0.2, horizonDays: 1, confidence: 0.95 },
  equityWeekly99: { id: "equityWeekly99", label: "股票 周 99%", positionValue: 1000000, mu: 0.1, sigma: 0.2, horizonDays: 5, confidence: 0.99 },
  cryptoDaily: { id: "cryptoDaily", label: "加密 日 95%", positionValue: 100000, mu: 0.5, sigma: 1.0, horizonDays: 1, confidence: 0.95 },
  bondDaily: { id: "bondDaily", label: "债券 日 95%", positionValue: 1000000, mu: 0.04, sigma: 0.03, horizonDays: 1, confidence: 0.95 },
  stress99: { id: "stress99", label: "压力 日 99%", positionValue: 100000, mu: 0.0, sigma: 0.3, horizonDays: 1, confidence: 0.99 },
};
export { num };
