// lib/onboarding.js — 7 日新手引导邮件序列（纯函数，SSR/Edge 安全，可单测）
//
// 手册 §4「留存漏斗 / 邮件自动化」：把新用户按 7 天引导过漏斗
//   Day0 欢迎(三步) → Day1 信号 → Day2 回测 → Day3 胜率显著性
//   → Day4 风险/回撤/仓位 → Day5 电子书(25本) → Day6 转化/订阅。
// 不依赖任何邮件服务商；是否真正发送由 pages/api/send-digest.js 决定
// （配了 provider 才发，否则返回预览）。单一事实源：复用 lib/email.js 的 htmlEscape。
//
// 契约：buildOnboardingEmail(day, {name, plan, lang}) →
//   { subject, text, html, contentType, template:"onboarding", day }
// day 越界（<0 或 ≥7）自动夹取到 [0,6]，绝不抛错。

import { htmlEscape } from "./email.js";

/** 序列天数（day 0..6，共 7 天） */
export const ONBOARDING_DAYS = 7;

// 7 天课程：每天一个主题 + 正文要点 + CTA（双语）。
// 每段文字都用 greeting() 处理名字，保证「无名字→通用问候、无残留占位符」。
const DAYS = [
  { // Day 0 — 欢迎 / 三步开始
    key: "welcome",
    subject: { zh: "欢迎来到 Weacond —— 三天起步", en: "Welcome to Weacond — start in 3 days" },
    focus: {
      zh: "三步把「裸信号」变成「可解释的概率」：",
      en: "Turn raw signals into explainable probabilities in 3 steps:",
    },
    steps: {
      zh: [
        "1. 打开「信号仪表盘」，看按盈利概率排序的三引擎信号。",
        "2. 进「回测」验证任一策略的胜率与最大回撤。",
        "3. 用「胜率显著性」判断它是真 edge 还是抛硬币。",
      ],
      en: [
        "1. Open the Signal Dashboard for three-engine signals ranked by win probability.",
        "2. Backtest any strategy for its win rate and max drawdown.",
        "3. Use Win-Rate Significance to tell a real edge from a coin flip.",
      ],
    },
    cta: { zh: "现在就开始 → /signals", en: "Start now → /signals" },
  },
  { // Day 1 — 信号仪表盘
    key: "signals",
    subject: { zh: "Day 1 · 让信号可解释", en: "Day 1 · Make signals explainable" },
    focus: {
      zh: "今天只学一件事：为什么同一个信号，在不同市场下盈利概率不同。",
      en: "Today, one idea: why the same signal has different profit probability in different markets.",
    },
    steps: {
      zh: [
        "· 看 P(+) 排序，而非只看方向：高胜率 > 高确定性。",
        "· 留意 95% 置信区间：区间越宽，结论越不稳。",
        "· 关注「假设清单」与「肥尾警示」——它们告诉你这个概率靠不靠谱。",
      ],
      en: [
        "· Rank by P(+) not direction: high win-rate beats high certainty.",
        "· Watch the 95% confidence band: wider band = shakier conclusion.",
        "· Read the assumptions and fat-tail warning — they say how much to trust it.",
      ],
    },
    cta: { zh: "看信号仪表盘 → /signals", en: "Open the dashboard → /signals" },
  },
  { // Day 2 — 回测
    key: "backtest",
    subject: { zh: "Day 2 · 用历史验证你的策略", en: "Day 2 · Prove it with history" },
    focus: {
      zh: "回测不是看「赚没赚」，而是看「回撤多大、是不是靠运气」。",
      en: "Backtest isn't about 'did it make money' — it's about 'how deep the drawdown, and was it luck'.",
    },
    steps: {
      zh: [
        "· 看最大回撤与 Calmar 比率：收益要配得上你承受的回撤。",
        "· 跑 16 个内置策略 + 网格参数，找稳健区。",
        "· 警惕过拟合：参数越敏感，实盘越容易失效。",
      ],
      en: [
        "· Check max drawdown and the Calmar ratio: reward must match the risk.",
        "· Run 16 built-in strategies + grid search to find the robust zone.",
        "· Beware overfitting: the more sensitive the params, the faster it breaks live.",
      ],
    },
    cta: { zh: "打开回测 → /backtest", en: "Open backtest → /backtest" },
  },
  { // Day 3 — 胜率显著性
    key: "significance",
    subject: { zh: "Day 3 · 是真 edge 还是抛硬币？", en: "Day 3 · Real edge or a coin flip?" },
    focus: {
      zh: "高胜率本身不足信——要用「胜率显著性」剔除运气成分。",
      en: "A high win rate alone isn't enough — 'Win-Rate Significance' strips out luck.",
    },
    steps: {
      zh: [
        "· 把样本胜率与 50% 做假设检验：p 值越小，越不可能是巧合。",
        "· 样本量太小（<30 笔）的结论一律降级为「不确定」。",
        "· 把「显著 edge」和「看起来好」分开，再决定是否上仓位。",
      ],
      en: [
        "· Test sample win rate vs. 50%: smaller p-value = less likely a fluke.",
        "· Small samples (<30 trades) are downgraded to 'uncertain'.",
        "· Separate a significant edge from 'looks good' before sizing up.",
      ],
    },
    cta: { zh: "试胜率显著性 → /signals", en: "Try Win-Rate Significance → /signals" },
  },
  { // Day 4 — 风险 / 回撤 / 仓位 / 黑天鹅
    key: "risk",
    subject: { zh: "Day 4 · 活下来比赚钱更重要", en: "Day 4 · Surviving beats winning" },
    focus: {
      zh: "决定你能否长期在牌桌上的，是仓位与尾部风险，而不是某次胜率。",
      en: "What keeps you in the game is position sizing and tail risk, not any single win rate.",
    },
    steps: {
      zh: [
        "· 用 Kelly / 风险预算定仓位：一次别押超过你能承受的回撤。",
        "· 跑黑天鹅蒙特卡洛：看 1% 与 0.1% 尾部会怎样。",
        "· 设硬止损与最大回撤线，先保本金再谈收益。",
      ],
      en: [
        "· Size with Kelly / a risk budget: never risk more than a drawdown you can survive.",
        "· Run the Black-Swan Monte Carlo: see the 1% and 0.1% tails.",
        "· Set a hard stop and a max-drawdown line — protect capital before chasing return.",
      ],
    },
    cta: { zh: "看黑天鹅模块 → /black-swan", en: "Open Black-Swan → /black-swan" },
  },
  { // Day 5 — 电子书（25 本教学体系）
    key: "ebooks",
    subject: { zh: "Day 5 · 25 本，从「钱是什么」到「你的体系」", en: "Day 5 · 25 books: from 'what is money' to 'your framework'" },
    focus: {
      zh: "我们做了一套 25 本的双语课程，按顺序读，每本建立在前一本之上。",
      en: "We built a 25-book bilingual curriculum — read in order; each builds on the last.",
    },
    steps: {
      zh: [
        "· 第 1 本《货币的本质》：从贝壳、金属到数字账户。",
        "· 中段：估值、价值投资、风险与尾部风险、技术/量化。",
        "· 第 25 本《构建你的投资体系》：把前面全部串成你自己的框架。",
      ],
      en: [
        "· Book 1 'The Nature of Money': from shells and metals to your digital balance.",
        "· Middle: valuation, value investing, risk & tail risk, technical/quant.",
        "· Book 25 'Building Your Investment Framework': tie it all into your own.",
      ],
    },
    cta: { zh: "浏览电子书 → /ebooks", en: "Browse the ebooks → /ebooks" },
  },
  { // Day 6 — 转化 / 订阅
    key: "convert",
    subject: { zh: "Day 6 · 把免费工具升级成你的系统", en: "Day 6 · Upgrade the free tools into your system" },
    focus: {
      zh: "免费档够用入门；把信号、回测、胜率、风险串起来，需要订阅。",
      en: "The free tier gets you started; wiring signals, backtest, win-rate and risk together needs a plan.",
    },
    steps: {
      zh: [
        "· PutSeller：5–10 条卖 Put + IV Rank + Greeks + 风控建议。",
        "· ProQuant：回测引擎 + 模拟盘 + 实时信号 + 策略市场。",
        "· 所有方案 7 天无条件退款，随时可取消。",
      ],
      en: [
        "· PutSeller: 5–10 puts + IV Rank + Greeks + risk guidance.",
        "· ProQuant: backtest engine + paper trading + live signals + strategy market.",
        "· Every plan: 7-day unconditional refund, cancel anytime.",
      ],
    },
    cta: { zh: "查看方案 → /pricing", en: "See plans → /pricing" },
  },
];

