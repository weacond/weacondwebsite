// tests/signalApi.test.mjs — 信号 API 数据层单元测试
import assert from "node:assert/strict";
import {
  buildSignalApi,
  DEFAULT_UNIVERSE,
  DEFAULT_WEIGHTS,
} from "../lib/signalApi.js";

function t(name, fn) {
  fn();
  passed++;
  console.log("  ✓ " + name);
}
let passed = 0;

t("默认返回 6 个信号，count 正确", () => {
  const r = buildSignalApi();
  assert.equal(r.count, 6);
  assert.equal(r.signals.length, 6);
});
t("signals 按 probOfProfit 降序", () => {
  const r = buildSignalApi();
  for (let i = 1; i < r.signals.length; i++)
    assert.ok(r.signals[i - 1].probOfProfit >= r.signals[i].probOfProfit, "降序");
});
t("topWin = 首位信号", () => {
  const r = buildSignalApi();
  assert.equal(r.topWin.ticker, r.signals[0].ticker);
  assert.equal(r.topWin.probOfProfit, r.signals[0].probOfProfit);
});
t("每个信号含胜率/置信区间/假设/rationale", () => {
  const r = buildSignalApi();
  for (const s of r.signals) {
    assert.ok(s.probOfProfit >= 0 && s.probOfProfit <= 1, "probOfProfit 在 [0,1]");
    assert.equal(s.confidenceBand.length, 2, "95% 区间 2 端");
    assert.equal(typeof s.highWin, "boolean", "highWin 布尔");
    assert.ok(Array.isArray(s.assumptions) && s.assumptions.length >= 4, "假设清单");
    assert.ok(s.rationale && s.rationale.fundamental, "含 rationale(可解释)");
    assert.ok(s.score >= 0 && s.score <= 100, "score 是 0-100 尺度");
  }
});
t("avgProbOfProfit 在 [0,1]", () => {
  const r = buildSignalApi();
  assert.ok(r.avgProbOfProfit >= 0 && r.avgProbOfProfit <= 1);
});
t("确定性：相同 generatedAt → 相同输出", () => {
  const a = buildSignalApi(DEFAULT_UNIVERSE, DEFAULT_WEIGHTS, { generatedAt: "2026-01-01T00:00:00.000Z" });
  const b = buildSignalApi(DEFAULT_UNIVERSE, DEFAULT_WEIGHTS, { generatedAt: "2026-01-01T00:00:00.000Z" });
  assert.deepEqual(a.signals, b.signals);
});
t("dataMode 默认 estimated，可覆盖为 live", () => {
  assert.equal(buildSignalApi().dataMode, "estimated");
  assert.equal(buildSignalApi(undefined, undefined, { dataMode: "live" }).dataMode, "live");
});
t("空标的池 → count 0、topWin null、avg 0", () => {
  const r = buildSignalApi([], DEFAULT_WEIGHTS);
  assert.equal(r.count, 0);
  assert.equal(r.topWin, null);
  assert.equal(r.avgProbOfProfit, 0);
});
t("输出不泄密（无 api key / 凭据字段）", () => {
  const json = JSON.stringify(buildSignalApi());
  assert.ok(!/api[_-]?key|secret|token/i.test(json), "不应含密钥字段名");
});
t("含免责声明", () => {
  const r = buildSignalApi();
  assert.ok(/非投资建议/.test(r.disclaimer), "含免责");
});

console.log(`\n✅ signalApi: ${passed}/${passed} 通过`);
