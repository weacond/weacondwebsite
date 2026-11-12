// lib/rMultiple.js — R 倍数（系统交易的 R 框架）纯函数、确定性、可单元测试
//
// 核心洞见：把每笔盈亏表达为「R」（= 初始风险单位）。1R = 入场到止损的距离。
//   多头 R = (price − entry)/(entry − stop)；空头 R = (entry − price)/(stop − entry)
//   即 R = (price − entry) × dir / |entry − stop|，dir = 多头 +1、空头 −1。
//   R>0 为盈利方向，R<0 为亏损方向；R=1 即「赚了一个风险单位」。
//
// 与相邻模块分工：
//   - riskReward：「下单时」的 R:R 比率与盈亏平衡胜率；本模块是「持仓/复盘时」的实际 R 表现。
//   - kelly/performance：以货币/概率计期望；本模块以 R 单位计期望（与账户规模无关）。
//
// 口径：entry/stop/price 须有限且 entry≠stop（否则 1R=0 无意义）。
// 全部纯函数，给定输入结果唯一确定。

/**
 * 校验 R 计算入参：三者有限且 entry≠stop。
 * @returns {boolean}
 */
export function validRMultiple(entry, stop, price) {
  const e = Number(entry), s = Number(stop), p = Number(price);
  return Number.isFinite(e) && Number.isFinite(s) && Number.isFinite(p) && Math.abs(e - s) > 1e-12;
}

/**
 * 单笔实际 R 倍数（带符号）。
 * @param {number} entry 入场价
 * @param {number} stop  止损价
 * @param {number} price 现价 / 出场价
 * @param {"long"|"short"} [side="long"]
 * @returns {number} R（>0 盈利方向，<0 亏损方向）
 * @throws 入参非法（非有限或 entry===stop）
 */
export function rMultiple(entry, stop, price, side = "long") {
  const e = Number(entry), s = Number(stop), p = Number(price);
  if (!Number.isFinite(e) || !Number.isFinite(s) || !Number.isFinite(p)) throw new Error("invalid");
  const risk = Math.abs(e - s);
  if (risk <= 1e-12) throw new Error("no_risk");
  const dir = side === "short" ? -1 : 1;
  return ((p - e) * dir) / risk;
}

/**
 * 以 R 单位计期望：expectation_R = winRate·winR − (1−winRate)·lossR。
 *   winR、lossR 为平均盈/亏的 R（>0，如 winR=2、lossR=1）。
 *   >0 表示 R 口径正期望（与账户规模无关）。
 * @param {number} winRate 胜率∈[0,1]
 * @param {number} winR 平均盈利 R（>0）
 * @param {number} lossR 平均亏损 R（>0）
 * @returns {number}
 * @throws 入参非法
 */
export function expectancyFromR(winRate, winR, lossR) {
  const w = Number(winRate), wr = Number(winR), lr = Number(lossR);
  if (!Number.isFinite(w) || w < 0 || w > 1) throw new Error("invalid_winrate");
  if (!Number.isFinite(wr) || wr <= 0) throw new Error("invalid_winR");
  if (!Number.isFinite(lr) || lr <= 0) throw new Error("invalid_lossR");
  return w * wr - (1 - w) * lr;
}

/**
 * 单笔 R 结果分级（教育用速查）。
 * @param {number} r R 倍数
 * @returns {{grade:string, label:string, labelEn:string, color:string}}
 * @throws r 非有限
 */
export function rGrade(r) {
  const x = Number(r);
  if (!Number.isFinite(x)) throw new Error("invalid");
  if (x <= -1) return { grade: "loss", label: "止损/大亏", labelEn: "Stopped / Big loss", color: "rose" };
  if (x < 0) return { grade: "smallLoss", label: "小亏", labelEn: "Small loss", color: "orange" };
  if (x === 0) return { grade: "breakEven", label: "打平", labelEn: "Break-even", color: "slate" };
  if (x < 1) return { grade: "smallWin", label: "小盈", labelEn: "Small win", color: "amber" };
  if (x < 3) return { grade: "win", label: "盈利", labelEn: "Win", color: "emerald" };
  return { grade: "bigWin", label: "大盈", labelEn: "Big win", color: "emerald" };
}

/**
 * 由一笔 R 派生一句结论（教育用）。
 * @param {number} entry
 * @param {number} stop
 * @param {number} price
 * @param {"long"|"short"} [side="long"]
 * @returns {string}
 */
export function rMultipleInsight(entry, stop, price, side = "long") {
  if (!validRMultiple(entry, stop, price)) return "入场价须与止损价不同。";
  const r = rMultiple(entry, stop, price, side);
  const g = rGrade(r);
  if (r >= 3) return `已达 +${r.toFixed(2)}R，属${g.label}，可考虑移动止损保护利润。`;
  if (r >= 1) return `已达 +${r.toFixed(2)}R，达到 1R 目标，按计划执行。`;
  if (r === 0) return "价格回到入场，0R（打平）。";
  if (r >= -1) return `当前 ${r.toFixed(2)}R，尚在 −1R 风险内，继续持有观察。`;
  return `已 ${r.toFixed(2)}R，超出 −1R，触及止损纪律。`;
}

/**
 * 预设：常见 R 情景。
 */
export const R_PRESETS = [
  { id: "smallWin", label: "小盈 +0.5R", entry: 100, stop: 95, price: 102.5, side: "long" },
  { id: "win", label: "盈利 +2R", entry: 100, stop: 95, price: 110, side: "long" },
  { id: "bigWin", label: "大盈 +4R", entry: 100, stop: 95, price: 120, side: "long" },
  { id: "stopped", label: "止损 −1R", entry: 100, stop: 95, price: 95, side: "long" },
  { id: "shortWin", label: "空头 +1.5R", entry: 100, stop: 105, price: 92.5, side: "short" },
];

/**
 * 取预设；未知键抛错。
 * @param {string} id
 * @returns {object}
 */
export function getRPreset(id) {
  const p = R_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown R preset: ${id}`);
  return p;
}
