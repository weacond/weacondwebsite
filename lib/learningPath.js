// lib/learningPath.js — 学习路径 / 课程大纲（单一事实源，纯函数、可单元测试）
//
// 把站内工具串成一条循序渐进的学习路径：每个模块 { id, level, title,
// titleEn, desc, descEn, tool (href), estMin }。level: beginner /
// intermediate / advanced。供 /learning 页面按等级分组呈现。

export const LEVELS = {
  beginner: { label: "入门", labelEn: "Beginner", order: 0 },
  intermediate: { label: "进阶", labelEn: "Intermediate", order: 1 },
  advanced: { label: "高级", labelEn: "Advanced", order: 2 },
};

export const LEARNING_PATH = [
  {
    id: "pivots",
    level: "beginner",
    title: "枢轴点与技术位",
    titleEn: "Pivots & Levels",
    desc: "先用支点/斐波那契读懂关键价位与趋势。",
    descEn: "Read key levels & trend with pivots / Fibonacci first.",
    tool: "/pivots",
    estMin: 10,
  },
  {
    id: "position",
    level: "beginner",
    title: "头寸规模与凯利",
    titleEn: "Position Sizing & Kelly",
    desc: "学会按风险预算下注，用凯利定长期增长比例。",
    descEn: "Bet by risk budget; use Kelly for long-run growth.",
    tool: "/position-size",
    estMin: 10,
  },
  {
    id: "portfolio",
    level: "intermediate",
    title: "组合优化",
    titleEn: "Portfolio Optimization",
    desc: "在多个资产间配权，比较夏普/波动/风险平价。",
    descEn: "Weight multiple assets; compare Sharpe, vol, risk parity.",
    tool: "/portfolio",
    estMin: 15,
  },
  {
    id: "correlation",
    level: "intermediate",
    title: "相关性与分散化",
    titleEn: "Correlation & Diversification",
    desc: "用相关矩阵与分散化比率判断真正的分散。",
    descEn: "Use the correlation matrix & diversification ratio.",
    tool: "/correlation",
    estMin: 15,
  },
  {
    id: "options",
    level: "intermediate",
    title: "期权基础",
    titleEn: "Options Fundamentals",
    desc: "理解希腊字母、隐含波动率与策略盈亏。",
    descEn: "Greeks, implied vol & strategy payoffs.",
    tool: "/options",
    estMin: 20,
  },
  {
    id: "risk",
    level: "advanced",
    title: "风险与绩效仪表盘",
    titleEn: "Risk & Performance",
    desc: "从净值曲线一次读出回撤、尾部风险与六大比率。",
    descEn: "Read drawdown, tail risk & six ratios from an equity curve.",
    tool: "/risk",
    estMin: 20,
  },
  {
    id: "stresstest",
    level: "advanced",
    title: "压力测试 / 情景",
    titleEn: "Stress & Scenarios",
    desc: "把组合放进 2008 / 2020 / 2022 看总损失与资产贡献。",
    descEn: "Run your portfolio through 2008 / 2020 / 2022 shocks.",
    tool: "/stresstest",
    estMin: 15,
  },
  {
    id: "montecarlo",
    level: "advanced",
    title: "蒙特卡洛模拟",
    titleEn: "Monte Carlo",
    desc: "用大量路径估计财富分布、终端分位与破产概率。",
    descEn: "Estimate the wealth distribution, terminal quantiles & ruin odds.",
    tool: "/montecarlo",
    estMin: 20,
  },
  {
    id: "performance",
    level: "advanced",
    title: "交易业绩与纪律",
    titleEn: "Performance & Discipline",
    desc: "用交易日志量化胜率/期望/连亏/破产概率，建立纪律。",
    descEn: "Quantify win rate, expectancy, losing streaks & ruin from a journal.",
    tool: "/performance",
    estMin: 15,
  },
];

// 按 level 分组（保持 order）；组内保持 LEARNING_PATH 顺序。
export function groupedPath() {
  const levels = Object.keys(LEVELS).sort((a, b) => LEVELS[a].order - LEVELS[b].order);
  return levels
    .map((lv) => ({
      level: lv,
      label: LEVELS[lv].label,
      labelEn: LEVELS[lv].labelEn,
      modules: LEARNING_PATH.filter((m) => m.level === lv),
    }))
    .filter((g) => g.modules.length > 0);
}

// 总学时（分钟）
export function totalMinutes() {
  return LEARNING_PATH.reduce((s, m) => s + m.estMin, 0);
}

// 所有模块的工具 href（去重，保序）
export function allToolHrefs() {
  const seen = new Set();
  const out = [];
  for (const m of LEARNING_PATH) if (!seen.has(m.tool)) { seen.add(m.tool); out.push(m.tool); }
  return out;
}
