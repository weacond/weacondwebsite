// tests/mcpTools.test.mjs — MCP 工具注册表与 callTool 封装
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TOOLS,
  getTool,
  listToolDefs,
  callTool,
} from "../lib/mcp/tools.js";

test("注册 6 个高风险意图工具，公开定义含 inputSchema 且无 run", () => {
  assert.equal(TOOLS.length, 6);
  const names = TOOLS.map((t) => t.name);
  for (const n of ["kelly", "atr_stop", "risk_of_ruin", "risk_budget", "drawdown_sizing", "leverage"]) {
    assert.ok(names.includes(n), `缺少工具 ${n}`);
  }
  const defs = listToolDefs();
  assert.equal(defs.length, 6);
  for (const d of defs) {
    assert.ok(d.name && d.title && d.description);
    assert.ok(d.inputSchema && d.inputSchema.type === "object");
    assert.equal("run" in d, false); // 公开定义不含 run
  }
});

test("getTool 取到工具且带 run", () => {
  assert.equal(getTool("kelly").name, "kelly");
  assert.equal(typeof getTool("kelly").run, "function");
  assert.equal(getTool("nope"), undefined);
});

test("callTool kelly 计算正确（f* = p − q/b）", () => {
  const r = callTool("kelly", { winRate: 0.55, odds: 1 });
  assert.equal(r.isError, false);
  assert.ok(Array.isArray(r.content) && r.content[0].type === "text");
  assert.ok(Math.abs(r.structuredContent.fStar - 0.1) < 1e-9); // 0.55 − 0.45/1 = 0.1
});

test("callTool kelly 负期望给出负 f*（不下注信号），仍为成功调用", () => {
  const r = callTool("kelly", { winRate: 0.4, odds: 1 });
  assert.equal(r.isError, false);
  assert.ok(r.structuredContent.fStar <= 0);
});

test("callTool 入参非法（越界/缺字段/未知字段）→ isError", () => {
  assert.equal(callTool("kelly", { winRate: 1.5, odds: 1 }).isError, true); // 越界
  assert.equal(callTool("kelly", { odds: 1 }).isError, true); // 缺 winRate
  assert.equal(callTool("kelly", { winRate: 0.5, odds: 1, bogus: 1 }).isError, true); // 未知字段
  assert.equal(callTool("kelly", { winRate: 0.5, odds: 0 }).isError, true); // exclusiveMinimum
});

test("callTool 未知工具 → unknown_tool", () => {
  const r = callTool("does_not_exist", {});
  assert.equal(r.isError, true);
  assert.equal(r.structuredContent.error, "unknown_tool");
});

test("callTool leverage 复合视图（权益变动与分级）", () => {
  const r = callTool("leverage", { leverage: 10, movePct: 5, side: "long" });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.equityPct, 50); // 5% × 10× = 50%
  assert.equal(r.structuredContent.band, "extreme");
  assert.ok(Math.abs(r.structuredContent.liquidationMovePct - 10) < 1e-9); // 100/10
});

test("callTool risk_of_ruin 无盈利目标 → 破产概率 1（winRate 为百分数）", () => {
  const r = callTool("risk_of_ruin", { winRate: 50, rr: 0, bankrollR: 10 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.pRuin, 1);
});

test("callTool atr_stop 合法入参产出结构化结果", () => {
  const r = callTool("atr_stop", { account: 10000, riskPct: 1, side: "long", entry: 100, atrVal: 2 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
});
