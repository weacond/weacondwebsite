// tests/marketdata_real.test.mjs — lib/marketdata_real.js 单元测试
//
// 重点验证「优雅降级」设计：无密钥 / 上游失败时绝不臆造数据，
// 而是回退到带 live:false 标记的演示值；缺失/"-" 字段一律转 null（不编造）。
// 仅测降级分支（不触网）：无 apiKey、非法 symbol 都在网络请求前短路返回 mock。
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOverview, fetchFundamentals } from "../lib/marketdata_real.js";

test("parseOverview：raw 为 null / 非对象 → 默认形状（数值全 null，live:true）", () => {
  for (const raw of [null, undefined, 42, "x", []]) {
    const o = parseOverview("AAPL", raw);
    assert.equal(o.symbol, "AAPL");
    assert.equal(o.live, true);
    assert.equal(o.source, "alphaVantage");
    for (const k of ["name", "sector", "peRatio", "pbRatio", "roe", "marketCap", "dividendYield", "beta"]) {
      assert.equal(o[k], null, `${k} 应为 null (${JSON.stringify(raw)})`);
    }
  }
});

test("parseOverview：AV 字段映射 + 类型转换", () => {
  const o = parseOverview("AAPL", {
    PEFork: "15.5",
    PriceToBookRatio: "2.8",
    ROE: "0.22",
    MarketCapitalization: "3000000000000",
    DividendYield: "0.015",
    Beta: "1.2",
    Name: "Apple Inc",
    Sector: "Technology",
  });
  assert.equal(o.peRatio, 15.5);
  assert.equal(o.pbRatio, 2.8);
  assert.equal(o.roe, 0.22);
  assert.equal(o.marketCap, 3000000000000);
  assert.equal(o.dividendYield, 0.015);
  assert.equal(o.beta, 1.2);
  assert.equal(o.name, "Apple Inc");
  assert.equal(o.sector, "Technology");
});

test("parseOverview：'-' 空占位 / 空串 / 非数字 → null（绝不臆造）", () => {
  const o = parseOverview("AAPL", {
    PEFork: "-",
    ROE: null,
    Beta: "N/A",
    Name: "",
    Sector: "",
  });
  assert.equal(o.peRatio, null);
  assert.equal(o.roe, null);
  assert.equal(o.beta, null);
  assert.equal(o.name, null);
  assert.equal(o.sector, null);
});

test("fetchFundamentals：非法 symbol → 演示降级（live:false，不触网）", async () => {
  const r = await fetchFundamentals("AAPL!", undefined);
  assert.equal(r.live, false);
  assert.equal(r.source, "mock");
  assert.equal(r.symbol, "AAPL!");
  assert.ok(typeof r.peRatio === "number", "演示值应为确定的数值");
});

test("fetchFundamentals：合法 symbol 但无密钥 → 演示降级（不触网）", async () => {
  const r = await fetchFundamentals("AAPL", undefined);
  assert.equal(r.live, false);
  assert.equal(r.source, "mock");
  assert.equal(r.symbol, "AAPL");
});

test("fetchFundamentals：缺省 symbol → 归一为 SPY 后降级", async () => {
  const r = await fetchFundamentals(undefined, undefined);
  assert.equal(r.live, false);
  assert.equal(r.symbol, "SPY");
});
