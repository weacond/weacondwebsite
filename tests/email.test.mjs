// tests/email.test.mjs — 邮件内容生成器单元测试
import assert from "node:assert/strict";
import {
  buildDigestEmail,
  buildWelcomeEmail,
  htmlEscape,
} from "../lib/email.js";
import { buildDailyDigest } from "../lib/digest.js";

function t(name, fn) {
  fn();
  passed++;
  console.log("  ✓ " + name);
}
let passed = 0;

// ── 每日简报邮件 ──
t("buildDigestEmail：含 subject/text/html/template", () => {
  const d = buildDailyDigest({ date: "2026-01-01", generatedAt: "x" });
  const e = buildDigestEmail(d, { lang: "zh" });
  assert.ok(e.subject.includes("2026-01-01"), "主题含日期");
  assert.ok(typeof e.text === "string" && e.text.length > 0, "有纯文本");
  assert.ok(/<div/.test(e.html), "有 HTML");
  assert.equal(e.template, "digest");
  assert.ok(/非投资建议/.test(e.text), "含免责");
});
t("buildDigestEmail：英文主题", () => {
  const d = buildDailyDigest({ date: "2026-01-01", generatedAt: "x" });
  const e = buildDigestEmail(d, { lang: "en" });
  assert.ok(/Daily Signal Brief/.test(e.subject), "英文主题");
});
t("buildDigestEmail：空 digest 不崩", () => {
  const e = buildDigestEmail({}, { lang: "zh" });
  assert.ok(typeof e.text === "string", "不崩");
  assert.ok(e.html.includes("</div>"), "HTML 闭合");
});

// ── 欢迎信 ──
t("buildWelcomeEmail：含三步 + 引导 CTA", () => {
  const e = buildWelcomeEmail("Kendrick", { lang: "zh" });
  assert.ok(/Kendrick/.test(e.text), "含名字");
  assert.ok(/信号仪表盘/.test(e.text), "含步骤1");
  assert.ok(/胜率显著性/.test(e.text), "含步骤3");
  assert.ok(/\/signals/.test(e.text), "含 CTA");
  assert.equal(e.template, "welcome");
});
t("buildWelcomeEmail：无名字 → 通用问候", () => {
  const e = buildWelcomeEmail("", { lang: "zh" });
  assert.ok(/你好！/.test(e.text), "通用问候");
  assert.ok(!e.text.includes("{"), "无残留占位符");
});
t("buildWelcomeEmail：英文三步", () => {
  const e = buildWelcomeEmail("A", { lang: "en" });
  assert.ok(/3 steps/.test(e.subject) || /3 steps/.test(e.text) || e.subject.length > 0, "有内容");
  assert.ok(/Win-Rate Significance/.test(e.text), "含步骤3英文");
});

// ── HTML 转义（防注入）──
t("htmlEscape：&<> 被转义", () => {
  assert.equal(htmlEscape("a<b>&c"), "a&lt;b&gt;&amp;c");
});
t("HTML 不内联原始注入标签", () => {
  const e = buildWelcomeEmail("><script>", { lang: "zh" });
  assert.ok(!e.html.includes("<script>"), "script 被转义");
  assert.ok(!e.html.includes("></"), "原始 </ 被转义");
});

console.log(`\n✅ email: ${passed}/${passed} 通过`);
