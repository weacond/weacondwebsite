import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";

export const metadata = {
  title: "定价方案 — Weacond",
  description: "从免费到机构级，选择最适合你的方案",
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const plans = [
    { key:"free", name:"Free", price_month:0, price_year:0, badge:null,
      features:L.plans.free, cta:L.ctaFree, ctaHref:"/login", hl:false },
    { key:"basic", name:"Basic", price_month:9.9, price_year:99, badge:null,
      features:L.plans.basic, cta:L.ctaStart, ctaHref:"/login", hl:false },
    { key:"putseller", name:"PutSeller", price_month:29.9, price_year:299, badge:L.rec,
      features:L.plans.putseller, cta:L.ctaStart, ctaHref:"/login", hl:true },
    { key:"proquant", name:"ProQuant", price_month:149, price_year:1490, badge:null,
      features:L.plans.proquant, cta:L.ctaStart, ctaHref:"/login", hl:false },
    { key:"enterprise", name:"Enterprise", price_month:999, price_year:null, badge:null,
      features:L.plans.enterprise, cta:L.ctaContact, ctaHref:"/contact", hl:false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <Navbar />
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">{L.title}</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">{L.subtitle}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 items-start">
            {plans.map((p) => (
              <div key={p.key}
                className={`relative rounded-2xl p-6 transition-all ${p.hl ? "bg-indigo-600 text-white shadow-xl ring-4 ring-indigo-200 md:-translate-y-2" : "bg-white border border-slate-200 shadow-sm hover:shadow-md"}`}>
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full bg-yellow-400 text-yellow-900">
                    {p.badge}
                  </div>
                )}
                <h3 className={`text-lg font-bold mb-1 ${p.hl?"text-white":"text-slate-900"}`}>{p.name}</h3>
                <div className="mb-4">
                  {p.price_month > 0 ? (
                    <div>
                      <span className={`text-3xl font-bold ${p.hl?"text-white":"text-slate-900"}`}>${p.price_month}</span>
                      <span className={`text-sm ${p.hl?"text-indigo-200":"text-slate-500"}`}>/月</span>
                      {p.price_year && <p className={`text-xs mt-1 ${p.hl?"text-indigo-200":"text-slate-400"}`}>年付${p.price_year}（省{Math.round((1-p.price_year/(p.price_month*12))*100)}%）</p>}
                    </div>
                  ) : (
                    <div>
                      <span className="text-3xl font-bold">{p.key==="free"?"免费":"$"+p.price_month+"+/月"}</span>
                      {p.key==="enterprise"&&<p className="text-xs text-slate-400 mt-1">按需报价</p>}
                    </div>
                  )}
                </div>
                <ul className="space-y-2 mb-6 text-sm">
                  {p.features.map((f,i)=>(
                    <li key={i} className="flex items-start gap-2">
                      <span className={p.hl?"text-indigo-200":"text-green-500"}>✓</span>
                      <span className={p.hl?"text-indigo-100":"text-slate-600"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <a href={p.ctaHref}
                  className={`block text-center py-2.5 rounded-lg font-semibold text-sm transition-colors ${p.hl?"bg-white text-indigo-600 hover:bg-indigo-50":"bg-indigo-600 text-white hover:bg-indigo-500"}`}>
                  {p.cta}
                </a>
              </div>
            ))}
          </div>
          {/* 支付方式 */}
          <div className="mt-16 max-w-3xl mx-auto bg-white rounded-xl p-8 border border-slate-100">
            <h3 className="text-xl font-bold mb-4">{L.paymentTitle}</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600">
              <div>💳 <strong>信用卡</strong> — Visa/MC/Amex</div>
              <div>🏦 <strong>银行转账</strong> — 马来西亚 RHB</div>
              <div>📱 <strong>Touch 'n Go</strong></div>
              <div>🌐 <strong>PayPal</strong></div>
              <div>₿ <strong>USDT</strong>（即将推出）</div>
              <div>📧 <strong>邮件发票</strong></div>
            </div>
          </div>
          <div className="mt-8 max-w-3xl mx-auto text-center text-sm text-slate-500">
            <p>7天无条件退款（年付除外）。随时取消。</p>
          </div>
        </div>
      </section>
    </div>
  );
}

const zh = {
  title:"定价方案", subtitle:"所有方案均支持7天无条件退款。随时取消。",
  rec:"🔥 最推荐", ctaFree:"免费开始", ctaStart:"立即订阅", ctaContact:"联系我们",
  plans:{
    free:["每日信号速报","3天高级体验","基础电子书","社区访问"],
    basic:["每日技术信号","月度电子书","关注与收藏","基础任务体系","Web Push"],
    putseller:["5-10条卖Put","IV Rank/Fair Value","Greeks摘要","风控建议","导出表格","Push+邮件","黑天鹅模块"],
    proquant:["回测引擎","模拟交易","实时信号","高配API","策略市场","绩效面板","VIP社群"],
    enterprise:["高配API+行情","白标","专属经理","SLA","私有化部署","复制交易"],
  },
  paymentTitle:"支付方式",
};
const en = {
  title:"Pricing", subtitle:"7-day refund. Cancel anytime.",
  rec:"🔥 Most Popular", ctaFree:"Start Free", ctaStart:"Subscribe", ctaContact:"Contact",
  plans:{
    free:["Daily signals","3-day trial","Ebooks","Community"],
    basic:["Daily signals","Ebooks","Watchlist","Tasks","Push"],
    putseller:["5-10 puts","IV Rank","Greeks","Risk","Export","Push+Email","Black Swan"],
    proquant:["Backtest","Paper","Real-time","API","Market","Perf","VIP"],
    enterprise:["API+live","White-label","Manager","SLA","Self-host","Copy"],
  },
  paymentTitle:"Payment Methods",
};
