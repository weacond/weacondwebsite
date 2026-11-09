export const runtime = "edge";

// /api/errors — 客户端错误上报（轻量、零外部依赖）
// 由 ErrorBoundary 在捕获渲染异常时 fire-and-forget 调用。
// 存储：Cloudflare Logs（console.error）。可选通过 env ERROR_SINK_URL 转发到外部监控。
// 设计目标：
//   1. 校验 + 按 IP 限流 + 字段截断，防滥用 / 日志膨胀。
//   2. 绝不下发或记录敏感信息（客户端只发 message/stack/url/ua，无 cookie/token）。
//   3. 外部转发失败不影响主流程（仍写本地日志）。

const MAX_MESSAGE = 1000;
const MAX_STACK = 4000;
const LIMIT = 50; // 每个 IP 每 WINDOW_MS 最多上报条数
const WINDOW_MS = 60 * 1000; // 1 分钟
const MAP_CAP = 2000; // 限流表上限，超出即清空（Edge isolate 短命，够用）

// 按 IP 的内存限流（Edge 下随 isolate 存活，足以防客户端刷屏 / 滥用）
const rateWindow = new Map(); // ip -> { count, t }

function isRateLimited(ip) {
  const now = Date.now();
  const rec = rateWindow.get(ip);
  if (!rec || now - rec.t > WINDOW_MS) {
    if (rateWindow.size > MAP_CAP) rateWindow.clear();
    rateWindow.set(ip, { count: 1, t: now });
    return false;
  }
  rec.count += 1;
  if (rec.count > LIMIT) return true;
  rateWindow.set(ip, rec); // 刷新引用（同上界保护）
  return false;
}

// Cloudflare 提供 CF-Connecting-IP；本地/其他环境回退 x-forwarded-for；都无则匿名
function clientIp(req) {
  const h = req.headers || {};
  return h["cf-connecting-ip"] || h["x-forwarded-for"] || "anonymous";
}

function truncate(s, n) {
  if (typeof s !== "string") return "";
  return s.length > n ? s.slice(0, n) + "…(truncated)" : s;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Edge runtime 不自动解析 req.body，必须手动 req.json()（与 ai.js 一致）
  let body;
  try {
    body = await req.json();
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  // 校验：必须有一条字符串 message
  const message =
    body && typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  // 按 IP 限流，防客户端刷屏 / 滥用
  const ip = clientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many reports, slow down" });
  }

  // 规范化 + 截断，构造日志负载
  const payload = {
    message: truncate(message, MAX_MESSAGE),
    stack: truncate(typeof body.stack === "string" ? body.stack : "", MAX_STACK),
    componentStack: truncate(
      typeof body.componentStack === "string" ? body.componentStack : "",
      MAX_STACK
    ),
    url: truncate(typeof body.url === "string" ? body.url : "", 2000),
    ua: truncate(typeof body.ua === "string" ? body.ua : "", 500),
    ts: new Date().toISOString(),
    ip,
  };

  // 主存储：Cloudflare Logs
  console.error("[client-error]", payload);

  // 可选外部转发（Sentry / Logfire 等），失败不影响主流程
  const sink = process.env.ERROR_SINK_URL;
  if (sink) {
    try {
      await fetch(sink, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error("[client-error] sink forward failed:", e.message);
    }
  }

  // 204 No Content：客户端 fire-and-forget，不读响应体
  res.status(204).end();
}