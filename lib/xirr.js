// 内部收益率 IRR / XIRR —— 纯函数，确定性可复现
//
// 给定一条（按等间隔）现金流序列 cashflows（第 0 期通常为负=投入，
// 后续为正=回收），求使净现值 NPV=0 的每期收益率 r。
//   NPV(r) = Σ_t cashflows[t] / (1 + r)^t
// 用二分法在 [−0.9999, hi] 上求根（对多数投入→回收型序列稳定）。
//
// 与 compound 的分工：compound 假设「等额定投 + 恒定年化」求终值；
// IRR 处理「不规则现金流」反解收益率，是真实回报的标准口径。
//
// 口径：需同时存在正负现金流，否则不存在 IRR → 返回 null。

/**
 * 净现值 NPV(r) = Σ cashflows[t] / (1+r)^t。
 * @param {number} rate 每期收益率
 * @param {number[]} cashflows
 * @returns {number}
 */
export function npv(rate, cashflows) {
  if (!Array.isArray(cashflows)) return 0;
  let sum = 0;
  for (let t = 0; t < cashflows.length; t++) {
    const c = Number(cashflows[t]);
    if (!Number.isFinite(c)) continue;
    sum += c / Math.pow(1 + rate, t);
  }
  return sum;
}

/**
 * 求使 NPV=0 的每期收益率 r（二分法）。
 * @param {number[]} cashflows 等间隔现金流序列
 * @param {object} [opts]
 * @param {number} [opts.lo=-0.9999] 下界
 * @param {number} [opts.hi=10] 上界
 * @param {number} [opts.tol=1e-7] 容差
 * @returns {number|null} 收敛的 r；无符号变化/无解 → null
 */
export function irr(cashflows, opts = {}) {
  if (!Array.isArray(cashflows) || cashflows.length < 2) return null;
  const lo = Number.isFinite(opts.lo) ? opts.lo : -0.9999;
  const hi = Number.isFinite(opts.hi) ? opts.hi : 10;
  const tol = Number.isFinite(opts.tol) ? opts.tol : 1e-7;

  // 需同时存在正负现金流，否则 NPV 不变号，无 IRR
  let hasPos = false, hasNeg = false;
  for (const c of cashflows) {
    const v = Number(c);
    if (!Number.isFinite(v)) continue;
    if (v > 0) hasPos = true;
    else if (v < 0) hasNeg = true;
  }
  if (!hasPos || !hasNeg) return null;

  let fLo = npv(lo, cashflows);
  let fHi = npv(hi, cashflows);
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi)) return null;
  // 需端点异号（存在根）
  if (fLo * fHi > 0) return null;

  let a = lo, b = hi, fa = fLo;
  for (let i = 0; i < 200; i++) {
    const mid = (a + b) / 2;
    const fm = npv(mid, cashflows);
    if (Math.abs(fm) < tol || (b - a) / 2 < tol) return mid;
    if (fa * fm < 0) {
      b = mid;
    } else {
      a = mid;
      fa = fm;
    }
  }
  return (a + b) / 2;
}

/**
 * 年化 IRR：给定每期 IRR 与每年期数 periodsPerYear。
 * @param {number} irrPerPeriod
 * @param {number} [periodsPerYear=12]
 * @returns {number|null}
 */
export function annualize(irrPerPeriod, periodsPerYear = 12) {
  if (!Number.isFinite(irrPerPeriod) || irrPerPeriod <= -1) return null;
  if (!Number.isFinite(periodsPerYear) || periodsPerYear <= 0) return null;
  return Math.pow(1 + irrPerPeriod, periodsPerYear) - 1;
}

/**
 * 校验现金流输入：≥2 期、至少一项为负、至少一项为正、均有限。
 * @returns {boolean}
 */
export function validCashflows(cashflows) {
  if (!Array.isArray(cashflows) || cashflows.length < 2) return false;
  let hasPos = false, hasNeg = false;
  for (const c of cashflows) {
    if (!Number.isFinite(Number(c))) return false;
    if (Number(c) > 0) hasPos = true;
    else if (Number(c) < 0) hasNeg = true;
  }
  return hasPos && hasNeg;
}

/**
 * 由现金流派生一句结论。
 * @param {number[]} cashflows
 * @returns {{ irr: number|null, annual: number|null, note: string }}
 */
export function cashflowInsight(cashflows) {
  const r = irr(cashflows);
  if (r == null) return { irr: null, annual: null, note: "需同时存在投入(负)与回收(正)现金流。" };
  const a = annualize(r, 12);
  return {
    irr: r,
    annual: a,
    note: a != null ? `每期 ${(r * 100).toFixed(2)}%，年化约 ${(a * 100).toFixed(1)}%。` : `每期 ${(r * 100).toFixed(2)}%。`,
  };
}
