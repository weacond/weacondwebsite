// 复利 / 投资规划器 —— 纯函数，确定性可复现
//
// 给定「一次性本金 + 每月定投 + 年化收益率 + 年限」，按月复利计算：
//   FV = P·(1+rm)^n  +  PMT·[ ((1+rm)^n − 1) / rm ]
// 其中 rm = (1+r)^(1/12) − 1（年化 r 折成月化），n = 月数 = years·12。
// 同时提供 DCA vs 一次性投入对比、翻倍年数（72 法则 + 精确）、逐年快照。
//
// 与相邻模块分工：
//   - monteCarlo/systemSim：随机/离散路径风险；本模块是「确定性增长规划」。
//   - learningPath：入门层锚点——让用户直观理解「本金 × 时间 × 收益率」的复利效应。
//
// 口径：年化收益率 r 为小数（0.1 = 10%）。页面以百分数输入后 /100 传入。
// 全部为纯函数，给定输入结果唯一确定。

/**
 * 未来值 FV：一次性本金 P + 每月定投 M，月化复利 n 个月。
 * @param {object} o
 * @param {number} [o.principal=0] 一次性本金
 * @param {number} [o.monthly=0] 每月定投
 * @param {number} [o.annualRate=0.1] 年化收益率（小数）
 * @param {number} [o.years=10] 年限
 * @returns {{ fv:number, contributed:number, interest:number,
 *   principalGrowth:number, monthlyGrowth:number, months:number, rm:number }}
 */
export function futureValue(o = {}) {
  const P = Number.isFinite(o.principal) ? o.principal : 0;
  const M = Number.isFinite(o.monthly) ? o.monthly : 0;
  const r = Number.isFinite(o.annualRate) ? o.annualRate : 0;
  const years = Number.isFinite(o.years) ? o.years : 0;
  const n = Math.max(0, Math.floor(years * 12));

  if (n <= 0) {
    return { fv: P, contributed: P, interest: 0, principalGrowth: P, monthlyGrowth: 0, months: 0, rm: 0 };
  }
  const rm = Math.pow(1 + r, 1 / 12) - 1;
  const growth = Math.pow(1 + rm, n);
  const principalGrowth = P * growth;
  const monthlyGrowth = Math.abs(rm) < 1e-12 ? M * n : M * ((growth - 1) / rm);
  const fv = principalGrowth + monthlyGrowth;
  const contributed = P + M * n;
  return { fv, contributed, interest: fv - contributed, principalGrowth, monthlyGrowth, months: n, rm };
}

/**
 * DCA（每月定投）vs 一次性投入：相同总投入，比较终值。
 * 一次性：期初投入 total；DCA：每月投入 total/n。
 * 正收益时一次性通常更优（钱更早复利）。
 * @param {object} o { total, annualRate, years }
 * @returns {{ lump:FV, dca:FV, edge:number, edgePct:number, n:number }}
 */
export function dcaVsLump(o = {}) {
  const total = Number.isFinite(o.total) ? o.total : 0;
  const r = Number.isFinite(o.annualRate) ? o.annualRate : 0;
  const n = Math.max(0, Math.floor((Number.isFinite(o.years) ? o.years : 0) * 12));
  const lump = futureValue({ principal: total, monthly: 0, annualRate: r, years: o.years });
  const dca = futureValue({ principal: 0, monthly: n > 0 ? total / n : 0, annualRate: r, years: o.years });
  const edge = lump.fv - dca.fv;
  return { lump, dca, edge, edgePct: dca.fv > 0 ? edge / dca.fv : 0, n };
}

/**
 * 翻倍年数：72 法则近似与精确值 ln(2)/ln(1+r)。
 * @param {number} annualRate 年化收益率（小数）
 * @returns {{ rule72:number, exact:number, ratePct:number }} r≤0 → Infinity
 */
export function doublingYears(annualRate) {
  const r = Number.isFinite(annualRate) ? annualRate : 0;
  const ratePct = r * 100;
  if (r <= 0) return { rule72: Infinity, exact: Infinity, ratePct };
  return { rule72: 72 / (r * 100), exact: Math.log(2) / Math.log(1 + r), ratePct };
}

/**
 * 逐年快照：用于图表。返回 [{ year, fv, contributed }]。
 * @param {object} o 同 futureValue 入参
 * @returns {Array<{year:number, fv:number, contributed:number}>}
 */
export function yearSchedule(o = {}) {
  const P = Number.isFinite(o.principal) ? o.principal : 0;
  const M = Number.isFinite(o.monthly) ? o.monthly : 0;
  const r = Number.isFinite(o.annualRate) ? o.annualRate : 0;
  const years = Math.max(0, Math.floor((Number.isFinite(o.years) ? o.years : 0)));
  const out = [{ year: 0, fv: P, contributed: P }];
  if (years <= 0) return out;
  const rm = Math.pow(1 + r, 1 / 12) - 1;
  for (let y = 1; y <= years; y++) {
    const n = y * 12;
    const growth = Math.pow(1 + rm, n);
    const principalGrowth = P * growth;
    const monthlyGrowth = Math.abs(rm) < 1e-12 ? M * n : M * ((growth - 1) / rm);
    out.push({ year: y, fv: principalGrowth + monthlyGrowth, contributed: P + M * n });
  }
  return out;
}

/**
 * 校验规划输入：年限≥0，其余非负有限。
 * @returns {boolean}
 */
export function validCompound(o = {}) {
  if (!o) return false;
  return (
    Number.isFinite(o.principal) && o.principal >= 0 &&
    Number.isFinite(o.monthly) && o.monthly >= 0 &&
    Number.isFinite(o.annualRate) &&
    Number.isFinite(o.years) && o.years >= 0
  );
}
