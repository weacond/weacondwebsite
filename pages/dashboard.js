import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { usePaper } from "../lib/paper";

export const metadata = {
  title: "仪表盘 — Weacond",
  robots: { index: false },
};

// 任务系统 — 3天体验引导
const TASKS = [
  { day: 0, title_zh: "查看今日 SignalCard", title_en: "View Today's SignalCard", done_hint: "点击信号页并浏览任意一张卡片" },
  { day: 1, title_zh: "观看教学视频", title_en: "Watch Tutorial", done_hint: "完成 3 分钟 SignalCard 解读" },
  { day: 2, title_zh: "完成模拟下单", title_en: "Complete Paper Trade", done_hint: "在模拟账户中执行一笔交易" },
];

export default function Dashboard() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const router = useRouter();

  const [owned, setOwned] = useState([]);
  const [justBought, setJustBought] = useState(false);
  // 3 天任务进度：真实派生自本地 store（信号访问 / 教学 / 模拟交易），非硬编码
  const [taskState, setTaskState] = useState({ seenSignals: false, seenTutorial: false });
  const { trades, realizedPnl, positions } = usePaper();

  useEffect(() => {
    setTaskState({
      seenSignals: localStorage.getItem("weacond_seen_signals") === "1",
      seenTutorial: localStorage.getItem("weacond_seen_tutorial") === "1",
    });
    if (router.isReady && router.query.success === "true") setJustBought(true);
    fetch("/api/purchases", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { slugs: [] }))
      .then((d) => {
        const slugs = Array.isArray(d.slugs) ? d.slugs : [];
        localStorage.setItem("weacond_purchases", JSON.stringify(slugs));
        setOwned(slugs);
      })
      .catch(() => {});
  }, [router.isReady, router.query.success]);

  // Day0 看过信号 · Day1 看过教学 · Day2 完成模拟交易（全部真实派生）
  const completedTasks = {
    0: taskState.seenSignals,
    1: taskState.seenTutorial,
    2: trades.length > 0,
  };
  const progress = Object.values(completedTasks).filter(Boolean).length / TASKS.length * 100;

  const markTutorialDone = () => {
    localStorage.setItem("weacond_seen_tutorial", "1");
    setTaskState((s) => ({ ...s, seenTutorial: true }));
  };

  const handleLogout = () => {
    localStorage.removeItem("weacond_user");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          {/* 用户信息 */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">{L.title}</h1>
              <p className="text-sm text-slate-500">{L.freePlan} · 3天体验中</p>
            </div>
            <button onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-red-600 transition-colors">
              退出登录
            </button>
          </div>

          {/* 任务进度 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">{L.taskTitle}</h2>
              <span className="text-sm text-indigo-600 font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{width:`${progress}%`}} />
            </div>
            <div className="space-y-3">
              {TASKS.map((task, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${completedTasks[task.day]?"bg-green-500 text-white":"bg-slate-200"}`}>
                      {completedTasks[task.day] ? "✓" : task.day + 1}
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${completedTasks[task.day]?"line-through text-slate-400":""}`}>
                        Day {task.day}: {lang === "en" ? task.title_en : task.title_zh}
                      </div>
                      <div className="text-xs text-slate-400">{task.done_hint}</div>
                    </div>
                  </div>
                  {!completedTasks[task.day] &&
                    (task.day === 1 ? (
                      <button onClick={markTutorialDone} className="text-xs text-indigo-600 hover:underline">
                        {L.markDone}
                      </button>
                    ) : (
                      <Link href={task.day === 0 ? "/signals" : "/paper"} className="text-xs text-indigo-600 hover:underline">
                        {L.goNow}
                      </Link>
                    ))}
                </div>
              ))}
            </div>
          </div>

          {/* 快捷入口 */}
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/signals" className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-semibold mb-1">今日信号</h3>
              <p className="text-sm text-slate-500">查看三引擎合成评分</p>
            </Link>
            <Link href="/ebooks" className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="text-2xl mb-2">📚</div>
              <h3 className="font-semibold mb-1">投资书房</h3>
              <p className="text-sm text-slate-500">学习投资知识</p>
            </Link>
            <Link href="/pricing" className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-semibold mb-1">升级方案</h3>
              <p className="text-sm text-slate-500">解锁全部功能</p>
            </Link>
          </div>

          {/* 模拟账户概览（真实来自 lib/paper.js store） */}
          <div className="mt-6">
            <h2 className="font-bold mb-3">{L.paperSummary}</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="text-xs text-slate-400 mb-1">{L.openPos}</div>
                <div className="text-2xl font-bold">{positions.length}</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="text-xs text-slate-400 mb-1">{L.realizedPnlLabel}</div>
                <div className={`text-2xl font-bold ${realizedPnl >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {realizedPnl >= 0 ? "+" : ""}${realizedPnl.toFixed(0)}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="text-xs text-slate-400 mb-1">{L.closedTrades}</div>
                <div className="text-2xl font-bold">{trades.length}</div>
              </div>
            </div>
            <Link href="/paper" className="mt-3 inline-block text-sm text-indigo-600 hover:underline">{L.goToPaper} →</Link>
          </div>

          {/* 我的电子书（服务端真实来源 /api/purchases） */}
          <div className="mt-6">
            {justBought && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
                {lang === "zh" ? "✓ 购买成功！你的书已添加到下方列表。" : "✓ Purchase successful! Added to your library below."}
              </div>
            )}
            <h2 className="font-bold mb-3">{lang === "zh" ? "我的电子书" : "My Ebooks"}</h2>
            {owned.length === 0 ? (
              <p className="text-sm text-slate-400">
                {lang === "zh" ? "你还没有购买任何电子书。" : "You haven't bought any ebooks yet."}
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {owned.map((s) => (
                  <Link key={s} href={`/ebooks/${s}`}
                    className="flex items-center justify-between bg-white rounded-lg border border-slate-100 px-4 py-3 hover:shadow-sm transition-shadow">
                    <span className="text-sm font-medium text-slate-700">
                      {s === "bundle-all"
                        ? (lang === "zh" ? "全套 25 本" : "Complete Bundle (25)")
                        : s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                    <span className="text-xs text-indigo-600">{lang === "zh" ? "阅读 →" : "Read →"}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title:"我的仪表盘", freePlan:"Free 方案", taskTitle:"3天体验任务",
  goNow:"去完成", markDone:"标记已看",
  paperSummary:"模拟账户概览", openPos:"持仓数", realizedPnlLabel:"已实现盈亏",
  closedTrades:"已平仓", goToPaper:"进入模拟盘",
};
const en = {
  title:"My Dashboard", freePlan:"Free Plan", taskTitle:"3-Day Trial Tasks",
  goNow:"Go", markDone:"Mark watched",
  paperSummary:"Paper Account", openPos:"Open positions", realizedPnlLabel:"Realized P&L",
  closedTrades:"Closed trades", goToPaper:"Open paper trading",
};