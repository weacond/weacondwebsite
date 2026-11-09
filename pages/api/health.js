// /api/health — 轻量健康检查端点
// 用途：uptime 监控 / 负载均衡探活 / 冒烟测试。始终返回 200 + 服务时间戳。
// 对 Node 与 Cloudflare Edge 双运行时都安全（process 在 Edge 下可能缺失，已做守卫）。
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const uptime =
    typeof process !== "undefined" && typeof process.uptime === "function"
      ? Math.round(process.uptime())
      : null;
  const node = typeof process !== "undefined" ? process.version : null;
  res.status(200).json({
    status: "ok",
    service: "weacond",
    time: new Date().toISOString(),
    uptime, // 进程存活秒数（Edge 运行时下为 null）
    node, // Node 版本（Edge 运行时下为 null）
  });
}