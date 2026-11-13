"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "../contexts/LanguageContext";

const navItems = [
  { href: "/", key: "home" },
  { href: "/search", key: "search" },
  { href: "/signals", key: "signals" },
  { href: "/watchlist", key: "watchlist" },
  { href: "/ebooks", key: "ebooks" },
  { href: "/backtest", key: "backtest" },
  { href: "/paper", key: "paper" },
  { href: "/compare", key: "compare" },
  { href: "/macro", key: "macro" },
  { href: "/options", key: "options" },
  { href: "/putseller", key: "putseller" },
  { href: "/position-size", key: "positionSize" },
  { href: "/pivots", key: "pivots" },
  { href: "/fibonacci", key: "fibonacci" },
  { href: "/portfolio", key: "portfolio" },
  { href: "/risk", key: "risk" },
  { href: "/correlation", key: "correlation" },
  { href: "/montecarlo", key: "montecarlo" },
  { href: "/calculators", key: "calculators" },
  { href: "/performance", key: "performance" },
  { href: "/glossary", key: "glossary" },
  { href: "/regime", key: "regime" },
  { href: "/fear", key: "fear" },
  { href: "/stresstest", key: "stresstest" },
  { href: "/learning", key: "learning" },
  { href: "/drawdown", key: "drawdown" },
  { href: "/system", key: "system" },
  { href: "/compound", key: "compound" },
  { href: "/hedge", key: "hedge" },
  { href: "/xirr", key: "xirr" },
  { href: "/voltarget", key: "voltarget" },
  { href: "/leverage", key: "leverage" },
  { href: "/r-multiple", key: "rMultiple" },
  { href: "/average-entry", key: "averageEntry" },
  { href: "/z-score", key: "zScore" },
  { href: "/vol-drag", key: "volDrag" },
  { href: "/atr-stop", key: "atrStop" },
  { href: "/excursion", key: "excursion" },
  { href: "/breakeven", key: "breakeven" },
  { href: "/risk-ruin", key: "riskRuin" },
  { href: "/two-barrier", key: "twoBarrier" },
  { href: "/real-return", key: "realReturn" },
  { href: "/fair-value", key: "fairValue" },
  { href: "/levered-etf", key: "leveredEtf" },
  { href: "/rebalance", key: "rebalance" },
  { href: "/tax-loss", key: "taxLoss" },
  { href: "/fx-pip", key: "fxPip" },
  { href: "/bond", key: "bond" },
  { href: "/tax-drag", key: "taxDrag" },
  { href: "/margin", key: "margin" },
  { href: "/expectancy", key: "expectancy" },
  { href: "/options-payoff", key: "optionsPayoff" },
  { href: "/ytm", key: "ytm" },
  { href: "/loan", key: "loan" },
  { href: "/fx-cross", key: "fxCross" },
  { href: "/drip", key: "drip" },
  { href: "/staking", key: "staking" },
  { href: "/portfolio-beta", key: "portfolioBeta" },
  { href: "/annuity", key: "annuity" },
  { href: "/goal-solver", key: "goalSolver" },
  { href: "/drawdown-sizing", key: "ddSizing" },
  { href: "/r-position", key: "rPosition" },
  { href: "/real-after-tax", key: "realAfterTax" },
  { href: "/prob-return", key: "probReturn" },
  { href: "/fib-time", key: "fibTime" },
  { href: "/kelly", key: "kelly" },
  { href: "/npv", key: "npv" },
  { href: "/risk-budget", key: "riskBudget" },
  { href: "/trailing-stop", key: "trailingStop" },
  { href: "/take-profit", key: "takeProfit" },
  { href: "/lot-size", key: "lotSize" },
  { href: "/slippage", key: "slippage" },
  { href: "/inflation-goal", key: "inflationGoal" },
  { href: "/ai", key: "ai" },
  { href: "/strategies", key: "strategies" },
  { href: "/pricing", key: "pricing" },
  { href: "/about", key: "about" },
];

