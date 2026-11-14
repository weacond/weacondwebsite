// pages/api/mcp.js — Weacond MCP 端点（Model Context Protocol over 无状态 HTTP）
//
// 让 AI 搜索/助手（GEO，生成式引擎优化）把 Weacond 计算器作为工具调用。
// 遵循 2026 状态化 MCP 规范（无 initialize/session 握手，每请求自带 _meta 版本）。
// 双运行时安全：Vercel + Cloudflare Edge（无状态 HTTP 请求/响应，无 SSE 流）。
//
// 鉴权：设置 env MCP_API_KEY 后，要求 `Authorization: Bearer <key>` 或 `x-api-key`；
//       未配置则开放（仅记录，便于早期 GEO 抓取）。绝不向客户端回传密钥。
// 限流：env MCP_RATE_LIMIT_PER_MIN（默认 120，每分钟 / 每 key-或-IP）。
//       无状态运行时的内存桶为「每实例」计数；生产全局限流需接共享存储。
// 版本：env MCP_PROTOCOL_VERSION（默认见 lib/mcp/protocol.js）。
export const runtime = "edge";

import { handleMcpRequest } from "../../lib/mcp/server.js";
import { RPC, fail, SERVER_INFO, PROTOCOL_VERSION } from "../../lib/mcp/protocol.js";
import { makeLimiter } from "../../lib/mcp/rateLimit.js";

// 惰性限流器：首次请求时读取 env，避免 Edge 冷启动期顶层 env 缺失。
let _limiter;
function getLimiter() {
  if (!_limiter) _limiter = makeLimiter(Number(process.env.MCP_RATE_LIMIT_PER_MIN) || 120);
  return _limiter;
}

function apiKeyFrom(req) {
  const h = req.headers || {};
  const auth = h["authorization"] || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return h["x-api-key"] || "";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");

  if (req.method === "OPTIONS") return res.status(204).end();

  // GET → 发现信息（供 AI 爬虫/客户端探测端点能力，非 JSON-RPC 体）
  if (req.method === "GET") {
    return res.status(200).json({
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
      protocolVersion: process.env.MCP_PROTOCOL_VERSION || PROTOCOL_VERSION,
      description:
        "Weacond 金融计算器 MCP 端点。POST JSON-RPC 2.0 请求以调用 initialize / tools/list / tools/call。",
      methods: ["initialize", "tools/list", "tools/call", "ping"],
      auth: process.env.MCP_API_KEY
        ? "需要 Authorization: Bearer <key> 或 x-api-key"
        : "未配置密钥（开放）",
      example: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "kelly", arguments: { winRate: 0.55, odds: 1 } },
      },
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "仅支持 POST（JSON-RPC）与 GET（发现）" });
  }

  // 鉴权
  if (process.env.MCP_API_KEY) {
    const key = apiKeyFrom(req);
    if (!key || key !== process.env.MCP_API_KEY) {
      return res.status(401).json(
        fail(null, RPC.AUTH_REQUIRED, "需要有效 API 密钥（Authorization: Bearer 或 x-api-key）"),
      );
    }
  }

  // 限流（按 key 或转发 IP）
  const bucketKey = apiKeyFrom(req) || req.headers["x-forwarded-for"] || "anon";
  const rl = getLimiter()(bucketKey);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(Math.ceil((rl.retryAfterMs || 1000) / 1000)));
    return res.status(429).json(
      fail(null, RPC.RATE_LIMITED, `超出限流 ${rl.limit}/min`, { retryAfterMs: rl.retryAfterMs }),
    );
  }

  // 解析请求体
  let body;
  try {
    body = await req.json();
  } catch {
    return res.status(400).json(fail(null, RPC.PARSE_ERROR, "请求体不是合法 JSON"));
  }

  const response = await handleMcpRequest(body, {
    protocolVersion: process.env.MCP_PROTOCOL_VERSION,
  });

  if (response === null) return res.status(202).end(); // 通知：无响应体
  return res.status(200).json(response);
}
