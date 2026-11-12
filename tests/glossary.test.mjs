// tests/glossary.test.mjs — lib/glossary.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GLOSSARY,
  GLOSSARY_CATEGORIES,
  groupedGlossary,
  allRelatedHrefs,
  getGlossaryTerm,
} from "../lib/glossary.js";

test("每条概念字段完整，category 合法，related 为合法 href 或 null", () => {
  for (const t of GLOSSARY) {
    assert.ok(t.id && t.term && t.termEn, `${t.id} has terms`);
    assert.ok(t.def && t.defEn, `${t.id} has defs`);
    assert.ok(GLOSSARY_CATEGORIES[t.category], `${t.id} category valid`);
    assert.ok(t.related === null || (typeof t.related === "string" && t.related.startsWith("/")), `${t.id} related`);
  }
});

test("id 唯一；分组覆盖全部概念且按 order 排序", () => {
  const ids = GLOSSARY.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  const groups = groupedGlossary();
  const total = groups.reduce((s, g) => s + g.terms.length, 0);
  assert.equal(total, GLOSSARY.length);
  const orders = groups.map((g) => GLOSSARY_CATEGORIES[g.category].order);
  for (let i = 1; i < orders.length; i++) assert.ok(orders[i] > orders[i - 1]);
  for (const g of groups) assert.ok(g.terms.length > 0);
});

test("相关 href 均指向已知工具页", () => {
  const known = ["/risk", "/performance", "/correlation", "/portfolio", "/montecarlo", "/options", "/position-size", "/r-multiple", "/leverage", "/compound", "/backtest", "/stresstest", "/atr-stop", "/excursion", "/breakeven", "/risk-ruin", "/real-return", "/fair-value", "/levered-etf", "/rebalance", "/tax-loss", "/fx-pip", "/bond", "/tax-drag", "/margin", "/expectancy", "/options-payoff", "/ytm", "/loan", "/fx-cross", "/drip", "/staking", "/portfolio-beta", "/annuity", "/goal-solver", "/drawdown-sizing", "/r-position", "/real-after-tax", "/prob-return", "/fib-time"];
  for (const h of allRelatedHrefs()) {
    assert.ok(known.includes(h), `unknown href ${h}`);
  }
  assert.ok(allRelatedHrefs().length > 0);
});

test("getGlossaryTerm: 已知返回、未知抛错", () => {
  assert.equal(getGlossaryTerm("sharpe").related, "/risk");
  assert.throws(() => getGlossaryTerm("nope"), /Unknown/);
});

test("覆盖 5 个类别", () => {
  const cats = new Set(GLOSSARY.map((t) => t.category));
  for (const c of ["risk", "returns", "portfolio", "options", "position"]) assert.ok(cats.has(c), `category ${c} present`);
});
