import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import Link from "next/link";

export const metadata = {
  title: "Weacond — 让投资变得轻松、便捷、稳健",
  description:
    "Weacond 专注理性投资教育与 AI 智能系统，三引擎信号（基本面+技术面+波动面），帮助个人投资者建立稳定、系统化的财富思维。",
  keywords: [
    "Weacond", "投资教育", "理性投资", "金融AI", "期权",
    "卖Put", "公允价值", "技术信号", "回测",
    "financial education", "options trading", "AI investing",
  ],
  openGraph: {
    title: "Weacond — 让投资变得轻松、便捷、稳健",
    description: "AI + 量化 + 教育，三位一体的金融决策平台",
    type: "website", locale: "zh_CN", siteName: "Weacond",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weacond — 让投资变得轻松、便捷、稳健",
    description: "AI + 量化 + 教育，三位一体的金融决策平台",
  },
  robots: { index: true, follow: true },
};

export default function Home() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar />
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white py-28 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-8 backdrop-blur">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {L.heroBadge}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight leading-tight">
            {L.heroTitle}
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            {L.heroSubtitle}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/pricing"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/30">
              {L.ctaPricing}
            </Link>
            <Link href="/signals"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-8 rounded-xl transition-all border border-white/20 backdrop-blur">
              {L.ctaSignals}
            </Link>
            <Link href="/backtest"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-8 rounded-xl transition-all border border-white/20 backdrop-blur">
              {L.ctaBacktest}
            </Link>
            <Link href="/ai"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-8 rounded-xl transition-all border border-white/20 backdrop-blur">
              {L.ctaAI}
            </Link>
          </div>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[L.engine1, L.engine2, L.engine3].map((e, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-5 border border-white/10 backdrop-blur text-left">
                <div className="text-2xl mb-2">{["📊","📈","⚡"][i]}</div>
                <h3 className="font-semibold text-white mb-1">{e.title}</h3>
                <p className="text-sm text-slate-400">{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 核心功能 */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">{L.featuresTitle}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {L.features.map((f, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 计算工具 */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">{L.toolsTitle}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {L.tools.map((f, i) => (
            <Link key={i} href={f.href} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow block">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 定价预览 */}
      <section className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4 text-slate-900">{L.pricingTitle}</h2>
          <p className="text-slate-600 mb-10">{L.pricingSubtitle}</p>
          <Link href="/pricing"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
            {L.viewPlans}
          </Link>
        </div>
      </section>

      {/* 理念 + 关于 */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-6 text-slate-900">{L.philosophyTitle}</h2>
        <p className="text-lg text-slate-600 leading-relaxed mb-12">{L.philosophy}</p>
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-left max-w-3xl mx-auto">
          <h3 className="text-xl font-bold mb-4">{L.aboutTitle}</h3>
          <p className="text-slate-600 leading-relaxed mb-6">{L.about}</p>
          <Link href="/about" className="text-indigo-600 hover:underline text-sm font-medium">{L.moreAbout}</Link>
        </div>
      </section>

      {/* 本地 AI */}
      <section className="bg-gradient-to-r from-indigo-50 to-violet-50 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-6 text-slate-900">{L.localAITitle}</h2>
          <p className="text-slate-600 leading-relaxed mb-8">{L.localAIDesc}</p>
          <div className="flex justify-center gap-4 flex-wrap">
            {["🔒 数据不出本地","⚡ 零推理成本","📱 浏览器/桌面运行","🧠 Qwen 7B/14B"].map((tag, i) => (
              <span key={i} className="bg-white text-sm px-4 py-2 rounded-full shadow-sm border border-slate-200">{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Weacond</h3>
              <p className="text-sm">{L.footerAbout}</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{L.navLinks}</h4>
              <div className="flex flex-col gap-2 text-sm">
                <Link href="/signals" className="hover:text-white">信号仪表盘</Link>
                <Link href="/ebooks" className="hover:text-white">投资书房</Link>
                <Link href="/pricing" className="hover:text-white">定价方案</Link>
                <Link href="/contact" className="hover:text-white">联系我们</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{L.legalLinks}</h4>
              <div className="flex flex-col gap-2 text-sm">
                <Link href="/terms" className="hover:text-white">服务条款</Link>
                <Link href="/privacy" className="hover:text-white">隐私政策</Link>
                <Link href="/about" className="hover:text-white">关于我们</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-6 text-center">
            <p className="text-xs mb-2">{L.disclaimer}</p>
            <p className="text-xs">&copy; {new Date().getFullYear()} Weacond</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const zh = {
  heroBadge: "AI 驱动的金融决策平台",
  heroTitle: "让投资变得轻松、便捷、稳健",
  heroSubtitle: "三引擎信号（基本面+技术面+波动面）· 宏观情绪 · 本地AI · 多策略对比 · 模拟交易 · 任务引导",
  ctaPricing: "查看方案", ctaSignals: "今日信号", ctaBacktest: "策略回测", ctaAI: "AI助手",
  engine1: { title: "基础面", desc: "公允价值模型，识别被低估资产" },
  engine2: { title: "技术面", desc: "突破位/支撑位/趋势评分" },
  engine3: { title: "波动面", desc: "IV Rank / Theta / 黑天鹅对冲" },
  featuresTitle: "核心功能",
  features: [
    { icon: "📊", title: "三引擎信号", desc: "基本面+技术面+波动面合成可解释评分，附数据来源" },
    { icon: "🧠", title: "本地AI", desc: "WebGPU运行Qwen模型，数据永不出本地" },
    { icon: "📚", title: "投资书房", desc: "中英双语电子书，构建理性思维系统" },
    { icon: "📈", title: "回测引擎", desc: "参数化回测，含滑点/佣金/分红假设" },
    { icon: "🌐", title: "宏观情绪", desc: "市场regime识别 + 风险评分 + 资产配置建议" },
    { icon: "⚖️", title: "多策略对比", desc: "多策略并排回测，逐指标高亮最优" },
    { icon: "💼", title: "模拟交易", desc: "零风险模拟盘，信号→下单→平仓全链路" },
    { icon: "⭐", title: "关注列表", desc: "跨标签同步收藏，一键加入模拟盘" },
    { icon: "🎯", title: "任务系统", desc: "3天体验任务引导，完成即解锁高级功能" },
    { icon: "🛡️", title: "黑天鹅模块", desc: "尾部风险检测+对冲建议+教育" },
  ],
  toolsTitle: "计算工具",
  tools: [
    { icon: "🧭", title: "学习路径", desc: "入门→进阶→高级，串联全部工具的循序渐进课程", href: "/learning" },
    { icon: "🎯", title: "支点计算器", desc: "经典/伍迪/卡马拉拉/斐波那契日内支撑阻力位", href: "/pivots" },
    { icon: "📐", title: "斐波那契", desc: "回撤/扩展关键位，趋势反转与目标", href: "/fibonacci" },
    { icon: "📏", title: "头寸 & Kelly", desc: "风险预算、R:R 盈亏比与最优仓位比例", href: "/position-size" },
    { icon: "📊", title: "组合优化器", desc: "5 种配权对比：夏普、波动、风险平价与有效前沿", href: "/portfolio" },
    { icon: "🛡️", title: "风险仪表盘", desc: "最大回撤/持续/恢复、VaR/CVaR 与六大绩效比率", href: "/risk" },
    { icon: "🔗", title: "相关性 & 分散化", desc: "相关矩阵热力图、分散化比率 DR 与 HHI", href: "/correlation" },
    { icon: "🎲", title: "蒙特卡洛模拟器", desc: "模拟财富路径、终端分布、腰斩/归零概率与扇形图", href: "/montecarlo" },
    { icon: "📝", title: "交易日志 / 业绩", desc: "输入每笔收益，读胜率/盈利因子/期望/连亏与破产概率", href: "/performance" },
    { icon: "🌊", title: "压力测试", desc: "把组合放进 2008 / 2020 / 2022 情景看总损失与资产贡献", href: "/stresstest" },
    { icon: "↩️", title: "回撤恢复", desc: "跌 X% 要涨多少回本？给定 CAGR 算恢复时间", href: "/drawdown" },
    { icon: "🎲", title: "系统模拟", desc: "胜率×盈亏比×下注，模拟净值曲线、回撤与破产概率", href: "/system" },
    { icon: "📈", title: "复利规划", desc: "本金+每月定投按月复利，对比 DCA 与一次性，附 72 法则", href: "/compound" },
    { icon: "⚖️", title: "对冲比率", desc: "给定相关 ρ 与波动，算最小方差对冲比率与残余风险", href: "/hedge" },
    { icon: "🧮", title: "IRR / XIRR", desc: "输入现金流序列，反解内部收益率与年化回报", href: "/xirr" },
    { icon: "🎯", title: "波动目标", desc: "给定目标波动与资产波动，算所需杠杆与头寸规模", href: "/voltarget" },
    { icon: "⚡", title: "杠杆强平", desc: "输入杠杆与价格变动，算放大盈亏、强平价与最大亏损", href: "/leverage" },
    { icon: "🎯", title: "R 倍数", desc: "把盈亏表达为 R，算实际 R、分级与 R 口径期望", href: "/r-multiple" },
    { icon: "📊", title: "加仓均价", desc: "合并原持仓与加仓，算新均价、现价盈亏与到目标距离", href: "/average-entry" },
    { icon: "🔔", title: "Z 分数", desc: "算 Z 分数、正态百分位与分级，用于均值回归与异常检测", href: "/z-score" },
    { icon: "⚖️", title: "波动拖累", desc: "对比算术与几何收益，量化波动对复合终值的拖累", href: "/vol-drag" },
    { icon: "🛡️", title: "ATR 止损", desc: "用 ATR 定止损距离与风险头寸：止损=入场±N·ATR，头寸=风险/距离", href: "/atr-stop" },
    { icon: "🎯", title: "最大偏移", desc: "评估入场/出场质量：MFE 最大浮盈、MAE 最大浮亏、捕获率=盈亏/MFE", href: "/excursion" },
    { icon: "🧮", title: "盈亏平衡", desc: "扣手续费后多少价打平：平衡价=入场·(1±fee)/(∓fee)，并给出扣费后有效 R:R", href: "/breakeven" },
    { icon: "⚠️", title: "破产概率", desc: "由胜率/盈亏比/本金估算破产概率：P=(（q/w)·(1/rr))^B", href: "/risk-ruin" },
    { icon: "🎲", title: "双屏障", desc: "先触目标还是先触止损？P(先触目标)=b/(a+b)，可加漂移", href: "/two-barrier" },
    { icon: "💵", title: "实际回报", desc: "Fisher 方程：实际年化=(1+名义)/(1+通胀)−1，含 Bogle 魔数与购买力", href: "/real-return" },
    { icon: "📈", title: "公允价值", desc: "P/E 回归 + 戈登增长(DDM) + 格雷厄姆安全边际，含上涨空间", href: "/fair-value" },
    { icon: "🪄", title: "杠杆 ETF", desc: "杠杆后年化=L·μ−½·L·(L−1)·σ²，展示波动衰减/损耗", href: "/levered-etf" },
    { icon: "🔀", title: "再平衡", desc: "再平衡溢价≈w₁w₂(σ₁²+σ₂²−2ρσ₁σ₂)，相对买入持有的额外收益", href: "/rebalance" },
    { icon: "🧾", title: "税务亏损", desc: "当年节省=min(亏损,抵免上限)×税率，超限结转，税后净成本", href: "/tax-loss" },
    { icon: "💱", title: "FX 点值", desc: "每点价值=pipSize×头寸/汇率，名义头寸=头寸×汇率，价格变动%", href: "/fx-pip" },
    { icon: "🔎", title: "全站搜索", desc: "搜索全部工具与量化概念，实时匹配", href: "/search" },
    { icon: "🌡️", title: "恐惧指数", desc: "VIX 风格恐惧仪表，确定性示例 + 情绪标签", href: "/fear" },
    { icon: "🧭", title: "市场状态", desc: "VIX · 趋势 · 利差 · 信用 → 判定 Risk-On / Risk-Off", href: "/regime" },
    { icon: "📖", title: "概念词典", desc: "夏普/回撤/VaR/凯利等核心概念中英定义 + 工具链接", href: "/glossary" },
    { icon: "🧰", title: "全部工具", desc: "支点·头寸·组合·风险·期权 — 计算工具总入口", href: "/calculators" },
  ],
  pricingTitle: "灵活定价，按需选择",
  pricingSubtitle: "从免费体验到机构级服务",
  viewPlans: "查看完整方案",
  philosophyTitle: "我们的理念",
  philosophy: "投资应基于数据与逻辑，而非情绪。金融教育是每个人必备的技能。",
  aboutTitle: "关于 Weacond",
  about: "以市场理性为核心，提供AI驱动的信号系统、教育资源和策略工具。",
  moreAbout: "了解更多 →",
  localAITitle: "本地优先，隐私至上",
  localAIDesc: "WebGPU+Qwen模型在你的设备本地运行。交易数据永不上传服务器。",
  footerAbout: "AI驱动的金融决策平台。",
  navLinks: "导航", legalLinks: "法律",
  disclaimer: "免责声明：仅供教育与研究用途，不构成投资建议。",
};

const en = {
  heroBadge: "AI-Powered Financial Decision Platform",
  heroTitle: "Make Investing Simple, Smart, Stable",
  heroSubtitle: "3-Engine Signals · Macro Sentiment · Local AI · Strategy Compare · Paper Trading · Task-Guided",
  ctaPricing: "View Plans", ctaSignals: "Today's Signals", ctaBacktest: "Backtest", ctaAI: "AI Assistant",
  engine1: { title: "Fundamental", desc: "Fair value model" },
  engine2: { title: "Technical", desc: "Breakout/support scoring" },
  engine3: { title: "Volatility", desc: "IV Rank / Theta / Black Swan" },
  featuresTitle: "Core Features",
  features: [
    { icon: "📊", title: "3-Engine Signals", desc: "Explainable scoring with data sources" },
    { icon: "🧠", title: "Local AI", desc: "WebGPU + Qwen, data stays local" },
    { icon: "📚", title: "Library", desc: "Bilingual ebooks" },
    { icon: "📈", title: "Backtesting", desc: "Slippage, commission, dividends" },
    { icon: "🌐", title: "Macro Sentiment", desc: "Regime detection + risk score + allocation" },
    { icon: "⚖️", title: "Strategy Compare", desc: "Side-by-side backtests, best metric highlighted" },
    { icon: "💼", title: "Paper Trading", desc: "Zero-risk: signal → order → close, end to end" },
    { icon: "⭐", title: "Watchlist", desc: "Cross-tab synced watchlist, one-tap to paper" },
    { icon: "🎯", title: "Task System", desc: "3-day trial, unlock premium" },
    { icon: "🛡️", title: "Black Swan", desc: "Tail risk detection & hedging" },
  ],
  toolsTitle: "Calculators",
  tools: [
    { icon: "🧭", title: "Learning Path", desc: "Beginner→advanced: a guided course chaining every tool", href: "/learning" },
    { icon: "🎯", title: "Pivot Points", desc: "Classic / Woodie / Camarilla / Fibonacci intraday levels", href: "/pivots" },
    { icon: "📐", title: "Fibonacci", desc: "Retracement & extension — reversal zones & trend targets", href: "/fibonacci" },
    { icon: "📏", title: "Position & Kelly", desc: "Risk budget, R:R ratio, and optimal bet sizing", href: "/position-size" },
    { icon: "📊", title: "Portfolio Optimizer", desc: "Compare 5 weightings: Sharpe, vol, risk parity & efficient frontier", href: "/portfolio" },
    { icon: "🛡️", title: "Risk Dashboard", desc: "Max drawdown / duration / recovery, VaR/CVaR & six performance ratios", href: "/risk" },
    { icon: "🔗", title: "Correlation & Diversification", desc: "Correlation heatmap, diversification ratio DR & HHI", href: "/correlation" },
    { icon: "🎲", title: "Monte Carlo Simulator", desc: "Simulate wealth paths, terminal distribution, halving/ruin odds & fan chart", href: "/montecarlo" },
    { icon: "📝", title: "Trade Journal", desc: "Enter per-trade returns for win rate, profit factor, expectancy, ruin odds", href: "/performance" },
    { icon: "🌊", title: "Stress Test", desc: "Run your portfolio through 2008 / 2020 / 2022 shocks — loss & per-asset contribution", href: "/stresstest" },
    { icon: "↩️", title: "Recovery", desc: "What gain breaks even after a -X% drawdown, and time at a given CAGR", href: "/drawdown" },
    { icon: "🎲", title: "Simulator", desc: "Win rate × R:R × bet size → equity curve, drawdown & probability of ruin", href: "/system" },
    { icon: "📈", title: "Compound", desc: "Principal + monthly DCA compounded monthly; DCA vs lump sum & rule of 72", href: "/compound" },
    { icon: "⚖️", title: "Hedge Ratio", desc: "Min-variance hedge ratio, residual risk & optimal weights from ρ and vol", href: "/hedge" },
    { icon: "🧮", title: "IRR / XIRR", desc: "Enter a cashflow series, solve the internal rate of return & annualized return", href: "/xirr" },
    { icon: "🎯", title: "Vol Target", desc: "Given target & asset volatility, compute the leverage and position size", href: "/voltarget" },
    { icon: "⚡", title: "Leverage", desc: "Amplified P&L, liquidation price & max loss from leverage and a price move", href: "/leverage" },
    { icon: "🎯", title: "R-Multiple", desc: "Express P&L in R; compute realized R, grade & expectancy-in-R", href: "/r-multiple" },
    { icon: "📊", title: "Avg Entry", desc: "Blend existing + add-on positions; new average, P&L at spot & distance to target", href: "/average-entry" },
    { icon: "🔔", title: "Z-Score", desc: "Z-score, normal percentile & band for mean-reversion signals and outlier detection", href: "/z-score" },
    { icon: "⚖️", title: "Vol Drag", desc: "Compare arithmetic vs geometric (compounded) returns; quantify volatility drag on terminal value", href: "/vol-drag" },
    { icon: "🛡️", title: "ATR Stop", desc: "Size positions from ATR: stop = entry ± N·ATR, shares = risk$ / stop distance", href: "/atr-stop" },
    { icon: "🎯", title: "Max Excursion", desc: "Grade entry/exit quality: MFE max favorable, MAE max adverse, capture = P&L / MFE", href: "/excursion" },
    { icon: "🧮", title: "Breakeven", desc: "Post-fee breakeven price = entry·(1±fee)/(∓fee), plus the net (post-fee) R:R", href: "/breakeven" },
    { icon: "⚠️", title: "Risk of Ruin", desc: "Pruin = ((q/w)·(1/rr))^B from win rate, R:R, and bankroll in R units", href: "/risk-ruin" },
    { icon: "🎲", title: "Two-barrier", desc: "Target-first vs stop-first: P(target) = b/(a+b), with optional drift", href: "/two-barrier" },
    { icon: "💵", title: "Real Return", desc: "Fisher real rate = (1+nominal)/(1+inflation)−1; Bogle #, purchasing power", href: "/real-return" },
    { icon: "📈", title: "Fair Value", desc: "P/E reversion + Gordon growth (DDM) + Graham margin of safety", href: "/fair-value" },
    { icon: "🪄", title: "Levered ETF", desc: "Levered annual = L·μ − ½·L·(L−1)·σ²; shows vol decay/drag", href: "/levered-etf" },
    { icon: "🔀", title: "Rebalance", desc: "Rebalancing premium ≈ w₁w₂(σ₁²+σ₂²−2ρσ₁σ₂) over buy-and-hold", href: "/rebalance" },
    { icon: "🧾", title: "Tax-Loss", desc: "Year-1 saving = min(loss, cap)×rate; excess carried forward, after-tax cost", href: "/tax-loss" },
    { icon: "💱", title: "FX Pip", desc: "Pip value = pipSize×size/rate; notional = size×rate; price-move %", href: "/fx-pip" },
    { icon: "🔎", title: "Search", desc: "Search all tools and quant concepts with live matching", href: "/search" },
    { icon: "🌡️", title: "Fear Index", desc: "VIX-style fear gauge, deterministic sample + mood label", href: "/fear" },
    { icon: "🧭", title: "Market Regime", desc: "VIX · trend · yield curve · credit → Risk-On / Risk-Off", href: "/regime" },
    { icon: "📖", title: "Glossary", desc: "Bilingual definitions of Sharpe, drawdown, VaR, Kelly + tool links", href: "/glossary" },
    { icon: "🧰", title: "All Tools", desc: "Pivots · position · portfolio · risk · options — the calculators hub", href: "/calculators" },
  ],
  pricingTitle: "Flexible Pricing",
  pricingSubtitle: "From free trial to enterprise",
  viewPlans: "View Full Plans",
  philosophyTitle: "Our Philosophy",
  philosophy: "Investing should be based on data and logic, not emotion.",
  aboutTitle: "About Weacond",
  about: "AI-driven signals, education, and strategy tools for rational investing.",
  moreAbout: "Learn More →",
  localAITitle: "Local-First, Privacy Above All",
  localAIDesc: "WebGPU + Qwen runs on your device. Data never touches a server.",
  footerAbout: "AI-powered financial platform.",
  navLinks: "Navigate", legalLinks: "Legal",
  disclaimer: "For educational purposes only. Not financial advice.",
};
