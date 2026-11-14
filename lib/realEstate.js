// lib/realEstate.js — 房地产投资分析（Net Operating Income / Cap Rate / CoC / DSCR）
//
// 给定买入价 P、首付 D、年毛租金 R、年运营费用 E（除按揭外全部）、按揭利率 r、
// 贷款年限 T（以及可选目标资本化率 c*），计算出租物业的核心投资指标：
//   净营运收入 NOI  = R − E
//   资本化率 CapRate = NOI / P
//   月供 P&I       = L·i·(1+i)^n / ((1+i)^n − 1)   （i=r/12, n=T·12, L=P−D；i=0 → L/n）
//   年还本付息 DS  = 月供 × 12
//   年净现金流     = NOI − DS
//   现金回报率 CoC = 年净现金流 / D      （全款 D=P 时即 = CapRate；D=0 无意义）
//   债务覆盖倍数 DSCR = NOI / DS         （DS=0 即全款，无按揭 → 无穷大）
//   贷款价值比 LTV = L / P
//   反推合理估值   = NOI / c*            （按市场目标资本化率给物业估值）
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:realEstate:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 净营运收入 NOI = 年毛租金 − 年运营费用。
export function netOperatingIncome(annualRent, operatingExpenses) {
  return num(annualRent) - num(operatingExpenses);
}

// 资本化率 Cap Rate = NOI / 买入价；价 ≤0 返回 null。
export function capRate(noi, purchasePrice) {
  const p = num(purchasePrice);
  if (!(p > 0)) return null;
  return num(noi) / p;
}

// 月供 P&I = L·i·(1+i)^n / ((1+i)^n − 1)；月利率 i=0 → 等额 L/n；L≤0 或 n≤0 → 0。
export function monthlyPmt(loanAmount, annualRate, termYears) {
  const L = num(loanAmount);
  const n = Math.round(num(termYears) * 12);
  if (!(L > 0) || !(n > 0)) return 0;
  const i = num(annualRate) / 12;
  if (i === 0) return L / n;
  const f = Math.pow(1 + i, n);
  return (L * i * f) / (f - 1);
}

// 年还本付息 = 月供 × 12。
export function annualDebtService(monthlyPayment) {
  return num(monthlyPayment) * 12;
}

// 现金回报率 CoC = 年净现金流 / 首付；首付 ≤0 返回 null（无自有本金则无意义）。
export function cashOnCash(annualCashFlow, downPayment) {
  const d = num(downPayment);
  if (!(d > 0)) return null;
  return num(annualCashFlow) / d;
}

// 债务覆盖倍数 DSCR = NOI / 年还本付息；DS≤0（无按揭）返回 null。
export function dscr(noi, annualDebtServiceAmt) {
  const ds = num(annualDebtServiceAmt);
  if (!(ds > 0)) return null;
  return num(noi) / ds;
}

// 贷款价值比 LTV = 贷款额 / 买入价；价 ≤0 返回 null。
export function ltv(loanAmount, purchasePrice) {
  const p = num(purchasePrice);
  if (!(p > 0)) return null;
  return num(loanAmount) / p;
}

// 按市场目标资本化率反推合理估值 = NOI / c*；c*≤0 返回 null。
export function impliedValue(noi, targetCapRate) {
  const c = num(targetCapRate);
  if (!(c > 0)) return null;
  return num(noi) / c;
}

// 按 DSCR 分级；null/非有限（无按揭）→ nofinancing。
export function dscrBand(dscrVal) {
  if (dscrVal === null || dscrVal === undefined) return "nofinancing";
  const r = typeof dscrVal === "number" ? dscrVal : num(dscrVal);
  if (!Number.isFinite(r)) return "nofinancing";
  if (r < 1) return "stressed"; // 现金流为负
  if (r < 1.25) return "tight";
  if (r < 1.5) return "adequate";
  return "strong";
}

// 综合视图：给定 7 项输入算出全部指标 + 分级。
export function realEstateSummary(inputs = {}) {
  const {
    purchasePrice = 0,
    downPayment = 0,
    annualRent = 0,
    operatingExpenses = 0,
    mortgageRate = 0,
    loanTermYears = 0,
    targetCapRate = 0,
  } = inputs;
  const P = num(purchasePrice);
  const D = num(downPayment);
  const rent = num(annualRent);
  const opex = num(operatingExpenses);
  const r = num(mortgageRate);
  const term = num(loanTermYears);
  const tCap = num(targetCapRate);
  // 首付须落在 [0, P]；租金须 >0；费用/利率/年限须 ≥0。
  const valid =
    P > 0 &&
    D >= 0 &&
    D <= P + 1e-9 &&
    rent > 0 &&
    opex >= 0 &&
    r >= 0 &&
    term >= 0;
  if (!valid) return { valid: false };

  const loanAmount = Math.max(0, P - D);
  const monthlyPI = monthlyPmt(loanAmount, r, term);
  const ds = annualDebtService(monthlyPI);
  const noi = netOperatingIncome(rent, opex);
  const cr = capRate(noi, P);
  const cashFlow = noi - ds;
  const coc = cashOnCash(cashFlow, D);
  const dc = dscr(noi, ds);
  const ltvVal = ltv(loanAmount, P);
  const impl = impliedValue(noi, tCap);

  return {
    purchasePrice: P,
    downPayment: D,
    annualRent: rent,
    operatingExpenses: opex,
    mortgageRate: r,
    loanTermYears: term,
    targetCapRate: tCap,
    loanAmount,
    monthlyPI,
    annualDebtService: ds,
    noi,
    capRate: cr,
    cashFlow,
    cashOnCash: coc,
    dscr: dc,
    ltv: ltvVal,
    impliedValue: impl,
    hasDebt: loanAmount > 0,
    band: dscrBand(dc),
    valid: true,
  };
}

// 预设：常见投资场景（targetCapRate 为市场参考资本化率，用于反推估值）。
export const REAL_ESTATE_PRESETS = {
  singleFamily: {
    id: "singleFamily",
    label: "单户住宅",
    purchasePrice: 350000,
    downPayment: 70000,
    annualRent: 32000,
    operatingExpenses: 5000,
    mortgageRate: 0.065,
    loanTermYears: 30,
    targetCapRate: 0.08,
  },
  multiFamily: {
    id: "multiFamily",
    label: "多户住宅",
    purchasePrice: 600000,
    downPayment: 180000,
    annualRent: 52000,
    operatingExpenses: 12000,
    mortgageRate: 0.07,
    loanTermYears: 30,
    targetCapRate: 0.08,
  },
  rehab: {
    id: "rehab",
    label: "翻修小公寓",
    purchasePrice: 250000,
    downPayment: 50000,
    annualRent: 24000,
    operatingExpenses: 4000,
    mortgageRate: 0.05,
    loanTermYears: 15,
    targetCapRate: 0.1,
  },
  allCash: {
    id: "allCash",
    label: "全款（无按揭）",
    purchasePrice: 300000,
    downPayment: 300000,
    annualRent: 22000,
    operatingExpenses: 4500,
    mortgageRate: 0,
    loanTermYears: 0,
    targetCapRate: 0.07,
  },
  highOpex: {
    id: "highOpex",
    label: "高运营/负现金流",
    purchasePrice: 400000,
    downPayment: 80000,
    annualRent: 24000,
    operatingExpenses: 18000,
    mortgageRate: 0.07,
    loanTermYears: 30,
    targetCapRate: 0.06,
  },
};

export { num };