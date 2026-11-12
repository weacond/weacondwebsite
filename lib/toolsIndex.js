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
    id: "stresstest",
    icon: "🌊",
    title: "压力测试",
    titleEn: "Stress Test",
    desc: "2008 / 2020 / 2022 情景下组合总损失与每只资产贡献",
    descEn: "Total loss & per-asset contribution across 2008 / 2020 / 2022 shocks",
    href: "/stresstest",
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
