// pages/api/sitemap.js — 动态站点地图（Edge 运行时，纯函数生成）
// 随 lib/toolsIndex.js 的 TOOLS 变化自动更新，无需手动维护 public/sitemap.xml。
import { buildSitemapXml, sitemapRoutes } from "../../lib/sitemap.js";

export const config = { runtime: "edge" };

export default function handler(req) {
  const host = req.headers.get("host") || "weacond.com";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const body = buildSitemapXml(`${proto}://${host}`, sitemapRoutes());
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
