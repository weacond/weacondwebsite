// lib/fibTime.js — 斐波那契时间周期（Fibonacci Time Zones，纯函数）
//
// 概念：市场从 A→B 的摆动耗时 T 根 K 线，未来关键转折点出现在
//   t2 + T×φ_level 处（φ = 0.618, 1.0, 1.618, 2.618, 4.236, 6.854）
// 与 lib/fibonacci.js 的价格回撤/延伸正交——本模块只处理时间轴。
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:fibTime:v1";
// 斐波那契时间乘数（标准 6 级）
export const TIME_MULTS = [0.618, 1.0, 1.618, 2.618, 4.236, 6.854];
// 计算 T 倍乘数后的时间偏移
export function fibTimePeriods(T) {
  const t = Number(T);
  if (!Number.isFinite(t) || t <= 0) return [];
  return TIME_MULTS.map((m) => t * m);
}
// 从 t2 起预测未来转折点
export function fibTimePredict(t2, T) {
  const t = Number(T);
  const base = Number(t2);
  if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(base)) return [];
  return TIME_MULTS.map((m) => base + t * m);
}
// 下一个转折点：从 t2 起，第一个 ≥ currentTime 的预测点
export function nextTimeZone(t2, T, currentTime) {
  const preds = fibTimePredict(t2, T);
  if (preds.length === 0) return null;
  const cur = Number(currentTime);
  for (const p of preds) {
    if (p >= cur) return p;
  }
  return null; // 已超越所有预测点
}
// 当前所在区间与进度
export function timeZoneStatus(t2, T, currentTime) {
  const preds = fibTimePredict(t2, T);
  if (preds.length === 0) return { valid: false };
  const cur = Number(currentTime);
  if (!Number.isFinite(cur)) return { valid: false };
  // 找到最后一个 ≤ cur 的预测点和下一个
  let lastIdx = -1;
  for (let i = 0; i < preds.length; i++) {
    if (preds[i] <= cur) lastIdx = i;
  }
  const next = lastIdx < preds.length - 1 ? preds[lastIdx + 1] : null;
  const last = lastIdx >= 0 ? preds[lastIdx] : t2;
  const progress = next ? (cur - last) / (next - last) : 1;
  return {
    valid: true,
    next: next,
    last: last,
    progress: Math.max(0, Math.min(1, progress)),
    zoneIndex: Math.max(0, lastIdx),
    zonesPassed: lastIdx + 1,
    zonesTotal: preds.length,
  };
}
// 综合视图
export function fibTimeSummary(inputs = {}) {
  const { t2, T, currentTime } = inputs;
  if (!Number.isFinite(Number(T)) || Number(T) <= 0) return { valid: false };
  const preds = fibTimePredict(t2, T);
  const st = timeZoneStatus(t2, T, currentTime || t2);
  return {
    t2: Number(t2),
    T: Number(T),
    predictions: preds,
    next: st.next,
    status: st,
    valid: true,
  };
}
// 预设：不同周期
export const FIB_TIME_PRESETS = {
  short: { id: "short", label: "短期 T=5", t2: 50, T: 5, currentTime: 55 },
  medium: { id: "medium", label: "中期 T=20", t2: 100, T: 20, currentTime: 110 },
  long: { id: "long", label: "长期 T=50", t2: 200, T: 50, currentTime: 220 },
  intraday: { id: "intraday", label: "日内 T=2", t2: 20, T: 2, currentTime: 22 },
  weekly: { id: "weekly", label: "周线 T=8", t2: 40, T: 8, currentTime: 45 },
};
