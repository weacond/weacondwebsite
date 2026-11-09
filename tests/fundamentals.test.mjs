// 基本面数据接入测试（Alpha Vantage OVERVIEW）。
// 遵循项目测试哲学：重测纯函数 parseOverview 与降级行为；网络路径用局部
// globalThis.fetch 覆盖并逐例复位，避免污染其它测试。
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchFundamentals, parseOverview } from "../lib/marketdata_real.js";

// 一份贴近 Alpha Vantage OVERVIEW 的样例响应（含字符串数值 + "-" 空占位）
const AV_SAMPLE = {
  Symbol: "AAPL",
  Name: "Apple Inc.",
  Sector: "Technology",
  PEFork: "30.5",
  PriceToBookRatio: "50.2",
  ROE: "0.148",
  MarketCapitalization: "3500000000000",
  DividendYield: "0.0065",
  Beta: "1.28",
};

// ---------- parseOverview（纯函数） ----------

test("parseOverview: 完整样本 → 字段正确映射并转为数字", () => {
  const f = parseOverview("AAPL", AV_SAMPLE);
  assert.equal(f.symbol, "AAPL");
  assert.equal(f.name, "Apple Inc.");
  assert.equal(f.sector, "Technology");
  assert.equal(f.peRatio, 30.5);
  assert.equal(f.pbRatio, 50.2);
  assert.equal(f.roe, 0.148);
  assert.equal(f.marketCap, 3500000000000);
  assert.equal(f.dividendYield, 0.0065);
  assert.equal(f.beta, 1.28);
  assert.equal(f.live, true);
  assert.equal(f.source, "alphaVantage");
});

test("parseOverview: 缺失 / '-' 空占位 → 对应字段为 null（绝不臆造）", () => {
  const f = parseOverview("XYZ", { Symbol: "XYZ", PEFork: "-", ROE: "0.1" });
  assert.equal(f.peRatio, null); // "-" → null
  assert.equal(f.pbRatio, null); // 缺失 → null
  assert.equal(f.roe, 0.1); // 唯一有效值
  assert.equal(f.live, true);
});

test("parseOverview: 非对象 / null 输入 → 全 null 形状，仍带 live:true", () => {
  const f1 = parseOverview("SPY", null);
  assert.equal(f1.peRatio, null);
  assert.equal(f1.marketCap, null);
  assert.equal(f1.live, true);
  assert.equal(f1.source, "alphaVantage");
  const f2 = parseOverview("SPY", 42);
  assert.equal(f2.peRatio, null);
});

test("parseOverview: 非法数值（非数字字符串）→ null", () => {
  const f = parseOverview("SPY", { PEFork: "N/A", Beta: "abc" });
  assert.equal(f.peRatio, null);
  assert.equal(f.beta, null);
});

// ---------- fetchFundamentals 降级行为（无网络） ----------

test("fetchFundamentals: 无 apiKey → 返回演示数据（live:false, source:mock）", async () => {
  const f = await fetchFundamentals("AAPL");
  assert.equal(f.live, false);
  assert.equal(f.source, "mock");
  assert.equal(f.peRatio, 15.5);
  assert.equal(f.symbol, "AAPL");
});

test("fetchFundamentals: 非法标的 → 直接降级，不发起网络", async () => {
  let called = false;
  const orig = globalThis.fetch;
  globalThis.fetch = async () => { called = true; return { ok: true, status: 200, json: async () => AV_SAMPLE }; };
  try {
    const f = await fetchFundamentals("bad symbol!");
    assert.equal(f.live, false); // 降级到 mock
    assert.equal(called, false); // 未触发 fetch
  } finally {
    globalThis.fetch = orig;
  }
});

test("fetchFundamentals: 标的自动转大写", async () => {
  const f = await fetchFundamentals("aapl");
  assert.equal(f.symbol, "AAPL");
});

// ---------- fetchFundamentals 网络路径（局部 fetch 覆盖 + 复位） ----------

test("fetchFundamentals: 有密钥 + 正常响应 → 返回真实数据（live:true）", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    assert.match(url, /function=OVERVIEW/);
    assert.match(url, /symbol=AAPL/);
    assert.match(url, /apikey=KEY123/);
    return { ok: true, status: 200, json: async () => AV_SAMPLE };
  };
  try {
    const f = await fetchFundamentals("AAPL", "KEY123");
    assert.equal(f.live, true);
    assert.equal(f.source, "alphaVantage");
    assert.equal(f.peRatio, 30.5);
    assert.equal(f.name, "Apple Inc.");
  } finally {
    globalThis.fetch = orig;
  }
});

test("fetchFundamentals: 上游 reject → 优雅降级到演示数据", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("network down"); };
  try {
    const f = await fetchFundamentals("AAPL", "KEY123");
    assert.equal(f.live, false);
    assert.equal(f.source, "mock");
  } finally {
    globalThis.fetch = orig;
  }
});

test("fetchFundamentals: Alpha Vantage 限流信封 → 降级到演示数据", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ Note: "API calls exhausted", "1 min limit": "5" }) });
  try {
    const f = await fetchFundamentals("AAPL", "KEY123");
    assert.equal(f.live, false);
    assert.equal(f.source, "mock");
  } finally {
    globalThis.fetch = orig;
  }
});

test("fetchFundamentals: 关键字段全空 → 降级到演示数据（避免“真但无用”）", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ Symbol: "AAPL", PEFork: "-", MarketCapitalization: "-", ROE: "-" }) });
  try {
    const f = await fetchFundamentals("AAPL", "KEY123");
    assert.equal(f.live, false);
    assert.equal(f.source, "mock");
  } finally {
    globalThis.fetch = orig;
  }
});
