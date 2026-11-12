// tests/rMultiple.test.mjs — R 倍数框架
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validRMultiple, rMultiple, expectancyFromR, rGrade,
  rMultipleInsight, R_PRESETS, getRPreset,
} from "../lib/rMultiple.js";

test("rMultiple：多头符号 R", () => {
  // 入场 100、止损 95（1R=5）、现价 110 → +2R
  assert.ok(Math.abs(rMultiple(100, 95, 110, "long") - 2) < 1e-12);
  // 现价 97 → −0.6R（跌破入场）
  assert.ok(Math.abs(rMultiple(100, 95, 97, "long") - (-0.6)) < 1e-12);
  // 现价 102.5 → +0.5R
  assert.ok(Math.abs(rMultiple(100, 95, 102.5, "long") - 0.5) < 1e-12);
  // 现价 100（=入场）→ 0R
  assert.ok(Math.abs(rMultiple(100, 95, 100, "long") - 0) < 1e-12);
  // 现价 95（=止损）→ −1R
  assert.ok(Math.abs(rMultiple(100, 95, 95, "long") - (-1)) < 1e-12);
});

test("rMultiple：空头符号取反", () => {
  // 入场 100、止损 105（1R=5）、现价 90 → 空头 +2R
  assert.ok(Math.abs(rMultiple(100, 105, 90, "short") - 2) < 1e-12);
  // 现价 110 → 空头 −2R
  assert.ok(Math.abs(rMultiple(100, 105, 110, "short") - (-2)) < 1e-12);
});

test("rMultiple：确定性 + 非法抛错", () => {
  assert.equal(rMultiple(100, 95, 110), rMultiple(100, 95, 110));
  assert.throws(() => rMultiple(100, 100, 110)); // entry===stop
  assert.throws(() => rMultiple(NaN, 95, 110));
  assert.throws(() => rMultiple(100, 95, Infinity));
});

test("validRMultiple", () => {
  assert.equal(validRMultiple(100, 95, 110), true);
  assert.equal(validRMultiple(100, 100, 110), false);
  assert.equal(validRMultiple(NaN, 95, 110), false);
});

test("expectancyFromR：R 口径期望", () => {
  // 胜率 0.6，winR=2，lossR=1 → 0.6·2 − 0.4·1 = 0.8
  assert.ok(Math.abs(expectancyFromR(0.6, 2, 1) - 0.8) < 1e-12);
  // 盈亏平衡：0.5·1 − 0.5·1 = 0
  assert.ok(Math.abs(expectancyFromR(0.5, 1, 1)) < 1e-12);
  // 负期望
  assert.ok(expectancyFromR(0.3, 1, 2) < 0);
  assert.throws(() => expectancyFromR(1.5, 2, 1)); // 胜率越界
  assert.throws(() => expectancyFromR(0.6, 0, 1)); // winR≤0
  assert.throws(() => expectancyFromR(0.6, 2, -1)); // lossR≤0
});

test("rGrade：分级 + 中英标签", () => {
  assert.equal(rGrade(-2).grade, "loss");
  assert.equal(rGrade(-0.5).grade, "smallLoss");
  assert.equal(rGrade(0).grade, "breakEven");
  assert.equal(rGrade(0.5).grade, "smallWin");
  assert.equal(rGrade(2).grade, "win");
  assert.equal(rGrade(5).grade, "bigWin");
  assert.equal(rGrade(2).labelEn, "Win");
  assert.equal(rGrade(-2).label, "止损/大亏");
  assert.throws(() => rGrade(NaN));
});

test("rMultipleInsight：返回字符串，文案随 R 变", () => {
  assert.ok(rMultipleInsight(100, 95, 130).includes("大盈") || rMultipleInsight(100, 95, 130).includes("移动止损"));
  assert.ok(rMultipleInsight(100, 95, 110).includes("1R"));
  assert.ok(rMultipleInsight(100, 95, 80).includes("止损"));
  assert.ok(rMultipleInsight(100, 100, 110).includes("不同")); // 非法
});

test("R_PRESETS + getRPreset", () => {
  assert.equal(R_PRESETS.length, 5);
  for (const p of R_PRESETS) {
    assert.ok(validRMultiple(p.entry, p.stop, p.price));
    assert.ok(typeof p.label === "string");
  }
  assert.equal(getRPreset("shortWin").side, "short");
  assert.throws(() => getRPreset("nope"));
});
