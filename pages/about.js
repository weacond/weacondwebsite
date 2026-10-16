import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";

export const metadata = {
  title: "关于 Weacond",
  description: "Weacond 的使命、团队与理念",
  robots: { index: true, follow: true },
};

export default function AboutPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <Navbar />
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">{L.title}</h1>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 space-y-8">
            <section>
              <h2 className="text-xl font-bold mb-3">{L.missionTitle}</h2>
              <p className="text-slate-600 leading-relaxed">{L.mission}</p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">{L.roadmapTitle}</h2>
              <div className="space-y-4">
                {[L.roadmap].map((phase, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-20 text-sm font-bold text-indigo-600">{phase.time}</div>
                    <div>
                      <h3 className="font-semibold">{phase.name}</h3>
                      <p className="text-sm text-slate-600">{phase.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">{L.techTitle}</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {L.tech.map((item, i) => (
                  <div key={i} className="bg-slate-50 rounded-lg p-4">
                    <div className="font-semibold text-sm mb-1">{item.name}</div>
                    <p className="text-xs text-slate-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">{L.contactTitle}</h2>
              <p className="text-slate-600">weacond@gmail.com</p>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

const zh = {
  title: "关于 Weacond",
  missionTitle: "使命",
  mission: "Weacond 致力于让每一个个人投资者都能获得专业级的金融分析能力。我们相信，投资应基于数据与逻辑，而非情绪。通过 AI + 量化 + 教育的三位一体，我们让投资决策变得简单、透明、可追溯。",
  roadmapTitle: "路线图",
  roadmap: [
    { time: "0-2月", name: "MVP 上线", desc: "技术面信号 + 公允价值基础 + 仪表盘 + 支付 + 免责声明" },
    { time: "2-4月", name: "核心能力", desc: "黑天鹅模块 + API Sandbox + 自动化任务 + 付费数据源" },
    { time: "4-8月", name: "扩展", desc: "回测引擎 + 模拟交易 + 策略市场初版" },
    { time: "8-12月", name: "规模化", desc: "Broker 对接 + 实时 WebSocket + 企业 API + 分润自动化" },
    { time: "12-18月", name: "国际化", desc: "多语 + 白标 + 税务导出 + 国际 SaaS 出口" },
  ],
  techTitle: "技术栈",
  tech: [
    { name: "Next.js 14", desc: "React 全栈框架，SSR + SSG" },
    { name: "Cloudflare Pages", desc: "全球 CDN + 零费用部署" },
    { name: "Cloudflare R2", desc: "对象存储（替代 Notion），零出口费" },
    { name: "Supabase", desc: "PostgreSQL + Auth + 实时" },
    { name: "Stripe", desc: "订阅 + 一次性支付" },
    { name: "WebGPU + Qwen", desc: "本地 AI 推理，Apache 2.0" },
  ],
  contactTitle: "联系我们",
};
const en = {
  title: "About Weacond",
  missionTitle: "Mission",
  mission: "Weacond aims to give every individual investor professional-grade financial analysis. Investing should be based on data, not emotion.",
  roadmapTitle: "Roadmap",
  roadmap: [
    { time: "0-2m", name: "MVP", desc: "Technical signals + fair value + dashboard + payments + disclaimer" },
    { time: "2-4m", name: "Core", desc: "Black Swan module + API Sandbox + automated tasks" },
    { time: "4-8m", name: "Expand", desc: "Backtesting + Paper Trading + Strategy Marketplace v1" },
    { time: "8-12m", name: "Scale", desc: "Broker integration + Real-time WebSocket + Enterprise API" },
    { time: "12-18m", name: "Global", desc: "Multi-language + White-label + Tax export + i18n SaaS" },
  ],
  techTitle: "Tech Stack",
  tech: [
    { name: "Next.js 14", desc: "Full-stack React" },
    { name: "Cloudflare Pages", desc: "Global CDN + free deployment" },
    { name: "Cloudflare R2", desc: "Object storage (replaces Notion), zero egress" },
    { name: "Supabase", desc: "PostgreSQL + Auth + Realtime" },
    { name: "Stripe", desc: "Subscriptions + one-time" },
    { name: "WebGPU + Qwen", desc: "Local AI inference, Apache 2.0" },
  ],
  contactTitle: "Contact",
};