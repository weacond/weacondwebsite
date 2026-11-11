// 斐波那契回撤/扩展测试 — lib/fibonacci.js
// 取 高=120, 低=100 → range=20, min=100, max=120，各档可手算核对。
import { test } from "node:test";
import assert from "node:assert/strict";
import { retracementLevels, extensionLevels } from "../lib/fibonacci.js";

const H = 120;
const L = 100;
const RANGE = 20;

test("retracementLevels: 6 档 0.236~1.0，落在 [min,max] 内且单调", () => {
  const r = retracementLevels(H, L);
  assert.equal(r.min, 100);
  assert.equal(r.max, 120);
  assert.equal(r.range, 20);
  assert.equal(r.levels.length, 6);
  // 手算：0.236→104.72, 0.5→110, 1.0→120
  assert.ok(Math.abs(r.levels[0].level - (100 + 0.236 * 20)) < 1e-9);
  assert.ok(Math.abs(r.levels[2].level - 110) < 1e-9, "0.5 回撤=中点");
  assert.ok(Math.abs(r.levels[5].level - 120) < 1e-9, "1.0 回撤=max");
  // 单调且全部落在区间内
  for (let i = 1; i < r.levels.length; i++) {
    assert.ok(r.levels[i].level >= r.levels[i - 1].level, "单调不减");
    assert.ok(r.levels[i].level >= 100 && r.levels[i].level <= 120, "在 [min,max] 内");
  }
});

test("retracementLevels: 方向无关（高/低互换结果一致）", () => {
  const a = retracementLevels(H, L);
  const b = retracementLevels(L, H);
  assert.deepEqual(a.levels, b.levels, "回撤档位与输入顺序无关");
});

test("retracementLevels: range=0 → 各档=min；非有限数 → null", () => {
  const flat = retracementLevels(100, 100);
  assert.equal(flat.range, 0);
  assert.ok(flat.levels.every((x) => x.level === 100), "range=0 时各档等于 min");
  assert.equal(retracementLevels(NaN, 100), null);
  assert.equal(retracementLevels(100, undefined), null);
});

test("extensionLevels: up 突破 max，down 跌破 min", () => {
  const up = extensionLevels(H, L, "up");
  assert.ok(up.levels.every((x) => x.level > 120), "up 扩展 > max");
  assert.ok(Math.abs(up.levels[0].level - (120 + 0.382 * 20)) < 1e-9, "up 0.382=max+0.382·range");
  assert.ok(Math.abs(up.levels[3].level - (120 + 1.618 * 20)) < 1e-9, "up 1.618");

  const down = extensionLevels(H, L, "down");
  assert.ok(down.levels.every((x) => x.level < 100), "down 扩展 < min");
  assert.ok(Math.abs(down.levels[3].level - (100 - 1.618 * 20)) < 1e-9, "down 1.618=min−1.618·range");
});

test("extensionLevels: 退化 → null", () => {
  assert.equal(extensionLevels(NaN, 100), null);
  assert.equal(extensionLevels(100, 100, "up").range, 0, "range=0 仍返回（各档=base）");
});
