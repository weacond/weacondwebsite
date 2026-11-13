// lib/aiRag.js — 幻觉控制 + RAG 接地层（手册 §3「建立客户信任的核心」/ §4「数据壁垒」）
//
// 设计目标（对应手册三条铁律）：
//   1) 幻觉控制：仅依据「给定上下文」回答；查不到就明说「不知道」；严禁编造数字/价格/引用。
//   2) 数据壁垒：把站点自有知识作为 RAG 语料注入，模型「变成金融专家」。
//   3) 精准溯源：每条回答附来源；UI 可据来源与「不确定」标记提示用户。
//
// 隐私：检索全部在本地（静态语料），不上传任何用户数据；与 lib/ai.js 本地 WebGPU 路径一致。
// 本模块全部为纯函数，可单元测试；不依赖任何网络或浏览器 API。

// ─────────────────────────────────────────────────────────────────────────────
// 1) 内置知识库（站点自有、可核验的金融事实，作为默认 RAG 语料）。
// 可被外部知识源（用户文档 / 实时行情摘要）通过 retrieveContext(query, extraKB) 扩充。
// 每条：{ id, tags(检索用小写关键词), zh, en }
// ─────────────────────────────────────────────────────────────────────────────
export const KNOWLEDGE = [
  {
    id: "ivrank",
    tags: ["iv", "ivrank", "iv rank", "隐含波动率", "波动率", "volatility", "rank", "百分位", "percentile"],
    zh: "IV Rank 是隐含波动率相对其自身历史区间的百分位。IV Rank 高（>50）通常意味着期权偏贵，利于卖方收权利金；IV Rank 低（<30）意味着期权便宜，卖方收的权利金不足。",
    en: "IV Rank is the percentile of implied volatility relative to its own historical range. A high IV Rank (>50) usually means options are expensive, favorable to sellers collecting premium; a low IV Rank (<30) means options are cheap, so the premium sellers collect is thin.",
  },
  {
    id: "putselling",
    tags: ["put", "卖put", "selling puts", "卖方", "sell put", "covered call", "theta", "theta decay", "尾部", "tail risk"],
    zh: "卖 Put 是收取权利金并承担潜在买入义务的策略，依赖 Theta（时间衰减）获利。其风险是右偏的：小额频繁盈利但尾部可能出现大额亏损（个股跳空/退市）。",
    en: "Selling a put collects premium while taking on a potential obligation to buy, profiting from theta (time decay). Its risk is right-skewed: small frequent gains but a possible large tail loss from a single-stock gap or delisting.",
  },
  {
    id: "vix",
    tags: ["vix", "fear", "恐慌", "fear index", "cboe", "sp500 vol"],
    zh: "VIX 衡量标普 500 期权的隐含波动率，常被称为「恐慌指数」。VIX 急升通常伴随市场下跌与避险情绪；常被用作黑天鹅/尾部对冲的触发信号之一。",
    en: "The VIX measures the implied volatility of S&P 500 options and is often called the 'fear index'. A sharp VIX spike usually coincides with market declines and risk-averse sentiment; it is commonly used as one trigger for black-swan / tail hedging.",
  },
  {
    id: "sharpe",
    tags: ["sharpe", "夏普", "sharpe ratio", "risk-adjusted", "风险调整"],
    zh: "夏普比率 =（年化收益 − 无风险利率）/ 波动率，衡量每单位风险所获得的超额收益。数值越高，风险调整后的表现越好；但高夏普可能由低波动或样本偏差造成。",
    en: "Sharpe ratio = (annualized return − risk-free rate) / volatility, measuring excess return per unit of risk. A higher value indicates better risk-adjusted performance, though a high Sharpe can also stem from low volatility or sample bias.",
  },
  {
    id: "kelly",
    tags: ["kelly", "凯利", "kelly criterion", "仓位", "position sizing", "下注", "bet"],
    zh: "凯利公式给出在正期望赌局上的最优下注比例：f* = 胜率 − 赔率/盈亏比。实务中常用「半凯利」以降方差；全凯利在参数估计不准时风险极高。",
    en: "The Kelly criterion gives the optimal fraction to wager on a positive-expected-value bet: f* = win rate − (payout odds / payoff ratio). In practice 'half-Kelly' is used to cut variance; full-Kelly is very risky when parameters are mis-estimated.",
  },
  {
    id: "r",
    tags: ["r", "r multiple", "r-multiple", "风险回报", "risk reward", "盈亏比"],
    zh: "R 倍数 = 盈亏 / 初始风险（R）。R=1 表示赚回一倍初始风险；R=−1 表示亏掉全部初始风险。它把不同交易归一化为可比的风险单位。",
    en: "R-multiple = profit-and-loss divided by the initial risk (R). R=1 means one full unit of risk was recovered; R=−1 means the entire initial risk was lost. It normalizes trades into a comparable unit of risk.",
  },
  {
    id: "drawdown",
    tags: ["drawdown", "回撤", "max drawdown", "最大回撤", "peak to trough"],
    zh: "最大回撤 = 从历史峰值到随后谷值的最大跌幅，衡量策略在最坏区间的承受能力。它是风控与仓位管理的关键约束。",
    en: "Maximum drawdown is the largest peak-to-trough decline, measuring how badly a strategy fares in its worst regime. It is a key constraint for risk control and position sizing.",
  },
  {
    id: "greeks",
    tags: ["greeks", "delta", "theta", "gamma", "vega", "期权敏感度"],
    zh: "期权希腊字母衡量价格对各因素的敏感度：Delta=标的价格、Theta=时间流逝、Gamma=Delta 的二阶变化、Vega=隐含波动率。卖方通常追求正 Theta、负 Vega。",
    en: "Options Greeks measure sensitivity: Delta to the underlying price, Theta to time passing, Gamma to the change in Delta, Vega to implied volatility. Sellers typically seek positive Theta and negative Vega.",
  },
];
// ─────────────────────────────────────────────────────────────────────────────
// 2) 严格金融系统提示（幻觉控制铁律）。双语。
//    grounded=false 时不要求引用上下文（用于纯常识问答）。
// ─────────────────────────────────────────────────────────────────────────────
export function buildSystemPrompt(opts = {}) {
  const lang = opts.lang || "zh";
  const context =
    typeof opts.context === "string" && opts.context.trim()
      ? `\n\n[可用上下文 / Available context — 仅可依据此内容作答 / answer only from this]\n${opts.context.trim()}`
      : "";

  const zh =
    "你是 Weacond 的金融情报助手，面向散户卖 Put 与风险教育。\n" +
    "硬性规则（务必遵守）：\n" +
    "1. 仅依据【可用上下文】与公认金融常识作答；上下文中没有的，直接回答「我不确定 / 需要更多数据」，严禁编造。\n" +
    "2. 不得编造任何数字、价格、收益率、报价或引用来源；不确定就明说不确定。\n" +
    "3. 不得给个性化投资建议；只解释概念、概率与风险，并提示「结果因人而异」。\n" +
    "4. 涉及具体判断时，标注所依据的上下文条目 id（如 [ivrank]）。\n" +
    "5. 用用户所用的语言回复，简洁、分步骤。" +
    context;

  const en =
    "You are Weacond's financial-intelligence assistant, focused on retail put-selling and risk education.\n" +
    "Hard rules (must follow):\n" +
    "1. Answer ONLY from the [Available context] below and accepted financial common sense; if it is not there, say 'I'm not sure / more data is needed' — never fabricate.\n" +
    "2. Never invent numbers, prices, returns, quotes, or citations; if unsure, say so.\n" +
    "3. Never give personalized investment advice; explain concepts, probabilities, and risk, and note 'results vary'.\n" +
    "4. When making a specific call, cite the context entry id it relies on (e.g. [ivrank]).\n" +
    "5. Reply in the user's language; be concise and step-by-step." +
    context;

  return lang === "en" ? en : zh;
}
// ─────────────────────────────────────────────────────────────────────────────
// 3) 朴素 RAG 检索：按关键词重叠给语料打分，返回 top-k（score>0）。
//    query 会被分词（小写 + 按非字母数字/CJK 切分）；extraKnowledge 可追加语料。
// ─────────────────────────────────────────────────────────────────────────────
function tokenize(text) {
  if (!text) return [];
  const s = String(text).toLowerCase();
  const latin = s.match(/[a-z0-9]+/g) || [];
  const cjk = s.match(/[一-龥]/g) || [];
  return [...latin, ...cjk];
}

