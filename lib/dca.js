// lib/dca.js — 定投 DCA vs 一次性投入（纯计算，无 IO，可单元测试）
//
// 经典问题：把同样一笔钱「一次性投在 t0」还是「按月定投摊到 N 期」，在给定
// 预期年化收益下，终端期望价值谁更高？结论：正收益时一次性更早投入、期望更优
// （历史上约 2/3 时间一次性胜出），但定投波动更小、心理压力更低。
//
//   一次性终值 = L · (1+r)^years
//   定投终值   = m · Σ_{k=1..N} (1+i)^(N−k)   （期末年金，i = r/12, N = 12·years）
//
// 入参（fraction）：
//   monthly      每月定投金额
//   annualRate   预期年化收益（fraction）
//   years        投资年限
//   lump         可选：一次性金额（默认 = monthly × 12 × years，即同等总投入）
//   annualVol    可选：年化波动率（蒙特卡洛用，fraction）
//   paths        可选：蒙特卡洛路径数（默认 5000）
//   seed         可选：蒙特卡洛随机种子（默认 12345，确定性可复现）

export function num(x, d = 0) {
  const n = typeof x === "number" ? x : parseFloat(x);
  return Number.isFinite(n) ? n : d;
}

// 月度普通年金终值（期末贡献）：FV = m · [((1+i)^N − 1) / i]；i=0 时退化为 m·N
export function annuityFv(monthly, annualRate, years) {
  const n = Math.floor(num(years, 0) * 12);
  if (n <= 0) return 0;
  const i = num(annualRate, 0) / 12;
  const m = num(monthly, 0);
  if (i === 0) return m * n;
  return (m * (Math.pow(1 + i, n) - 1)) / i;
}

// 一次性投入终值
export function lumpFv(amount, annualRate, years) {
  return num(amount, 0) * Math.pow(1 + num(annualRate, 0), num(years, 0));
}

// 定投 vs 一次性（闭式期望比较，确定性）
export function dcaVsLump(inputs = {}) {
  const monthly = num(inputs.monthly, 0);
  const annualRate = num(inputs.annualRate, 0);
  const years = num(inputs.years, 0);
  const n = Math.floor(years * 12);
  const totalDca = monthly * n;
  const lump = num(inputs.lump, 0) > 0 ? num(inputs.lump, 0) : totalDca; // 默认同等总投入
  const fvDca = annuityFv(monthly, annualRate, years);
  const fvLump = lumpFv(lump, annualRate, years);
  const diff = fvLump - fvDca;
  const lumpEdge = fvDca > 0 ? diff / fvDca : 0;
  let winner = "tie";
  if (diff > 1e-6) winner = "lump";
  else if (diff < -1e-6) winner = "dca";

  return {
    valid: monthly > 0 && years > 0,
    monthly,
    annualRate,
    years,
    months: n,
    lump,
    totalDca,
    fvDca,
    fvLump,
    diff,
    lumpEdge,
    winner,
  };
}

// 确定性伪随机（mulberry32）+ 高斯（Box-Muller），用于可复现的蒙特卡洛
function mulberry32(seed) {
  let a = num(seed, 12345) >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(rng) {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = Math.max(rng(), 1e-12);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// 蒙特卡洛：每月收益 ~ N(mean=m/12, sd=vol/√12)，比较一次性 vs 定投的终端值胜率（确定性可复现）
export function dcaMonteCarlo(inputs = {}) {
  const monthly = num(inputs.monthly, 1000);
  const years = num(inputs.years, 10);
  const n = Math.floor(years * 12);
  const annualRate = num(inputs.annualRate, 0.07);
  const annualVol = num(inputs.annualVol, 0.15);
  const paths = Math.max(1, Math.floor(num(inputs.paths, 5000)));
  const seed = num(inputs.seed, 12345);
  const mean = annualRate / 12;
  const sd = annualVol / Math.sqrt(12);
  const lump0 = num(inputs.lump, 0) > 0 ? num(inputs.lump, 0) : monthly * n;

  const rng = mulberry32(seed);
  let lumpWins = 0;
  let dcaWins = 0;
  let lumpFvSum = 0;
  let dcaFvSum = 0;
  for (let p = 0; p < paths; p++) {
    const rets = [];
    for (let k = 0; k < n; k++) rets.push(1 + mean + sd * gaussian(rng));
    let lumpVal = lump0;
    let dcaVal = 0;
    for (let k = 0; k < n; k++) {
      lumpVal *= rets[k];
      dcaVal = dcaVal * rets[k] + monthly;
    }
    lumpFvSum += lumpVal;
    dcaFvSum += dcaVal;
    if (lumpVal > dcaVal) lumpWins++;
    else if (dcaVal > lumpVal) dcaWins++;
  }
  return {
    paths,
    seed,
    lumpWinRate: lumpWins / paths,
    dcaWinRate: dcaWins / paths,
    expectedLumpFv: lumpFvSum / paths,
    expectedDcaFv: dcaFvSum / paths,
  };
}

// 一次性/定投优势分级
export function dcaBand(winner) {
  if (winner === "lump") return "lumpFavored";
  if (winner === "dca") return "dcaFavored";
  return "balanced";
}

// 预设
export const DCA_PRESETS = {
  stocks10y: { id: "stocks10y", label: "股票 10 年", labelEn: "Equity 10y", monthly: 1000, annualRate: 0.08, annualVol: 0.15, years: 10 },
  bonds10y: { id: "bonds10y", label: "债券 10 年", labelEn: "Bonds 10y", monthly: 1000, annualRate: 0.03, annualVol: 0.05, years: 10 },
  crypto5y: { id: "crypto5y", label: "加密 5 年", labelEn: "Crypto 5y", monthly: 500, annualRate: 0.25, annualVol: 0.6, years: 5 },
  shortNeg: { id: "shortNeg", label: "短期负收益", labelEn: "Short / Negative", monthly: 1000, annualRate: -0.05, annualVol: 0.1, years: 2 },
};