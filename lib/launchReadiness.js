// lib/launchReadiness.js — 上线就绪度审计（纯函数，SSR/Edge 安全，无浏览器 API、无网络）
// 用途：把「我还要去配什么」变成一次可机读的判断。
//   - 只判断「配置是否存在」，**绝不回传密钥值本身**（安全）。
//   - 占位值（如 .env.example 里的 "your-..."）一律视为「未配置」。
//   - 严重度：blocker = 缺失则对应核心功能不可用；recommended = 缺失则降级；optional = 锦上添花。
// 真实 env 变量名以 .env.example 与代码内 process.env 引用为准。

// 把任意 env 对象里某个键当作「已配置」的判定：非空、非纯占位/测试值。
function isSet(env, name) {
  const v = env ? env[name] : undefined;
  if (typeof v !== "string") return false;
  const t = v.trim();
  if (!t) return false;
  // 占位 / 示例 / 测试值一律视为「未配置」
  if (t.startsWith("your-") || t.startsWith("sk_test_") || t.startsWith("pk_test_")) return false;
  if (t === "false" || t.toLowerCase() === "null" || t.toLowerCase() === "undefined") return false;
  return true;
}

// 检查清单。每项：var(env 变量名), label(双语简短), where(在哪配), hint, severity。
// severity: "blocker" | "recommended" | "optional"
export const READINESS_CHECKS = [
  {
    var: "ALPHA_VANTAGE_API_KEY",
    label: "实时行情（K 线/信号/回测从演示变真实）",
    where: "GitHub Settings → Secrets and variables → Actions",
    hint: "免费 5 次/分：alphavantage.org/support/#api-key",
    severity: "blocker",
  },
  {
    var: "FREDSERIESKEY",
    label: "FRED 宏观指标（利率/通胀/就业，缺失则宏观为演示）",
    where: "GitHub Secrets",
    hint: "fred.stlouisfed.org 注册免费 key",
    severity: "recommended",
  },
  {
    var: "STRIPE_SECRET_KEY",
    label: "支付：Stripe 服务端密钥",
    where: "GitHub Secrets + Stripe 后台",
    hint: "sk_live_...（上线用 live，非 test）",
    severity: "blocker",
  },
  {
    var: "STRIPE_WEBHOOK_SECRET",
    label: "支付：Stripe Webhook 签名密钥",
    where: "Stripe 后台 → Webhooks → 复制 whsec_...",
    hint: "无它则订阅状态无法回传，用户付了却拿不到权益",
    severity: "blocker",
  },
  {
    var: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    label: "支付：Stripe 前端发布密钥",
    where: "GitHub Secrets",
    hint: "pk_live_...",
    severity: "blocker",
  },
  {
    var: "NEXT_PUBLIC_SUPABASE_URL",
    label: "用户/订阅/任务：Supabase 项目地址",
    where: "Supabase 项目 → Settings → API",
    hint: "跑过 supabase/schema.sql 再填",
    severity: "blocker",
  },
  {
    var: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    label: "用户/订阅：Supabase anon 密钥（前端）",
    where: "Supabase 项目 → Settings → API",
    severity: "blocker",
  },
  {
    var: "SUPABASE_SERVICE_ROLE_KEY",
    label: "用户/订阅：Supabase service_role 密钥（服务端）",
    where: "Supabase 项目 → Settings → API（勿泄露到前端）",
    severity: "blocker",
  },
  {
    var: "R2_API_TOKEN",
    label: "电子书下载：Cloudflare R2 访问令牌",
    where: "Cloudflare R2 → API Tokens",
    hint: "先 npm run enable:r2 创建 weacond-public / weacond-private 双桶",
    severity: "blocker",
  },
  {
    var: "R2_PUBLIC_URL",
    label: "电子书下载：R2 公开桶 URL",
    where: "Cloudflare R2 → weacond-public",
    severity: "blocker",
  },
  {
    var: "OPENAI_API_KEY",
    label: "云端 AI 推理（可选；本地 AI 不需要它）",
    where: "GitHub Secrets",
    hint: "没有也能跑本地 AI（WebGPU）；有它则云端补盲",
    severity: "optional",
  },
  {
    var: "ERROR_SINK_URL",
    label: "错误上报（可选）",
    where: "GitHub Secrets",
    hint: "接 Sentry/自建 sink 才有意义",
    severity: "optional",
  },
];

// 适用法律：来自 lib/legalContent.js 的 PLATFORM_JURISDICTION（构建期常量）。
// 这里用注入的 governingLaw 字段判断，避免在 API 运行时 import 页面常量。
export function assessReadiness(env, options = {}) {
  const governingLaw = (options.governingLaw || "").trim();
  const results = READINESS_CHECKS.map((c) => ({
    ...c,
    configured: isSet(env, c.var),
  }));
  // 法律主体（单独一项，blocker：上线前必须确定管辖法）
  const legal = {
    var: "PLATFORM_JURISDICTION.governingLaw",
    label: "适用法律/注册主体（决定争议解决与牌照边界）",
    where: "编辑 lib/legalContent.js 的 PLATFORM_JURISDICTION",
    hint: "建议新加坡/美国/马来西亚；决定后代码自动在 /terms 渲染真实管辖",
    severity: "blocker",
    configured: Boolean(governingLaw),
  };
  const all = [...results, legal];

  const blockersMissing = all.filter((c) => c.severity === "blocker" && !c.configured);
  const recommendedMissing = all.filter((c) => c.severity === "recommended" && !c.configured);
  const optionalMissing = all.filter((c) => c.severity === "optional" && !c.configured);

  return {
    // 可上线 ⇔ 没有任何 blocker 缺失（recommended/optional 不影响上线）
    ready: blockersMissing.length === 0,
    summary: {
      total: all.length,
      configured: all.filter((c) => c.configured).length,
      missing: all.filter((c) => !c.configured).length,
      blockersMissing: blockersMissing.length,
      recommendedMissing: recommendedMissing.length,
      optionalMissing: optionalMissing.length,
    },
    // 上线前必做（blocker，按定义顺序）；ready ⇔ todo.length === 0
    todo: blockersMissing.map((c) => ({
      what: c.label,
      where: c.where,
      hint: c.hint,
      severity: c.severity,
    })),
    // 建议做（recommended）+ 可选（optional），不影响上线判断
    recommended: recommendedMissing.map((c) => ({
      what: c.label,
      where: c.where,
      hint: c.hint,
      severity: c.severity,
    })),
    optional: optionalMissing.map((c) => ({
      what: c.label,
      where: c.where,
      hint: c.hint,
      severity: c.severity,
    })),
    checks: all,
    note: "本端点只判断配置是否存在，不回传任何密钥值。",
  };
}

export default assessReadiness;
