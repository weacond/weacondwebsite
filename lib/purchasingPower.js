// lib/purchasingPower.js — 货币购买力 / 通胀侵蚀（纯计算，无 IO，可单元测试）
//
// 经典「通胀计算器」：今天的钱在通胀下逐年贬值。
//
//   维持购买力所需名义金额 = 金额 × (1+通胀)^years
//   该笔钱 N 年后的今日购买力 = 金额 / (1+通胀)^years
//   购买力流失比例         = 1 − 1/(1+通胀)^years
//   购买力减半年数(精确)   = ln2 / ln(1+通胀)
//   72 法则(近似)          = 72 / (通胀×100)
//
// 入参（fraction）：
//   amount     金额
//   inflation  年通胀率（fraction，0.03 = 3%）
//   years      年数
//   realReturn 可选：实际年收益率（求「跑赢通胀」需的名义收益，fraction）

export function num(x, d = 0) {
  const n = typeof x === "number" ? x : parseFloat(x);
  return Number.isFinite(n) ? n : d;
}

// 通胀因子：(1+i)^years —— 价格/名义倍数
export function inflationFactor(inflation, years) {
  return Math.pow(1 + num(inflation, 0), num(years, 0));
}

export function purchasingPower(inputs = {}) {
  const amount = num(inputs.amount, 0);
  const inflation = num(inputs.inflation, 0);
  const years = num(inputs.years, 0);
  const factor = Math.pow(1 + inflation, years);

  // 维持购买力所需的名义金额
  const futureNominal = amount * factor;
  // N 年后该笔钱的「今日购买力」
  const realValueToday = factor > 0 ? amount / factor : 0;
  // 购买力流失比例（0..1）
  const powerLost = factor > 0 ? 1 - 1 / factor : 0;
  // 购买力减半年数（精确）
  const halfLife = inflation > 0 ? Math.log(2) / Math.log(1 + inflation) : null;
  // 72 法则近似
  const rule72 = inflation > 0 ? 72 / (inflation * 100) : null;

  // 若提供实际目标收益：要维持购买力，名义收益须 ≥ 通胀
  const realReturn = num(inputs.realReturn, 0);
  // 费雪近似：名义 ≈ 实际 + 通胀（精确：(1+名义)=(1+实际)(1+通胀)−1）
  const requiredNominal = (1 + realReturn) * (1 + inflation) - 1;

  const valid = amount >= 0 && inflation >= 0 && years >= 0;
  return {
    valid,
    amount,
    inflation,
    years,
    factor,
    futureNominal,
    realValueToday,
    powerLost,
    halfLife,
    rule72,
    requiredNominal,
  };
}

// 购买力流失分级
export function ppBand(powerLost) {
  if (powerLost == null || !Number.isFinite(powerLost)) return "n/a";
  if (powerLost >= 0.5) return "severe";
  if (powerLost >= 0.2) return "noticeable";
  if (powerLost > 0.01) return "mild";
  return "negligible";
}

// 预设
export const PP_PRESETS = {
  mild: { id: "mild", label: "温和 3% × 10y", labelEn: "Mild 3% × 10y", amount: 100000, inflation: 0.03, years: 10 },
  moderate: { id: "moderate", label: "常态 5% × 10y", labelEn: "Moderate 5% × 10y", amount: 100000, inflation: 0.05, years: 10 },
  high: { id: "high", label: "高 8% × 10y", labelEn: "High 8% × 10y", amount: 100000, inflation: 0.08, years: 10 },
  severe: { id: "severe", label: "严重 25% × 5y", labelEn: "Severe 25% × 5y", amount: 100000, inflation: 0.25, years: 5 },
};