/** @type {import('next').NextConfig} */
// 架构：Cloudflare Workers（通过 @cloudflare/next-on-pages）
// 静态页面 + API 路由一起部署为 Worker
// 文档：https://developers.cloudflare.com/next-on-pages/

const nextConfig = {
  reactStrictMode: true,
  // 不用 output: "export"，让 next-on-pages 处理
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "weacond.com" },
      { protocol: "https", hostname: "weacond-public.r2.cloudflarestorage.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