const zhMeta = {
  hi: "你好！",
  hiName: "你好，{n}！",
  day: "第 {d} 天 ·",
  title: "Weacond 7 日引导 ·",
  planFree: "（当前：免费档）",
  planOther: "（当前：{p} 档）",
  disclaimer: "教育性参考，非投资建议；所有数字为示意。",
};
const enMeta = {
  hi: "Hi!",
  hiName: "Hi {n}!",
  day: "Day {d} ·",
  title: "Weacond 7-day guide ·",
  planFree: "(current: Free plan)",
  planOther: "(current: {p} plan)",
  disclaimer: "Educational only, not investment advice; all figures illustrative.",
};

/** day 越界夹取到 [0, 6]，绝不抛错。 */
export function clampDay(day) {
  const n = Number(day);
  if (!Number.isFinite(n)) return 0;
  const i = Math.trunc(n);
  if (i < 0) return 0;
  if (i >= ONBOARDING_DAYS) return ONBOARDING_DAYS - 1;
  return i;
}

/** 是否合法的序列日（0..6）。 */
export function isOnboardingDay(day) {
  return Number.isInteger(day) && day >= 0 && day < ONBOARDING_DAYS;
}

/** 生成指定日的引导邮件。day 越界自动夹取。返回 {subject,text,html,contentType,template,day}。 */
export function buildOnboardingEmail(day, opts = {}) {
  const idx = clampDay(day);
  const dayObj = DAYS[idx];
  const lang = opts.lang === "en" ? "en" : "zh";
  const L = lang === "en" ? enMeta : zhMeta;
  const name = typeof opts.name === "string" ? opts.name.trim() : "";
  const plan = typeof opts.plan === "string" ? opts.plan.trim() : "free";

  // 与 lib/email.js 一致：名字/计划只在最终 simpleHtml 转义一次（避免双重转义）。
  const who = name ? L.hiName.replace("{n}", name) : L.hi;
  const planTag =
    plan && plan.toLowerCase() !== "free"
      ? L.planOther.replace("{p}", plan)
      : L.planFree;

  const subject =
    L.title +
    " " +
    L.day.replace("{d}", String(idx + 1)) +
    " " +
    dayObj.subject[lang];

  const text = [
    who + " " + planTag,
    "",
    dayObj.focus[lang],
    "",
    ...dayObj.steps[lang],
    "",
    dayObj.cta[lang],
    L.disclaimer,
  ].join("\n");

  return {
    subject,
    text,
    html: simpleHtml(text),
    contentType: "text/plain",
    template: "onboarding",
    day: idx,
  };
}

/** 返回完整 7 天序列（day 0..6 的邮件对象数组）。 */
export function getOnboardingSchedule(opts = {}) {
  const out = [];
  for (let i = 0; i < ONBOARDING_DAYS; i++) out.push(buildOnboardingEmail(i, opts));
  return out;
}

function simpleHtml(text) {
  return `<div style="font-family:-apple-system,sans-serif;white-space:pre-line">${htmlEscape(
    text
  )}</div>`;
}

export { htmlEscape };
export default buildOnboardingEmail;

