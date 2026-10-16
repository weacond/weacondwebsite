/**
 * genEbooks.mjs — 电子书目录与占位内容生成器（Node ESM）
 *
 * 作用：
 *   1. 读取 public/ebooks/index.json，补齐 desc_cn / desc_en / type / number 字段；
 *   2. 为【缺少】的 preview/*.md 与 content/*.md 生成中英双语【占位】结构；
 *      —— 已存在的文件（如 3 本真实内容）绝不被覆盖；
 *   3. 写回 index.json（带描述）。
 *
 * 这是【本地】脚本，不会改动任何远程 / GitHub。可安全重复运行（幂等）。
 *
 * 运行：node scripts/genEbooks.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const INDEX = path.join(root, "public", "ebooks", "index.json");
const PREVIEW_DIR = path.join(root, "public", "ebooks", "preview");
const CONTENT_DIR = path.join(root, "private", "ebooks", "content");

// 25 本书的中英双语一句话简介（占位，可在此处直接替换为正式文案）
const DESCRIPTIONS = {
  "rational-101": { cn: "用第一性原理解构投资，建立理性决策的底层框架。", en: "First-principles framework for rational decision-making in investing." },
  "behavioral-biases": { cn: "识别损失厌恶、锚定、从众等认知偏差对交易的破坏。", en: "Spot loss aversion, anchoring, and herd bias that wreck trades." },
  "macro-basics": { cn: "读懂利率、通胀、增长与汇率，构建宏观投资视角。", en: "Read rates, inflation, growth, and FX to build a macro view." },
  "equity-pricing": { cn: "DCF、相对估值与情景分析，给股票一个合理价格。", en: "DCF, relative valuation, and scenario analysis to price a stock." },
  "risk-management": { cn: "仓位、止损、最大回撤与凯利公式，守住本金。", en: "Position sizing, stop-loss, max drawdown, and Kelly to protect capital." },
  "portfolio-theory": { cn: "马科维茨、有效前沿与分散化的数学与直觉。", en: "Markowitz, the efficient frontier, and diversification, math and intuition." },
  "options-strategies": { cn: "从单腿到价差、策略矩阵与 Greeks 管理。", en: "From single legs to spreads, strategy matrix, and Greeks management." },
  "futures-trading": { cn: "合约、保证金、展仓与杠杆的实战纪律。", en: "Contracts, margin, rolling, and leverage discipline in practice." },
  "quant-coding": { cn: "用代码实现回测、信号与数据管道。", en: "Code backtests, signals, and data pipelines." },
  "backtesting": { cn: "样本外、过拟合、交易成本与稳健性检验。", en: "Out-of-sample, overfitting, transaction costs, and robustness checks." },
  "market-microstructure": { cn: "订单簿、流动性、滑点与撮合机制。", en: "Order book, liquidity, slippage, and matching mechanics." },
  "fixed-income": { cn: "久期、凸性与收益率曲线的分析框架。", en: "Duration, convexity, and the yield curve framework." },
  "reits": { cn: "股息、估值与宏观敏感度的房地产投资信托。", en: "Dividends, valuation, and macro sensitivity of real-estate trusts." },
  "crypto-investing": { cn: "链上数据、周期与风险管理的数字资产框架。", en: "On-chain data, cycles, and risk management for digital assets." },
  "emerging-markets": { cn: "汇率、政策与增长红利的新兴市场配置。", en: "FX, policy, and growth premium in emerging-market allocation." },
  "etf-guide": { cn: "宽基、行业、杠杆与被动投资的选基方法。", en: "Broad, sector, leveraged, and passive fund selection." },
  "tax-optimization": { cn: "资本利得、税务错配与长期持有策略。", en: "Capital gains, tax-loss harvesting, and long-hold strategy." },
  "retirement-planning": { cn: "目标日期、提取率与人生现金流规划。", en: "Target date, withdrawal rate, and lifetime cash-flow planning." },
  "asset-allocation": { cn: "战略与战术配置、再平衡与风险预算。", en: "Strategic & tactical allocation, rebalancing, and risk budgeting." },
  "index-investing": { cn: "为什么被动多数情况下跑赢主动。", en: "Why passive usually beats active, and how to do it right." },
  "value-investing": { cn: "安全边际、护城河与内在价值评估。", en: "Margin of safety, moats, and intrinsic value." },
  "momentum-trading": { cn: "趋势跟踪、动量因子与反转风险。", en: "Trend following, the momentum factor, and reversal risk." },
  "event-driven": { cn: "并购、拆分、指数调整等事件套利。", en: "Mergers, spinoffs, and index-rebalance arbitrage." },
  "high-frequency": { cn: "低延迟、做市与高频的门槛与陷阱。", en: "Low latency, market making, and the traps of HFT." },
  "black-swan": { cn: "尾部风险识别与不对称对冲框架。", en: "Tail-risk detection and asymmetric hedging." },
};

// 通用章节大纲（中英双语），可逐本替换
const CHAPTERS = [
  { cn: "导论：为什么这本书重要", en: "Introduction: why this matters" },
  { cn: "核心概念与术语", en: "Core Concepts & Terms" },
  { cn: "方法论与计算", en: "Methodology & Calculations" },
  { cn: "实战案例", en: "Practical Examples" },
  { cn: "常见误区与陷阱", en: "Common Mistakes & Traps" },
  { cn: "结语：行动清单", en: "Conclusion: Your Action List" },
];

function readIndex() {
  return JSON.parse(fs.readFileSync(INDEX, "utf-8"));
}

function previewMarkdown(book) {
  const c0 = CHAPTERS[0], c1 = CHAPTERS[1];
  return [
    `# ${book.title_cn} / ${book.title_en}`,
    "",
    "> 占位预览（PLACEHOLDER）— 请替换为正式第一章。/ Placeholder preview — replace with the real chapter 1.",
    "",
    `## ${c0.cn} / ${c0.en}`,
    "",
    `（${DESCRIPTIONS[book.slug]?.cn || book.title_cn}）`,
    `(${DESCRIPTIONS[book.slug]?.en || book.title_en})`,
    "",
    `## ${c1.cn} / ${c1.en}`,
    "",
    "本节为结构占位，演示排版与章节层级。This section is a structural placeholder demonstrating layout and chapter hierarchy.",
    "",
    "---",
    "",
    "*Preview ends here. 解锁完整内容。/ Unlock full book to continue.*",
    "",
  ].join("\n");
}

function contentMarkdown(book) {
  const lines = [
    `# ${book.title_cn} / ${book.title_en}`,
    "",
    "> 占位正文（PLACEHOLDER）：自动生成的双语结构，请逐章替换为正式内容。",
    "> Placeholder body: auto-generated bilingual outline — replace each chapter with the real text.",
    "",
  ];
  CHAPTERS.forEach((c, idx) => {
    lines.push(`## 第${idx + 1}章 ${c.cn} / Ch.${idx + 1} ${c.en}`);
    lines.push("");
    lines.push(`（占位：${c.cn}）`);
    lines.push(`(Placeholder: ${c.en})`);
    lines.push("");
  });
  lines.push(`© Weacond · 仅供个人使用，禁止复制或传播 / For personal use only.`);
  lines.push("");
  return lines.join("\n");
}

function main() {
  const books = readIndex();
  let descAdded = 0, previewMade = 0, contentMade = 0, previewSkipped = 0, contentSkipped = 0;

  books.forEach((book, i) => {
    const d = DESCRIPTIONS[book.slug];
    if (!book.desc_cn) { book.desc_cn = d?.cn || book.title_cn; descAdded++; }
    if (!book.desc_en) { book.desc_en = d?.en || book.title_en; descAdded++; }
    if (book.price_cents != null && book.price_cents > 0 && book.type !== "paid") book.type = "paid";
    if (book.price_cents === 0) book.type = "free";
    if (!book.number) book.number = i + 1;
    book.preview = book.preview || `preview/${book.slug}.md`;
    book.content = book.content || `content/${book.slug}.md`;

    const pvPath = path.join(PREVIEW_DIR, `${book.slug}.md`);
    if (!fs.existsSync(pvPath)) { fs.writeFileSync(pvPath, previewMarkdown(book), "utf-8"); previewMade++; }
    else previewSkipped++;

    const ctPath = path.join(CONTENT_DIR, `${book.slug}.md`);
    if (!fs.existsSync(ctPath)) { fs.writeFileSync(ctPath, contentMarkdown(book), "utf-8"); contentMade++; }
    else contentSkipped++;
  });

  fs.writeFileSync(INDEX, JSON.stringify(books, null, 2) + "\n", "utf-8");

  const paid = books.filter((b) => b.type === "paid").length;
  console.log(`✓ index.json 写回：${books.length} 本（付费 ${paid}）`);
  console.log(`  描述补齐字段：${descAdded} 处`);
  console.log(`  生成预览：${previewMade} 个（已存在跳过 ${previewSkipped}）`);
  console.log(`  生成正文：${contentMade} 个（已存在跳过 ${contentSkipped}）`);
}

main();