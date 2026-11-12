// lib/glossary.js — 量化/金融概念词典（单一事实源，纯函数、可单元测试）
//
// 为教育站提供核心概念的中英定义，并链接到对应的计算工具。
// 每条：{ id, term, termEn, def, defEn, category, related }。
// category: risk / returns / portfolio / options / position。

export const GLOSSARY_CATEGORIES = {
  risk: { label: "风险度量", labelEn: "Risk Metrics", order: 0 },
  returns: { label: "收益与交易", labelEn: "Returns & Trading", order: 1 },
  portfolio: { label: "组合与分散化", labelEn: "Portfolio & Diversification", order: 2 },
  options: { label: "期权", labelEn: "Options", order: 3 },
  position: { label: "头寸与凯利", labelEn: "Position & Kelly", order: 4 },
};

export const GLOSSARY = [
  {
    id: "sharpe",
    term: "夏普比率",
    termEn: "Sharpe Ratio",
    def: "每单位总风险（标准差）换来的超额收益，(μ−rf)/σ×√N。越高越好。",
    defEn: "Excess return per unit of total risk (std dev): (μ−rf)/σ×√N. Higher is better.",
    category: "risk",
    related: "/risk",
  },
  {
    id: "sortino",
    term: "索提诺比率",
    termEn: "Sortino Ratio",
    def: "只惩罚下行波动（下行标准差）的风险调整收益，比夏普更关注亏损。",
    defEn: "Risk-adjusted return using only downside deviation; penalizes losses, not upside.",
    category: "risk",
    related: "/risk",
  },
  {
    id: "calmar",
    term: "卡玛比率",
    termEn: "Calmar Ratio",
    def: "年化收益 / 最大回撤，衡量每单位回撤换来的收益。",
    defEn: "Annualized return / max drawdown: return earned per unit of drawdown.",
    category: "risk",
    related: "/risk",
  },
  {
    id: "maxdrawdown",
    term: "最大回撤",
    termEn: "Max Drawdown",
    def: "净值从历史峰值到谷底的最大跌幅（正数表示幅度）。",
    defEn: "Largest peak-to-trough decline in an equity curve (a positive magnitude).",
    category: "risk",
    related: "/risk",
  },
  {
    id: "var",
    term: "在险价值 VaR",
    termEn: "Value at Risk",
    def: "给定置信水平下，某段时间内可能的最大损失（分位数口径）。",
    defEn: "The loss threshold at a confidence level over a period (a quantile).",
    category: "risk",
    related: "/risk",
  },
  {
    id: "cvar",
    term: "期望损失 CVaR",
    termEn: "Expected Shortfall",
    def: "超过 VaR 的那部分损失的均值，衡量尾部极端风险；恒 ≥ VaR。",
    defEn: "Average loss beyond the VaR threshold; captures tail risk, always ≥ VaR.",
    category: "risk",
    related: "/risk",
  },
  {
    id: "ruin",
    term: "破产概率",
    termEn: "Probability of Ruin",
    def: "给定每笔期望优势与下注次数，账户归零的概率；有优势时趋 0。",
    defEn: "Chance the account hits zero given per-trade edge and N bets; →0 with an edge.",
    category: "risk",
    related: "/performance",
  },
  {
    id: "profitfactor",
    term: "盈利因子",
    termEn: "Profit Factor",
    def: "总盈利 / 总亏损绝对值；>1 表示长期为正期望。",
    defEn: "Gross profit / |gross loss|; >1 means a positive long-term edge.",
    category: "returns",
    related: "/performance",
  },
  {
    id: "payoff",
    term: "盈亏比",
    termEn: "Payoff Ratio",
    def: "平均盈利幅度 / 平均亏损幅度；赢一次可补几次亏。",
    defEn: "Average win / average loss: how many losses one win covers.",
    category: "returns",
    related: "/performance",
  },
  {
    id: "expectancy",
    term: "每笔期望",
    termEn: "Expectancy",
    def: "长期平均每笔交易的净收益 = 胜率×平均盈 − 败率×平均亏。",
    defEn: "Long-run average P/L per trade = winRate×avgWin − lossRate×avgLoss.",
    category: "returns",
    related: "/performance",
  },
  {
    id: "riskparity",
    term: "风险平价",
    termEn: "Risk Parity",
    def: "让各资产对组合总风险的贡献相等，而非权重相等。",
    defEn: "Equalizes each asset's contribution to total portfolio risk, not its weight.",
    category: "portfolio",
    related: "/portfolio",
  },
  {
    id: "diversification",
    term: "分散化比率",
    termEn: "Diversification Ratio",
    def: "加权个体波动 / 组合波动；越大表示分散化越有效，=1 表示无分散化。",
    defEn: "Weighted single-asset vol / portfolio vol; higher = more diversified, 1 = none.",
    category: "portfolio",
    related: "/correlation",
  },
  {
    id: "frontier",
    term: "有效前沿",
    termEn: "Efficient Frontier",
    def: "给定波动率下夏普（或收益）最优的一组组合的轨迹。",
    defEn: "The curve of portfolios that maximize return (Sharpe) for each vol level.",
    category: "portfolio",
    related: "/portfolio",
  },
  {
    id: "montecarlo",
    term: "蒙特卡洛",
    termEn: "Monte Carlo",
    def: "用大量随机路径模拟未来分布，估计极端结果与破产概率。",
    defEn: "Simulating many random paths to estimate outcome distributions & ruin odds.",
    category: "portfolio",
    related: "/montecarlo",
  },
  {
    id: "greeks",
    term: "希腊字母",
    termEn: "Option Greeks",
    def: "期权价格对底层/波动/利率/时间的敏感度：Delta、Gamma、Theta、Vega、Rho。",
    defEn: "Sensitivities of option price to spot/vol/rate/time: Delta, Gamma, Theta, Vega, Rho.",
    category: "options",
    related: "/options",
  },
  {
    id: "impliedvol",
    term: "隐含波动率",
    termEn: "Implied Volatility",
    def: "使期权定价模型价格等于市场价的波动率输入，反映市场预期波动。",
    defEn: "The volatility input that makes a pricing model match the market price.",
    category: "options",
    related: "/options",
  },
  {
    id: "kelly",
    term: "凯利公式",
    termEn: "Kelly Criterion",
    def: "长期增长最优的下注比例 f* = 胜率 −(1−胜率)×(亏/盈)。",
    defEn: "Growth-optimal bet fraction f* = p − (1−p)×(loss/win).",
    category: "position",
    related: "/position-size",
  },
  {
    id: "positionsize",
    term: "头寸规模",
    termEn: "Position Size",
    def: "按账户与单笔风险预算反推的可下注金额或手数。",
    defEn: "The stake/quantity implied by your account and per-trade risk budget.",
    category: "position",
    related: "/position-size",
  },

];

export function getGlossaryTerm(id) {
  const t = GLOSSARY.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown glossary term: ${id}`);
  return t;
}

// 按 category 分组（保持 order）；返回 { category, label, labelEn, terms[] }[]
export function groupedGlossary() {
  const cats = Object.keys(GLOSSARY_CATEGORIES).sort((a, b) => GLOSSARY_CATEGORIES[a].order - GLOSSARY_CATEGORIES[b].order);
  return cats
    .map((c) => ({
      category: c,
      label: GLOSSARY_CATEGORIES[c].label,
      labelEn: GLOSSARY_CATEGORIES[c].labelEn,
      terms: GLOSSARY.filter((t) => t.category === c),
    }))
    .filter((g) => g.terms.length > 0);
}

// 所有相关工具 href（去重）
export function allRelatedHrefs() {
  return [...new Set(GLOSSARY.filter((t) => t.related).map((t) => t.related))];
}