const labels = {
  zh: {
    home: "主页",
    search: "搜索",
    signals: "信号",
    watchlist: "收藏",
    ebooks: "书房",
    backtest: "回测",
    paper: "模拟交易",
    compare: "对比",
    macro: "宏观",
    options: "期权",
    putseller: "卖Put",
    positionSize: "头寸",
    pivots: "支点",
    fibonacci: "斐波那契",
    portfolio: "组合",
    risk: "风险",
    correlation: "相关性",
    montecarlo: "蒙特卡洛",
    calculators: "工具集",
    performance: "业绩",
    glossary: "词典",
    regime: "状态",
    fear: "恐惧",
    stresstest: "压测",
    learning: "路径",
    drawdown: "回本",
    system: "模拟",
    compound: "复利",
    hedge: "对冲",
    xirr: "IRR",
    voltarget: "波动目标",
    leverage: "杠杆",
    rMultiple: "R倍数",
    averageEntry: "加仓均价",
    zScore: "Z分数",
    volDrag: "波动拖累",
    atrStop: "ATR止损",
    excursion: "最大偏移",
    breakeven: "盈亏平衡",
    riskRuin: "破产概率",
    twoBarrier: "双屏障",
    realReturn: "实际回报",
    fairValue: "公允价值",
    leveredEtf: "杠杆 ETF",
    rebalance: "再平衡",
    taxLoss: "税务亏损",
    fxPip: "FX 点值",
    bond: "债券",
    taxDrag: "税后复利",
    margin: "保证金",
    expectancy: "交易期望",
    optionsPayoff: "期权盈亏",
    ytm: "到期收益率",
    loan: "贷款摊销",
    fxCross: "FX 交叉汇率",
    drip: "红利再投资",
    staking: "加密质押",
    portfolioBeta: "组合 Beta",
    annuity: "年金给付",
    goalSolver: "目标储蓄",
    ddSizing: "回撤缩放",
    rPosition: "R头寸",
    realAfterTax: "税后实际",
    probReturn: "概率回报",
    fibTime: "时间周期",
    kelly: "凯利公式",
    npv: "净现值",
    riskBudget: "风险预算",
    trailingStop: "移动止损",
    takeProfit: "止盈目标",
    lotSize: "手数",
    slippage: "滑点",
    inflationGoal: "含通胀目标",
    ai: "AI助手",
    strategies: "策略市场",
    pricing: "定价",
    about: "关于",
    login: "登录",
    dashboard: "仪表盘",
    switchLang: "切换语言",
    openMenu: "打开菜单",
    closeMenu: "关闭菜单",
    language: "语言",
    more: "更多",
  },
  en: {
    home: "Home",
    search: "Search",
    signals: "Signals",
    watchlist: "Watchlist",
    ebooks: "Ebooks",
    backtest: "Backtest",
    paper: "Paper",
    compare: "Compare",
    macro: "Macro",
    options: "Options",
    putseller: "Put Selling",
    positionSize: "Position",
    pivots: "Pivots",
    fibonacci: "Fibonacci",
    portfolio: "Portfolio",
    risk: "Risk",
    correlation: "Correlation",
    montecarlo: "Monte Carlo",
    calculators: "Tools",
    performance: "Performance",
    glossary: "Glossary",
    regime: "Regime",
    fear: "Fear",
    stresstest: "Stress",
    learning: "Path",
    drawdown: "Recover",
    system: "Simulate",
    compound: "Compound",
    hedge: "Hedge",
    xirr: "IRR",
    voltarget: "Vol Target",
    leverage: "Leverage",
    rMultiple: "R-Multiple",
    averageEntry: "Avg Entry",
    zScore: "Z-Score",
    volDrag: "Vol Drag",
    atrStop: "ATR Stop",
    excursion: "Excursion",
    breakeven: "Breakeven",
    riskRuin: "Risk of Ruin",
    twoBarrier: "Two-barrier",
    realReturn: "Real Return",
    fairValue: "Fair Value",
    leveredEtf: "Levered ETF",
    rebalance: "Rebalance",
    taxLoss: "Tax-Loss",
    fxPip: "FX Pip",
    bond: "Bond",
    taxDrag: "Tax Drag",
    margin: "Margin",
    expectancy: "Expectancy",
    optionsPayoff: "Options P/L",
    ytm: "YTM",
    loan: "Loan",
    fxCross: "FX Cross",
    drip: "DRIP",
    staking: "Staking",
    portfolioBeta: "Port Beta",
    annuity: "Annuity",
    goalSolver: "Goal",
    ddSizing: "DD Size",
    rPosition: "R Size",
    realAfterTax: "Real Tax",
    probReturn: "Prob Ret",
    fibTime: "Fib Time",
    kelly: "Kelly",
    npv: "NPV",
    riskBudget: "Risk Budget",
    trailingStop: "Trailing Stop",
    takeProfit: "Take-Profit",
    lotSize: "Lot Size",
    slippage: "Slippage",
    inflationGoal: "Inflation Goal",
    ai: "AI",
    strategies: "Strategies",
    pricing: "Pricing",
    about: "About",
    login: "Sign In",
    dashboard: "Dashboard",
    switchLang: "Switch language",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    language: "Language",
    more: "More",
  },
};

