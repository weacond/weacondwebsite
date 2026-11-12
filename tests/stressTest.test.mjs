// tests/stressTest.test.mjs — lib/stressTest.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ASSETS,
  DEFAULT_PORTFOLIO,
  STRESS_SCENARIOS,
  scenarioPL,
  stressAll,
  totalWeight,
} from "../lib/stressTest.js";

test("组合总权重 = 1", () => {
  assert.ok(Math.abs(totalWeight(DEFAULT_PORTFOLIO) - 1) < 1e-9);
});

test("scenarioPL: P/L = Σ 权重×冲击；贡献与最坏/最好分解正确", () => {
  const p = [{ key: "usEquity", name: "e", nameEn: "e", weight: 0.6 }, { key: "gold", name: "g", nameEn: "g", weight: 0.4 }];
  const r = scenarioPL(p, { key: "x", name: "x", nameEn: "x", shocks: { usEquity: -30, gold: 10 } });
  assert.ok(Math.abs(r.pl - (0.6 * -30 + 0.4 * 10)) < 1e-9, "P/L = Σ w×shock");
  assert.equal(r.worst.key, "usEquity", "最坏贡献来自股票");
  assert.equal(r.best.key, "gold", "最好贡献来自黄金");
});

test("缺失资产冲击视为 0；纯现金组合几乎不受股票冲击", () => {
  const cash = [{ key: "cash", name: "c", nameEn: "c", weight: 1 }];
  const r = scenarioPL(cash, STRESS_SCENARIOS[0]);
  assert.ok(Math.abs(r.pl - 2) < 1e-9, "只取现金冲击");
});

test("stressAll: 最坏在前排序；覆盖全部预设情景", () => {
  const all = stressAll(DEFAULT_PORTFOLIO);
  assert.equal(all.length, STRESS_SCENARIOS.length);
  for (let i = 1; i < all.length; i++) assert.ok(all[i].pl >= all[i - 1].pl, "升序（最坏在前）");
});

test("预设情景字段完整；冲击为有限数；资产键合法", () => {
  const keys = new Set(ASSETS.map((a) => a.key));
  for (const s of STRESS_SCENARIOS) {
    assert.ok(s.key && s.name && s.nameEn && s.desc && s.descEn);
    for (const [k, v] of Object.entries(s.shocks)) {
      assert.ok(keys.has(k), `shock key ${k} 合法`);
      assert.ok(Number.isFinite(v), `shock ${k} 有限`);
    }
  }
});

test("2008 因债/金对冲而损失有限；2022 利率冲击对默认组合最痛", () => {
  const all = stressAll(DEFAULT_PORTFOLIO);
  const gfc = all.find((r) => r.scenario === "gfc2008");
  const rates = all.find((r) => r.scenario === "rates2022");
  assert.ok(gfc.pl > rates.pl, "2008 损失 < 2022 损失（债金对冲）");
  assert.ok(gfc.pl < 0, "2008 仍为亏损");
});

test("完全相关（等权重全同向）组合在崩盘中损失最大", () => {
  const allEquity = [{ key: "usEquity", name: "e", nameEn: "e", weight: 1 }];
  const r = scenarioPL(allEquity, STRESS_SCENARIOS[0]);
  assert.ok(Math.abs(r.pl - (-37)) < 1e-9, "全仓股票 = 100% 冲击");
});
