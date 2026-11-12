// lib/loan.js — 贷款/偿债摊销（Loan / Debt Payoff，纯函数）
//
// 等额本息月供：PMT = P·r·(1+r)^n / ((1+r)^n − 1)，r=年利率/12，n=年数×12。
// 确定性、零外部依赖。教育性参考，非投资建议。

export const STORAGE_KEY = "weacond:loan:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 月供（等额本息）。r=0 → P/n。
export function monthlyPayment(principal, annualRate, years) {
  const P = num(principal);
  const r = num(annualRate) / 12;
  const n = Math.max(0, Math.round(num(years) * 12));
  if (P <= 0 || n <= 0) return null;
  if (r === 0) return P / n;
  const growth = Math.pow(1 + r, n);
  return (P * r * growth) / (growth - 1);
}

// 总还款额。
export function totalPaid(payment, months) {
  return num(payment) * Math.max(0, Math.round(num(months)));
}

// 总利息 = 总还款 − 本金。
export function totalInterest(payment, months, principal) {
  return totalPaid(payment, months) - num(principal);
}

// 固定月供的偿还月数：n = ln(PMT/(PMT − P·r)) / ln(1+r)。
// 月供 ≤ 当期利息 → 永远还不完 → null。
export function payoffMonths(principal, annualRate, payment) {
  const P = num(principal);
  const r = num(annualRate) / 12;
  const pmt = num(payment);
  if (P <= 0 || pmt <= 0) return null;
  if (r === 0) return P / pmt;
  const interest = P * r;
  if (pmt <= interest) return null; // 永远还不完
  return Math.log(pmt / (pmt - interest)) / Math.log(1 + r);
}

// 偿还状态分级（按月数）。
export function payoffBand(months) {
  if (months == null) return "unbounded";
  const m = num(months);
  if (m <= 0) return "na";
  if (m <= 36) return "fast";
  if (m <= 120) return "medium";
  return "slow";
}

// 综合视图。
export function loanSummary(inputs = {}) {
  const { principal = 10000, annualRate = 0.12, years } = inputs;
  const P = num(principal);
  const ar = num(annualRate);
  const valid = P > 0 && ar >= 0;
  if (!valid) return { valid: false };
  const pmt = monthlyPayment(P, ar, years);
  const n = Math.max(0, Math.round(num(years) * 12));
  const paid = totalPaid(pmt, n);
  const interest = totalInterest(pmt, n, P);
  return {
    principal: P,
    annualRate: ar,
    years: num(years),
    payment: pmt,
    totalPaid: paid,
    interest,
    interestRatio: paid > 0 ? interest / paid : 0,
    payoffBand: payoffBand(n),
    valid: true,
  };
}

// 预设：典型贷款情景。
export const LOAN_PRESETS = {
  car:      { id: "car",      label: "车贷",   principal: 20000,   annualRate: 0.05, years: 5 },
  mortgage: { id: "mortgage", label: "房贷",   principal: 1000000, annualRate: 0.03, years: 30 },
  student:  { id: "student",  label: "学贷",   principal: 30000,   annualRate: 0.04, years: 10 },
  highRate: { id: "highRate", label: "高利率", principal: 5000,    annualRate: 0.18, years: 2 },
  zeroRate: { id: "zeroRate", label: "零利率", principal: 10000,   annualRate: 0,    years: 1 },
};
export { num };
