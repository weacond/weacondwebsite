// lib/mcp/server.js — MCP 请求分发（纯函数，可测试）
//
// 把一条 JSON-RPC 2.0 请求（对象或批量数组）分发为对应的结果/错误/通知响应。
// 支持方法：initialize、ping、tools/list、tools/call、通知（无 id → null 响应）。
// 无状态：不持有会话；跨调用状态由调用方在入参中传递（2026 规范）。

import { RPC, PROTOCOL_VERSION, SERVER_INFO, ok, fail, isRequest } from "./protocol.js";
import { listToolDefs, callTool } from "./tools.js";

/**
 * 处理一条（或一批）MCP 请求。
 * @param {object|Array} request JSON-RPC 请求对象或批量数组
 * @param {{protocolVersion?:string}} [ctx] 上下文（协议版本覆盖等）
 * @returns {object|null|Array} 结果/错误对象；通知返回 null；批量返回数组
 */
export function handleMcpRequest(request, ctx = {}) {
  if (Array.isArray(request)) return request.map((m) => handleSingle(m, ctx));
  return handleSingle(request, ctx);
}

function handleSingle(request, ctx) {
  if (!isRequest(request)) {
    const id =
      request && typeof request === "object" && "id" in request ? request.id : null;
    return fail(id, RPC.INVALID_REQUEST, "不是合法的 JSON-RPC 2.0 请求");
  }

  const { id, method, params } = request;
  const isNotification = id === undefined || id === null;

  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion: (ctx && ctx.protocolVersion) || PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });

    case "ping":
      return ok(id, {});

    case "tools/list":
      return ok(id, {
        resultType: "complete",
        tools: listToolDefs(),
        cacheScope: "public",
        ttlMs: 300000,
      });

    case "tools/call": {
      const name = params && params.name;
      if (typeof name !== "string") {
        return fail(id, RPC.INVALID_PARAMS, "tools/call 需要 params.name（工具名）");
      }
      const args =
        params.arguments && typeof params.arguments === "object" ? params.arguments : {};
      return ok(id, callTool(name, args));
    }

    // 通知：按规范不产生响应体
    case "notifications/initialized":
    case "initialized":
    case "notifications/cancelled":
      return null;

    default:
      if (isNotification) return null; // 未知通知：静默忽略
      return fail(id, RPC.METHOD_NOT_FOUND, `方法不存在: ${method}`);
  }
}
