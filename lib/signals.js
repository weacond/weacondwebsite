/**
 * 信号引擎 — 三引擎合成评分
 *
 * 基础面（Fundamental）+ 技术面（Technical）+ 波动面（Volatility）
 *
 * 本文件定义信号数据结构与评分算法的骨架。
 * 实际数据接入在 API routes 中实现。
 */

/**
 * 信号评分 — 三引擎加权
 * @param {Object} weights — 各引擎权重（可后台参数化）
 * @param {Object} inputs  — 各引擎原始数据
 * @returns {Object} SignalCard 对象
 */
export function computeSignalScore(weights, inputs) {
  const {
    fundamental = 0.33,
    technical = 0.34,
    volatility = 0.33,
  } = weights;

  const {
    fairValueScore = 0.5,      // 0-1, 越高越被低估
    technicalScore = 0.5,      // 0-1, 趋势/突破强度
    ivRank = 50,               // 0-100, IV Rank
    thetaScore = 0.5,          // 0-1, Theta 有利程度
  } = inputs;

  const rawScore =
    fundamental * fairValueScore +
    technical * technicalScore +
    volatility * (ivRank / 100) * thetaScore;

  const signalScore = Math.round(rawScore * 100); // 0-100

  // 信号方向
  let direction = "neutral";
  if (signalScore >= 70) direction = "bullish";
  else if (signalScore >= 50) direction = "mild_bullish";
  else if (signalScore >= 30) direction = "mild_bearish";
  else direction = "bearish";

  // 风险等级
  let riskLevel = "moderate";
  if (ivRank > 80) riskLevel = "high_iv";
  else if (ivRank < 20) riskLevel = "low_iv";

  return {
    score: signalScore,
    direction,
    riskLevel,
    components: {
      fundamental: Math.round(fairValueScore * 100),
      technical: Math.round(technicalScore * 100),
      volatility: Math.round((ivRank / 100) * thetaScore * 100),
    },
    ivRank,
    timestamp: new Date().toISOString(),
    // 可解释性：每个分数的来源
    rationale: {
      fundamental: fairValueScore > 0.6
        ? "公允价值模型显示当前价格低于内在价值"
        : "公允价值模型显示估值接近合理",
      technical: technicalScore > 0.6
        ? "技术面突破关键阻力位"
        : "技术面处于整理阶段",
      volatility: ivRank > 70
        ? "IV Rank 偏高，期权卖方有较高 Theta 收益"
        : "IV Rank 偏低，期权买方有优势",
    },
  };
}

/**
 * 卖 Put 筛选规则（PutSeller 产品核心）
 * 简化版，实际需要接入期权链数据
 */
export function screenPutSignals(tickers, marketData) {
  // 筛选条件（可参数化）：
  // 1. IV Rank > 50
  // 2. 基本面评分 > 60
  // 3. 技术面支撑位附近
  // 4. Theta 有利
  // 5. 仓位建议 <= 10% 组合

  const results = [];

  for (const ticker of tickers) {
    const data = marketData[ticker];
    if (!data) continue;

    if (data.ivRank > 50 && data.fundamentalScore > 60) {
      results.push({
        ticker,
        strike: data.suggestedStrike,
        expiry: data.suggestedExpiry,
        ivRank: data.ivRank,
        premium: data.premium,
        score: computeSignalScore(
          { fundamental: 0.35, technical: 0.30, volatility: 0.35 },
          data
        ),
        rationale: `IV Rank ${data.ivRank}, 基本面评分 ${data.fundamentalScore}`,
      });
    }
  }

  // 按 score 降序
  results.sort((a, b) => b.score.score - a.score.score);
  return results.slice(0, 10); // 每日 5-10 条
}

/**
 * 黑天鹅模块 — 尾部风险检测
 */
export function detectBlackSwan(marketState) {
  const { vix, vixPercentile, marketDrop, sectorCorrelation } = marketState;

  const triggers = [];

  // VIX 突破历史百分位
  if (vixPercentile > 90) {
    triggers.push(`VIX ${vix} 超过 90 分位`);
  }
  // 主要市场大幅下跌
  if (marketDrop < -0.03) {
    triggers.push(`市场跌幅 ${Math.abs(marketDrop * 100).toFixed(1)}%`);
  }
  // 行业内高相关性（系统性风险）
  if (sectorCorrelation > 0.9) {
    triggers.push(`板块相关性 ${sectorCorrelation.toFixed(2)}，系统性风险`);
  }

  return {
    triggered: triggers.length > 0,
    triggers,
    recommendations: triggers.length > 0
      ? [
          "考虑买入深度 OTM SPY Put 作为尾部对冲",
          "增加现金/短债仓位至 20-30%",
          "黄金/贵金属作为非相关对冲",
          "执行止损纪律，不逆势加仓",
        ]
      : [],
    // 教育：展示历史案例
    historicalContext: triggers.length > 0
      ? "参考 2020-03、2018-02 等尾部事件，OTM Put 可保护 30-50% 下行"
      : null,
  };
}