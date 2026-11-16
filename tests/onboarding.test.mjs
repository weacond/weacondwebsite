// tests/onboarding.test.mjs — 7 日新手引导邮件序列单元测试
import assert from "node:assert/strict";
import {
  buildOnboardingEmail,
  getOnboardingSchedule,
  isOnboardingDay,
  clampDay,
  ONBOARDING_DAYS,
} from "../lib/onboarding.js";

function t(name, fn) {
  fn();
  passed++;
  console.log("  ✓ " + name);
}
let passed = 0;

// ── 序列长度 ──
t("getOnboardingSchedule：返回 7 天", () => {
  assert.equal(ONBOARDING_DAYS, 7);
  const s = getOnboardingSchedule({ name: "K", lang: "en" });
  assert.equal(s.length, 7, "7 封");
});

// ── 单封邮件结构 ──
t("buildOnboardingEmail：含 subject/text/html/template/day", () => {
  const e = buildOnboardingEmail(0, { name: "Kendrick", lang: "en" });
  assert.equal(e.template, "onboarding");
  assert.equal(e.day, 0);
  assert.ok(e.subject.includes("Welcome"), "英文欢迎主题");
  assert.ok(/Kendrick/.test(e.text), "含名字");
  assert.ok(/<div/.test(e.html), "有 HTML");
  assert.ok(/Educational/.test(e.text), "含英文免责");
});

// ── 漏斗 CTA 覆盖 ──
t("Day0 引导 CTA → /signals", () => {
  const e = buildOnboardingEmail(0, { lang: "zh" });
  assert.ok(/\/signals/.test(e.text), "Day0 引导到信号");
});
t("Day2 引导 CTA → /backtest", () => {
  const e = buildOnboardingEmail(2, { lang: "zh" });
  assert.ok(/\/backtest/.test(e.text), "Day2 引导到回测");
});
t("Day5 引导 CTA → /ebooks", () => {
  const e = buildOnboardingEmail(5, { lang: "zh" });
  assert.ok(/\/ebooks/.test(e.text), "Day5 引导到电子书");
});
t("Day6 引导 CTA → /pricing（转化）", () => {
  const e = buildOnboardingEmail(6, { lang: "en" });
  assert.ok(/\/pricing/.test(e.text), "Day6 引导到定价");
  assert.ok(/7-day|refund/.test(e.text), "提退款/转化话术");
});

// ── 越界夹取，绝不抛错 ──
t("clampDay：越界夹取到 [0,6]", () => {
  assert.equal(clampDay(-3), 0);
  assert.equal(clampDay(99), 6);
  assert.equal(clampDay("abc"), 0);
  assert.equal(clampDay(3), 3);
});
t("buildOnboardingEmail：负数/超界 day 不崩", () => {
  const a = buildOnboardingEmail(-1, {});
  assert.equal(a.day, 0);
  const b = buildOnboardingEmail(12, {});
  assert.equal(b.day, 6);
});
t("isOnboardingDay：0..6 合法，7 与负数非法", () => {
  assert.ok(isOnboardingDay(0));
  assert.ok(isOnboardingDay(6));
  assert.ok(!isOnboardingDay(7));
  assert.ok(!isOnboardingDay(-1));
});

// ── 双语 / 名字 / 计划 ──
t("中文 vs 英文主题不同", () => {
  const zh = buildOnboardingEmail(1, { lang: "zh" }).subject;
  const en = buildOnboardingEmail(1, { lang: "en" }).subject;
  assert.ok(/第 2 天/.test(zh), "中文含「第 2 天」");
  assert.ok(/Day 2/.test(en), "英文含 Day 2");
});
t("无名字 → 通用问候且无残留占位符", () => {
  const e = buildOnboardingEmail(0, { lang: "zh" });
  assert.ok(/你好！/.test(e.text), "通用问候");
  assert.ok(!e.text.includes("{"), "无残留占位符");
});
t("非 free 计划 → 标注计划档位", () => {
  const e = buildOnboardingEmail(6, { lang: "zh", plan: "ProQuant" });
  assert.ok(/ProQuant/.test(e.text), "标注当前计划");
});
t("free 计划 → 标注免费档", () => {
  const e = buildOnboardingEmail(0, { lang: "zh", plan: "free" });
  assert.ok(/免费档/.test(e.text), "标注免费档");
});

// ── HTML 转义（防注入）──
t("HTML 不内联原始注入标签（script 被转义）", () => {
  const e = buildOnboardingEmail(0, { name: "><script>", lang: "zh" });
  assert.ok(!e.html.includes("<script>"), "原始 <script> 被转义");
  assert.ok(e.html.includes("&lt;script"), "转义后的 &lt;script 存在");
});

console.log(`\n✅ onboarding: ${passed}/${passed} 通过`);
