// /api/launch-check — 上线就绪度审计（运营用，非用户用）
// 返回：哪些核心服务已配 / 哪些还缺 + 「下一步去哪配」。
// 安全：只判断配置是否存在，**绝不回传密钥值**；对 Node 与 Cloudflare Edge 双运行时安全。
// 注意：始终返回 200（即使未就绪），供监控/脚本判断，避免被当作 5xx 告警。
import { assessReadiness } from "../../lib/launchReadiness.js";
import { PLATFORM_JURISDICTION } from "../../lib/legalContent.js";

// next-on-pages 要求所有非静态路由声明 edge runtime，否则构建拒绝出包。
// 本路由仅做配置存在性判断、不回传密钥值，process.env 已做守卫，edge 安全。
export const config = { runtime: "edge" };
import { toEdge } from "../../lib/edge-res.js";
export default toEdge(handler);
// 修复 Cloudflare edge 下 res.status().json() 的 500：包一层 toEdge，业务逻辑不变。见 lib/edge-res.js。
function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow"); // 运营端点，勿被搜索引擎收录
  const env = (typeof process !== "undefined" && process.env) ? process.env : {};
  const report = assessReadiness(env, { governingLaw: PLATFORM_JURISDICTION.governingLaw });
  res.status(200).json({
    status: "ok",
    endpoint: "launch-check",
    time: new Date().toISOString(),
    ...report,
  });
}
