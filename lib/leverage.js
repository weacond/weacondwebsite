// lib/leverage.js — 杠杆与强平计算器（纯函数、确定性、可单元测试）
//
// 核心洞见：杠杆同时放大收益与风险。满仓强平价 ≈ 入场价 × (1 ∓ 1/杠杆)
//   （维持保证金为 0 时）；价格只需反向变动 1/杠杆 即触发强平。
//
// 与相邻模块分工：
//   - volTarget：以「目标波动率」决定杠杆；本模块以「杠杆倍数」反推风险（强平/最大亏损）。
//   - positionSize：以「风险预算」决定头寸规模；本模块聚焦杠杆放大与强平。
//   - riskReward：方向性盈亏比 R:R；本模块聚焦「杠杆放大 + 强平价」。
//
// 口径：
//   - leverage > 0（如 5 表示 5 倍）。
//   - movePct 为价格变动百分比（正=涨，负=跌）。
//   - 权益/亏损以「占账户百分比」表示；保证金最多亏光 → 权益变动封顶 -100%。
//   - mmPct 为维持保证金率（%），∈[0,100)。
// 全部纯函数，给定输入结果唯一确定。

/**
 * 校验杠杆倍数：有限且 > 0。
 * @param {number} leverage
 * @returns {boolean}
 */
export function validLeverage(leverage) {
  const l = Number(leverage);
  return Number.isFinite(l) && l > 0;
}

/**
 * 名义价值：账户权益 × 杠杆。
 * @param {number} account 账户权益（≥0）
 * @param {number} leverage 杠杆倍数（>0）
 * @returns {number}
 * @throws 入参非法时
 */
export function notional(account, leverage) {
  const a = Number(account);
  if (!Number.isFinite(a) || a < 0) throw new Error("invalid_account");
  if (!validLeverage(leverage)) throw new Error("invalid_leverage");
  return a * Number(leverage);
}

/**
 * 杠杆下价格变动对账户权益的影响（%）。
 *   pnl% = 价格方向 × 杠杆；long 涨为赚、short 跌为赚。
 *   权益变动封顶 -100%（保证金最多亏光，视为已强平）。
 * @param {number} movePct 价格变动百分比（正=涨）
 * @param {number} leverage 杠杆倍数
 * @param {"long"|"short"} [side="long"]
 * @returns {number} 占账户的权益变动百分比
 * @throws 入参非法时
 */
export function leveragedPnl(movePct, leverage, side = "long") {
  const m = Number(movePct);
  if (!Number.isFinite(m) || !validLeverage(leverage)) throw new Error("invalid");
  const dir = side === "short" ? -1 : 1;
  const raw = m * Number(leverage) * dir;
  return Math.max(-100, raw);
}

/**
 * 强平所需的不利价格变动（%）= 100/leverage − 维持保证金率。
 *   ≤0 时返回 0（无缓冲，开仓即面临强平）。
 * @param {number} leverage 杠杆倍数
 * @param {number} [mmPct=0] 维持保证金率（%）
 * @returns {number}
 * @throws 杠杆/维持保证金非法时
 */
export function liquidationMove(leverage, mmPct = 0) {
  if (!validLeverage(leverage)) throw new Error("invalid_leverage");
  const mm = Number(mmPct);
  if (!Number.isFinite(mm) || mm < 0 || mm >= 100) throw new Error("invalid_mm");
  const move = 100 / Number(leverage) - mm;
  return move > 0 ? move : 0;
}

/**
 * 强平价：入场价 × (1 ± 强平幅度/100)。
 *   多头在下方、空头在上方。
 * @param {number} entry 入场价（>0）
 * @param {number} leverage 杠杆倍数
 * @param {"long"|"short"} [side="long"]
 * @param {number} [mmPct=0] 维持保证金率（%）
 * @returns {number}
 * @throws 入参非法时
 */
export function liquidationPrice(entry, leverage, side = "long", mmPct = 0) {
  const e = Number(entry);
  if (!(e > 0) || !validLeverage(leverage)) throw new Error("invalid");
  const move = liquidationMove(leverage, mmPct);
  const dir = side === "short" ? 1 : -1;
  return e * (1 + (dir * move) / 100);
}

