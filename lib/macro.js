// 宏观分析模块
// 分析宏观因子对投资组合的影响
// 支持: 利率、通胀、就业、VIX、信用利差

/**
 * 宏观因子定义
 */
export const MACRO_FACTORS = {
  rates: {
    name: "利率",
    nameEn: "Interest Rates",
    impact: "影响折现率，对成长股影响最大",
    impactEn: "Affects discount rates, biggest impact on growth stocks",
    sensitivity: {
      growth: -0.8,   // 成长股对利率最敏感
      value: 0.2,
      bonds: -1.0,    // 债券价格与利率反向
      cash: 0.0,
    },
  },
  inflation: {
    name: "通胀",
    nameEn: "Inflation",
    impact: "侵蚀购买力，利好价值股和商品",
    impactEn: "Erodes purchasing power, benefits value and commodities",
    sensitivity: {
      growth: -0.3,
      value: 0.5,
      bonds: -0.6,
      cash: -0.4,
    },
  },
  employment: {
    name: "就业",
    nameEn: "Employment",
    impact: "经济强弱指示器，影响消费和盈利",
    impactEn: "Economic strength indicator, affects consumption and earnings",
    sensitivity: {
      growth: 0.4,
      value: 0.5,
      bonds: 0.1,
      cash: 0.0,
    },
  },
  vix: {
    name: "VIX恐慌指数",
    nameEn: "VIX",
    impact: "波动率代理，高VIX利好对冲策略",
    impactEn: "Volatility proxy, high VIX benefits hedging",
    sensitivity: {
      growth: -0.7,
      value: -0.3,
      bonds: 0.2,
      cash: 0.5,
    },
  },
  credit_spread: {
    name: "信用利差",
    nameEn: "Credit Spread",
    impact: "企业信用风险，扩张时衰退概率上升",
    impactEn: "Corporate credit risk, widening indicates recession risk",
    sensitivity: {
      growth: -0.6,
      value: -0.4,
      bonds: 0.3,
      cash: 0.4,
    },
  },
};

/**
 * 宏观状态评估
 * @param {Object} indicators - { rates, inflation, employment, vix, credit_spread }
 * @returns {Object} 宏观状态和建议
 */
export function assessMacroState(indicators = {}) {
  const {
    rates = 4.5,        // 联邦基金利率
    inflation = 3.2,    // CPI YoY
    employment = 100,   // 就业指数（100为基准）
    vix = 18,           // VIX
    credit_spread = 1.2, // 信用利差
  } = indicators;

  const riskScore = calculateRiskScore(indicators);
  const regime = getMarketRegime(indicators);
  const suggestions = getAllocationSuggestions(regime, riskScore);

  return {
    riskScore,
    regime,
    suggestions,
    indicators,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 计算风险评分 (0-100)
 */
function calculateRiskScore({ vix = 18, credit_spread = 1.2, rates = 4.5, inflation = 3.2 }) {
  let score = 50; // 基准

  // VIX 越高越危险
  if (vix > 30) score += 20;
  else if (vix > 20) score += 10;
  else if (vix < 15) score -= 10;

  // 信用利差越宽越危险
  if (credit_spread > 2.5) score += 20;
  else if (credit_spread > 1.5) score += 10;

  // 高通胀+高利率组合更危险
  if (inflation > 4 && rates > 5) score += 15;

  return Math.min(100, Math.max(0, score));
}

/**
 * 识别市场状态
 */
function getMarketRegime({ rates = 4.5, inflation = 3.2, vix = 18, credit_spread = 1.2 }) {
  if (vix > 30 || credit_spread > 3) return "crisis";       // 危机
  if (inflation > 4 && rates > 5) return "stagflation";       // 滞胀
  if (inflation < 2 && rates < 2) return "liquidity_blow";    // 流动性宽松
  if (vix < 15 && credit_spread < 1) return "bull";           // 牛市
  return "neutral";                                            // 中性
}

/**
 * 根据宏观状态给配置建议
 */
function getAllocationSuggestions(regime, riskScore) {
  const baseSuggestions = {
    crisis: [
      { asset: "现金/短债", allocation: "40%", reason: "流动性优先" },
      { asset: "TLT (长债)", allocation: "20%", reason: "避险" },
      { asset: "黄金", allocation: "15%", reason: "尾部对冲" },
      { asset: "SPY Put 期权", allocation: "5%", reason: "下行保护" },
    ],
    stagflation: [
      { asset: "价值股 (VTV)", allocation: "30%", reason: "抗通胀" },
      { asset: "商品 (GLD/COMT)", allocation: "25%", reason: "通胀对冲" },
      { asset: "现金", allocation: "20%", reason: "等待机会" },
      { asset: "TLT", allocation: "15%", reason: "分散" },
    ],
    liquidity_blow: [
      { asset: "成长股 (QQQ)", allocation: "40%", reason: "低利率利好" },
      { asset: "SPY", allocation: "30%", reason: "Beta" },
      { asset: "公司债 (LQD)", allocation: "20%", reason: "收益" },
      { asset: "现金", allocation: "10%", reason: "机动" },
    ],
    bull: [
      { asset: "SPY", allocation: "40%", reason: "Beta" },
      { asset: "QQQ", allocation: "30%", reason: "成长" },
      { asset: "VIG (股息)", allocation: "15%", reason: "分散" },
      { asset: "现金", allocation: "15%", reason: "机动" },
    ],
    neutral: [
      { asset: "SPY", allocation: "35%", reason: "核心" },
      { asset: "QQQ", allocation: "25%", reason: "成长" },
      { asset: "VTV (价值)", allocation: "15%", reason: "分散" },
      { asset: "TLT", allocation: "15%", reason: "债券" },
      { asset: "现金", allocation: "10%", reason: "机动" },
    ],
  };

  // 根据风险评分调整
  const suggestions = baseSuggestions[regime] || baseSuggestions.neutral;

  if (riskScore > 70) {
    suggestions[0].allocation = "50%"; // 增加现金
    suggestions.push({ asset: "SPY Put", allocation: "10%", reason: "额外保护" });
  }

  return suggestions;
}

/**
 * 宏观因子敏感度分析
 * @param {string} factor - MACRO_FACTORS 的 key
 * @returns {Object} 各资产类的敏感度
 */
export function getFactorSensitivity(factor) {
  const macroFactor = MACRO_FACTORS[factor];
  if (!macroFactor) return null;

  return {
    factor,
    sensitivity: macroFactor.sensitivity,
    interpretation: interpretSensitivity(macroFactor.sensitivity),
  };
}

/**
 * 解读敏感度
 */
function interpretSensitivity(sensitivity) {
  const entries = Object.entries(sensitivity);
  const positive = entries.filter(([, v]) => v > 0.3).map(([k]) => k);
  const negative = entries.filter(([, v]) => v < -0.3).map(([k]) => k);

  return {
    benefits: positive,
    harms: negative,
    summary: `该因子利好: ${positive.join(", ") || "无"}, 利空: ${negative.join(", ") || "无"}`,
  };
}
