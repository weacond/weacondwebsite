// tests/tickerLanding.test.mjs — 单标的落地页数据单元测试
import assert from "node:assert/strict";
import { buildTickerLanding, DEFAULT_UNIVERSE } from "../lib/signalApi.js";

function t(name, fn) {
  fn();
  passed++;
  console.log("  ✓ " + name);
}
let passed = 0;

t("已知 ticker → 返回信号 + 排名 + 总数", () => {
  const r = buildTickerLanding("NVDA");
  assert.ok(r, "存在");
  assert.equal(r.ticker, "NVDA");
  assert.equal(typeof r.rank, "number");
  assert.ok(r.rank >= 1 && r.rank <= r.total, "rank 在 [1,total]");
  assert.equal(r.total, DEFAULT_UNIVERSE.length);
  assert.ok(/非投资建议/.test(r.disclaimer), "含免责");
  assert.equal(r.dataMode, "estimated");
});
t("大小写不敏感", () => {
  const a = buildTickerLanding("spy");
  const b = buildTickerLanding("SPY");
  assert.equal(a.ticker, b.ticker);
});
t("未知 ticker → null(页面据此 notFound)", () => {
  assert.equal(buildTickerLanding("ZZZZ"), null);
  assert.equal(buildTickerLanding(""), null);
  assert.equal(buildTickerLanding(null), null);
});
t("落地页数据含盈利概率/置信/假设(供 JSON-LD 与渲染)", () => {
  const r = buildTickerLanding("TSLA");
  assert.ok(Number.isFinite(r.probOfProfit), "有 probOfProfit");
  assert.equal(r.confidenceBand.length, 2, "有置信区间");
  assert.ok(r.assumptions, "有 assumptions");
});

console.log(`\n✅ tickerLanding: ${passed}/${passed} 通过`);