/**
 * 给定不利价格变动幅度，账户权益的最大亏损（%）= min(变动 × 杠杆, 100)。
 * @param {number} leverage 杠杆倍数
 * @param {number} adverseMovePct 不利价格变动百分比（>0）
 * @returns {number}
 * @throws 入参非法时
 */
export function maxLossForMove(leverage, adverseMovePct) {
  const m = Number(adverseMovePct);
  if (!validLeverage(leverage) || !Number.isFinite(m) || m < 0) throw new Error("invalid");
  return Math.min(m * Number(leverage), 100);
}

/**
 * 反推：在给定最大可容忍权益回撤下，可承受的最大不利价格变动（%）= maxLoss/leverage。
 * @param {number} leverage 杠杆倍数
 * @param {number} maxLossPct 最大可容忍权益回撤（%）∈(0,100]
 * @returns {number}
 * @throws 入参非法时
 */
export function adverseMoveForMaxLoss(leverage, maxLossPct) {
  const ml = Number(maxLossPct);
  if (!validLeverage(leverage) || !(ml > 0) || !(ml <= 100)) throw new Error("invalid");
  return ml / Number(leverage);
}

/**
 * 杠杆风险分级。
 * @param {number} leverage
 * @returns {{band:string, label:string, labelEn:string, liqMove:number}}
 *   liqMove = 100/leverage（维持保证金为 0 时的强平幅度 %）
 * @throws 杠杆非法时
 */
export function leverageBand(leverage) {
  const l = Number(leverage);
  if (!validLeverage(l)) throw new Error("invalid_leverage");
  const liqMove = 100 / l;
  if (l < 2) return { band: "low", label: "低", labelEn: "Low", liqMove };
  if (l < 5) return { band: "moderate", label: "中", labelEn: "Moderate", liqMove };
  if (l < 10) return { band: "high", label: "高", labelEn: "High", liqMove };
  return { band: "extreme", label: "极高", labelEn: "Extreme", liqMove };
}

/**
 * 由杠杆与一次价格变动派生一句结论（教育用）。
 * @param {number} leverage
 * @param {number} movePct 价格变动百分比
 * @param {"long"|"short"} [side="long"]
 * @returns {string}
 */
export function leverageInsight(leverage, movePct, side = "long") {
  if (!validLeverage(leverage)) return "杠杆须为正数。";
  const l = Number(leverage);
  const pnl = leveragedPnl(movePct, l, side);
  const liq = liquidationMove(l, 0);
  if (pnl <= -100 + 1e-9) return `价格反向约 ${liq.toFixed(2)}% 即触发强平，保证金全损。`;
  if (l >= 10) return `杠杆 ${l}× 极高：${movePct}% 的价变动放大为 ${pnl.toFixed(1)}% 权益变动。`;
  if (l >= 5) return `杠杆 ${l}× 偏高：${movePct}% 的价变动放大为 ${pnl.toFixed(1)}% 权益变动。`;
  return `杠杆 ${l}× 可控：${movePct}% 的价变动对应 ${pnl.toFixed(1)}% 权益变动。`;
}

/**
 * 预设：常见杠杆情景。
 */
export const LEVERAGE_PRESETS = [
  { id: "spot", label: "现货 1×", leverage: 1, movePct: 10, side: "long" },
  { id: "low", label: "低杠杆 2×", leverage: 2, movePct: 10, side: "long" },
  { id: "mod", label: "中杠杆 5×", leverage: 5, movePct: 10, side: "long" },
  { id: "high", label: "高杠杆 10×", leverage: 10, movePct: 10, side: "long" },
  { id: "crypto", label: "币圈 20×", leverage: 20, movePct: 5, side: "short" },
];

/**
 * 取预设；未知键抛错。
 * @param {string} id
 * @returns {object}
 */
export function getLeveragePreset(id) {
  const p = LEVERAGE_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown leverage preset: ${id}`);
  return p;
}
