import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPutScreener,
  DEFAULT_PUT_UNIVERSE,
} from "../lib/putseller.js";

// ---------- 基本行为 ----------
test("buildPutScreener: 默认标的池非空且仅返回通过筛选的标的", () => {
  const rows = buildPutScreener();
  assert.ok(rows.length > 0, "应有通过筛选的结果");
  // 通过的：NVDA(78,82) MSFT(55,78) QQQ(52,70) BABA(65,68)
  const tickers = rows.map((r) => r.ticker).sort();
  assert.deepEqual(tickers, ["BABA", "MSFT", "NVDA", "QQQ"]);
  // 被过滤的不应出现：SPY/AAPL(IV Rank<50)、TSLA/AMD(基本面<60)
  for (const t of ["SPY", "AAPL", "TSLA", "AMD"]) {
    assert.ok(!tickers.includes(t), `${t} 应被过滤掉`);
  }
});

test("buildPutScreener: 结果按综合分降序，且字段完整", () => {
  const rows = buildPutScreener();
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i - 1].score >= rows[i].score, "应按 score 降序");
  }
  for (const r of rows) {
    for (const key of ["ticker", "name", "spot", "strike", "expiryDays", "ivRank", "premium", "score", "probITM", "theta", "delta"]) {
      assert.ok(key in r, `结果应包含 ${key}`);
    }
    assert.ok(r.score >= 0 && r.score <= 100, "score 应在 0-100");
    assert.ok(r.ivRank > 50, "通过的标的 IV Rank 应 > 50");
    assert.ok(r.premium > 0, "卖 Put 权利金应为正");
    // 虚值 Put：到期实值概率应 < 0.5
    assert.ok(r.probITM >= 0 && r.probITM < 0.5, "虚值 Put probITM 应 < 0.5");
    assert.ok(r.delta < 0 && r.delta > -1, "Put delta 应在 (-1,0)");
  }
});

test("buildPutScreener: 全不通过 → 空数组", () => {
  const universe = [
    { ticker: "AAA", spot: 100, iv: 0.2, ivRank: 30, fundamentalScore: 50 }, // 两项都不达标
  ];
  assert.deepEqual(buildPutScreener(universe), []);
});

test("buildPutScreener: 空标的池 → 空数组", () => {
  assert.deepEqual(buildPutScreener([]), []);
});

test("buildPutScreener: 自定义到期日改变结果（30d vs 90d）", () => {
  const a = buildPutScreener(DEFAULT_PUT_UNIVERSE, { expiryDays: 30 });
  const b = buildPutScreener(DEFAULT_PUT_UNIVERSE, { expiryDays: 90 });
  assert.ok(a.length === b.length, "通过的标的集合应一致");
  // 不同到期日 → 权利金/theta 不同
  const aNVDA = a.find((r) => r.ticker === "NVDA");
  const bNVDA = b.find((r) => r.ticker === "NVDA");
  assert.notEqual(aNVDA.premium, bNVDA.premium, "不同到期日权利金应不同");
  assert.equal(aNVDA.expiryDays, 30);
  assert.equal(bNVDA.expiryDays, 90);
});

test("buildPutScreener: 确定性（同输入同输出）", () => {
  const a = JSON.stringify(buildPutScreener());
  const b = JSON.stringify(buildPutScreener());
  assert.equal(a, b);
});

test("buildPutScreener: 含盈利概率与盈亏平衡（卖方口径）", () => {
  const rows = buildPutScreener();
  assert.ok(rows.length > 0, "应有结果");
  for (const r of rows) {
    // 盈亏平衡 = 行权价 − 权利金
    assert.ok(typeof r.breakeven === "number", "breakeven 应为数值");
    assert.ok(Math.abs(r.breakeven - (r.strike - r.premium)) < 0.01, "breakeven = strike − premium");
    // 盈利概率 ∈ [0,1]
    assert.ok(typeof r.probProfit === "number" && r.probProfit >= 0 && r.probProfit <= 1, "probProfit ∈ [0,1]");
    // 盈利概率应显著高于实值概率（虚值 Put 大概率到期归零）
    assert.ok(r.probProfit > r.probITM, "盈利概率应高于实值概率");
  }
});
