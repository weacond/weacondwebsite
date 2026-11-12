// lib/regime.js — 市场状态 / 风险情绪分类器（单一事实源，纯函数、可单元测试）
//
// 输入少量宏观/市场指标，综合判定当前处于 Risk-On（风险偏好）还是
// Risk-Off（风险规避/危机）。每个指标贡献一个 [-40,+40] 的分项得分，
// 汇总后归一到 [-100,+100] 并映射到 5 档状态。全部确定性、无副作用。
//
// 指标：
//   vix        隐含波动率（低=平静=偏 risk-on，高=恐慌=偏 risk-off）
//   spyVsMa200 价格相对 200 日均线偏离 %（高于=上行趋势，低于=下行）
//   yieldSpread 10Y-2Y 利差 %（正=陡峭/增长信号；负=倒挂/衰退信号）
//   creditOAS  高收益债信用利差 OAS（基点；窄=健康；宽=信用紧张）

// 每个指标 -> [-40, +40]，正分表示偏 Risk-On，负分表示偏 Risk-Off。
export function vixScore(vix) {
  // vix=0 -> +40，vix=20 -> 0，vix=40 -> -40
  return clamp(((20 - vix) / 20) * 40, -40, 40);
}

export function priceScore(spyVsMa200) {
  // 高于/低于 200dma 各约 ±5% 触及饱和
  return clamp(spyVsMa200 * 8, -40, 40);
}

export function yieldScore(yieldSpread) {
  // 利差 ±1.5% 触及饱和；倒挂（负）= 偏 risk-off
  return clamp(yieldSpread * 26.666, -40, 40);
}

export function creditScore(creditOASbps) {
  // OAS 500bp -> 0，窄（低）= risk-on，宽（高）= risk-off
  return clamp(((500 - creditOASbps) / 500) * 40, -40, 40);
}

// 汇总：四项之和（范围 [-160,+160]）归一到 [-100,+100]
export function aggregateScore(inputs) {
  const { vix, spyVsMa200, yieldSpread, creditOAS } = inputs;
  const comps = {
    vix: vixScore(vix),
    price: priceScore(spyVsMa200),
    yield: yieldScore(yieldSpread),
    credit: creditScore(creditOAS),
  };
  const raw = comps.vix + comps.price + comps.yield + comps.credit;
  return { components: comps, raw, total: clamp(raw / 1.6, -100, 100) };
}

// 5 档状态；按 total 判定。
export const REGIME_BANDS = [
  { key: "riskon", min: 45, label: "风险偏好", labelEn: "Risk-On",
    desc: "波动低、趋势向上、曲线陡峭、信用健康——市场风险偏好强。",
    descEn: "Low vol, uptrend, steep curve, healthy credit — strong risk appetite." },
  { key: "tilton", min: 15, label: "偏风险偏好", labelEn: "Tilted Risk-On",
    desc: "多数信号偏正面，但存在部分逆风。",
    descEn: "Mostly positive signals with some headwinds." },
  { key: "neutral", min: -15, label: "中性", labelEn: "Neutral",
    desc: "信号相互抵消，无明显方向。",
    descEn: "Signals offset; no clear direction." },
  { key: "tiltoff", min: -45, label: "偏风险规避", labelEn: "Tilted Risk-Off",
    desc: "多数信号偏负面，避险情绪上升。",
    descEn: "Mostly negative signals; caution rising." },
  { key: "riskoff", min: -Infinity, label: "风险规避 / 危机", labelEn: "Risk-Off / Crisis",
    desc: "高波动、下行趋势、曲线倒挂、信用紧张——典型避险/危机。",
    descEn: "High vol, downtrend, inverted curve, stressed credit — caution/crisis." },
];

export function classifyRegime(total) {
  for (const b of REGIME_BANDS) if (total >= b.min) return { ...b, total };
  return { ...REGIME_BANDS[REGIME_BANDS.length - 1], total };
}

// 顶层：给 inputs 返回完整评估（分项 + 总分 + 状态 + 理由）
export function evaluateRegime(inputs) {
  const { components, total } = aggregateScore(inputs);
  const regime = classifyRegime(total);
  const componentsArr = [
    { key: "vix", label: "VIX 波动率", value: components.vix },
    { key: "price", label: "价格 vs 200DMA", value: components.price },
    { key: "yield", label: "10Y-2Y 利差", value: components.yield },
    { key: "credit", label: "信用利差 OAS", value: components.credit },
  ].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return { ...inputs, components: componentsArr, total, regime };
}

// 预设情景（可演示）
export const REGIME_PRESETS = {
  bull: {
    label: "平稳牛市", labelEn: "Calm Bull",
    inputs: { vix: 13, spyVsMa200: 6, yieldSpread: 1.0, creditOAS: 350 },
  },
  panic: {
    label: "恐慌", labelEn: "Panic",
    inputs: { vix: 45, spyVsMa200: -10, yieldSpread: -0.3, creditOAS: 1000 },
  },
  inverted: {
    label: "曲线倒挂（衰退信号）", labelEn: "Inverted Yield",
    inputs: { vix: 20, spyVsMa200: -3, yieldSpread: -0.6, creditOAS: 600 },
  },
  normal: {
    label: "中性常态", labelEn: "Normal",
    inputs: { vix: 18, spyVsMa200: 0, yieldSpread: 0.3, creditOAS: 500 },
  },
};

export function regimeForPreset(id) {
  const p = REGIME_PRESETS[id];
  if (!p) throw new Error(`Unknown regime preset: ${id}`);
  return { preset: p, result: evaluateRegime(p.inputs) };
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}
