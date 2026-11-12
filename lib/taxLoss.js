// lib/taxLoss.js — 税务亏损收割（Tax-Loss Harvesting，纯函数，可单元测试）
//
// 收割实现亏损以获得税收抵免：一年税收节省 = min(亏损, 抵免上限) × 税率；
// 超过上限的部分通过 carryforward（结转）逐年抵扣。
// cap ≤ 0 视为“无限抵免”。确定性、零外部依赖。

export const STORAGE_KEY = "weacond:taxLoss:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 当年可抵免的亏损（cap ≤ 0 视为无限）。
export function effectiveOffset(loss, cap) {
  const L = num(loss);
  const C = num(cap);
  if (C <= 0) return L; // 无限抵免
  return Math.min(L, C);
}

// 当年税收节省 = 可抵免亏损 × 税率。
export function taxSavings(loss, taxRate, cap) {
  return effectiveOffset(loss, cap) * num(taxRate);
}

// 税后净成本 = 亏损 − 当年税收节省。
export function afterTaxCost(loss, taxRate, cap) {
  const L = num(loss);
  return L - taxSavings(loss, taxRate, cap);
}

// 通过结转逐年抵扣全部亏损所需的年数（cap ≤ 0 视为 1 年）。
export function carryforwardYears(loss, cap) {
  const L = num(loss);
  const C = num(cap);
  if (L <= 0) return 0;
  if (C <= 0) return 1; // 无限抵免，当年结清
  return Math.ceil(L / C);
}

// 税收节省相对亏损的比例分级。
export function savingsBand(loss, taxSavings) {
  const L = num(loss);
  if (L <= 0) return "na";
  const ratio = num(taxSavings) / L;
  if (ratio <= 0) return "none";
  if (ratio < 0.15) return "low";
  if (ratio < 0.3) return "moderate";
  return "high";
}

// 综合视图：含可抵免、当年节省、税后净成本、结转年数与分级。
export function harvestSummary(inputs = {}) {
  const { loss, taxRate, cap } = inputs;
  const L = num(loss);
  const valid = L > 0;
  if (!valid) return { valid: false };
  const tsv = taxSavings(L, taxRate, cap);
  return {
    loss: L,
    effectiveOffset: effectiveOffset(L, cap),
    taxSavings: tsv,
    afterTaxCost: afterTaxCost(L, taxRate, cap),
    carryforwardYears: carryforwardYears(L, cap),
    band: savingsBand(L, tsv),
    valid: true,
  };
}

// 预设：不同收割情景。
export const HARVEST_PRESETS = {
  smallLoss: { id: "smallLoss", label: "小额亏损", loss: 2000, taxRate: 0.2, cap: 3000 },
  capped: { id: "capped", label: "受限抵免", loss: 10000, taxRate: 0.3, cap: 3000 },
  unlimited: { id: "unlimited", label: "无限抵免", loss: 10000, taxRate: 0.35, cap: 0 },
  noTax: { id: "noTax", label: "免税", loss: 5000, taxRate: 0, cap: 3000 },
  bigCapped: { id: "bigCapped", label: "大额受限", loss: 50000, taxRate: 0.3, cap: 3000 },
};
export { num };