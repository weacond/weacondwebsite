import Head from "next/head";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import StructuredData from "../../components/StructuredData";
import { softwareLd } from "../../lib/jsonLd.js";
import { buildTickerLanding, DEFAULT_UNIVERSE } from "../../lib/signalApi.js";

// 6 个标的 → 6 个可索引落地页（无 fallback，未知 ticker 404）。
export function getStaticPaths() {
  return {
    paths: DEFAULT_UNIVERSE.map((u) => ({ params: { ticker: u.ticker } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const signal = buildTickerLanding(params.ticker);
  if (!signal) return { notFound: true };
  return { props: { signal } };
}

export default function TickerSignalPage({ signal }) {
  const pct = (n) => `${Math.round(Number(n) * 100)}%`;
  const rationale =
    typeof signal.rationale === "string" ? signal.rationale : JSON.stringify(signal.rationale);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>
          {signal.ticker} 信号 — 盈利概率 {pct(signal.probOfProfit)} | Weacond
        </title>
        <meta
          name="description"
          content={`${signal.ticker}（${signal.name}）三引擎信号：盈利概率 ${pct(
            signal.probOfProfit
          )}（95% 区间 ${pct(signal.confidenceBand[0])}–${pct(
            signal.confidenceBand[1]
          )}）。教育性参考，非投资建议。`}
        />
      </Head>
      <StructuredData
        data={[
          softwareLd({
            id: `signal-${signal.ticker}`,
            icon: "📈",
            title: `${signal.ticker} 信号`,
            titleEn: `${signal.ticker} Signal`,
            desc: `${signal.ticker} 三引擎信号，盈利概率 ${pct(signal.probOfProfit)}，含 95% 置信区间与假设。`,
            descEn: `${signal.ticker} three-engine signal, win probability ${pct(
              signal.probOfProfit
            )}, with 95% CI and assumptions.`,
            href: `/signals/${signal.ticker}`,
            category: "market",
          }),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/signals" className="text-sm text-indigo-600 hover:underline">
            ← 全部信号
          </Link>
          <h1 className="text-3xl font-bold mt-2">
            {signal.ticker} · {signal.name}
          </h1>
          <p className="text-slate-500 mt-1">
            排名 {signal.rank}/{signal.total}（按盈利概率）· {signal.engine} · 数据 {signal.dataMode}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <Stat label="盈利概率" value={pct(signal.probOfProfit)} />
            <Stat
              label="95% 区间"
              value={`${pct(signal.confidenceBand[0])}–${pct(signal.confidenceBand[1])}`}
            />
            <Stat label="综合分" value={Number(signal.score).toFixed(1)} />
            <Stat label="IV Rank" value={String(signal.ivRank)} />
          </div>

          <div className="mt-6 rounded-xl p-5 border border-slate-100 bg-white">
            <h3 className="font-semibold mb-2">假设与解读（可解释性）</h3>
            <p className="text-sm text-slate-600">{signal.assumptions && signal.assumptions.probability}</p>
            <p className="text-sm text-slate-500 mt-2">{rationale}</p>
          </div>

          <p className="text-xs text-slate-400 mt-6 leading-relaxed">{signal.disclaimer}</p>
          <Link
            href="/pricing"
            className="inline-block mt-4 text-sm text-indigo-600 hover:underline"
          >
            升级查看实时数据 →
          </Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
