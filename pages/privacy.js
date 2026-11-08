import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Head from "next/head";
import { useLanguage } from "../contexts/LanguageContext";
import { PRIVACY_SECTIONS, PRIVACY_META } from "../lib/legalContent";

export const metadata = {
  title: "隐私政策 — Weacond",
  robots: { index: false },
};

export default function PrivacyPage() {
  const { lang } = useLanguage();
  const meta = lang === "en" ? PRIVACY_META.en : PRIVACY_META.zh;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{meta.title} — Weacond</title></Head>
      <Navbar />
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <h1 className="text-3xl font-bold mb-2">{meta.title}</h1>
          <p className="text-sm text-slate-400 mb-8">{meta.intro}</p>

          <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
            {PRIVACY_SECTIONS.map((s, i) => (
              <section key={i}>
                <h2 className="text-lg font-bold mb-2">{s[lang].h}</h2>
                <p>{s[lang].p}</p>
              </section>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
