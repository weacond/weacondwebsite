import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSignalHistory,
  summarizeHistory,
} from "../lib/signalHistory.js";

// ---------- buildSignalHistory ----------
test("buildSignalHistory: 同种子可复现（ret/symbol 序列一致）", () => {
  const a = buildSignalHistory(30, 42);
  const b = buildSignalHistory(30, 42);
  assert.equal(a.length, b.length);
  assert.deepEqual(a.map((x) => x.ret), b.map((x) => x.ret));
  assert.deepEqual(a.map((x) => x.symbol), b.map((x) => x.symbol));
  assert.deepEqual(a.map((x) => x.type), b.map((x) => x.type));
});

test("buildSignalHistory: 按日期新→旧排序，且字段完整", () => {
  const h = buildSignalHistory(30, 42);
  assert.ok(h.length > 0, "30 日应有信号");
  // 新→旧：首条日期 >= 末条日期
  assert.ok(h[0].date >= h[h.length - 1].date);
  for (const s of h) {
    for (const f of ["id", "date", "symbol", "name", "type", "dir", "strength", "ret", "win", "holdDays"]) {
      assert.ok(f in s, `缺少字段 ${f}`);
    }
    assert.equal(typeof s.win, "boolean");
    assert.ok(s.strength >= 50 && s.strength <= 98, "strength 应在 50-98");
  }
});

test("buildSignalHistory: 回溯 0 天 → 空数组", () => {
  assert.deepEqual(buildSignalHistory(0, 42), []);
});

// ---------- summarizeHistory ----------
test("summarizeHistory: 空数组 → 全 0 / best null", () => {
  assert.deepEqual(summarizeHistory([]), { count: 0, hitRate: 0, avgRet: 0, best: null });
});

test("summarizeHistory: 已知数据 → 数量/命中率/平均收益/最佳一笔", () => {
  const h = [
    { ret: 10, win: true },
    { ret: -5, win: false },
  ];
  const s = summarizeHistory(h);
  assert.equal(s.count, 2);
  assert.equal(s.hitRate, 0.5);
  assert.equal(s.avgRet, 2.5);
  assert.equal(s.best.ret, 10);
});