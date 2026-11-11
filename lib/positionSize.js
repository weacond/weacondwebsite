// 头寸规模 / 风险预算计算（position sizing）
// 日常交易的核心纪律：先定"每笔最多亏多少"，再反推头寸大小。
//   单笔风险金额 riskAmount = 账户权益 account × 每笔风险比例 riskPct
//   止损距离 stopDistance    = |entry − stop|
//   头寸单位 units          = ⌊ riskAmount / stopDistance ⌋
//   名义价值 notional       = units × entry
// 全部为纯函数、确定性，便于单元测试与前端实时计算。

/**
 * 计算单笔头寸规模。
 * @param {{account:number, riskPct:number, entry:number, stop:number}} o
 *   account  账户权益（须 > 0）
 *   riskPct  每笔风险占账户比例（如 0.01 = 1%，须 > 0）
 *   entry    入场价（须 > 0）
 *   stop     止损价（须为有限数，且与 entry 不同）
 * @returns {{valid:boolean, reason?:string, riskAmount?:number, stopDistance?:number, units?:number, notional?:number, positionPct?:number, maxLoss?:number}}
 *   入参非法 → { valid:false, reason }；合法 → 各字段为数值。
 *   units 向下取整，保证实际最大亏损 maxLoss ≤ riskAmount。
 */
export function positionSize({ account, riskPct, entry, stop }) {
  const acct = Number(account);
  const risk = Number(riskPct);
  const e = Number(entry);
  const s = Number(stop);
  if (!(acct > 0) || !(risk > 0) || !(e > 0) || !Number.isFinite(s) || Math.abs(e - s) < 1e-9) {
    return { valid: false, reason: "invalid" };
  }
  const riskAmount = acct * risk; // 愿意亏的钱
  const stopDistance = Math.abs(e - s); // 每单位止损距离
  const units = Math.floor(riskAmount / stopDistance);
  const notional = units * e; // 头寸名义价值
  const positionPct = notional / acct; // 占账户比例（= 名义/账户）
  const maxLoss = units * stopDistance; // 实际最大亏损（取整后 ≤ riskAmount）
  return { valid: true, riskAmount, stopDistance, units, notional, positionPct, maxLoss };
}

/**
 * 解读头寸规模，给出集中度判断。
 * positionPct > 1 表示名义超过账户（需杠杆/保证金）；> 3 通常视为集中度过高。
 * @param {ReturnType<typeof positionSize>} res
 * @returns {{verdict:string, overSized:boolean, needsLeverage:boolean}} verdict ∈ ok/leveraged/overSized/invalid
 */
export function assessPosition(res) {
  if (!res || !res.valid) return { verdict: "invalid", overSized: false, needsLeverage: false };
  const needsLeverage = res.positionPct > 1;
  const overSized = res.positionPct > 3;
  const verdict = overSized ? "overSized" : needsLeverage ? "leveraged" : "ok";
  return { verdict, overSized, needsLeverage };
}
