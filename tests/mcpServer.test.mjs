// tests/mcpServer.test.mjs — MCP 请求分发（纯函数）
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleMcpRequest } from "../lib/mcp/server.js";
import { RPC, PROTOCOL_VERSION } from "../lib/mcp/protocol.js";

test("initialize 返回协议版本/能力/服务器信息", () => {
  const r = handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
  assert.equal(r.result.protocolVersion, PROTOCOL_VERSION);
  assert.deepEqual(r.result.capabilities, { tools: { listChanged: false } });
  assert.ok(r.result.serverInfo.name);
});

test("tools/list 返回 45 个工具定义，确定性顺序", () => {
  const r = handleMcpRequest({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.equal(r.result.tools.length, 45);
  assert.ok(r.result.tools[0].inputSchema);
  assert.equal(r.result.resultType, "complete");
  // 顺序稳定
  const a = handleMcpRequest({ jsonrpc: "2.0", id: 3, method: "tools/list" }).result.tools.map((t) => t.name);
  const b = handleMcpRequest({ jsonrpc: "2.0", id: 4, method: "tools/list" }).result.tools.map((t) => t.name);
  assert.deepEqual(a, b);
});

test("tools/call kelly 成功产出 content + structuredContent", () => {
  const r = handleMcpRequest({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "kelly", arguments: { winRate: 0.55, odds: 1 } },
  });
  assert.ok(Array.isArray(r.result.content));
  assert.equal(r.result.content[0].type, "text");
  assert.ok(Math.abs(r.result.structuredContent.fStar - 0.1) < 1e-9);
});

test("tools/call 缺 name → INVALID_PARAMS", () => {
  const r = handleMcpRequest({ jsonrpc: "2.0", id: 6, method: "tools/call", params: {} });
  assert.equal(r.error.code, RPC.INVALID_PARAMS);
});

test("未知方法（带 id）→ METHOD_NOT_FOUND", () => {
  const r = handleMcpRequest({ jsonrpc: "2.0", id: 7, method: "bogus" });
  assert.equal(r.error.code, RPC.METHOD_NOT_FOUND);
});

test("通知（无 id）→ null 响应", () => {
  const r = handleMcpRequest({ jsonrpc: "2.0", method: "notifications/initialized" });
  assert.equal(r, null);
});

test("非法 JSON-RPC 请求 → INVALID_REQUEST", () => {
  const r = handleMcpRequest({ id: 8, method: "ping" });
  assert.equal(r.error.code, RPC.INVALID_REQUEST);
});

test("批量请求返回响应数组（成功+错误混合）", () => {
  const batch = [
    { jsonrpc: "2.0", id: 1, method: "ping" },
    { jsonrpc: "2.0", id: 2, method: "nope" },
  ];
  const out = handleMcpRequest(batch);
  assert.ok(Array.isArray(out));
  assert.equal(out.length, 2);
  assert.deepEqual(out[0].result, {});
  assert.equal(out[1].error.code, RPC.METHOD_NOT_FOUND);
});

test("ctx.protocolVersion 可覆盖默认版本", () => {
  const r = handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "initialize" }, { protocolVersion: "2025-03-26" });
  assert.equal(r.result.protocolVersion, "2025-03-26");
});
