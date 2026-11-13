// lib/email.js — 邮件内容生成器（纯函数，SSR/Edge 安全，可单元测试）
//
// 手册 §4「邮件自动化 / 留存漏斗」：把「每日简报」与「欢迎信」渲染为邮件
// （主题 + 纯文本 + HTML）。不依赖任何邮件服务商；是否真正发送由
// pages/api/send-digest.js 决定（有 provider key 才发，否则返回预览）。
// 单一事实源：复用 lib/digest.js 的 formatDigestText。

import { formatDigestText } from "./digest.js";

// HTML 转义，防止 ticker/名称注入。
function htmlEscape(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// 每日简报 → 邮件对象（subject / 纯文本 / HTML）。
export function buildDigestEmail(digest, opts = {}) {
  const lang = opts.lang || "zh";
  const L = lang === "en" ? en : zh;
  const d = digest || {};
  const subject = L.digestSubject.replace("{d}", d.date || "");
  const text = formatDigestText(d, lang);
  const html = digestHtml(d, lang);
  return { subject, text, html, contentType: "text/plain", template: "digest" };
}

// 欢迎信：引导新用户「信号 → 回测 → 胜率」三步（留存漏斗）。
export function buildWelcomeEmail(name = "", opts = {}) {
  const lang = opts.lang || "zh";
  const L = lang === "en" ? en : zh;
  const who = name ? L.hiName.replace("{n}", name) : L.hi;
  const text = [
    who,
    L.welcome,
    "",
    "1. " + L.step1,
    "2. " + L.step2,
    "3. " + L.step3,
    "",
    L.cta,
    L.disclaimer,
  ].join("\n");
  return {
    subject: L.welcomeSubject,
    text,
    html: simpleHtml(text, lang),
    contentType: "text/plain",
    template: "welcome",
  };
}

function digestHtml(d, lang) {
  const L = lang === "en" ? en : zh;
  const rows = (d.top || [])
    .map(
      (s, i) =>
        `<li><b>${i + 1}. ${htmlEscape(s.ticker)}</b> — P(+)≈${Math.round(
          s.probOfProfit * 100
        )}%</li>`
    )
    .join("");
  return (
    `<div style="font-family:-apple-system,sans-serif;max-width:560px">` +
    `<h2>${htmlEscape(d.headline || L.digestSubject)}</h2>` +
    `<p>${L.date} ${htmlEscape(d.date || "")}</p>` +
    `<ol style="line-height:1.6">${rows}</ol>` +
    `<hr style="border:none;border-top:1px solid #eee"/>` +
    `<p style="color:#888;font-size:12px">${htmlEscape(d.disclaimer || L.disclaimer)}</p>` +
    `</div>`
  );
}

function simpleHtml(text, lang) {
  return `<div style="font-family:-apple-system,sans-serif;white-space:pre-line">${htmlEscape(
    text
  )}</div>`;
}

const zh = {
  digestSubject: "Weacond 每日信号简报 · {d}",
  welcomeSubject: "欢迎来到 Weacond —— 三步开始",
  hi: "你好！",
  hiName: "你好，{n}！",
  welcome: "三步把「裸信号」变成「可解释的概率」：",
  step1: "打开「信号仪表盘」，看按盈利概率排序的三引擎信号。",
  step2: "进「回测」验证任一策略的胜率与最大回撤。",
  step3: "用「胜率显著性」判断它是真 edge 还是抛硬币。",
  cta: "现在开始 → /signals",
  disclaimer: "教育性参考，非投资建议。",
  date: "日期：",
};
const en = {
  digestSubject: "Weacond Daily Signal Brief · {d}",
  welcomeSubject: "Welcome to Weacond — start in 3 steps",
  hi: "Hi!",
  hiName: "Hi {n}!",
  welcome: "Turn raw signals into explainable probabilities in 3 steps:",
  step1: "Open the Signal Dashboard for three-engine signals ranked by win probability.",
  step2: "Backtest any strategy for its win rate and max drawdown.",
  step3: "Use Win-Rate Significance to tell a real edge from a coin flip.",
  cta: "Start now → /signals",
  disclaimer: "Educational only, not investment advice.",
  date: "Date: ",
};

export { htmlEscape };
export default buildDigestEmail;
