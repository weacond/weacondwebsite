// lib/mcp/protocol.js — MCP over 无状态 JSON-RPC 2.0 / HTTP
//
// 遵循 2026 状态化 MCP 规范：移除 initialize/session 握手与 Mcp-Session-Id，
// 每个请求在 _meta 携带 io.modelcontextprotocol/* 元数据，跨调用状态用工具入参传递。
// 本实现为「无状态 HTTP 请求/响应」，Vercel 与 Cloudflare Edge 双运行时皆可。
//
// 设计：纯函数、无副作用、无外部依赖，便于单元测试与跨运行时移植。

// JSON-RPC 2.0 标准错误码 + MCP 自定义码（-32000..-32099 区间）
export const RPC = {
  PARSE_ERROR: -32700, // 请求体非合法 JSON
  INVALID_REQUEST: -32600, // 不满足 JSON-RPC 2.0 结构
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // MCP 自定义
  UNSUPPORTED_PROTOCOL_VERSION: -32000,
  AUTH_REQUIRED: -32001,
  RATE_LIMITED: -32002,
  UNKNOWN_TOOL: -32003,
};

// 服务器对外声明的协议版本（可被 env MCP_PROTOCOL_VERSION 覆盖）；
// 2026-07-28 为当前主线版本。版本协商对客户端采取宽松策略（不硬拒）。
export const PROTOCOL_VERSION = "2026-07-28";

// 服务器标识（出现在 initialize 结果与结果 _meta）
export const SERVER_INFO = { name: "weacond-mcp", version: "1.0.0" };

// 成功结果：{ jsonrpc: "2.0", id, result }
export function ok(id, result) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

// 错误结果：{ jsonrpc: "2.0", id, error: { code, message, data? } }
export function fail(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: "2.0", id: id ?? null, error };
}

// 是否为合法的 JSON-RPC 2.0 请求对象
export function isRequest(m) {
  return m !== null && typeof m === "object" && m.jsonrpc === "2.0" && typeof m.method === "string";
}

// 客户端在 params._meta 或 params 顶层携带的协议版本（2026 状态化规范）
export function clientProtocolVersion(params) {
  if (!params || typeof params !== "object") return null;
  const meta = params._meta && typeof params._meta === "object" ? params._meta : null;
  const v = meta && meta["io.modelcontextprotocol/protocolVersion"];
  const fallback = params.protocolVersion;
  const chosen = v ?? fallback;
  return typeof chosen === "string" ? chosen : null;
}
