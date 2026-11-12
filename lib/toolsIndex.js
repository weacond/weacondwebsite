// lib/toolsIndex.js — 计算工具索引（单一事实源，纯函数、可单元测试）
//
// 把所有"计算器 / 分析工具"页面集中为一份结构化清单，供 /calculators 聚合页
// （双语）与后续任何"工具目录"复用。每个工具：{ id, icon, title, titleEn,
// desc, descEn, href, category }。
//
// category 取值：technical / position / portfolio / risk / options / market。

export const CATEGORIES = {
  technical: { label: "技术分析", labelEn: "Technical", order: 0 },
  position: { label: "头寸管理", labelEn: "Position", order: 1 },
  portfolio: { label: "组合 & 风险", labelEn: "Portfolio & Risk", order: 2 },
  risk: { label: "风险度量", labelEn: "Risk Metrics", order: 3 },
  options: { label: "期权", labelEn: "Options", order: 4 },
  market: { label: "市场状态", labelEn: "Market Regime", order: 5 },
  invest: { label: "投资规划", labelEn: "Investing", order: 6 },
};

export const TOOLS = [
  {
    id: "pivots",
    icon: "🎯",
    title: "枢轴点",
    titleEn: "Pivot Points",
    desc: "经典 / 伍德 / 卡玛里拉 / 斐波那契四套支点与趋势判定",
    descEn: "Classic / Woodie / Camarilla / Fibonacci pivots + trend read",
    href: "/pivots",
    category: "technical",
  },
  {
    id: "fibonacci",
    icon: "🌀",
    title: "斐波那契",
    titleEn: "Fibonacci",
    desc: "回撤位（38.2/50/61.8%）与延伸位（1.618/2.618）",
    descEn: "Retracements (38.2/50/61.8%) & extensions (1.618/2.618)",
    href: "/fibonacci",
    category: "technical",
  },
  {
    id: "position-size",
    icon: "⚖️",
    title: "头寸 & Kelly",
    titleEn: "Position & Kelly",
    desc: "风险预算头寸规模与凯利 / 分数凯利比例",
    descEn: "Risk-budget sizing & Kelly / fractional Kelly fraction",
    href: "/position-size",
    category: "position",
  },
  {
    id: "portfolio",
    icon: "📊",
    title: "组合优化器",
    titleEn: "Portfolio Optimizer",
    desc: "5 种配权对比：夏普、波动、风险平价与有效前沿",
    descEn: "Compare 5 weightings: Sharpe, vol, risk parity & efficient frontier",
    href: "/portfolio",
    category: "portfolio",
  },
  {
    id: "correlation",
    icon: "🔗",
    title: "相关性 & 分散化",
    titleEn: "Correlation & Diversification",
    desc: "相关矩阵热力图、分散化比率 DR 与 HHI",
    descEn: "Correlation heatmap, diversification ratio DR & HHI",
    href: "/correlation",
    category: "portfolio",
  },
  {
    id: "montecarlo",
    icon: "🎲",
    title: "蒙特卡洛模拟器",
    titleEn: "Monte Carlo Simulator",
    desc: "模拟财富路径、终端分布、腰斩/归零概率与扇形图",
    descEn: "Simulate wealth paths, terminal distribution & fan chart",
    href: "/montecarlo",
    category: "portfolio",
  },
  {
    id: "risk",
    icon: "🛡️",
    title: "风险仪表盘",
    titleEn: "Risk Dashboard",
    desc: "最大回撤/持续/恢复、VaR/CVaR 与六大绩效比率",
    descEn: "Max drawdown / duration / recovery, VaR/CVaR & six ratios",
    href: "/risk",
    category: "risk",
  },
  {
    id: "performance",
    icon: "📝",
    title: "交易日志 / 业绩",
    titleEn: "Trade Journal",
    desc: "输入每笔收益，读胜率/盈利因子/期望/连亏与破产概率",
    descEn: "Enter per-trade returns for win rate, profit factor, expectancy, ruin",
    href: "/performance",
    category: "risk",
  },
  {
    id: "options",
    icon: "📈",
    title: "期权",
    titleEn: "Options",
    desc: "期权链、希腊字母、隐含波动率、IV 排名与策略盈亏",
    descEn: "Option chain, greeks, implied vol, IV rank & strategy payoff",
    href: "/options",
    category: "options",
  },
  {
    id: "putseller",
    icon: "🧾",
    title: "卖 Put",
    titleEn: "Put Seller",
    desc: "备兑卖 Put 的盈亏、保证金与违约风险",
    descEn: "Cash-secured put P/L, margin & assignment risk",
    href: "/putseller",
    category: "options",
  },
  {
    id: "regime",
    icon: "🧭",
    title: "市场状态",
    titleEn: "Market Regime",
    desc: "VIX · 价格趋势 · 10Y-2Y 利差 · 信用利差 → 判定 Risk-On / Risk-Off",
    descEn: "VIX · price trend · 10Y-2Y spread · credit → Risk-On / Risk-Off",
    href: "/regime",
    category: "market",
  },
  {
    id: "fear",
    icon: "🌡️",
    title: "恐惧指数",
    titleEn: "Fear Index",
    desc: "VIX 风格恐惧仪表：确定性合成序列 → 0~100 恐惧分 + 情绪标签（示例数据）",
    descEn: "VIX-style fear gauge: deterministic synthetic series → 0–100 score + mood (illustrative)",
    href: "/fear",
    category: "market",
  },

  {
    id: "stresstest",
    icon: "🌊",
    title: "压力测试",
    titleEn: "Stress Test",
    desc: "2008 / 2020 / 2022 情景下组合总损失与每只资产贡献",
    descEn: "Total loss & per-asset contribution across 2008 / 2020 / 2022 shocks",
    href: "/stresstest",
    category: "risk",
  },
  {
    id: "drawdown",
    icon: "↩️",
    title: "回撤恢复",
    titleEn: "Drawdown Recovery",
    desc: "跌 X% 需涨多少回本，及给定 CAGR 下的恢复时间",
    descEn: "Gain to break even after a -X% drawdown & time at a given CAGR",
    href: "/drawdown",
    category: "risk",
  },
  {
    id: "system",
    icon: "🎲",
    title: "系统模拟",
    titleEn: "System Simulator",
    desc: "胜率×盈亏比×下注 → 净值曲线、最大回撤与破产概率",
    descEn: "Win rate × R:R × bet → equity curve, max drawdown & P(ruin)",
    href: "/system",
    category: "risk",
  },
  {
    id: "compound",
    icon: "📈",
    title: "复利规划",
    titleEn: "Compound Growth",
    desc: "本金 + 每月定投按月复利；DCA vs 一次性 + 72 法则",
    descEn: "Principal + monthly DCA compounded monthly; DCA vs lump sum + rule of 72",
    href: "/compound",
    category: "invest",
  },


  {
    id: "hedge",
    icon: "⚖️",
    title: "对冲比率",
    titleEn: "Hedge Ratio",
    desc: "给定相关 ρ 与波动，算最小方差对冲比率、残余风险与最优权重",
    descEn: "Min-variance hedge ratio, residual risk & optimal weights from ρ and vol",
    href: "/hedge",
    category: "portfolio",
  },

  {
    id: "xirr",
    icon: "🧮",
    title: "IRR / XIRR",
    titleEn: "IRR / XIRR",
    desc: "输入现金流序列，反解内部收益率与年化回报",
    descEn: "Enter a cashflow series, solve the internal rate of return & annualized return",
    href: "/xirr",
    category: "risk",
  },
  {
    id: "voltarget",
    icon: "🎯",
    title: "波动目标",
    titleEn: "Volatility Target",
    desc: "给定目标波动与资产波动，算所需杠杆与头寸规模",
    descEn: "Given target & asset volatility, compute the leverage and position size",
    href: "/voltarget",
    category: "risk",
  },
  {
    id: "leverage",
    icon: "⚡",
    title: "杠杆强平",
    titleEn: "Leverage & Liquidation",
    desc: "给定杠杆与价格变动，算放大盈亏、强平价与最大亏损",
    descEn: "Amplified P&L, liquidation price & max loss from leverage and a price move",
    href: "/leverage",
    category: "position",
  },
  {
    id: "rmultiple",
    icon: "🎯",
    title: "R 倍数",
    titleEn: "R-Multiple",
    desc: "把盈亏表达为 R，算实际 R、分级与 R 口径期望",
    descEn: "Express P&L in R; compute realized R, grade & expectancy-in-R",
    href: "/r-multiple",
    category: "risk",
  },
  {
    id: "averageEntry",
    icon: "📊",
    title: "加仓均价",
    titleEn: "Average Entry & P&L",
    desc: "合并原持仓与加仓，算新均价、现价盈亏与到目标价距离",
    descEn: "Blend existing + add-on positions; new average, P&L at spot & distance to target",
    href: "/average-entry",
    category: "position",
  },
  {
    id: "zScore",
    icon: "🔔",
    title: "Z 分数",
    titleEn: "Z-Score",
    desc: "算 Z 分数、正态百分位与分级，用于均值回归信号与异常检测",
    descEn: "Z-score, normal percentile & band for mean-reversion signals and outlier detection",
    href: "/z-score",
    category: "technical",
  },
  {
    id: "volDrag",
    icon: "⚖️",
    title: "波动拖累",
    titleEn: "Volatility Drag",
    desc: "对比算术与几何（复合）收益，量化波动对终值的拖累",
    descEn: "Compare arithmetic vs geometric (compounded) returns; quantify volatility drag on terminal value",
    href: "/vol-drag",
    category: "risk",
  },





];

// 按 category 分组（保持 CATEGORIES 的 order）；返回 { category, label, labelEn, tools[] }[]
export function groupedTools() {
  const cats = Object.keys(CATEGORIES).sort((a, b) => CATEGORIES[a].order - CATEGORIES[b].order);
  return cats
    .map((c) => ({
      category: c,
      label: CATEGORIES[c].label,
      labelEn: CATEGORIES[c].labelEn,
      tools: TOOLS.filter((t) => t.category === c),
    }))
    .filter((g) => g.tools.length > 0);
}

// 所有工具 href（去重），供 sitemap/校验
export function allToolHrefs() {
  return [...new Set(TOOLS.map((t) => t.href))];
}

export function getTool(id) {
  const t = TOOLS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown tool: ${id}`);
  return t;
}
