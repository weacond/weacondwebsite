// /api/health — 轻量健康检查端点
// 用途：uptime 监控 / 负载均衡探活 / 冒烟测试。始终返回 200 + 服务时间戳。
//
// 对齐项目内【能正常运行】的 edge 路由（signals.js / sitemap.js）的两点关键：
//   1) 运行时声明用 `export const config = { runtime: "edge" }`。
//      旧写法 `export const runtime = "edge"` 在 next-on-pages 下不被识别 → 路由不进 edge 出包 → 运行即 500。
//   2) 响应用 Web 标准 `new Response(...)`，不用 Node 风格 `res.status().json()`。
//      Cloudflare Worker 里 res 不是 Node 的 ServerResponse，调用 .status().json() 会抛错 → 500。
export const config = { runtime: "edge" };

export default function handler() {
  const body = {
    status: "ok",
    service: "weacond",
    time: new Date().toISOString(),
    uptime: null, // Edge 运行时无 process，固定 null（Node 本地才可能有值）
    node: null,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}