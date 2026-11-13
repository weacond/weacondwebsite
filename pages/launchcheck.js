import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Head from "next/head";
import { useLanguage } from "../contexts/LanguageContext";
import { formatReport } from "../lib/launchCheckView";

// 内部运营页：把 /api/launch-check 的 JSON 渲染成「上线就绪清单」。只显示是否已配，绝不回传密钥；noindex。
export const metadata = {
  title: "上线就绪清单 — Weacond",
  robots: { index: false },
};

const SEV_STYLE = { blocker: "border-red-200 bg-red-50", recommended: "border-amber-200 bg-amber-50", optional: "border-slate-200 bg-slate-50" };
const SEV_DOT = { blocker: "bg-red-500", recommended: "bg-amber-500", optional: "bg-slate-400" };

export default function LaunchCheckPage() {
  const { lang } = useLanguage();
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | error

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    fetch("/api/launch-check", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (!j || j.ready === undefined) { setStatus("error"); return; }
        setReport(j);
        setStatus("ok");
      })
      .catch(() => { if (alive) setStatus("error"); });
    return () => { alive = false; };
  }, []);

  const view = report ? formatReport(report, lang) : null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{view ? view.title : "上线就绪清单"} — Weacond</title></Head>
      <Navbar />
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-4 text-xs text-slate-400">{view ? view.banner : "Internal ops page · not public"}</div>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 mb-6">
            <h1 className="text-3xl font-bold mb-2">{view ? view.title : "上线就绪清单"}</h1>
            <p className="text-sm text-slate-400 mb-6">{view ? view.subtitle : ""}</p>

            {status === "loading" && <p className="text-slate-400 text-sm">读取中…</p>}
            {status === "error" && <p className="text-red-600 text-sm">无法读取 /api/launch-check。请确认已在生产构建并部署该 API 路由。</p>}

            {view && (
              <>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${view.ready ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {view.statusLabel}
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{view.progressLabel}</span>
                    <span>{view.configured}/{view.total} · {view.progressPct}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-2 rounded-full ${view.ready ? "bg-green-500" : "bg-indigo-500"}`} style={{ width: `${view.progressPct}%` }} />
                  </div>
                </div>

                <div className="space-y-6">
                  {view.groups.map((g) => (
                    <div key={g.key}>
                      <h2 className="text-sm font-bold text-slate-700 mb-2">
                        {g.title}<span className="ml-2 text-xs font-normal text-slate-400">{g.items.length || 0}</span>
                      </h2>
                      {g.items.length === 0 ? (
                        <p className="text-sm text-green-600">{g.key === "todo" ? "✅ 全部 Blocker 已完成" : view.emptyLabel}</p>
                      ) : (
                        <ul className="space-y-2">
                          {g.items.map((it, i) => (
                            <li key={i} className={`rounded-xl border px-4 py-3 ${SEV_STYLE[it.severity] || SEV_STYLE.optional}`}>
                              <div className="flex items-start gap-2">
                                <span className={`mt-1.5 h-2 w-2 rounded-full ${SEV_DOT[it.severity] || SEV_DOT.optional} shrink-0`} />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-slate-800">{it.what}</div>
                                  {it.where && <div className="text-xs text-slate-500 mt-1"><span className="font-medium text-slate-600">{view.whereLabel}</span>: {it.where}</div>}
                                  {it.hint && <div className="text-xs text-slate-400 mt-0.5">{it.hint}</div>}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-400 space-y-1">
                  <p>{view.tip}</p>
                  <p>{view.note}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
