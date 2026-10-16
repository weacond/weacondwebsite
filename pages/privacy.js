import Navbar from "../components/Navbar";
import Head from "next/head";

export const metadata = {
  title: "隐私政策 — Weacond",
  robots: { index: false },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>隐私政策 — Weacond</title></Head>
      <Navbar />
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <h1 className="text-3xl font-bold mb-2">隐私政策</h1>
          <p className="text-sm text-slate-400 mb-8">最后更新：2026年10月</p>

          <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-lg font-bold mb-2">1. 数据收集</h2>
              <p>Weacond 收集以下数据：(a) 注册信息（邮箱、用户名）；(b) 使用数据（页面访问、功能使用）；(c) 支付信息（通过 Stripe，Weacond 不存储信用卡号）；(d) 本地 AI 数据（完全在设备本地，不上传）。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">2. 数据使用</h2>
              <p>数据仅用于：(a) 提供服务；(b) 改善用户体验；(c) 发送通知和账单；(d) 安全与反欺诈。我们不出售用户数据。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">3. 本地 AI 隐私</h2>
              <p>Weacond 的本地 AI 功能（WebGPU + Qwen）在用户设备本地运行。交易数据、策略参数、持仓信息<b>永不上传服务器</b>。这是我们的核心设计原则。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">4. 第三方服务</h2>
              <p>我们使用以下第三方：Supabase（用户数据）、Stripe（支付）、Cloudflare R2（文件存储）。这些服务可能在不同地区处理数据，但受其各自隐私政策保护。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">5. 数据保留</h2>
              <p>用户数据在账户存续期间保留。账户关闭后 30 天内删除。审计日志保留 7 年以满足监管要求。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">6. 用户权利</h2>
              <p>用户可：(a) 查看自己的数据；(b) 请求更正；(c) 请求删除；(d) 导出数据；(e) 撤销同意。通过 weacond@gmail.com 联系。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">7. 数据安全保障</h2>
              <p>敏感数据加密存储（AES-256）。传输使用 HTTPS/TLS。访问控制基于角色（RBAC）。定期进行安全审计。计划取得 SOC2 / ISO27001 认证。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">8. Cookie 与追踪</h2>
              <p>我们使用必要的会话 Cookie 和可选的分析 Cookie。用户可在浏览器中管理 Cookie 设置。</p>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}