// lib/stressTest.js — 组合压力测试 / 情景分析（单一事实源，纯函数、可单元测试）
//
// 给定组合权重与一组「情景冲击」（每只资产在该情景下的收益率 %），
// 计算组合在该情景下的收益/损失，并分解到每只资产的贡献。
// 配套预设历史式情景（2008 / 2020 / 2022 利率 / 2018 Q4 波动）。
// 全部确定性、无副作用；冲击收益率以 % 计（如 -37 表示 -37%）。

// 资产：{ key, name, nameEn }
export const ASSETS = [
  { key: "usEquity", name: "美股", nameEn: "US Equity" },
  { key: "intlEquity", name: "国际股票", nameEn: "Intl Equity" },
  { key: "usBond", name: "美债", nameEn: "US Bond" },
  { key: "gold", name: "黄金", nameEn: "Gold" },
  { key: "crypto", name: "加密", nameEn: "Crypto" },
  { key: "cash", name: "现金", nameEn: "Cash" },
];

// 默认组合（权重合计应为 1）
export const DEFAULT_PORTFOLIO = [
  { key: "usEquity", name: "美股", nameEn: "US Equity", weight: 0.4 },
  { key: "intlEquity", name: "国际股票", nameEn: "Intl Equity", weight: 0.15 },
  { key: "usBond", name: "美债", nameEn: "US Bond", weight: 0.3 },
  { key: "gold", name: "黄金", nameEn: "Gold", weight: 0.1 },
  { key: "crypto", name: "加密", nameEn: "Crypto", weight: 0.05 },
];

// 情景：{ key, name, nameEn, desc, descEn, shocks: { key: pctReturn } }
export const STRESS_SCENARIOS = [
  {
    key: "gfc2008",
    name: "2008 金融危机",
    nameEn: "2008 GFC",
    desc: "股票崩盘，债券与黄金大涨避险。",
    descEn: "Equities crash; bonds & gold surge for safety.",
    shocks: { usEquity: -37, intlEquity: -40, usBond: 32, gold: 55, crypto: 0, cash: 2 },
  },
  {
    key: "covid2020",
    name: "2020 新冠冲击",
    nameEn: "2020 COVID",
    desc: "流动性危机：股/加密大跌，长债与黄金上涨。",
    descEn: "Liquidity crisis: equities & crypto plunge, long bonds & gold rise.",
    shocks: { usEquity: -34, intlEquity: -30, usBond: 16, gold: 25, crypto: -70, cash: 0.5 },
  },
  {
    key: "rates2022",
    name: "2022 加息/通胀",
    nameEn: "2022 Rate Shock",
    desc: "加息周期：股债双杀，现金为王。",
    descEn: "Hiking cycle: stocks & bonds fall, cash wins.",
    shocks: { usEquity: -18, intlEquity: -15, usBond: -16, gold: 5, crypto: -65, cash: 3 },
  },
  {
    key: "vol2018",
    name: "2018 Q4 波动",
    nameEn: "2018 Q4 Vol",
    desc: "季度级回调：股回撤，黄金相对抗跌。",
    descEn: "Quarterly pullback: equities draw down, gold resilient.",
    shocks: { usEquity: -17, intlEquity: -15, usBond: -3, gold: 15, crypto: -40, cash: 0.3 },
  },
];

// 组合在单情景下的收益/损失（%）及每资产贡献。
// contribution_i = weight_i × shock_i（%），组合 P/L = Σ contribution。
export function scenarioPL(portfolio, scenario) {
  const contributions = portfolio.map((a) => {
    const shock = scenario.shocks[a.key] ?? 0; // 无该资产冲击视为 0
    return {
      key: a.key,
      name: a.name,
      nameEn: a.nameEn,
      weight: a.weight,
      shock,
      contribution: a.weight * shock,
    };
  });
  const pl = contributions.reduce((s, c) => s + c.contribution, 0);
  const sorted = [...contributions].sort((x, y) => x.contribution - y.contribution);
  return {
    scenario: scenario.key,
    pl,
    contributions,
    worst: sorted[0],
    best: sorted[sorted.length - 1],
  };
}

// 对全部情景计算并排序（最坏在前）
export function stressAll(portfolio, scenarios = STRESS_SCENARIOS) {
  return scenarios
    .map((s) => scenarioPL(portfolio, s))
    .sort((a, b) => a.pl - b.pl);
}

// 组合总权重（用于校验，理想 = 1）
export function totalWeight(portfolio) {
  return portfolio.reduce((s, a) => s + a.weight, 0);
}
