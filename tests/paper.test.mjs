import { test } from "node:test";
import assert from "node:assert/strict";

// 模拟浏览器环境：localStorage + window，驱动 lib/paper.js 的持久化路径。
// 必须在 import paper.js 之前注入 global.window，使模块顶层的 storage 监听注册成功。
const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
global.window = { localStorage, addEventListener: () => {} };
global.localStorage = localStorage;

const POS_KEY = "weacond_paper_positions";
const TRADES_KEY = "weacond_paper_trades";
const { openPosition, closePosition, markPositions } = await import("../lib/paper.js");

// 关键：readPositions() 在 localStorage 为空时回退到演示持仓，
// 因此需先把两个 key 显式置为 "[]"，让 read* 返回空数组而非默认演示数据。
const reset = () => {
  store.set(POS_KEY, "[]");
  store.set(TRADES_KEY, "[]");
};

test("openPosition + closePosition: 浮盈 10 股/10 元 → 平仓盈亏 100 且标记为胜", () => {
  reset();
  openPosition({ ticker: "test", name: "Test Corp", qty: 10, entry: 100, current: 110 });
  const positions = JSON.parse(localStorage.getItem(POS_KEY) || "[]");
  assert.equal(positions.length, 1);
  assert.equal(positions[0].ticker, "TEST"); // 标的归一为大写
  const id = positions[0].id;

  closePosition(id);
  const trades = JSON.parse(localStorage.getItem(TRADES_KEY) || "[]");
  assert.equal(trades.length, 1);
  assert.equal(trades[0].pnl, (110 - 100) * 10); // 100
  assert.equal(trades[0].win, true);
  // 平仓后持仓被移除
  assert.equal(JSON.parse(localStorage.getItem(POS_KEY) || "[]").length, 0);
});

test("openPosition: 非法参数被忽略（空标的 / 非正数量 / 非正价格）", () => {
  reset();
  openPosition({ ticker: "", qty: 0, entry: 0 });
  assert.equal(JSON.parse(localStorage.getItem(POS_KEY) || "[]").length, 0);
  openPosition({ ticker: "abc", qty: -5, entry: 100 });
  assert.equal(JSON.parse(localStorage.getItem(POS_KEY) || "[]").length, 0);
  openPosition({ ticker: "def", qty: 1, entry: -10 });
  assert.equal(JSON.parse(localStorage.getItem(POS_KEY) || "[]").length, 0);
});

test("markPositions: 用最新价（大写标的）更新持仓现价", () => {
  reset();
  openPosition({ ticker: "xyz", name: "X", qty: 4, entry: 50, current: 50 });
  markPositions({ XYZ: 60 });
  const after = JSON.parse(localStorage.getItem(POS_KEY) || "[]");
  assert.equal(after[0].current, 60);
});

test("closePosition: 未知 id 不产生交易", () => {
  reset();
  closePosition("does-not-exist");
  assert.equal(JSON.parse(localStorage.getItem(TRADES_KEY) || "[]").length, 0);
});