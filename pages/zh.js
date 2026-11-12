import Head from "next/head";
import LocaleAlias from "../components/LocaleAlias";

// /zh — 华语语言别名：落地后设置华语并重定向到首页（不索引，避免重复内容）
export const metadata = {
  title: "华语版 — Weacond",
  robots: { index: false, follow: true },
};

export default function ZhAlias() {
  return (
    <>
      <Head>
        <title>华语版 — Weacond</title>
      </Head>
      <LocaleAlias locale="zh" />
    </>
  );
}