export function retrieveContext(query, knowledgeBase = KNOWLEDGE, k = 4) {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const scores = knowledgeBase
    .map((entry) => {
      const hay = (entry.tags || []).join(" ");
      let score = 0;
      for (const t of tokens) {
        if (hay.includes(t)) score += 1;
      }
      return { entry, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scores.slice(0, Math.max(1, k)).map((x) => x.entry);
}

// 把检索结果拼成「可注入的上下文」文本（含条目 id，供模型引用与 UI 溯源）
export function formatContext(entries, lang = "zh") {
  if (!Array.isArray(entries) || !entries.length) return "";
  return entries.map((e) => `[${e.id}] ${e[lang] || e.zh || ""}`).join("\n");
}

// 一次性构造「接地后的系统提示」：系统提示 + 检索到的上下文
export function buildGroundedSystemPrompt(query, opts = {}) {
  const lang = opts.lang || "zh";
  const k = opts.k || 4;
  const extra = opts.extraKnowledge;
  const kb = extra && extra.length ? KNOWLEDGE.concat(extra) : KNOWLEDGE;
  const hits = retrieveContext(query, kb, k);
  const context = formatContext(hits, lang);
  return {
    prompt: buildSystemPrompt({ lang, grounded: hits.length > 0, context }),
    sources: hits.map((h) => h.id),
    hits,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) 答案后处理：附来源 + 检测「不确定」（供 UI 警示）。
// ─────────────────────────────────────────────────────────────────────────────
const UNCERTAIN_ZH = ["我不确定", "无法确定", "没有足够", "缺少数据", "需要更多数据", "无法回答", "信息不足"];
const UNCERTAIN_EN = [
  "i'm not sure",
  "i am not sure",
  "not enough",
  "insufficient",
  "cannot determine",
  "i don't know",
  "i do not know",
  "need more data",
];

export function looksUncertain(text) {
  const s = String(text || "").toLowerCase();
  return UNCERTAIN_ZH.some((p) => s.includes(p)) || UNCERTAIN_EN.some((p) => s.includes(p));
}

// 在答案末尾追加「参考来源」段落（无来源则原样返回）
export function appendSources(answer, sourceIds, lang = "zh") {
  const base = String(answer || "");
  if (!Array.isArray(sourceIds) || !sourceIds.length) return base;
  const head = lang === "en" ? "\n\n— Sources: " : "\n\n— 参考来源: ";
  return base + head + sourceIds.map((id) => `[${id}]`).join(", ");
}