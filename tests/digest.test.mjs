// tests/digest.test.mjs — 每日信号简报生成器单元测试
import assert from "node:assert/strict";
import { buildDailyDigest, formatDigestText } from "../lib/digest.js";

function t(name, fn) {
  fn();
  passed++;
  console.log("  ✓ " + name);
}
let passed = 0;

t("生成简报：含 date/engine/top/topSignal", () => {
  const d = buildDailyDigest({ date: "2026-01-01", generatedAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(d.date, "2026-01-01");
  assert.ok(Array.isArray(d.top) && d.top.length > 0, "有 top 信号");
  assert.ok(d.topSignal && d.topSignal.ticker, "有 topSignal");
  assert.ok(/非投资建议|not investment advice/.test(d.disclaimer), "含免责");
});
t("topN 可定制", () => {
  assert.equal(buildDailyDigest({ topN: 1 }).top.length, 1);
  assert.equal(buildDailyDigest({ topN: 5 }).top.length, 5);
  assert.equal(buildDailyDigest({ topN: 100 }).top.length, 6, "不超过标的池");
});
t("确定性：固定 date/generatedAt → 相同输出", () => {
  const a = buildDailyDigest({ date: "2026-01-01", generatedAt: "2026-01-01T00:00:00.000Z" });
  const b = buildDailyDigest({ date: "2026-01-01", generatedAt: "2026-01-01T00:00:00.000Z" });
  assert.deepEqual(a, b);
});
t("top 按盈利概率降序", () => {
  const d = buildDailyDigest();
  for (let i = 1; i < d.top.length; i++)
    assert.ok(d.top[i - 1].probOfProfit >= d.top[i].probOfProfit, "降序");
});
t("riskOfTheDay = IV Rank 最高者", () => {
  const d = buildDailyDigest();
  const maxIv = Math.max(...d.top.map((s) => s.ivRank), ...[]);
  assert.ok(d.riskOfTheDay, "有风险焦点");
  // 风险焦点的 ivRank 应 >= 任一 top 的 ivRank
  const topMaxIv = Math.max(...d.top.map((s) => s.ivRank));
  assert.ok(d.riskOfTheDay.ivRank >= topMaxIv, "风险焦点 ivRank 最高");
});
t("空标的池 → top 空、topSignal/risk null", () => {
  const d = buildDailyDigest({ universe: [] });
  assert.equal(d.top.length, 0);
  assert.equal(d.topSignal, null);
  assert.equal(d.riskOfTheDay, null);
});
t("formatDigestText 含信号 ticker + 免责，纯文本无 HTML", () => {
  const d = buildDailyDigest({ date: "2026-01-01", generatedAt: "x" });
  const txt = formatDigestText(d, "zh");
  assert.ok(/非投资建议/.test(txt), "含免责");
  assert.ok(!/<[a-z]/i.test(txt), "无 HTML 标签");
  assert.ok(/[A-Z]{2,}/.test(txt), "含 ticker");
});
t("formatDigestText 空对象 → 空串", () => {
  assert.equal(formatDigestText({}, "zh"), "");
  assert.equal(formatDigestText(null, "en"), "");
});
t("dataMode 默认 estimated，可覆盖", () => {
  assert.equal(buildDailyDigest().dataMode, "estimated");
  assert.equal(buildDailyDigest({ dataMode: "live" }).dataMode, "live");
});

console.log(`\n✅ digest: ${passed}/${passed} 通过`);