export default function Navbar() {
  const { lang, setLang } = useLanguage();
  const t = labels[lang] || labels.zh;
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // 桌面端：核心页内联展示，其余深度链接收进「更多 ▾」下拉，避免导航随工具增长溢出。
  const PRIMARY_KEYS = new Set([
    "home", "signals", "watchlist", "backtest", "paper", "options", "risk",
    "search", "calculators", "ai", "strategies", "pricing", "about",
  ]);
  const primaryItems = navItems.filter((i) => PRIMARY_KEYS.has(i.key));
  const moreItems = navItems.filter((i) => !PRIMARY_KEYS.has(i.key));
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-md shadow-md" : "bg-white/80 backdrop-blur"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" aria-label="Weacond home"
          className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent hover:opacity-90 transition-opacity">
          Weacond
        </Link>
        <nav aria-label="Primary" className="hidden lg:flex items-center gap-3 text-sm">
          {primaryItems.map((item) => (
            <Link key={item.href} href={item.href}
              className="hover:text-indigo-600 transition-colors font-medium text-slate-700">
              {t[item.key]}
            </Link>
          ))}
          {moreItems.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                aria-controls="more-menu"
                className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors font-medium text-slate-700">
                {t.more}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={moreOpen ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
                </svg>
              </button>
              {moreOpen && (
                <div id="more-menu"
                  className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 shadow-lg rounded-xl p-1 grid grid-cols-1 gap-0.5 max-h-96 overflow-y-auto z-50">
                  {moreItems.map((item) => (
                    <Link key={item.href} href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors text-slate-700">
                      {t[item.key]}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login"
            className="hidden lg:inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
            {t.login}
          </Link>
          <label className="sr-only" htmlFor="lang-select">{t.language}</label>
          <select id="lang-select" aria-label={t.switchLang} value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="zh">华语</option>
            <option value="en">English</option>
          </select>
          <button type="button"
            className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg hover:bg-slate-100"
            aria-label={menuOpen ? t.closeMenu : t.openMenu}
            aria-expanded={menuOpen} aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}>
            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Mobile" className="lg:hidden border-t border-slate-100 bg-white">
          <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col gap-2 text-sm">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}
                onClick={() => setMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors font-medium">
                {t[item.key]}
              </Link>
            ))}
            <div className="border-t border-slate-100 mt-1 pt-2">
              <Link href="/login" onClick={() => setMenuOpen(false)}
                className="block py-2 px-3 rounded-lg hover:bg-indigo-50 text-indigo-600 font-medium">
                {t.login}
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
